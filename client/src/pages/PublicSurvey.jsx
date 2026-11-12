import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function QuestionField({ question, value, onChange }) {
  const name = `question-${question._id}`;

  switch (question.type) {
    case 'short-answer':
      return (
        <input
          aria-label={question.text}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          required={question.required}
        />
      );
    case 'long-answer':
      return (
        <textarea
          aria-label={question.text}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          required={question.required}
        />
      );
    case 'multiple-choice':
      return question.options.map((option) => (
        <label className="checkbox-row" key={option}>
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
            required={question.required}
          />
          {option}
        </label>
      ));
    case 'checkboxes':
      return question.options.map((option) => {
        const selected = value ?? [];

        return (
          <label className="checkbox-row" key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option)
                )
              }
            />
            {option}
          </label>
        );
      });
    case 'dropdown':
      return (
        <select
          aria-label={question.text}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          required={question.required}
        >
          <option value="">Choisir...</option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case 'rating':
      return (
        <div className="rating-row">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label className="checkbox-row" key={rating}>
              <input
                type="radio"
                name={name}
                checked={value === rating}
                onChange={() => onChange(rating)}
                required={question.required}
              />
              {rating}
            </label>
          ))}
        </div>
      );
    case 'yes-no':
      return (
        <div className="rating-row">
          {[
            { value: 'yes', label: 'Oui' },
            { value: 'no', label: 'Non' },
          ].map((choice) => (
            <label className="checkbox-row" key={choice.value}>
              <input
                type="radio"
                name={name}
                checked={value === choice.value}
                onChange={() => onChange(choice.value)}
                required={question.required}
              />
              {choice.label}
            </label>
          ))}
        </div>
      );
    default:
      return null;
  }
}

// UUID v4 aléatoire. crypto.randomUUID n'existe qu'en HTTPS ou sur localhost,
// d'où le repli sur crypto.getRandomValues (ex. test sur téléphone en http://192.168.x.x).
function randomId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Identifiant aléatoire propre à ce navigateur, gardé entre les visites
function getRespondentId() {
  try {
    let id = localStorage.getItem('respondentId');

    if (!id) {
      id = randomId();
      localStorage.setItem('respondentId', id);
    }

    return id;
  } catch {
    return randomId();
  }
}

function hasAnswered(shareId) {
  try {
    return localStorage.getItem(`answered:${shareId}`) === '1';
  } catch {
    return false;
  }
}

function markAnswered(shareId) {
  try {
    localStorage.setItem(`answered:${shareId}`, '1');
  } catch {
    // Stockage indisponible : le serveur bloquera quand même les doublons
  }
}

export default function PublicSurvey() {
  const { shareId } = useParams();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState(() => hasAnswered(shareId));

  useEffect(() => {
    async function loadSurvey() {
      try {
        const response = await api.get(`/public/surveys/${shareId}`);
        setSurvey(response.data.survey);
      } catch (err) {
        setError(err.response?.data?.message || 'Impossible de charger le sondage.');
      }
    }

    loadSurvey();
  }, [shareId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const missingCheckboxes = survey.questions.find(
      (question) =>
        question.type === 'checkboxes' &&
        question.required &&
        !answers[question._id]?.length
    );

    if (missingCheckboxes) {
      setError(`Réponse obligatoire : ${missingCheckboxes.text}`);
      return;
    }

    setSending(true);

    try {
      await api.post(`/public/surveys/${shareId}/responses`, {
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        })),
        respondentId: getRespondentId(),
      });
      markAnswered(shareId);
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 409) {
        markAnswered(shareId);
        setAlreadyAnswered(true);
        return;
      }

      setError(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <main className="dashboard">
        <h1>Merci !</h1>
        <p>Ta réponse a bien été enregistrée.</p>
      </main>
    );
  }

  if (alreadyAnswered) {
    return (
      <main className="dashboard">
        <h1>Déjà répondu</h1>
        <p>Tu as déjà répondu à ce sondage. Merci pour ta participation !</p>
      </main>
    );
  }

  if (!survey) {
    return (
      <main className="dashboard">
        {error ? <p className="error">{error}</p> : <p>Chargement...</p>}
      </main>
    );
  }

  return (
    <main className="dashboard">
      <h1>{survey.title}</h1>
      {survey.description && <p>{survey.description}</p>}

      <form className="survey-form" onSubmit={handleSubmit}>
        {survey.questions.map((question) => (
          <section className="question-card" key={question._id}>
            <p className="question-title">
              {question.text}
              {question.required && <span className="error"> *</span>}
            </p>
            <QuestionField
              question={question}
              value={answers[question._id]}
              onChange={(value) => setAnswers({ ...answers, [question._id]: value })}
            />
          </section>
        ))}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={sending}>
          {sending ? 'Envoi...' : 'Envoyer ma réponse'}
        </button>
      </form>
    </main>
  );
}
