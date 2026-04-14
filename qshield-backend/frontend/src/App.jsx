import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetInventory from './pages/AssetInventory';
import Monitoring from './pages/Monitoring';
import Security from './pages/Security';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import VulnerabilityScan from './pages/VulnerabilityScan';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CBOM from './pages/CBOM';
import CyberRating from './pages/CyberRating';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  const [scanData, setScanData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [nucleiResults, setNucleiResults] = useState([]);
  const nucleiStorageKey = 'nucleiResults';

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(nucleiStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setNucleiResults(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(nucleiStorageKey, JSON.stringify(nucleiResults));
    } catch {
      // ignore storage errors
    }
  }, [nucleiResults]);

  const handleScan = async (domain, options = {}) => {
    setIsLoading(true);
    setIsScanning(true);
    setError(null);
    try {
      const use_crtsh = Boolean(options.use_crtsh);
      // Proxy setup in Vite, or complete URL if CORS is enabled
      const response = await fetch('http://localhost:8000/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, use_crtsh })
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
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    try {
      await fetch('/stop-scan', { method: 'POST' });
    } catch (err) {
      console.error('Failed to stop scan:', err);
    } finally {
      setIsScanning(false);
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
            <Route
              path="/"
              element={
                <Layout
                  onScan={handleScan}
                  onStopScan={stopScan}
                  isScanning={isScanning}
                  scanData={scanData}
                  nucleiResults={nucleiResults}
                />
              }
            >
              <Route index element={<Dashboard scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="assets" element={<Assets scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="asset-inventory" element={<AssetInventory scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="monitoring" element={<Monitoring scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="security" element={<Security scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="vulnerability-scan" element={<VulnerabilityScan scanData={scanData} isLoading={isLoading} error={error} setNucleiResults={setNucleiResults} />} />
              <Route path="threat-surface" element={<VulnerabilityScan scanData={scanData} isLoading={isLoading} error={error} setNucleiResults={setNucleiResults} defaultTab="threat-surface" />} />
              <Route path="analytics" element={<Analytics scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="reports" element={<Reports scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="cbom" element={<CBOM scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="cyber-rating" element={<CyberRating scanData={scanData} isLoading={isLoading} error={error} />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
