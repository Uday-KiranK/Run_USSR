require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/sites',     require('./routes/siteRoutes'));
app.use('/api/terminals', require('./routes/terminalRoutes'));
app.use('/api/boxes',     require('./routes/boxRoutes'));
app.use('/api/orders',    require('./routes/orderRoutes'));
app.use('/api/pricing',   require('./routes/pricingRoutes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(require('./middleware/errorHandler'));

module.exports = app;
