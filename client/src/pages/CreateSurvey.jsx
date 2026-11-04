import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const QUESTION_TYPES = [
  { value: 'short-answer', label: 'Réponse courte' },
  { value: 'long-answer', label: 'Réponse longue' },
  { value: 'multiple-choice', label: 'Choix multiple' },
  { value: 'checkboxes', label: 'Cases à cocher' },
  { value: 'dropdown', label: 'Liste déroulante' },
  { value: 'rating', label: 'Note de 1 à 5' },
  { value: 'yes-no', label: 'Oui / Non' },
];

const CHOICE_TYPES = ['multiple-choice', 'checkboxes', 'dropdown'];

function createQuestion() {
  return { type: 'short-answer', text: '', required: false, options: ['', ''] };
}

export default function CreateSurvey() {
  const navigate = useNavigate();
  const [survey, setSurvey] = useState({
    title: '',
    description: '',
    category: '',
    expiresAt: '',
  });
  const [questions, setQuestions] = useState([createQuestion()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleSurveyChange(event) {
    setSurvey({ ...survey, [event.target.name]: event.target.value });
  }

  function updateQuestion(index, changes) {
    setQuestions(
      questions.map((question, position) =>
        position === index ? { ...question, ...changes } : question
      )
    );
  }

  function removeQuestion(index) {
    setQuestions(questions.filter((_, position) => position !== index));
  }

  function updateOption(questionIndex, optionIndex, value) {
    const options = [...questions[questionIndex].options];
    options[optionIndex] = value;
    updateQuestion(questionIndex, { options });
  }

  function addOption(questionIndex) {
    updateQuestion(questionIndex, {
      options: [...questions[questionIndex].options, ''],
    });
  }

  function removeOption(questionIndex, optionIndex) {
    updateQuestion(questionIndex, {
      options: questions[questionIndex].options.filter(
        (_, position) => position !== optionIndex
      ),
    });
  }

  async function saveSurvey(status) {
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...survey,
        expiresAt: survey.expiresAt || null,
        status,
        questions: questions.map((question) => ({
          ...question,
          options: CHOICE_TYPES.includes(question.type)
            ? question.options.map((option) => option.trim()).filter(Boolean)
            : [],
        })),
      };

      await api.post('/surveys', payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    saveSurvey('published');
  }

  return (
    <main className="dashboard">
      <Link to="/dashboard">← Retour au tableau de bord</Link>
      <h1>Créer un sondage</h1>

      {error && <p className="error">{error}</p>}

      <form className="survey-form" onSubmit={handleSubmit}>
        <label htmlFor="title">Titre</label>
        <input id="title" name="title" value={survey.title} onChange={handleSurveyChange} required />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={survey.description}
          onChange={handleSurveyChange}
        />

        <label htmlFor="category">Catégorie</label>
        <input id="category" name="category" value={survey.category} onChange={handleSurveyChange} />

        <label htmlFor="expiresAt">Date d'expiration</label>
        <input
          id="expiresAt"
          name="expiresAt"
          type="date"
          value={survey.expiresAt}
          onChange={handleSurveyChange}
        />

        <h2>Questions</h2>

        {questions.map((question, questionIndex) => (
          <section className="question-card" key={questionIndex}>
            <label htmlFor={`question-${questionIndex}`}>Question {questionIndex + 1}</label>
            <input
              id={`question-${questionIndex}`}
              value={question.text}
              onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
              required
            />

            <label htmlFor={`type-${questionIndex}`}>Type</label>
            <select
              id={`type-${questionIndex}`}
              value={question.type}
              onChange={(event) => updateQuestion(questionIndex, { type: event.target.value })}
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {CHOICE_TYPES.includes(question.type) && (
              <div className="options-list">
                {question.options.map((option, optionIndex) => (
                  <div className="option-row" key={optionIndex}>
                    <input
                      aria-label={`Option ${optionIndex + 1}`}
                      value={option}
                      onChange={(event) =>
                        updateOption(questionIndex, optionIndex, event.target.value)
                      }
                      required
                    />
                    {question.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(questionIndex, optionIndex)}>
                        Retirer
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" onClick={() => addOption(questionIndex)}>
                  Ajouter une option
                </button>
              </div>
            )}

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(event) =>
                  updateQuestion(questionIndex, { required: event.target.checked })
                }
              />
              Réponse obligatoire
            </label>

            {questions.length > 1 && (
              <button type="button" onClick={() => removeQuestion(questionIndex)}>
                Supprimer la question
              </button>
            )}
          </section>
        ))}

        <button type="button" onClick={() => setQuestions([...questions, createQuestion()])}>
          Ajouter une question
        </button>

        <div className="form-actions">
          <button type="button" disabled={saving} onClick={() => saveSurvey('draft')}>
            Enregistrer le brouillon
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Publier'}
          </button>
        </div>
      </form>
    </main>
  );
}