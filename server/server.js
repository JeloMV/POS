require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const menuRoutes = require('./routes/menu');
const ordersRoutes = require('./routes/orders');
const paymongoRoutes = require('./routes/paymongo');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/paymongo', paymongoRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.listen(PORT, () => {
  console.log(`Chick N Pastil POS Server running at http://localhost:${PORT}`);
});
