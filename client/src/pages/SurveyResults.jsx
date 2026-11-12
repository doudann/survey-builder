import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import QuestionChart from '../components/QuestionChart';

const TYPE_LABELS = {
  'short-answer': 'Réponse courte',
  'long-answer': 'Réponse longue',
  'multiple-choice': 'Choix unique',
  checkboxes: 'Cases à cocher',
  dropdown: 'Liste déroulante',
  rating: 'Note sur 5',
  'yes-no': 'Oui / Non',
};

function percent(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

function CountBars({ counts, total }) {
  return (
    <ul className="result-bars">
      {counts.map(({ label, count }) => {
        const share = percent(count, total);

        return (
          <li key={label}>
            <div className="result-bar-label">
              <span>{label}</span>
              <span>
                {count} · {share} %
              </span>
            </div>
            <div className="result-bar-track">
              <div className="result-bar-fill" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function QuestionResult({ question }) {
  return (
    <article className="survey-card">
      <h3>{question.text}</h3>
      <p className="result-meta">
        {TYPE_LABELS[question.type]} · {question.answered} réponse(s)
      </p>

      {question.answered === 0 ? (
        <p className="result-meta">Aucune réponse pour l'instant.</p>
      ) : question.counts ? (
        <>
          {question.type === 'rating' && (
            <p className="result-average">Moyenne : {question.average} / 5</p>
          )}
          {/* For checkboxes, a respondent can tick several options, so shares are per respondent. */}
          <QuestionChart type={question.type} counts={question.counts} />
          <CountBars counts={question.counts} total={question.answered} />
        </>
      ) : (
        <ul className="text-answers">
          {question.answers.map((answer, index) => (
            <li key={index}>{answer}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function SurveyResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadResults() {
      try {
        const { data } = await api.get(`/surveys/${id}/results`);
        setResults(data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
          return;
        }

        setError(err.response?.data?.message || 'Impossible de charger les résultats.');
      }
    }

    loadResults();
  }, [id, navigate]);

  if (error) {
    return (
      <main className="dashboard">
        <Link to="/dashboard">← Retour au tableau de bord</Link>
        <p className="error">{error}</p>
      </main>
    );
  }

  if (!results) {
    return <p>Chargement...</p>;
  }

  const { survey, totalResponses, lastResponseAt, questions } = results;

  return (
    <main className="dashboard">
      <Link to="/dashboard">← Retour au tableau de bord</Link>

      <header className="results-header">
        <h1>{survey.title}</h1>
        {survey.description && <p>{survey.description}</p>}
      </header>

      <div className="results-summary">
        <div className="stat-tile">
          <span className="stat-value">{totalResponses}</span>
          <span className="stat-label">réponse(s)</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{questions.length}</span>
          <span className="stat-label">question(s)</span>
        </div>
        {lastResponseAt && (
          <div className="stat-tile">
            <span className="stat-value stat-value-small">
              {new Date(lastResponseAt).toLocaleDateString('fr-FR')}
            </span>
            <span className="stat-label">dernière réponse</span>
          </div>
        )}
      </div>

      {totalResponses === 0 ? (
        <p>
          Pas encore de réponse.
          {survey.status === 'published'
            ? ' Partage le lien du sondage pour en recevoir.'
            : ' Publie le sondage pour pouvoir le partager.'}
        </p>
      ) : (
        questions.map((question) => <QuestionResult key={question._id} question={question} />)
      )}
    </main>
  );
}
