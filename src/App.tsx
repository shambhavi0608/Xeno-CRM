import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.js';
import AppShell from './layouts/AppShell.js';
import LandingPage from './pages/LandingPage.js';
import DashboardPage from './pages/DashboardPage.js';
import CampaignsPage from './pages/CampaignsPage.js';
import CustomersPage from './pages/CustomersPage.js';
import CampaignBuilderPage from './pages/CampaignBuilderPage.js';

// Auto-Scroller helper that triggers on route transformations
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* LANDING PAGE (NO SHELL AS SPECENS) */}
          <Route path="/" element={<LandingPage />} />

          {/* DASHBOARD PAGE */}
          <Route 
            path="/dashboard" 
            element={
              <AppShell title="Dashboard">
                <DashboardPage />
              </AppShell>
            } 
          />

          {/* CAMPAIGNS DIRECTORY */}
          <Route 
            path="/campaigns" 
            element={
              <AppShell title="Campaigns">
                <CampaignsPage />
              </AppShell>
            } 
          />

          {/* CAMPAIGN WIZARD PLANNER */}
          <Route 
            path="/campaigns/new" 
            element={
              <AppShell title="New Campaign">
                <CampaignBuilderPage />
              </AppShell>
            } 
          />

          {/* CUSTOMERS ROSTER */}
          <Route 
            path="/customers" 
            element={
              <AppShell title="Customers">
                <CustomersPage />
              </AppShell>
            } 
          />

          {/* FALLBACK REDIRECT ROUTE */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
