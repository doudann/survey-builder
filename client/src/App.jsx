import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateSurvey from './pages/CreateSurvey';
import PublicSurvey from './pages/PublicSurvey';
import SurveyResults from './pages/SurveyResults';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pages publiques */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/s/:shareId" element={<PublicSurvey />} />

        {/* Pages réservées aux utilisateurs connectés */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surveys/new"
          element={
            <ProtectedRoute>
              <CreateSurvey />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surveys/:id/results"
          element={
            <ProtectedRoute>
              <SurveyResults />
            </ProtectedRoute>
          }
        />

        {/* Toute adresse inconnue renvoie au tableau de bord */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}