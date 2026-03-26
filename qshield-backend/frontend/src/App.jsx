import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Monitoring from './pages/Monitoring';
import Security from './pages/Security';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  const [scanData, setScanData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('scanData');
      if (saved) {
        setScanData(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load scanData from storage:', err);
    }
  }, []);

  const handleScan = async (domain) => {
    setIsLoading(true);
    setError(null);
    try {
      // Proxy setup in Vite, or complete URL if CORS is enabled
      const response = await fetch('http://localhost:8000/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      if (!response.ok) {
        throw new Error('Scan failed');
      }
      const data = await response.json();
      setScanData(data);
      try {
        localStorage.setItem('scanData', JSON.stringify(data));
      } catch (err) {
        console.error('Failed to persist scanData:', err);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout onScan={handleScan} />}>
              <Route index element={<Dashboard scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="assets" element={<Assets scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="monitoring" element={<Monitoring scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="security" element={<Security scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="analytics" element={<Analytics scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="reports" element={<Reports scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
