const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

//api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, nom, prenom } = req.body;
  // 1. Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 2. Vérifier si email existe
    const checkUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (checkUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }
    // 3. Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);
    // 4. Insérer l'utilisateur
    const result = await client.query(
      'INSERT INTO users (email, password_hash, nom, prenom) VALUES ($1, $2, $3, $4) RETURNING id, email, nom, prenom, date_creation',
      [email, passwordHash, nom || null, prenom || null]
    );
    const newUser = result.rows[0];
    // 5. Assigner le rôle "user"
    await client.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1, (SELECT id FROM roles WHERE nom = $2))",
      [newUser.id, 'user']
    );
    await client.query('COMMIT');
    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: newUser
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

//Post /api/auth/login
// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Récupérer l'utilisateur
    const userResult = await client.query(
      'SELECT id, email, password_hash, nom, prenom, actif FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      // Logger l'échec (email inconnu)
      await client.query(
        'INSERT INTO logs_connexion (user_id, email, succes, ip, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [null, email, false, req.ip]
      );
      await client.query('COMMIT');
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = userResult.rows[0];

    // 2. Vérifier que l'utilisateur est actif
    if (!user.actif) {
      await client.query(
        'INSERT INTO logs_connexion (user_id, email, succes, ip, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [user.id, email, false, req.ip]
      );
      await client.query('COMMIT');
      return res.status(403).json({ error: 'Compte inactif' });
    }

    // 3. Comparer le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await client.query(
        'INSERT INTO logs_connexion (user_id, email, succes, ip, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [user.id, email, false, req.ip]
      );
      await client.query('COMMIT');
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // 4. Générer un token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 5. Créer une session
    await client.query(
      'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
      [token, user.id, expiresAt]
    );

    // 6. Logger la réussite
    await client.query(
      'INSERT INTO logs_connexion (user_id, email, succes, ip, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [user.id, email, true, req.ip]
    );

    await client.query('COMMIT');

    // 7. Retourner token et infos utilisateur (sans password)
    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom
      },
      expiresAt
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// GET /api/auth/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.nom, u.prenom, u.actif,
              COALESCE(array_agg(r.nom) FILTER (WHERE r.nom IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1
       GROUP BY u.id, u.email, u.nom, u.prenom, u.actif`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return res.status(400).json({ error: 'Token manquant' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Désactiver la session (marquer expirée)
    const updateRes = await client.query(
      'UPDATE sessions SET expires_at = NOW() WHERE token = $1 RETURNING user_id',
      [token]
    );
    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Session introuvable' });
    }
    // 2. Logger la déconnexion
    await client.query(
      'INSERT INTO logs_connexion (user_id, email, succes, ip, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [req.user.id, req.user.email, true, req.ip]
    );
    await client.query('COMMIT');
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur logout:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// GET /api/auth/logs
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, email, succes, ip, created_at
       FROM logs_connexion
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Erreur logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;