import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch {
        localStorage.removeItem('token');
        setError('Session expirée. Reconnecte-toi.');
        navigate('/login', { replace: true });
      }
    }

    loadProfile();
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }

  if (error) {
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

      <p>Bienvenue sur Survey Builder.</p>
      <p>Tes sondages apparaîtront bientôt ici.</p>
    </main>
  );
}