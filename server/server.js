require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/surveys', require('./routes/surveyRoutes'));
app.use('/api/public/surveys', require('./routes/publicSurveyRoutes'));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Serveur Survey Builder actif' });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connecté');

    app.listen(PORT, () => {
      console.log(`Serveur lancé sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur de connexion MongoDB :', error.message);
    process.exit(1);
  }
}

startServer();