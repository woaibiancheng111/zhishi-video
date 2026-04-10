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
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

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
          <Route path="/favorites" element={isAuthenticated ? <Favorites /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
