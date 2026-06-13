import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  Plus, 
  PlayCircle, 
  Search, 
  Bell, 
  RefreshCw,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useToast } from '../components/ui/Toast.js';
import { resetDemoDb, createCampaign, launchCampaign } from '../lib/api.js';
import { useAuth } from '../components/FirebaseProvider.js';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error, info } = useToast();
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const { user, logout, isDemo } = useAuth();

  // High performance demo automation trigger
  const handleRunDemo = async () => {
    setIsRunningDemo(true);
    info('Triggering Local Demo Reset', 'Clearing logs and seeding new organic roastery campaigns...');
    
    try {
      // 1. Reset database to beautiful demo defaults
      await resetDemoDb();
      
      // 2. Insert and auto-launch a brand new AI-powered campaign
      const newCmp = await createCampaign({
        name: 'Organic Beans VIP Launch ☕',
        audiencePrompt: 'Segment of spent over ₹5000 in past 90 days',
        matchedCount: 12,
        message: 'Hey {name}! 🎉 Get flat 25% off on our limited-edition Single-Origin Geisha beans with code GEISHA25. Shop: links.xeno.com/geisha',
        channel: 'whatsapp'
      });

      // 3. Launch it to kick off asynchronous simulations
      await launchCampaign(newCmp.campaignId);

      success(
        'Organic Beans VIP Draft Launched!',
        'Queued sending process for 12 customers. Live analytics will reflect changes in 5s.'
      );
      
      // Redirect to dashboard to watch the graphs update
      navigate('/dashboard');
      
      // Force refreshing page state implicitly
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (err: any) {
      error('Demo Suite Failed', err.message || 'Error occurred while resetting demo data');
    } finally {
      setIsRunningDemo(false);
    }
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/copilot', label: 'AI Copilot', icon: <Sparkles className="w-4 h-4" /> },
    { to: '/campaigns', label: 'Campaigns', icon: <Megaphone className="w-4 h-4" /> },
    { to: '/customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-editorial min-h-screen text-white flex select-none relative">
      
      {/* Delicate Amber / Red Glows to match Editorial Aesthetic */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF4500 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-100px] left-[10%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />

      {/* ========================================================= */}
      {/* SIDEBAR (DESKTOP) */}
      {/* ========================================================= */}
      <aside className="hidden md:flex flex-col w-[240px] bg-[#120a0a]/80 backdrop-blur-xl border-r border-white/8 fixed inset-y-0 left-0 z-30">
        
        {/* LOGO AREA */}
        <div className="p-6 flex flex-col">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-all active:scale-98 select-none"
            title="Return to Welcome Page"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#FF69B4] to-[#FFD1DC]"></div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center select-none font-display">
              Mochi<span className="text-[#FF69B4] font-extrabold ml-0.5">CRM</span>
            </span>
            <span className="relative flex h-2.5 w-2.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF69B4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF69B4]"></span>
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#7a6f6f] uppercase tracking-wider mt-1.5 font-mono">
            AI-Native Mini CRM
          </span>
        </div>

        {/* NAVIGATION SECTOR */}
        <div className="mt-8 flex-1 px-3">
          <span className="text-[10px] font-bold text-[#5c4a4a] uppercase tracking-widest px-4 block mb-2">
            MAIN
          </span>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 py-2.5 px-4 text-sm font-medium rounded-lg transition-all ${
                    isActive 
                      ? 'text-white bg-[#FF4500]/10 border-l-2 border-[#FF4500]' 
                      : 'text-[#A0A0A0] hover:text-white hover:bg-white/4'
                  }`}
                >
                  <span className={`${isActive ? 'text-[#FF4500]' : 'text-[#606060]'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="my-6 border-t border-white/6 mx-2" />

          {/* ACTIONS SECTOR */}
          <span className="text-[10px] font-bold text-[#5c4a4a] uppercase tracking-widest px-4 block mb-2">
            ACTIONS
          </span>
          <NavLink
            to="/campaigns/new"
            className="flex items-center justify-center gap-2 py-2.5 px-3 mx-1 text-sm font-semibold rounded-lg bg-[#FF4500]/12 border border-[#FF4500]/20 text-[#FF4500] hover:bg-[#FF4500]/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </NavLink>
        </div>

        {/* USER PROFILE ROW (FOOTER) */}
        <div className="p-4 border-t border-white/6 bg-[#0a0505]/94 backdrop-blur-sm flex flex-col space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-stone-850 border border-[#FF4500]/15 flex items-center justify-center font-bold text-[10px] text-white">
                {user?.email ? user.email.slice(0, 2).toUpperCase() : 'AN'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-white">
                  {user?.displayName || (user?.email ? user.email.split('@')[0] : 'Anonymous User')}
                </p>
                <p className="text-[9px] text-[#7a6f6f] truncate font-mono">
                  {user?.email || 'anonymous-token'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={async () => {
                await logout();
                success('Logged Out', 'Successfully cleared secure cloud database sessions.');
                navigate('/');
              }}
              className="p-1.5 rounded bg-white/4 hover:bg-red-500/10 text-[#7a6f6f] hover:text-red-400 active:scale-95 transition-all cursor-pointer"
              title="Sign Out Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          {isDemo ? (
            <div className="flex items-center gap-1.5 px-2 bg-orange-950/20 border border-orange-500/20 rounded-md py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[9px] font-mono text-orange-400 uppercase tracking-wider font-bold">Local Demo Mode</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[10px] font-mono text-[#22C55E] uppercase tracking-wider">Cloud Firestore Active</span>
            </div>
          )}
        </div>

      </aside>

      {/* ========================================================= */}
      {/* TOPBAR (DESKTOP) & MAIN PAGE */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col md:pl-[240px]">
        
        <header className="h-16 bg-[#0a0505]/40 backdrop-blur-md border-b border-white/8 flex items-center justify-between px-6 md:px-8 sticky top-0 z-40">
          <h1 className="text-sm md:text-base font-semibold text-white uppercase tracking-wider font-mono">
            {title}
          </h1>

          <div className="flex items-center gap-4">
            {isDemo && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-orange-500/10 border border-orange-500/40 text-orange-400 font-sans tracking-wide shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>DEMO MODE</span>
              </div>
            )}

            {/* Search/Notification triggers (decorative placeholders) */}
            <button className="p-1.5 text-[#606060] hover:text-[#A0A0A0] transition-colors" aria-label="Search records">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-[#606060] hover:text-[#A0A0A0] transition-colors relative" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#FF4500] rounded-full" />
            </button>

            {/* Run Live Simulation Demo Button */}
            <button
              onClick={handleRunDemo}
              disabled={isRunningDemo}
              className="run-demo-button flex items-center gap-2.5 py-[10px] px-[20px] rounded-xl text-[14px] font-bold bg-gradient-to-r from-[#FF4500] via-[#FF5A1F] to-[#FF7000] hover:from-[#FF5A1F] hover:to-[#FF8C00] text-white disabled:opacity-50 transition-all select-none shadow-lg shadow-orange-600/25 hover:shadow-orange-500/40 active:scale-97 cursor-pointer hover:scale-[1.02] border border-orange-400/20 tracking-wide"
            >
              {isRunningDemo ? (
                <RefreshCw className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <PlayCircle className="w-[18px] h-[18px] text-white" />
              )}
              <span>{isRunningDemo ? 'Running...' : 'Execute Campaign'}</span>
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* VIEWPORT AREA */}
        {/* ========================================================= */}
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden min-h-[calc(100vh-56px)] pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto animate-[pageEnter_300ms_ease-out_forwards]">
            {children}
          </div>
        </main>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM NAVIGATION (MOBILE) */}
      {/* ========================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#120a0a]/90 backdrop-blur-lg border-t border-white/8 z-50 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 text-[10px] uppercase tracking-wide font-medium transition-colors ${
                isActive ? 'text-[#FF4500]' : 'text-[#606060]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <NavLink
          to="/campaigns/new"
          className="flex flex-col items-center justify-center bg-[#FF4500] h-10 w-10 rounded-full text-white active:scale-95 shadow-md"
        >
          <Plus className="w-5 h-5 text-white" />
        </NavLink>
      </nav>

    </div>
  );
}
