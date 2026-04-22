import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import Login from './pages/Login';
import Home from './pages/Home';
import Category from './pages/Category';
import Search from './pages/Search';
import Player from './pages/Player';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Notes from './pages/Notes';
import History from './pages/History';
import Roadmaps from './pages/Roadmaps';
import RoadmapDetail from './pages/RoadmapDetail';
import CreatorStudio from './pages/CreatorStudio';
import Reminders from './pages/Reminders';
import Settings from './pages/Settings';
import Feedback from './pages/Feedback';
import About from './pages/About';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span>正在恢复登录状态...</span>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  const { loading } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (loading && !isLoginPage) {
    return (
      <div className="app">
        <div className="app-content">
          <div className="loading">
            <div className="loading-spinner"></div>
            <span>正在加载应用...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${isLoginPage ? 'app-auth' : ''}`}>
      {!isLoginPage && <NavBar />}
      <div className={`app-content ${isLoginPage ? 'app-content-auth' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/category" element={<Category />} />
          <Route path="/search" element={<Search />} />
          <Route path="/video/:id" element={<Player />} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/roadmaps" element={<Roadmaps />} />
          <Route path="/roadmaps/:id" element={<RoadmapDetail />} />
          <Route path="/creator" element={<ProtectedRoute><CreatorStudio /></ProtectedRoute>} />
          <Route path="/creator/:videoId" element={<ProtectedRoute><CreatorStudio /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
