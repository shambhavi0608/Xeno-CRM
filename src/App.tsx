import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.js';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider.js';
import AppShell from './layouts/AppShell.js';
import LandingPage from './pages/LandingPage.js';
import DashboardPage from './pages/DashboardPage.js';
import CampaignsPage from './pages/CampaignsPage.js';
import CustomersPage from './pages/CustomersPage.js';
import CampaignBuilderPage from './pages/CampaignBuilderPage.js';
import AICopilot from './pages/AICopilot.js';
import AuthPage from './pages/AuthPage.js';

// Auto-Scroller helper that triggers on route transformations
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// Enterprise Router Security Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSeeding } = useAuth();

  if (loading || isSeeding) {
    return (
      <div className="bg-[#0b0606] min-h-screen text-white flex flex-col items-center justify-center font-sans space-y-4">
        <div className="w-6 h-6 rounded-full border-2 border-stone-850 border-t-[#FF4500] animate-spin" />
        <p className="text-[10px] text-[#7a6f6f] uppercase tracking-widest font-mono animate-pulse">
          {isSeeding ? 'Seeding VIP Cloud Collections...' : 'Aligning direct session token...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <FirebaseProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* LANDING ENTRANCE (PUBLIC) */}
            <Route path="/" element={<LandingPage />} />

            {/* AUTHENTICATION PORTAL */}
            <Route path="/auth" element={<AuthPage />} />

            {/* SECURED CAMPAIGNS & CRM PANELS */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <AppShell title="Dashboard">
                    <DashboardPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/copilot" 
              element={
                <ProtectedRoute>
                  <AppShell title="AI Copilot">
                    <AICopilot />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/campaigns" 
              element={
                <ProtectedRoute>
                  <AppShell title="Campaigns">
                    <CampaignsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/campaigns/new" 
              element={
                <ProtectedRoute>
                  <AppShell title="New Campaign">
                    <CampaignBuilderPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/customers" 
              element={
                <ProtectedRoute>
                  <AppShell title="Customers">
                    <CustomersPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            {/* FALLBACK REDIRECT ROUTE */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FirebaseProvider>
    </ToastProvider>
  );
}
