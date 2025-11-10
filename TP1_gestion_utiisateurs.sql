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


