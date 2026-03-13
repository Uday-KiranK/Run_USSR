const express = require('express');
const app = express();

const authRoutes = require('./routes/authRoutes'); // 👈 import routes

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cloakbe API is running' });
});

// 👇 connect auth routes
app.use('/api/auth', authRoutes);

module.exports = app;