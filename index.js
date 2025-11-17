const express = require('express');
const pool = require('./database/db');
const authRoutes = require('./routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 3000;
const userRoutes = require('./routes/userRoutes');


// Middleware
app.use(express.json());
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users',userRoutes);
// Health check
app.get('/api/health', async (req, res) => {
 try {
    const result = await pool.query('SELECT NOW()');
    const now = result.rows[0].now;
    res.json({ status: 'ok', time: now });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'error', error: 'Database connection failed' });
  }
});
app.listen(PORT, () => {
 console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
