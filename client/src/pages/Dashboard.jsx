import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_LABELS = {
  draft: 'Brouillon',
  published: 'Publié',
  closed: 'Fermé',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [profileResponse, surveysResponse] = await Promise.all([
          api.get('/auth/me'),
          api.get('/surveys'),
        ]);

        setUser(profileResponse.data.user);
        setSurveys(surveysResponse.data.surveys);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login', { replace: true });
          return;
        }

        setError('Impossible de charger le tableau de bord.');
      }
    }

    loadDashboard();
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer ce sondage ?')) {
      return;
    }

    try {
      await api.delete(`/surveys/${id}`);
      setSurveys(surveys.filter((survey) => survey._id !== id));
    } catch {
      setError('Suppression impossible.');
    }
  }

  if (error && !user) {
    return <p className="error">{error}</p>;
  }

  if (!user) {
    return <p>Chargement...</p>;
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>Bonjour {user.name}</h1>
        <button type="button" onClick={handleLogout}>Se déconnecter</button>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="dashboard-header">
        <h2>Mes sondages</h2>
        <Link className="button-link" to="/surveys/new">Créer un sondage</Link>
      </div>

      {surveys.length === 0 ? (
        <p>Tu n'as pas encore de sondage.</p>
      ) : (
        surveys.map((survey) => (
          <article className="survey-card" key={survey._id}>
            <h3>{survey.title}</h3>
            <p>{survey.description || 'Sans description'}</p>
            <p>
              {STATUS_LABELS[survey.status]} · {survey.questions.length} question(s) ·{' '}
              {survey.category}
            </p>
            <button type="button" onClick={() => handleDelete(survey._id)}>
              Supprimer
            </button>
          </article>
        ))
      )}
    </main>
  );
}