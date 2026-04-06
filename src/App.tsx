import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, onSnapshot, onAuthStateChanged } from './firebase';
import Layout from './components/Layout';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import CreateInfluencer from './components/CreateInfluencer';
import InfluencerDetail from './components/InfluencerDetail';

import Auth from './components/Auth';
import Gallery from './components/Gallery';
import Settings from './components/Settings';
import AdminTemplateUpload from './components/AdminTemplateUpload';

function ProtectedRoute({ children, isLoggedIn }: { children: React.ReactNode; isLoggedIn: boolean }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
}

function AdminRoute({ children, isLoggedIn }: { children: React.ReactNode; isLoggedIn: boolean }) {
  const user = auth.currentUser;
  const isAdmin = user?.email === 'kyashwanth1133@gmail.com';

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', user.displayName || 'User');
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
      }
    });
    return () => unsubscribe();
  }, []);

  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route path="/signup" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <CreateInfluencer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/influencer/:id"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <InfluencerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gallery"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Gallery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute isLoggedIn={isLoggedIn}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/templates"
          element={
            <AdminRoute isLoggedIn={isLoggedIn}>
              <AdminTemplateUpload />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

