const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));


app.use(express.json());


app.use('/api/auth', authRoutes);


app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});