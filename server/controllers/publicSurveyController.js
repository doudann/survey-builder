const Response = require('../models/Response');
const Survey = require('../models/Survey');

const MAX_TEXT_LENGTH = 5000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// The form stores a calendar date, so a survey stays open until the end of that day.
function isExpired(survey) {
  if (!survey.expiresAt) {
    return false;
  }

  return Date.now() >= survey.expiresAt.getTime() + ONE_DAY_MS;
}

async function findOpenSurvey(shareId) {
  if (typeof shareId !== 'string') {
    return { status: 404, message: 'Sondage introuvable.' };
  }

  const survey = await Survey.findOne({ shareId, status: { $ne: 'draft' } });

  if (!survey) {
    return { status: 404, message: 'Sondage introuvable.' };
  }

  if (survey.status === 'closed' || isExpired(survey)) {
    return { status: 410, message: 'Ce sondage est fermé.' };
  }

  return { survey };
}

function isEmptyAnswer(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && !value.trim()) ||
    (Array.isArray(value) && value.length === 0)
  );
}

// Returns the cleaned value, or undefined when the answer does not fit the question.
function cleanAnswer(question, value) {
  switch (question.type) {
    case 'short-answer':
    case 'long-answer':
      return typeof value === 'string' && value.length <= MAX_TEXT_LENGTH
        ? value.trim()
        : undefined;
    case 'multiple-choice':
    case 'dropdown':
      return question.options.includes(value) ? value : undefined;
    case 'checkboxes': {
      const isValid =
        Array.isArray(value) &&
        new Set(value).size === value.length &&
        value.every((option) => question.options.includes(option));

      return isValid ? value : undefined;
    }
    case 'rating':
      return Number.isInteger(value) && value >= 1 && value <= 5 ? value : undefined;
    case 'yes-no':
      return value === 'yes' || value === 'no' ? value : undefined;
    default:
      return undefined;
  }
}

exports.getPublicSurvey = async (req, res) => {
  try {
    const { survey, status, message } = await findOpenSurvey(req.params.shareId);

    if (!survey) {
      return res.status(status).json({ message });
    }

    res.json({
      survey: {
        title: survey.title,
        description: survey.description,
        questions: survey.questions,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
};

exports.submitResponse = async (req, res) => {
  try {
    const { survey, status, message } = await findOpenSurvey(req.params.shareId);

    if (!survey) {
      return res.status(status).json({ message });
    }

    if (!Array.isArray(req.body?.answers)) {
      return res.status(400).json({ message: 'Réponses invalides.' });
    }

    const submitted = new Map(
      req.body.answers.map((answer) => [String(answer?.questionId), answer?.value])
    );
    const answers = [];

    for (const question of survey.questions) {
      const value = submitted.get(question._id.toString());

      if (isEmptyAnswer(value)) {
        if (question.required) {
          return res.status(400).json({
            message: `Réponse obligatoire : ${question.text}`,
            questionId: question._id,
          });
        }

        continue;
      }

      const cleanedValue = cleanAnswer(question, value);

      if (cleanedValue === undefined) {
        return res.status(400).json({
          message: `Réponse invalide : ${question.text}`,
          questionId: question._id,
        });
      }

      answers.push({ questionId: question._id, value: cleanedValue });
    }

    await Response.create({ survey: survey._id, answers });
    res.status(201).json({ message: 'Merci pour ta réponse.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
};
