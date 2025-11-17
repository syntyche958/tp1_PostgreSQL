const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
// GET /api/users?page=1&limit=10
router.get('/',
  requireAuth,
  requirePermission('users', 'read'),
  async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    try {
      // 1. Compter le total d'utilisateurs
      const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM users');
      const total = countResult.rows[0].total;

      // 2. Récupérer les utilisateurs avec leurs rôles (array_agg)
      const usersResult = await pool.query(
        `SELECT u.id, u.email, u.nom, u.prenom, u.actif,
                COALESCE(array_agg(r.nom) FILTER (WHERE r.nom IS NOT NULL), '{}') AS roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         GROUP BY u.id, u.email, u.nom, u.prenom, u.actif
         ORDER BY u.id
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      // 3. Utiliser LIMIT et OFFSET pour la pagination (déjà appliqué)
      // 4. Retourner users et pagination info
      const totalPages = Math.ceil(total / limit) || 1;
      res.json({
        users: usersResult.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
    } catch (error) {
      console.error('Erreur liste utilisateurs:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

//  /api/users/:id
router.put('/:id',
 requireAuth,
 requirePermission('users', 'write'),
 async (req, res) => {
   const { id } = req.params;
   const { nom, prenom, actif } = req.body;
   try {
     // Préparer valeurs : utiliser null pour préserver champs via COALESCE
     const nomVal = nom ?? null;
     const prenomVal = prenom ?? null;
     const actifVal = (typeof actif === 'boolean') ? actif : null;

     const result = await pool.query(
       `UPDATE users
        SET nom = COALESCE($1, nom),
            prenom = COALESCE($2, prenom),
            actif = COALESCE($3, actif),
            date_modification = NOW()
        WHERE id = $4
        RETURNING id, email, nom, prenom, actif, date_modification`,
       [nomVal, prenomVal, actifVal, id]
     );
     if (result.rows.length === 0) {
       return res.status(404).json({ error: 'Utilisateur non trouvé' });
     }
     res.json({
       message: 'Utilisateur mis à jour',
       user: result.rows[0]
     });
   } catch (error) {
     console.error('Erreur mise à jour utilisateur:', error);
     res.status(500).json({ error: 'Erreur serveur' });
   }
 }
);

// DELETE /api/users/:id
router.delete('/:id',
 requireAuth,
 requirePermission('users', 'delete'),
 async (req, res) => {
   const { id } = req.params;
   // Empêcher l'auto-suppression — supporte req.user.id ou req.user.utilisateur_id
   const requesterId = req.user?.id ?? req.user?.utilisateur_id;
   if (parseInt(id, 10) === parseInt(requesterId, 10)) {
     return res.status(400).json({
       error: 'Vous ne pouvez pas supprimer votre propre compte'
     });
   }
   try {
     const result = await pool.query(
       'DELETE FROM users WHERE id = $1 RETURNING id, email, nom, prenom',
       [id]
     );
     if (result.rows.length === 0) {
       return res.status(404).json({ error: 'Utilisateur non trouvé' });
     }
     res.json({
       message: 'Utilisateur supprimé',
       user: result.rows[0]
     });
   } catch (error) {
     console.error('Erreur suppression utilisateur:', error);
     res.status(500).json({ error: 'Erreur serveur' });
   }
 }
);

// GET /api/users/:id/permissions
router.get('/:id/permissions',
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    try {
      // Récupérer toutes les permissions de l'utilisateur via ses rôles
      const result = await pool.query(
        `SELECT DISTINCT p.id, p.nom, p.ressource, p.action, p.description
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN roles r ON r.id = rp.role_id
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = $1
         ORDER BY p.id`,
        [id]
      );

      res.json({
        utilisateur_id: parseInt(id, 10),
        permissions: result.rows
      });
    } catch (error) {
      console.error('Erreur récupération permissions:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);


module.exports = router;