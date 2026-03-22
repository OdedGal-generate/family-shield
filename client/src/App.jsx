import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import GroupPage from './pages/GroupPage.jsx';
import GroupSettingsPage from './pages/GroupSettingsPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join/:token" element={<JoinPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/group/:id" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
        <Route path="/group/:id/settings" element={<ProtectedRoute><GroupSettingsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
