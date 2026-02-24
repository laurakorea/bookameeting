import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ResidentPage from './pages/ResidentPage';
import AdminPage from './pages/AdminPage';
import RegisterPage from './pages/RegisterPage';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<ResidentPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
