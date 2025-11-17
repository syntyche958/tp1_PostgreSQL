--Task 1
CREATE TABLE utilisateurs (
user_id SERIAL PRIMARY KEY NOT NULL,
email VARCHAR (255) UNIQUE NOT NULL,
password_hash VARCHAR (255) NOT NULL,
user_name VARCHAR (255) NOT NULL,
actif BOOL DEFAULT 'true',
date_creation TIMESTAMP ,
date_modification TIMESTAMP
);

/* Index pour recherche rapide
CREATE INDEX idx_utilisateurs_email ON utilisateurs (email);
CREATE INDEX idx_utilisateurs_actif ON utilisateurs (actif);
*/

--Task 2
CREATE TABLE roles(
role_id SERIAL PRIMARY KEY NOT NULL,
role_name VARCHAR(255) UNIQUE,
description VARCHAR (255),
date_creation DATE
);

CREATE TABLE permissions(
permission_id SERIAL PRIMARY KEY,
permission_name VARCHAR(255) UNIQUE,
ressource VARCHAR(255) NOT NULL,
permission_action VARCHAR (255),
description VARCHAR (255),
UNIQUE(ressource,permission_action)
);

--Task 3
CREATE TABLE utilisateurs_roles(
user_id INT,
role_id INT,
date_assignation DATE,
PRIMARY KEY (user_id, role_id),
FOREIGN KEY (user_id) REFERENCES utilisateurs(user_id) ON DELETE CASCADE,
FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);

CREATE TABLE roles_permissions(
role_id INT,
permission_id INT,
PRIMARY KEY (role_id, permission_id),
FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);

--Task 4
CREATE TABLE sessions(
session_id SERIAL PRIMARY KEY NOT NULL,
user_id INT,
token VARCHAR(255) UNIQUE,
date_creation TIMESTAMP,
date_expiration TIMESTAMP,
actif BOOL DEFAULT 'true',
FOREIGN KEY (user_id) REFERENCES utilisateurs(user_id)
);

CREATE TABLE logs_connexion(
log_id SERIAL PRIMARY KEY NOT NULL,
user_id INT NULL,
email_tentative VARCHAR (255),
date_heure TIMESTAMP,
adresse_ip VARCHAR(255),
user_agent VARCHAR (255),
succes VARCHAR(255),
message_logs VARCHAR (255),
date_expiration TIMESTAMP,
actif BOOL DEFAULT 'true',
FOREIGN KEY (user_id) REFERENCES utilisateurs(user_id)
);

--Task 5
INSERT INTO roles (role_name, description) VALUES
 ('admin', 'Administrateur avec tous les droits'),
 ('moderator', 'Modérateur de contenu'),
 ('user', 'Utilisateur standard');
 
INSERT INTO permissions (permission_name, ressource, permission_action, description) VALUES
 ('read_users', 'users', 'read', 'Lire les utilisateurs'),
 ('write_users', 'users', 'write', 'Créer/modifier des utilisateurs'),
 ('delete_users', 'users', 'delete', 'Supprimer des utilisateurs'),
 ('read_posts', 'posts', 'read', 'Lire les posts'),
 ('write_posts', 'posts', 'write', 'Créer/modifier des posts'),
 ('delete_posts', 'posts', 'delete', 'Supprimer des posts');

  -- Admin : toutes les permissions
 INSERT INTO roles_permissions (role_id,permission_id)
 SELECT r.role_id, p.permission_id
 FROM roles r, permissions p
 WHERE r.role_name = 'admin';

--Moderator
INSERT INTO roles_permissions (role_id, permission_id)
SELECT 
    (SELECT role_id FROM roles WHERE role_name = 'moderator'),
    permission_id
FROM permissions
WHERE permission_name IN ('read_users', 'read_posts', 'write_posts', 'delete_posts');

--USer
INSERT INTO roles_permissions (role_id, permission_id)
SELECT 
    (SELECT role_id FROM roles WHERE role_name = 'user'),
    permission_id
FROM permissions
WHERE permission_name IN ('read_users', 'read_posts', 'write_posts');

--ok !
SELECT r.role_name, p.permission_name
FROM roles_permissions rp
JOIN roles r ON rp.role_id = r.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
ORDER BY r.role_name;

--Task 6
CREATE OR REPLACE FUNCTION utilisateur_a_permission(
 p_utilisateur_id INT,
 p_ressource VARCHAR,
 p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
	v_count INT;
BEGIN
	SELECT COUNT(*)
	INTO v_count
	FROM utilisateurs u
	JOIN utilisateurs_roles ur ON u.user_id = ur.user_id
	JOIN roles r ON ur.role_id = r.role_id
	JOIN roles_permissions rp ON r.role_id = rp.role_id
	JOIN permissions p ON rp.permission_id = p.permission_id
	WHERE u.user_id = p_utilisateur_id
		AND u.actif = TRUE
		AND p.ressource = p_ressource
		AND p.permission_action = p_action;
	IF v_count > 0 THEN
		RETURN TRUE;
	ELSE
		RETURN FALSE;
	END IF;
END;
$$ LANGUAGE plpgsql;

SELECT utilisateur_a_permission(1,'users','read');

--Task 7
SELECT 
	u.user_id,
	u.email,
	u.user_name,
	array_agg(r.role_name) AS roles
FROM utilisateurs u
JOIN utilisateurs_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
WHERE u.user_id = 1
GROUP BY u.user_id, u.email, u.user_name;

--Task 8
SELECT DISTINCT
    u.user_id,
    u.email,
    p.permission_name AS permission,
    p.ressource,
    p.permission_action AS action
FROM utilisateurs u
JOIN utilisateurs_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
JOIN roles_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE u.user_id = 1
ORDER BY p.ressource, p.permission_action;

--Task 9
SELECT
    r.role_name AS nom_du_role,
    COUNT(ur.user_id) AS nombre_utilisateurs
FROM roles r
LEFT JOIN utilisateurs_roles ur ON r.role_id = ur.role_id
GROUP BY r.role_name
ORDER BY nombre_utilisateurs DESC;

--Task 10
SELECT
    u.user_id,
    u.email,
    array_agg(r.role_name) AS roles
FROM utilisateurs u
JOIN utilisateurs_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
WHERE r.role_name IN ('admin', 'moderator')
GROUP BY u.user_id, u.email
HAVING COUNT(DISTINCT r.role_name) = 2;





