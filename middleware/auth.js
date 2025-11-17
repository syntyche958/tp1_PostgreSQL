const pool = require('../database/db');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

    // Supporte "Bearer <token>" ou juste le token
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) return res.status(401).json({ error: 'Token invalide' });

    // Vérifier que le token est valide et récupérer l'utilisateur
    const result = await pool.query(
      `SELECT s.user_id AS id, u.email, u.nom, u.prenom, u.actif, s.expires_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1`,
      [token]
    );

    if (result.rows.length === 0) return res.status(401).json({ error: 'Session introuvable' });

    const session = result.rows[0];
    const now = new Date();
    if (session.expires_at && new Date(session.expires_at) < now) {
      return res.status(401).json({ error: 'Session expirée' });
    }
    if (!session.actif) return res.status(403).json({ error: 'Compte inactif' });

    // Attacher l'utilisateur et le token à la requête
    req.user = {
      id: session.id,
      email: session.email,
      nom: session.nom,
      prenom: session.prenom
    };
    req.token = token;

    next();
  } catch (error) {
    console.error('Erreur middleware auth:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Alternative au middleware requireAuth
async function requireAuthWithFunction(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

    // Supporte "Bearer <token>" ou juste le token
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) return res.status(401).json({ error: 'Token invalide' });

    // Tenter d'utiliser la fonction stockée est_token_valide(token)
    let valid = null;
    try {
      const validResult = await pool.query('SELECT est_token_valide($1) AS valide', [token]);
      if (validResult.rows.length > 0) valid = validResult.rows[0].valide;
    } catch (fnErr) {
      // Si la fonction n'existe pas ou erreur, on tombera sur la vérification manuelle ci-dessous
      valid = null;
    }

    if (valid === false) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }

    // Si la fonction n'a répondu, faire une vérification manuelle via la table sessions
    if (valid === null) {
      const checkResult = await pool.query(
        `SELECT s.user_id AS id, u.email, u.nom, u.prenom, u.actif, s.expires_at
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = $1`,
        [token]
      );
      if (checkResult.rows.length === 0) return res.status(401).json({ error: 'Session introuvable' });

      const session = checkResult.rows[0];
      const now = new Date();
      if (session.expires_at && new Date(session.expires_at) < now) {
        return res.status(401).json({ error: 'Session expirée' });
      }
      if (!session.actif) return res.status(403).json({ error: 'Compte inactif' });

      req.user = {
        id: session.id,
        email: session.email,
        nom: session.nom,
        prenom: session.prenom
      };
      req.token = token;
      return next();
    }

    // Si la fonction a validé le token, récupérer les infos utilisateur
    const userResult = await pool.query(
      `SELECT s.user_id AS id, u.email, u.nom, u.prenom, u.actif, s.expires_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1`,
      [token]
    );
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'Session introuvable' });

    const session = userResult.rows[0];
    const now = new Date();
    if (session.expires_at && new Date(session.expires_at) < now) {
      return res.status(401).json({ error: 'Session expirée' });
    }
    if (!session.actif) return res.status(403).json({ error: 'Compte inactif' });

    req.user = {
      id: session.id,
      email: session.email,
      nom: session.nom,
      prenom: session.prenom
    };
    req.token = token;
    next();
  } catch (error) {
    console.error('Erreur middleware auth:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { requireAuth, requireAuthWithFunction };