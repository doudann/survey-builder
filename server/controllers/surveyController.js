const mongoose = require('mongoose');
const Survey = require('../models/Survey');

function pickSurveyFields(body) {
  const fields = {};
  const allowedFields = [
    'title',
    'description',
    'category',
    'expiresAt',
    'status',
    'questions',
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }
  }

  return fields;
}

function handleError(error, res) {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Erreur du serveur.' });
}

async function findOwnedSurvey(id, userId) {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return Survey.findOne({ _id: id, owner: userId });
}

exports.createSurvey = async (req, res) => {
  try {
    const survey = new Survey({
      ...pickSurveyFields(req.body),
      owner: req.user._id,
    });

    if (survey.status === 'published' && survey.questions.length === 0) {
      return res.status(400).json({ message: 'Ajoute au moins une question.' });
    }

    await survey.save();
    res.status(201).json({ survey });
  } catch (error) {
    handleError(error, res);
  }
};

exports.getMySurveys = async (req, res) => {
  try {
    const surveys = await Survey.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({ surveys });
  } catch (error) {
    handleError(error, res);
  }
};

exports.getSurvey = async (req, res) => {
  try {
    const survey = await findOwnedSurvey(req.params.id, req.user._id);

    if (!survey) {
      return res.status(404).json({ message: 'Sondage introuvable.' });
    }

    res.json({ survey });
  } catch (error) {
    handleError(error, res);
  }
};

exports.updateSurvey = async (req, res) => {
  try {
    const survey = await findOwnedSurvey(req.params.id, req.user._id);

    if (!survey) {
      return res.status(404).json({ message: 'Sondage introuvable.' });
    }

    survey.set(pickSurveyFields(req.body));

    if (survey.status === 'published' && survey.questions.length === 0) {
      return res.status(400).json({ message: 'Ajoute au moins une question.' });
    }

    await survey.save();
    res.json({ survey });
  } catch (error) {
    handleError(error, res);
  }
};

exports.deleteSurvey = async (req, res) => {
  try {
    const survey = await findOwnedSurvey(req.params.id, req.user._id);

    if (!survey) {
      return res.status(404).json({ message: 'Sondage introuvable.' });
    }

    await survey.deleteOne();
    res.json({ message: 'Sondage supprimé.' });
  } catch (error) {
    handleError(error, res);
  }
};