const express = require('express');
const cors = require('cors');
const { query } = require('./db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const groupRoutes = require('./routes/groupRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (_request, response) => {
  await query('SELECT 1');
  response.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/users', profileRoutes);
app.use('/', groupRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Erro interno do servidor.' });
});

module.exports = app;
