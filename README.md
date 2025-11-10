# tp1_PostgreSQL
# TP1 : Gestion d’utilisateurs — PostgreSQL

Ce projet consiste à créer un schéma de base de données pour gérer les **utilisateurs**, leurs **rôles**, et leurs **permissions**, selon une architecture de type RBAC *(Role-Based Access Control)*.

---

## 📌 Contenu du projet

Le script `gestion_utilisateur.sql` contient :

✅ Création des tables principales :
- `utilisateurs`
- `roles`
- `permissions`

✅ Tables de relation (associations many-to-many) :
- `utilisateurs_roles`
- `roles_permissions`

✅ Table de suivi des connexions :
- `sessions`
- `logs_connection`

✅ Contraintes et bonnes pratiques :
- Clés primaires et étrangères
- Contraintes d’unicité
- Suppression en cascade (`ON DELETE CASCADE`)
- Valeurs par défaut pour les dates

---

## 🔧 Technologies utilisées

| Technologie | Version |
|------------|---------|
| PostgreSQL | 18 |
| pgAdmin    | Optionnel pour exécuter le script |

---

## 🚀 Instructions d’exécution

1. Ouvrir **pgAdmin**
2. Créer une base de données (ex: `tp_gestion_utilisateurs`)
3. Ouvrir l’outil de requêtes (**Query Tool**)
4. Importer ou copier le contenu du fichier :
   - `File → Open` → sélectionner `gestion_utilisateur.sql`
5. Exécuter le script avec le bouton ▶️ (run)

---

## ✅ Résultat attendu : Schéma de base de données

Relations principales :

- Un **utilisateur** peut avoir plusieurs **rôles**
- Un **rôle** peut avoir plusieurs **permissions**
- Les **sessions** sont liées aux utilisateurs

Ce modèle permet une gestion flexible des droits d’accès.

---

## 👤 Auteur

- **Nom** : Djuissi Syntyche
- **BUT Informatique — TP Bases de Données_

---

## 📎 Remarques

Ce projet pourra être enrichi avec :
- Des requêtes d’insertion d’exemples (`INSERT INTO`)
- Des vues pour consulter les permissions d’un utilisateur
- Des triggers pour mettre à jour automatiquement `date_modification`

---

### 📂 Structure du repository

