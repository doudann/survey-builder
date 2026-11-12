const mongoose = require('mongoose');
const Survey = require('../models/Survey');
const Response = require('../models/Response');

const MAX_TEXT_ANSWERS = 100;

// Counts how many answers picked each possible value, keeping the question's order.
function countValues(possibleValues, values) {
  const counts = new Map(possibleValues.map((value) => [String(value), 0]));

  for (const value of values.flat()) {
    const key = String(value);

    // Options removed after a response was given are still counted.
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts].map(([label, count]) => ({ label, count }));
}

function buildQuestionResult(question, values) {
  const result = {
    _id: question._id,
    text: question.text,
    type: question.type,
    answered: values.length,
  };

  switch (question.type) {
    case 'multiple-choice':
    case 'dropdown':
    case 'checkboxes':
      result.counts = countValues(question.options, values);
      break;
    case 'yes-no':
      result.counts = countValues(['yes', 'no'], values).map((entry) => ({
        ...entry,
        label: entry.label === 'yes' ? 'Oui' : entry.label === 'no' ? 'Non' : entry.label,
      }));
      break;
    case 'rating':
      result.counts = countValues([1, 2, 3, 4, 5], values);
      result.average = values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
        : null;
      break;
    default:
      // Text answers: the most recent ones first.
      result.answers = values.slice(-MAX_TEXT_ANSWERS).reverse();
  }

  return result;
}

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

    await Response.deleteMany({ survey: survey._id });
    await survey.deleteOne();
    res.json({ message: 'Sondage supprimé.' });
  } catch (error) {
    handleError(error, res);
  }
};

exports.getSurveyResults = async (req, res) => {
  try {
    const survey = await findOwnedSurvey(req.params.id, req.user._id);

    if (!survey) {
      return res.status(404).json({ message: 'Sondage introuvable.' });
    }

    const responses = await Response.find({ survey: survey._id })
      .sort({ createdAt: 1 })
      .select('answers createdAt')
      .lean();

    const valuesByQuestion = new Map(
      survey.questions.map((question) => [question._id.toString(), []])
    );

    for (const response of responses) {
      for (const answer of response.answers) {
        valuesByQuestion.get(answer.questionId.toString())?.push(answer.value);
      }
    }

    res.json({
      survey: {
        _id: survey._id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        shareId: survey.shareId,
      },
      totalResponses: responses.length,
      lastResponseAt: responses.at(-1)?.createdAt ?? null,
      questions: survey.questions.map((question) =>
        buildQuestionResult(question, valuesByQuestion.get(question._id.toString()))
      ),
    });
  } catch (error) {
    handleError(error, res);
  }
};
