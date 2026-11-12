import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_LABELS = {
  draft: 'Brouillon',
  published: 'Publié',
  closed: 'Fermé',
};

// Minuscules et sans accents : « Événement » est trouvé en tapant « evenement »
function normalize(text = '') {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const SORTERS = {
  recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, 'fr'),
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Liste des catégories existantes, sans doublons, triée dans l'ordre alphabétique français
  const categories = useMemo(
    () =>
      [...new Set(surveys.map((survey) => survey.category).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [surveys]
  );

  // Recalculé seulement quand la liste ou un filtre change
  const visibleSurveys = useMemo(() => {
    const query = normalize(search);

    return surveys
      .filter((survey) => statusFilter === 'all' || survey.status === statusFilter)
      .filter((survey) => categoryFilter === 'all' || survey.category === categoryFilter)
      .filter(
        (survey) =>
          !query ||
          normalize(survey.title).includes(query) ||
          normalize(survey.description).includes(query)
      )
      .sort(SORTERS[sortBy]);
  }, [surveys, search, statusFilter, categoryFilter, sortBy]);

  const hasFilters = search || statusFilter !== 'all' || categoryFilter !== 'all';

  function resetFilters() {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
  }

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

  async function handleCopyLink(survey) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${survey.shareId}`);
      setCopiedId(survey._id);
    } catch {
      setError('Copie impossible.');
    }
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

      {surveys.length > 0 && (
        <div className="filters">
          <input
            type="search"
            placeholder="Rechercher un sondage…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Rechercher un sondage"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filtrer par catégorie"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Trier"
          >
            <option value="recent">Plus récents</option>
            <option value="oldest">Plus anciens</option>
            <option value="title">Titre (A → Z)</option>
          </select>
          {hasFilters && (
            <button type="button" onClick={resetFilters}>Effacer les filtres</button>
          )}
        </div>
      )}

      {surveys.length > 0 && (
        <p className="result-meta">
          {visibleSurveys.length} sondage(s) sur {surveys.length}
        </p>
      )}

      {surveys.length === 0 ? (
        <p>Tu n'as pas encore de sondage.</p>
      ) : visibleSurveys.length === 0 ? (
        <p>Aucun sondage ne correspond à ta recherche.</p>
      ) : (
        visibleSurveys.map((survey) => (
          <article className="survey-card" key={survey._id}>
            <h3>{survey.title}</h3>
            <p>{survey.description || 'Sans description'}</p>
            <p>
              {STATUS_LABELS[survey.status]} · {survey.questions.length} question(s) ·{' '}
              {survey.category}
            </p>
            {survey.status !== 'draft' && (
              <Link className="button-link" to={`/surveys/${survey._id}/results`}>
                Voir les résultats
              </Link>
            )}
            {survey.status === 'published' && (
              <button type="button" onClick={() => handleCopyLink(survey)}>
                {copiedId === survey._id ? 'Lien copié !' : 'Copier le lien'}
              </button>
            )}
            <button type="button" onClick={() => handleDelete(survey._id)}>
              Supprimer
            </button>
          </article>
        ))
      )}
    </main>
  );
}