const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    er: process.env.DB_USER || process.env.PGUSER || 'postgres',
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    database: process.env.DB_NAME || process.env.PGDATABASE || 'postgres',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),

});
pool.on('connect', () => {
 console.log('✅ Connecté à PostgreSQL');
});
pool.on('error', (err) => {
 console.error('❌ Erreur PostgreSQL:', err);
});
module.exports = pool;