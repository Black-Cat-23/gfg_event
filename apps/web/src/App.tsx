import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Team } from './pages/Team';
import { Admin } from './pages/Admin';
import { useSocket } from './hooks/useSocket';

const SocketInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSocket(); // Global realtime socket listener active on all routes
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <SocketInitializer>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/team" element={<Team />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </SocketInitializer>
    </Router>
  );
};
