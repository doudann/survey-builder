require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// 1 seul proxy devant l'API (Render, Nginx…) : req.ip devient la vraie IP du visiteur.
// Ne pas mettre `true`, sinon un client pourrait fausser son IP via X-Forwarded-For.
app.set('trust proxy', 1);
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
    if (!process.env.HASH_SECRET) {
      throw new Error('HASH_SECRET manquant dans le fichier .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connecté');

    app.listen(PORT, () => {
      console.log(`Serveur lancé sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur au démarrage du serveur :', error.message);
    process.exit(1);
  }
}

startServer();