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
  Sparkles,
  Check,
  X,
  Clock,
  BellOff,
  SearchX,
  Pin,
  Sliders,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  Sun,
  Moon,
  Keyboard,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '../components/ui/Toast.js';
import { resetDemoDb, createCampaign, launchCampaign, fetchCustomers, fetchCampaigns } from '../lib/api.js';
import { Customer, Campaign } from '../types/index.js';
import { useAuth } from '../components/FirebaseProvider.js';
import { getComplianceLogs, addComplianceLog, ComplianceLog } from '../lib/compliance.js';

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

  // Campaign Execution States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Theme & Accessibility States
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('xeno_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('xeno_theme', newTheme);
    addComplianceLog('ACCESSIBILITY_THEME_TOGGLE', `User switched viewport contrast mode to: ${newTheme.toUpperCase()}`, 'system');
    if (newTheme === 'light') {
      document.documentElement.classList.add('theme-light');
      info('Accessibility active', 'Enabled high-contrast light mode for better legibility.');
    } else {
      document.documentElement.classList.remove('theme-light');
      info('Theme restored', 'Returned to original dark mode aesthetic.');
    }
  };

  // Keep theme synced on mount & change
  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  // Compliance Audit Logs Modal Panel
  const [showComplianceLog, setShowComplianceLog] = useState(false);
  const [complianceLogs, setComplianceLogs] = useState<ComplianceLog[]>([]);
  const [complianceSearch, setComplianceSearch] = useState('');
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'campaign' | 'security' | 'user' | 'system'>('all');
  const [auditNote, setAuditNote] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);

  // Load and refresh compliance logs
  const loadComplianceState = () => {
    setComplianceLogs(getComplianceLogs());
  };

  React.useEffect(() => {
    loadComplianceState();
  }, [showComplianceLog]);

  // Quick Actions Menu State
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionQuery, setQuickActionQuery] = useState('');

  const quickActionsList = [
    { id: 'dash', name: 'Go to Dashboard', description: 'Monitor live analytics, KPI cards, & reports', shortcut: 'D', action: () => { navigate('/dashboard'); setShowQuickActions(false); } },
    { id: 'copilot', name: 'Consult AI Copilot', description: 'Interact with the dynamic Gemini CRM coordinator', shortcut: 'A', action: () => { navigate('/copilot'); setShowQuickActions(false); } },
    { id: 'new_cmp', name: 'Create New Campaign', description: 'Define cohorts, design copy, & build outbound drafts', shortcut: 'C', action: () => { navigate('/campaigns/new'); setShowQuickActions(false); } },
    { id: 'cmp_list', name: 'Manage Campaigns', description: 'Audit all outbound campaigns & dispatches', shortcut: 'M', action: () => { navigate('/campaigns'); setShowQuickActions(false); } },
    { id: 'cust_list', name: 'Manage Customers', description: 'Browse buyer metrics, total spend, and health profiles', shortcut: 'U', action: () => { navigate('/customers'); setShowQuickActions(false); } },
    { id: 'toggle_mode', name: 'Toggle Contrast Mode', description: 'Switch between light & dark accessibility layouts', shortcut: 'L', action: () => { toggleTheme(); setShowQuickActions(false); } },
    { id: 'reset_data', name: 'Reset CRM Demo Data', description: 'Trigger simulation and seed roastery campaign metrics', shortcut: 'R', action: () => { setShowQuickActions(false); handleRunDemo(); } },
  ];

  // Search States
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCustomers, setSearchCustomers] = useState<Customer[]>([]);
  const [searchCampaigns, setSearchCampaigns] = useState<Campaign[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterAudience, setFilterAudience] = useState('all');

  // Notifications States
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'notif_copilot_pinned',
      title: '📌 Urgent AI Strategy Advisor',
      description: 'VIP Advocate segment engagement drop detected. Recommend launching Loyalty promo cascade.',
      time: 'Just now',
      unread: true,
      category: 'insight',
      pinned: true
    },
    {
      id: 'notif_1',
      title: '🎯 Campaign Dispatched',
      description: 'Organic Beans VIP Launch reached 12 customers successfully.',
      time: 'Just now',
      unread: true,
      category: 'campaign',
      pinned: false
    },
    {
      id: 'notif_2',
      title: '🛒 New Luxury Order',
      description: 'Ananya Sen purchased Single Origin Geisha for ₹2,450.',
      time: '5 mins ago',
      unread: true,
      category: 'order',
      pinned: false
    },
    {
      id: 'notif_3',
      title: '⚠️ Low inventory alert',
      description: 'Colombia Natural Microlot bag stock is under 15 bags.',
      time: '1 hour ago',
      unread: false,
      category: 'inventory',
      pinned: false
    },
    {
      id: 'notif_4',
      title: '⚡ Dynamic segment update',
      description: '3 new VIP profiles entered the "Potential Advocate" tier.',
      time: '3 hours ago',
      unread: false,
      category: 'segment',
      pinned: false
    }
  ]);

  const renderAlertItem = (notif: typeof notifications[0]) => {
    return (
      <div
        key={notif.id}
        onClick={() => {
          setNotifications(p => p.map(n => n.id === notif.id ? { ...n, unread: false } : n));
        }}
        className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer relative group/item select-none font-sans ${
          notif.unread 
            ? 'bg-[#FF4500]/5 border-[#FF4500]/15 hover:bg-[#FF4500]/10' 
            : 'bg-white/2 border-white/4 hover:bg-white/5'
        } ${notif.pinned ? 'border-amber-500/25 bg-amber-950/15' : ''}`}
      >
        {notif.unread && (
          <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-[#FF4500] rounded-full group-hover/item:hidden animate-pulse" />
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
          {/* Toggle Pin button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNotifications(p => p.map(n => n.id === notif.id ? { ...n, pinned: !n.pinned } : n));
              success(notif.pinned ? 'Alert Unpinned' : 'Alert Pinned', notif.pinned ? 'Removed priority anchor.' : 'Anchored alert to the top.');
            }}
            className="p-1 rounded hover:bg-white/8 transition-all text-stone-400 hover:text-white cursor-pointer"
            title={notif.pinned ? 'Unpin Alert' : 'Pin to Top'}
          >
            <Pin className={`w-3.5 h-3.5 ${notif.pinned ? 'text-amber-400 fill-amber-400 rotate-45' : ''}`} />
          </button>
          {/* Dismiss alert */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNotifications(p => p.filter(n => n.id !== notif.id));
              info('Alert Dismissed', 'Alert removed from list.');
            }}
            className="p-1 rounded text-[#7a6f6f] hover:text-white hover:bg-white/8 transition-all cursor-pointer"
            title="Dismiss Alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="font-semibold text-stone-105 pr-12 flex items-center gap-1.5">
          {notif.pinned && <Pin className="w-3 h-3 text-amber-400 rotate-45 shrink-0" />}
          <span className="truncate">{notif.title}</span>
        </div>
        <div className="text-[11px] text-[#7a6f6f] mt-1 line-clamp-2 pr-2">{notif.description}</div>
        <div className="text-[10px] text-stone-500 mt-1.5 font-mono flex items-center justify-between">
          <span className="flex items-center gap-1-5">
            <Clock className="w-3 h-3 text-[10px] text-stone-600" />
            {notif.time}
          </span>
          {notif.pinned && (
            <span className="text-[8px] text-amber-400 font-bold font-mono tracking-widest bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">
              Copilot Pinned
            </span>
          )}
        </div>
      </div>
    );
  };

  // Handle Search Input in real-time
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchCustomers([]);
      setSearchCampaigns([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const customersRes = await fetchCustomers(searchQuery);
        
        // Filter customers by advanced filter criteria
        let filteredCust = customersRes;
        
        // 1. Filter by Target Audience
        if (filterAudience === 'vip') {
          filteredCust = filteredCust.filter(c => c.totalSpent >= 5000 || c.orderCount >= 5 || c.tags?.some(t => t.toLowerCase().includes('vip')));
        } else if (filterAudience === 'advocates') {
          filteredCust = filteredCust.filter(c => c.orderCount >= 3 || c.tags?.some(t => t.toLowerCase().includes('advocate')));
        } else if (filterAudience === 'leads') {
          filteredCust = filteredCust.filter(c => c.orderCount <= 1 || c.totalSpent <= 2000);
        }

        // 2. Filter by Date Created / Member Since
        if (filterDate !== 'all') {
          const now = new Date('2026-06-14T05:15:25-07:00');
          filteredCust = filteredCust.filter(c => {
            const joinedDate = new Date(c.memberSince);
            const diffMs = Math.abs(now.getTime() - joinedDate.getTime());
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (filterDate === '24h') return diffDays <= 1;
            if (filterDate === '7d') return diffDays <= 7;
            if (filterDate === '90d') return diffDays <= 90;
            return true;
          });
        }

        setSearchCustomers(filteredCust.slice(0, 5));

        const campaignsRes = await fetchCampaigns();
        
        // Match query text
        let filteredCampaigns = campaignsRes.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.status.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // 1. Filter by Campaign Status
        if (filterStatus !== 'all') {
          filteredCampaigns = filteredCampaigns.filter(c => {
            const s = c.status.toLowerCase();
            if (filterStatus === 'draft') return s === 'draft';
            if (filterStatus === 'active') return s === 'active' || s === 'live';
            if (filterStatus === 'completed') return s === 'completed' || s === 'sent';
            if (filterStatus === 'paused') return s === 'paused';
            return true;
          });
        }

        // 2. Filter by Date Created
        if (filterDate !== 'all') {
          const now = new Date('2026-06-14T05:15:25-07:00');
          filteredCampaigns = filteredCampaigns.filter(c => {
            if (!c.createdAt) return false;
            const cDate = new Date(c.createdAt);
            const diffMs = Math.abs(now.getTime() - cDate.getTime());
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (filterDate === '24h') return diffDays <= 1;
            if (filterDate === '7d') return diffDays <= 7;
            if (filterDate === '90d') return diffDays <= 90;
            return true;
          });
        }

        // 3. Filter by Target Audience Segment Checklist
        if (filterAudience !== 'all') {
          filteredCampaigns = filteredCampaigns.filter(c => {
            const text = (c.name + ' ' + c.audiencePrompt).toLowerCase();
            if (filterAudience === 'vip') return text.includes('vip') || text.includes('advocate') || text.includes('5000') || text.includes('geisha') || text.includes('luxury');
            if (filterAudience === 'advocates') return text.includes('advocate') || text.includes('loyalty') || text.includes('regular');
            if (filterAudience === 'leads') return text.includes('lead') || text.includes('new') || text.includes('prospect') || text.includes('cold');
            return true;
          });
        }

        setSearchCampaigns(filteredCampaigns.slice(0, 5));
      } catch (err) {
        console.error('Error auto-searching:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, filterStatus, filterDate, filterAudience]);

  // Campaign execution simulation triggers with modal verification
  const confirmRunDemo = async () => {
    setShowConfirmModal(false);
    setIsRunningDemo(true);
    info('Triggering Local Demo Reset', 'Clearing logs and seeding new organic roastery campaigns...');
    
    try {
      // 1. Reset database to beautiful demo defaults
      await resetDemoDb();
      addComplianceLog('DATABASE_DEMO_RESEED', 'CRM sandbox databases purger active. Re-imaged 8 roastery accounts.', 'system');
      
      // 2. Insert and auto-launch a brand new AI-powered campaign
      const newCmp = await createCampaign({
        name: 'Organic Beans VIP Launch ☕',
        audiencePrompt: 'Segment of spent over ₹5000 in past 90 days',
        matchedCount: 12,
        message: 'Hey {name}! 🎉 Get flat 25% off on our limited-edition Single-Origin Geisha beans with code GEISHA25. Shop: links.xeno.com/geisha',
        channel: 'whatsapp'
      });
      addComplianceLog('CAMPAIGN_LAUNCHED', 'Dispatched "Organic Beans VIP Launch ☕" campaign to WhatsApp cohort (12 contacts).', 'campaign');

      // 3. Launch it to kick off asynchronous simulations
      await launchCampaign(newCmp.campaignId);

      // Append a fresh dispatched campaign alert and AI insights dynamically!
      setNotifications(prev => [
        {
          id: `notif_exe_${Date.now()}`,
          title: '🚀 VIP Campaign Executed',
          description: 'Organic Beans VIP Launch successfully dispatched to 12 targeted customers.',
          time: 'Just now',
          unread: true,
          category: 'campaign'
        },
        {
          id: `notif_exe_insight_${Date.now()}`,
          title: '✨ Post-Launch Campaign Insight',
          description: 'AI suggests running an A/B variation for single origin espresso over email inside 24h.',
          time: 'Just now',
          unread: true,
          category: 'insight'
        },
        ...prev
      ]);

      setShowSuccessCheck(true);

      success(
        'Organic Beans VIP Draft Launched!',
        'Queued sending process for 12 customers. Live analytics will reflect changes in 5s.'
      );
      
      // Redirect to dashboard to watch the graphs update
      navigate('/dashboard');
      
      // Keep check-mark transition animation active for 1.8 seconds before refreshing
      setTimeout(() => {
        window.location.reload();
      }, 1800);

    } catch (err: any) {
      error('Demo Suite Failed', err.message || 'Error occurred while resetting demo data');
      setIsRunningDemo(false);
    }
  };

  const handleRunDemo = () => {
    if (!isRunningDemo && !showSuccessCheck) {
      setShowConfirmModal(true);
    }
  };

  // Periodic Simulation of new AI campaign insights and alerts
  React.useEffect(() => {
    const timer1 = setTimeout(() => {
      setNotifications(prev => [
        {
          id: `notif_gen_1_${Date.now()}`,
          title: '✨ AI Campaign Insight',
          description: 'Copilot detected 12.4% higher response on WhatsApp templates featuring Single Origin beans.',
          time: 'Just now',
          unread: true,
          category: 'insight'
        },
        ...prev
      ]);
      success('AI Insight Generated', 'Copilot has compiled a new strategy card.');
    }, 15000); // 15 seconds after load

    const timer2 = setTimeout(() => {
      setNotifications(prev => [
        {
          id: `notif_gen_2_${Date.now()}`,
          title: '🎯 Audience Segment Optimization',
          description: '3 new VIP accounts tagged for VIP launch campaign.',
          time: 'Just now',
          unread: true,
          category: 'segment'
        },
        ...prev
      ]);
      success('Dynamic Segment Refined', 'AI matched 3 high-value accounts.');
    }, 45000); // 45 seconds after load

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifier && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
        setShowNotifications(false);
        setShowQuickActions(false);
      } else if (modifier && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setShowNotifications(prev => !prev);
        setShowSearchModal(false);
        setShowQuickActions(false);
      } else if (modifier && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setShowQuickActions(prev => !prev);
        setShowSearchModal(false);
        setShowNotifications(false);
      } else if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowQuickActions(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick Action Hotkeys when Spotlight Menu is active
  React.useEffect(() => {
    if (!showQuickActions) return;
    
    const handleQuickHotkey = (e: KeyboardEvent) => {
      const isTyping = document.activeElement?.tagName === 'INPUT';
      if (!isTyping) {
        const keyUpper = e.key.toUpperCase();
        const found = quickActionsList.find(item => item.shortcut === keyUpper);
        if (found) {
          e.preventDefault();
          found.action();
        }
      }
    };
    
    window.addEventListener('keydown', handleQuickHotkey);
    return () => window.removeEventListener('keydown', handleQuickHotkey);
  }, [showQuickActions, theme]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', tooltip: 'View metrics & overall CRM performance', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/copilot', label: 'AI Copilot', tooltip: 'Consult the Gemini-powered CRM coordinator', icon: <Sparkles className="w-4 h-4" /> },
    { to: '/campaigns', label: 'Campaigns', tooltip: 'Audit, edit, & dispatch campaign streams', icon: <Megaphone className="w-4 h-4" /> },
    { to: '/customers', label: 'Customers', tooltip: 'Explore customer profiles & segments', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className={`bg-editorial min-h-screen text-white flex select-none relative ${theme === 'light' ? 'theme-light' : ''}`}>
      
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
                <div key={item.to} className="relative group/nav">
                  <NavLink
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
                  {/* Tooltip bubble */}
                  <div className="absolute left-[92%] top-1/2 -translate-y-1/2 ml-3.5 px-2.5 py-1.5 bg-[#120a0a]/95 border border-white/10 text-stone-300 text-[11px] rounded-lg opacity-0 pointer-events-none group-hover/nav:opacity-100 transition-all z-50 font-sans shadow-xl shadow-black/8 w-48 transition-delay-150">
                    <div className="font-semibold text-white mb-0.5">{item.label}</div>
                    <div className="text-[10px] text-stone-500 leading-tight">{item.tooltip}</div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="my-6 border-t border-white/6 mx-2" />

          {/* ACTIONS SECTOR */}
          <span className="text-[10px] font-bold text-[#5c4a4a] uppercase tracking-widest px-4 block mb-2">
            ACTIONS
          </span>
          <div className="relative group/nav">
            <NavLink
              to="/campaigns/new"
              className="flex items-center justify-center gap-2 py-2.5 px-3 mx-1 text-sm font-semibold rounded-lg bg-[#FF4500]/12 border border-[#FF4500]/20 text-[#FF4500] hover:bg-[#FF4500]/20 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </NavLink>
            {/* Tooltip bubble */}
            <div className="absolute left-[92%] top-1/2 -translate-y-1/2 ml-3.5 px-2.5 py-1.5 bg-[#120a0a]/95 border border-white/10 text-stone-300 text-[11px] rounded-lg opacity-0 pointer-events-none group-hover/nav:opacity-100 transition-all z-50 font-sans shadow-xl shadow-black/8 w-48 transition-delay-150">
              <div className="font-semibold text-white mb-0.5">Build Campaign</div>
              <div className="text-[10px] text-stone-500 leading-tight">Design & execute a customized target marketing flow with raw text or AI prompts.</div>
            </div>
          </div>
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
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setShowComplianceLog(true)}
                className="p-1.5 rounded bg-white/4 hover:bg-emerald-500/10 text-[#7a6f6f] hover:text-emerald-400 active:scale-95 transition-all cursor-pointer"
                title="Compliance & System Audit Logs Ledger"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400 hover:text-emerald-400" />
              </button>
              
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

            {/* Search Trigger */}
            <div className="relative group/topbar">
              <button 
                onClick={() => setShowSearchModal(true)}
                className="p-1.5 text-[#606060] hover:text-[#A0A0A0] transition-colors rounded-lg hover:bg-white/5 cursor-pointer" 
                aria-label="Search records"
              >
                <Search className="w-4 h-4" />
              </button>
              {/* Tooltip */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#120a0a]/95 border border-white/10 text-stone-200 text-[10px] font-medium rounded-lg opacity-0 pointer-events-none group-hover/topbar:opacity-100 transition-all z-50 font-mono shadow-xl shadow-black/80 whitespace-nowrap">
                <span className="text-[#FF4500] font-bold">Deep Search</span> <span className="text-stone-500 mx-0.5 font-sans font-normal">(Ctrl+K)</span> - Find campaigns, customers, & metrics
              </div>
            </div>

            {/* Alarm/Notification popover */}
            <div className="relative group/topbar">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-1.5 hover:text-white transition-colors relative rounded-lg cursor-pointer ${showNotifications ? 'text-white bg-white/5' : 'text-[#606060]'}`}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => n.unread) && (
                  <>
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#FF4500] rounded-full animate-ping pointer-events-none" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#FF4500] rounded-full pointer-events-none animate-pulse" />
                  </>
                )}
              </button>
              {/* Tooltip */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#120a0a]/95 border border-white/10 text-stone-200 text-[10px] font-medium rounded-lg opacity-0 pointer-events-none group-hover/topbar:opacity-100 transition-all z-50 font-mono shadow-xl shadow-black/80 whitespace-nowrap">
                <span className="text-[#22C55E] font-bold">System Broadcasts</span> <span className="text-stone-500 mx-0.5 font-sans font-normal">(Ctrl+N)</span> - AI insights & alerts
              </div>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 bg-[#120a0a]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-[fadeIn_150ms_ease-out]">
                    <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">System Broadcasts</h4>
                        <p className="text-[10px] text-stone-500 font-sans mt-0.5">
                          {notifications.filter(n => n.unread).length} active alerts
                        </p>
                      </div>
                      {notifications.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setNotifications(p => p.map(n => ({ ...n, unread: false })));
                              success('Alerts updated', 'All system broadcasts marked as read.');
                            }}
                            className="text-[10px] text-orange-400 hover:text-orange-300 font-bold font-mono transition-colors cursor-pointer"
                          >
                            Read All
                          </button>
                          <span className="text-white/10 text-[10px] font-mono">|</span>
                          <button 
                            onClick={() => {
                              setNotifications([]);
                              success('Broadcasts cleared', 'All active alerts cleared.');
                            }}
                            className="text-[10px] text-[#7a6f6f] hover:text-white font-bold font-mono transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-8 px-4 font-sans animate-[fadeIn_150ms_ease-out]">
                          <div className="p-3 bg-white/4 border border-white/6 rounded-full mb-3 text-stone-500 relative">
                            <BellOff className="w-5 h-5 text-stone-600 animate-pulse" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-[#FF4500] rounded-full animate-ping" />
                          </div>
                          <h5 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">No Active Broadcasts</h5>
                          <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed max-w-[200px] mx-auto font-sans">
                            Your feed is fully synchronized. Ready to trigger a new outreach batch?
                          </p>
                          <div className="mt-4 flex flex-col gap-1.5 w-full">
                            <button
                              onClick={() => {
                                setShowNotifications(false);
                                handleRunDemo();
                              }}
                              className="w-full py-1.5 px-3 bg-[#FF4500]/12 border border-[#FF4500]/25 text-[#FF4500] hover:bg-[#FF4500]/20 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider cursor-pointer transition-all"
                            >
                              ⚡ Run Outreach Simulation
                            </button>
                            <button
                              onClick={() => {
                                setShowNotifications(false);
                                navigate('/copilot');
                              }}
                              className="w-full py-1.5 px-3 bg-white/3 hover:bg-white/6 text-stone-300 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-white/4"
                            >
                              Consult AI Copilot
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 font-sans text-xs">
                          {/* Pinned Section */}
                          {notifications.filter(n => n.pinned).length > 0 && (
                            <div className="space-y-1.5 pb-2 border-b border-white/6 animate-[fadeIn_150ms_ease-out]">
                              <div className="flex items-center justify-between px-1 mb-1">
                                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-1">
                                  <Pin className="w-3 h-3 text-amber-400 rotate-45 shrink-0 fill-amber-400 animate-pulse" />
                                  Pinned Urgent Alerts ({notifications.filter(n => n.pinned).length})
                                </span>
                                <button
                                  onClick={() => {
                                    setNotifications(p => p.map(n => n.pinned ? { ...n, unread: false } : n));
                                    success('Pinned read', 'All pinned alerts marked as read.');
                                  }}
                                  className="text-[9px] text-orange-400/80 hover:text-orange-300 font-mono font-semibold transition-colors cursor-pointer"
                                >
                                  Mark Read
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {notifications.filter(n => n.pinned).map(renderAlertItem)}
                              </div>
                            </div>
                          )}

                          {/* AI Copilot Insights Section */}
                          {notifications.filter(n => !n.pinned && n.category === 'insight').length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between px-1 mb-1">
                                <span className="text-[9px] font-bold text-[#FF69B4] uppercase tracking-widest font-mono flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-[#FF69B4] shrink-0 animate-[spin_4s_linear_infinite]" />
                                  AI Copilot ({notifications.filter(n => !n.pinned && n.category === 'insight').length})
                                </span>
                                <button
                                  onClick={() => {
                                    setNotifications(p => p.map(n => (!n.pinned && n.category === 'insight') ? { ...n, unread: false } : n));
                                    success('Insights read', 'All Copilot insights marked as read.');
                                  }}
                                  className="text-[9px] text-[#FF69B4]/80 hover:text-[#FF69B4] font-mono font-semibold transition-colors cursor-pointer"
                                >
                                  Mark Read
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {notifications.filter(n => !n.pinned && n.category === 'insight').map(renderAlertItem)}
                              </div>
                            </div>
                          )}

                          {/* Campaign Broadcasts Section */}
                          {notifications.filter(n => !n.pinned && n.category === 'campaign').length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between px-1 mb-1">
                                <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                                  <Megaphone className="w-3 h-3 text-sky-400 shrink-0" />
                                  Campaigns ({notifications.filter(n => !n.pinned && n.category === 'campaign').length})
                                </span>
                                <button
                                  onClick={() => {
                                    setNotifications(p => p.map(n => (!n.pinned && n.category === 'campaign') ? { ...n, unread: false } : n));
                                    success('Campaigns read', 'All campaign alerts marked as read.');
                                  }}
                                  className="text-[9px] text-sky-400/80 hover:text-sky-300 font-mono font-semibold transition-colors cursor-pointer"
                                >
                                  Mark Read
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {notifications.filter(n => !n.pinned && n.category === 'campaign').map(renderAlertItem)}
                              </div>
                            </div>
                          )}

                          {/* System Alerts Section */}
                          {notifications.filter(n => !n.pinned && n.category !== 'insight' && n.category !== 'campaign').length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between px-1 mb-1">
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                                  <Bell className="w-3 h-3 text-stone-400 shrink-0" />
                                  System ({notifications.filter(n => !n.pinned && n.category !== 'insight' && n.category !== 'campaign').length})
                                </span>
                                <button
                                  onClick={() => {
                                    setNotifications(p => p.map(n => (!n.pinned && n.category !== 'insight' && n.category !== 'campaign') ? { ...n, unread: false } : n));
                                    success('System alerts read', 'All system broadcasts marked as read.');
                                  }}
                                  className="text-[9px] text-stone-400/80 hover:text-stone-300 font-mono font-semibold transition-colors cursor-pointer"
                                >
                                  Mark Read
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {notifications.filter(n => !n.pinned && n.category !== 'insight' && n.category !== 'campaign').map(renderAlertItem)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dynamic Theme Contrast Toggle */}
            <div className="relative group/topbar">
              <button 
                onClick={toggleTheme}
                className="p-1.5 text-[#606060] hover:text-[#A0A0A0] transition-colors rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-center" 
                aria-label="Toggle layout contrast"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               </button>
               {/* Tooltip */}
               <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#120a0a]/95 border border-white/10 text-stone-200 text-[10px] font-medium rounded-lg opacity-0 pointer-events-none group-hover/topbar:opacity-100 transition-all z-50 font-mono shadow-xl shadow-black/80 whitespace-nowrap">
                 <span className="text-amber-500 font-bold">Contrast Mode</span> - Switch to {theme === 'dark' ? 'Light Accent' : 'Default Dark'} Theme
               </div>
            </div>

            {/* Spotlight Command Center Trigger */}
            <div className="relative group/topbar">
              <button 
                onClick={() => {
                  setQuickActionQuery('');
                  setShowQuickActions(true);
                }}
                className={`p-1.5 transition-colors rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-center ${showQuickActions ? 'text-white bg-white/5' : 'text-[#606060] hover:text-white'}`}
                aria-label="Command bar"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              {/* Tooltip */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#120a0a]/95 border border-white/10 text-stone-200 text-[10px] font-medium rounded-lg opacity-0 pointer-events-none group-hover/topbar:opacity-100 transition-all z-50 font-mono shadow-xl shadow-black/80 whitespace-nowrap">
                <span className="text-[#FF4500] font-bold">Quick Actions</span> <span className="text-stone-500 mx-0.5 font-sans font-normal">(Ctrl+J)</span> - Instant page navigator & hooks
              </div>
            </div>

            {/* Run Live Simulation Demo Button with satisfy-checkmark and spinners */}
            <div className="relative group/topbar">
              <button
                onClick={handleRunDemo}
                disabled={isRunningDemo || showSuccessCheck}
                className={`run-demo-button flex items-center gap-2.5 py-[10px] px-[20px] rounded-xl text-[14px] font-bold transition-all select-none shadow-lg tracking-wide border cursor-pointer hover:scale-[1.02] active:scale-97 ${
                  showSuccessCheck 
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-green-600/25 border-emerald-500/25'
                    : 'bg-gradient-to-r from-[#FF4500] via-[#FF5A1F] to-[#FF7000] hover:from-[#FF5A1F] hover:to-[#FF8C00] text-white shadow-orange-600/25 border-orange-400/20'
                }`}
              >
                {isRunningDemo ? (
                  <RefreshCw className="w-[18px] h-[18px] animate-spin text-white" />
                ) : showSuccessCheck ? (
                  <Check className="w-[18px] h-[18px] text-white animate-bounce" />
                ) : (
                  <PlayCircle className="w-[18px] h-[18px] text-white" />
                )}
                <span>
                  {isRunningDemo 
                    ? 'Running...' 
                    : showSuccessCheck 
                    ? 'Campaign Executed!' 
                    : 'Execute Campaign'}
                </span>
              </button>
              {/* Tooltip */}
              <div className="absolute top-12 left-1/2 -track-x-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-[#120a0a]/95 border border-white/10 text-stone-200 text-[10px] font-medium rounded-lg opacity-0 pointer-events-none group-hover/topbar:opacity-100 transition-all z-50 font-mono shadow-xl shadow-black/80 whitespace-nowrap">
                <span className="text-orange-400 font-bold font-mono text-[9px] uppercase tracking-wider block mb-0.5">Quick Automation</span>
                Simulate database reset & campaign dispatch
              </div>
            </div>
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

      {/* ========================================================= */}
      {/* CAMPAIGN EXECUTION CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050303]/85 backdrop-blur-md animate-[fadeIn_150ms_ease-out]">
          <div className="bg-[#120a0a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-[scaleUp_200ms_ease-out]">
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-[#7a6f6f] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF4500]">
                <PlayCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Confirm Launch Simulation</h3>
                <p className="text-[10px] text-[#7a6f6f] font-mono uppercase tracking-wider">Campaign Orchestration</p>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed mb-5">
              Are you sure you want to trigger the simulation and execute this campaign? This will seed the database with dynamic messaging statistics.
            </p>

            <div className="p-4 rounded-xl bg-white/4 border border-white/6 space-y-3.5 mb-6 text-xs font-sans">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/6">
                <span className="text-[#7a6f6f]">Target Size</span>
                <span className="font-semibold text-[#FF4500] font-mono text-[13px] bg-orange-950/25 px-2 py-0.5 rounded border border-orange-500/15">
                  12 Customers
                </span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-white/6">
                <span className="text-[#7a6f6f]">Target Criteria</span>
                <span className="font-semibold text-stone-200">Spend &gt; ₹5,000 / 90 days</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-white/6">
                <span className="text-[#7a6f6f]">Outbound Channel</span>
                <span className="font-semibold text-stone-200 uppercase font-mono tracking-wider">WhatsApp</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#7a6f6f]">Dispatch Delay</span>
                <span className="font-semibold text-stone-200">Asynchronous (5s offset)</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end text-xs">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 font-semibold rounded-lg border border-white/8 text-stone-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmRunDemo}
                className="px-5 py-2 font-bold rounded-lg bg-gradient-to-r from-[#FF4500] via-[#FF5A1F] to-[#FF7000] text-white hover:from-[#FF5A1F] hover:to-[#FF8C00] active:scale-97 select-none shadow-lg shadow-orange-600/15 border border-orange-400/10 cursor-pointer"
              >
                Confirm & Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SEARCH OVERLAY MODAL */}
      {/* ========================================================= */}
      {showSearchModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-[#050303]/85 backdrop-blur-md animate-[fadeIn_150ms_ease-out] pt-[12vh]">
          <div className="bg-[#120a0a] border border-white/10 rounded-2xl max-w-xl w-full p-5 shadow-2xl relative animate-[scaleUp_200ms_ease-out] overflow-hidden">
            <button 
              onClick={() => setShowSearchModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/5 text-[#7a6f6f] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xs font-bold text-white tracking-widest font-mono uppercase mb-4 text-[#FF4500]">
              CRM Deep Search
            </h3>

            {/* Input Box */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, email, or campaigns..."
                autoFocus
                className="w-full bg-white/4 border border-white/10 rounded-xl py-3 pl-11 pr-5 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#FF4500]/50 focus:ring-1 focus:ring-[#FF4500]/20 transition-all font-sans"
              />
              <Search className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
              {isSearching && (
                <RefreshCw className="w-4 h-4 text-[#FF4500] absolute right-12 top-1/2 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {/* Advanced Filters Accordion */}
            <div className="mb-4 bg-white/2 border border-white/5 rounded-xl p-3 font-sans select-none">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center justify-between w-full text-xs font-semibold text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#FF4500]" />
                  <span>Advanced Search Filters</span>
                  {(filterStatus !== 'all' || filterDate !== 'all' || filterAudience !== 'all') && (
                    <span className="bg-[#FF4500]/15 border border-[#FF4500]/30 text-[#FF4500] text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full">
                      {[filterStatus !== 'all', filterDate !== 'all', filterAudience !== 'all'].filter(Boolean).length} Active
                    </span>
                  )}
                </div>
                {showAdvancedFilters ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
              </button>

              {showAdvancedFilters && (
                <div className="mt-3 pt-3 border-t border-white/6 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-[fadeIn_150ms_ease-out]">
                  {/* Campaign Status */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider font-mono">Campaign Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-[#120a0a] border border-white/10 rounded-lg p-2 text-xs text-stone-300 focus:outline-none focus:border-[#FF4500]/30 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="draft">Drafts</option>
                      <option value="active">Active / Live</option>
                      <option value="completed">Completed / Sent</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider font-mono">Target Audience</label>
                    <select
                      value={filterAudience}
                      onChange={(e) => setFilterAudience(e.target.value)}
                      className="w-full bg-[#120a0a] border border-white/10 rounded-lg p-2 text-xs text-stone-300 focus:outline-none focus:border-[#FF4500]/30 cursor-pointer"
                    >
                      <option value="all">All Audiences</option>
                      <option value="vip">VIPs (Spent &gt; ₹5k)</option>
                      <option value="advocates">Brand Advocates</option>
                      <option value="leads">New Leads / Prospects</option>
                    </select>
                  </div>

                  {/* Date Created */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider font-mono">Joined / Created</label>
                    <select
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full bg-[#120a0a] border border-white/10 rounded-lg p-2 text-xs text-stone-300 focus:outline-none focus:border-[#FF4500]/30 cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="90d">Last 90 Days</option>
                    </select>
                  </div>

                  {/* Reset Filters button */}
                  {(filterStatus !== 'all' || filterDate !== 'all' || filterAudience !== 'all') && (
                    <div className="sm:col-span-3 flex justify-end">
                      <button
                        onClick={() => {
                          setFilterStatus('all');
                          setFilterDate('all');
                          setFilterAudience('all');
                          info('Search filters reset', 'Showing complete matching database models.');
                        }}
                        className="text-[10px] font-semibold text-[#FF4500] hover:text-[#FF7000] cursor-pointer transition-colors"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel Results */}
            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-5">
              {!searchQuery.trim() ? (
                <div className="space-y-4 py-2">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-[#5c4a4a] font-bold">Suggested searches</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {['Ananya', 'Organic', 'Geisha Beans', 'Delhi', 'VIP', 'Draft'].map((term) => (
                      <button 
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        className="py-1 px-3 bg-white/4 hover:bg-white/8 border border-white/6 text-stone-300 hover:text-white rounded-full transition-all cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-500 font-mono mt-4">
                    Deep search performs live queries to seek matching database models dynamically.
                  </p>
                </div>
              ) : (
                <>
                  {(() => {
                    const analyticsReports = [
                      { name: 'Average Delivery Rate', description: 'Real-time outbound transmission ratios kept between 92% and 99%', path: '/dashboard#dashboard_kpi_row' },
                      { name: 'Customer Lifetime Value (CLV)', description: 'Historical revenue segments & high-value customer ratios', path: '/dashboard#dashboard_ai_insights_panel' },
                      { name: 'Conversion Funnel Visualizer', description: 'Interactive conversion funnel tracking outbound WhatsApp metrics', path: '/dashboard#daily_insights_grid' },
                      { name: 'System Activity Logs', description: 'Audit trail detailing campaign resets & live customer signals', path: '/dashboard#recent_activity_section' }
                    ];
                    const filteredReports = analyticsReports.filter(r => 
                      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.description.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    const hasCustomers = searchCustomers.length > 0;
                    const hasCampaigns = searchCampaigns.length > 0;
                    const hasReports = filteredReports.length > 0;

                    if (!hasCustomers && !hasCampaigns && !hasReports && !isSearching) {
                      return (
                        <div className="flex flex-col items-center justify-center text-center py-10 px-6 bg-white/2 border border-white/5 rounded-2xl animate-[fadeIn_200ms_ease-out] font-sans">
                          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mb-4 animate-[pulse_2s_infinite]">
                            <SearchX className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-white tracking-tight font-sans">No Matching CRM Records</h4>
                          <p className="text-xs text-stone-400 mt-2 max-w-sm leading-relaxed font-sans">
                            No customers, campaigns, or analytics reports found matching <span className="text-orange-400 font-mono font-semibold bg-orange-950/30 border border-orange-500/15 px-1.5 py-0.5 rounded">"{searchQuery}"</span>. Try adjusting your query or launching a CRM simulation.
                          </p>
                          <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full justify-center">
                            <button
                              onClick={() => setSearchQuery('')}
                              className="px-4 py-2 text-xs font-semibold rounded-lg border border-white/10 text-stone-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                            >
                              Clear Search
                            </button>
                            <button
                              onClick={() => {
                                setShowSearchModal(false);
                                navigate('/campaigns/new');
                              }}
                              className="px-4 py-2 text-xs font-bold rounded-lg bg-white/4 border border-white/8 hover:bg-white/8 text-white transition-all cursor-pointer"
                            >
                              Create New Campaign
                            </button>
                            <button
                              onClick={() => {
                                setShowSearchModal(false);
                                handleRunDemo();
                              }}
                              className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#FF4500] to-[#FF7000] text-white hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-orange-600/15 border border-orange-400/10"
                            >
                              ⚡ Reset CRM Demo Data
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Customer list results */}
                        {hasCustomers && (
                          <div className="space-y-2">
                            <h4 className="text-[10px] uppercase tracking-wider font-mono text-[#5c4a4a] font-bold flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#FF4500]/80" />
                              Customers ({searchCustomers.length})
                            </h4>
                            <div className="space-y-1.5">
                              {searchCustomers.map((cust) => (
                                <div
                                  key={cust.id}
                                  onClick={() => {
                                    setShowSearchModal(false);
                                    navigate(`/customers?search=${encodeURIComponent(cust.name)}`);
                                  }}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/5 hover:border-[#FF4500]/20 hover:bg-[#FF4500]/5 transition-all text-xs cursor-pointer group"
                                >
                                  <div>
                                    <div className="font-semibold text-white group-hover:text-[#FF4500] transition-colors font-sans">
                                      {cust.name}
                                    </div>
                                    <div className="text-[11px] text-[#7a6f6f] mt-0.5">{cust.email}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-mono text-stone-300 font-semibold font-mono">₹{cust.totalSpent.toLocaleString()}</div>
                                    <div className="text-[10px] text-stone-500">{cust.orderCount} orders</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Campaign list results */}
                        {hasCampaigns && (
                          <div className="space-y-2 pt-2">
                            <h4 className="text-[10px] uppercase tracking-wider font-mono text-[#5c4a4a] font-bold flex items-center gap-1.5">
                              <Megaphone className="w-3.5 h-3.5 text-[#FF4500]/80" />
                              Campaigns ({searchCampaigns.length})
                            </h4>
                            <div className="space-y-1.5">
                              {searchCampaigns.map((cmp) => (
                                <div
                                  key={cmp.campaignId}
                                  onClick={() => {
                                    setShowSearchModal(false);
                                    navigate('/campaigns');
                                  }}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/5 hover:border-[#FF4500]/20 hover:bg-[#FF4500]/5 transition-all text-xs cursor-pointer group"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-white group-hover:text-[#FF4500] transition-colors truncate font-sans">
                                      {cmp.name}
                                    </div>
                                    <div className="text-[11px] text-[#7a6f6f] mt-0.5 capitalize flex items-center gap-1.5 truncate">
                                      <span className="px-1 border border-white/8 rounded bg-white/2 text-[9px] font-mono">{cmp.channel}</span>
                                      <span className="truncate">Audience: {cmp.audiencePrompt}</span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-semibold ${
                                      cmp.status === 'live' ? 'bg-green-500/15 text-green-400 border border-green-500/10' :
                                      cmp.status === 'sent' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/10' :
                                      cmp.status === 'draft' ? 'bg-white/5 text-stone-400 border border-white/5' : 'bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/10'
                                    }`}>
                                      {cmp.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Analytics & Reports results */}
                        {hasReports && (
                          <div className="space-y-2 pt-2">
                            <h4 className="text-[10px] uppercase tracking-wider font-mono text-[#5c4a4a] font-bold flex items-center gap-1.5">
                              <LayoutDashboard className="w-3.5 h-3.5 text-[#FF4500]/80" />
                              Analytics & Reports ({filteredReports.length})
                            </h4>
                            <div className="space-y-1.5">
                              {filteredReports.map((report) => (
                                <div
                                  key={report.name}
                                  onClick={() => {
                                    setShowSearchModal(false);
                                    navigate(report.path);
                                    const hash = report.path.split('#')[1];
                                    if (hash) {
                                      setTimeout(() => {
                                        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
                                      }, 150);
                                    }
                                  }}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/5 hover:border-[#FF4500]/20 hover:bg-[#FF4500]/5 transition-all text-xs cursor-pointer group"
                                >
                                  <div className="min-w-0 flex-1 font-sans">
                                    <div className="font-semibold text-white group-hover:text-[#FF4500] transition-colors truncate">
                                      {report.name}
                                    </div>
                                    <div className="text-[11px] text-[#7a6f6f] mt-0.5 truncate">
                                      {report.description}
                                    </div>
                                  </div>
                                  <div className="text-right ml-4 font-mono text-[9px] text-[#FF4500] uppercase tracking-wider bg-[#FF4500]/10 border border-[#FF4500]/20 px-1.5 py-0.5 rounded">
                                    Report
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* QUICK ACTIONS COMMAND OVERLAY */}
      {/* ========================================================= */}
      {showQuickActions && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-[#050303]/85 backdrop-blur-md animate-[fadeIn_150ms_ease-out] pt-[15vh]">
          <div className="bg-[#120a0a] border border-white/10 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative animate-[scaleUp_200ms_ease-out] overflow-hidden">
            <button 
              onClick={() => setShowQuickActions(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/5 text-[#7a6f6f] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] bg-[#FF4500]/10 border border-[#FF4500]/25 text-[#FF4500] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">Spotlight Control</span>
              <h3 className="text-xs font-bold text-white tracking-widest font-mono uppercase">
                Quick Action Command Bar
              </h3>
            </div>

            {/* Input Box */}
            <div className="relative mb-3">
              <input
                type="text"
                value={quickActionQuery}
                onChange={(e) => setQuickActionQuery(e.target.value)}
                placeholder="Type a command or use instant letter keys..."
                autoFocus
                className="w-full bg-white/4 border border-white/10 rounded-xl py-2.5 pl-11 pr-5 text-sm text-white placeholder-stone-550 focus:outline-none focus:border-[#FF4500]/50 focus:ring-1 focus:ring-[#FF4500]/20 transition-all font-sans"
              />
              <Search className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* Hint bar */}
            <div className="px-3 py-1.5 rounded-lg bg-orange-950/10 border border-orange-500/10 text-[9px] text-[#FF4500] font-mono flex items-center justify-between mb-4 select-none">
              <span>⌨️ Press hotkeys (e.g. D, A, L, R) when NOT typing to run instantly</span>
              <span className="text-stone-500 font-bold uppercase text-[8px]">Enabled</span>
            </div>

            {/* List and filter actions */}
            <div className="max-h-[280px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
              {(() => {
                const results = quickActionsList.filter(act => 
                  act.name.toLowerCase().includes(quickActionQuery.toLowerCase()) || 
                  act.description.toLowerCase().includes(quickActionQuery.toLowerCase())
                );

                if (results.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-stone-500 font-mono">
                      No matching quick commands found.
                    </div>
                  );
                }

                return results.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => act.action()}
                    className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/4 hover:border-[#FF4500]/30 hover:bg-[#FF4500]/5 transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="font-semibold text-stone-200 group-hover:text-white transition-colors text-xs leading-none font-sans">
                        {act.name}
                      </div>
                      <div className="text-[10px] text-stone-500 group-hover:text-[#FF4500] transition-colors mt-1.5 font-sans leading-relaxed">
                        {act.description}
                      </div>
                    </div>
                    {/* Shortcut indicator bubble */}
                    <div className="h-6 w-6 rounded border border-orange-500/15 bg-orange-950/20 text-[#FF4500] font-mono text-[10px] font-extrabold flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-all">
                      {act.shortcut}
                    </div>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* COMPLIANCE & REVOLVING SYSTEM AUDIT LEDGER */}
      {/* ========================================================= */}
      {showComplianceLog && (
        <div className="fixed inset-0 bg-[#020101]/85 backdrop-blur-lg z-999 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0b0505] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col relative animate-slide-up">
            
            {/* Close Button */}
            <button
              onClick={() => setShowComplianceLog(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-stone-400 hover:text-white transition-colors cursor-pointer z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Content */}
            <div className="p-6 pb-4 border-b border-white/5 bg-[#0e0707]/90">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans tracking-tight">Compliance & Auditing ledger</h3>
                    <p className="text-stone-400 text-xs font-sans mt-0.5">Auditing active state dispatches, security toggles, and campaign broadcasts for compliance.</p>
                  </div>
                </div>
                
                {/* Export Report CSV Trigger */}
                <button
                  onClick={() => {
                    const headers = 'ID,Date,Category,Action,Actor,IP,Detail\n';
                    const rows = complianceLogs.map(l => 
                      `"${l.id}","${l.date}","${l.category}","${l.action}","${l.actor}","${l.ip}","${l.detail.replace(/"/g, '""')}"`
                    ).join('\n');
                    const blob = new Blob([headers + rows], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('href', url);
                    a.setAttribute('download', `xeno_crm_compliance_ledger_${Date.now()}.csv`);
                    a.click();
                    success('Audit Report Exported', 'Downloaded complete compliance verification trail CSV file.');
                  }}
                  className="px-4 py-2 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold rounded-xl self-start md:self-center transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  Download Complete CSV
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* METADATA COUNT CONTROLS */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'All Audits', count: complianceLogs.length, id: 'all' },
                  { label: 'Campaigns', count: complianceLogs.filter(l => l.category === 'campaign').length, id: 'campaign' },
                  { label: 'User Actions', count: complianceLogs.filter(l => l.category === 'user').length, id: 'user' },
                  { label: 'System Engines', count: complianceLogs.filter(l => l.category === 'system').length, id: 'system' },
                  { label: 'Security Seals', count: complianceLogs.filter(l => l.category === 'security').length, id: 'security' },
                ].map((stat) => (
                  <button
                    key={stat.id}
                    onClick={() => setComplianceFilter(stat.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      complianceFilter === stat.id 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/2 border-white/5 text-stone-400 hover:border-white/10 hover:bg-white/4'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-stone-500 mb-1">{stat.label}</div>
                    <div className="text-xl font-bold font-mono text-white leading-none">{stat.count}</div>
                  </button>
                ))}
              </div>

              {/* SEARCH FILTER BOX */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={complianceSearch}
                    onChange={(e) => setComplianceSearch(e.target.value)}
                    placeholder="Search logs by action keywords, systems, or metadata..."
                    className="w-full bg-white/3 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all font-sans"
                  />
                  <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {complianceSearch && (
                  <button 
                    onClick={() => setComplianceSearch('')}
                    className="px-3 py-1 text-xs border border-white/10 rounded-xl text-stone-400 hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* ACTION LOG TABLE GRID */}
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20 text-xs">
                <div className="grid grid-cols-12 bg-white/4 border-b border-white/5 p-3 font-mono text-[10px] font-extrabold uppercase tracking-widest text-[#7a6f6f] select-none text-left">
                  <div className="col-span-3">Timestamp</div>
                  <div className="col-span-2">Group</div>
                  <div className="col-span-3">Executed Action</div>
                  <div className="col-span-2">Invoked By</div>
                  <div className="col-span-2">IP Address</div>
                </div>
                
                <div className="divide-y divide-white/5 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {(() => {
                    const subset = complianceLogs.filter((log) => {
                      const matchesS = log.action.toLowerCase().includes(complianceSearch.toLowerCase()) ||
                                      log.detail.toLowerCase().includes(complianceSearch.toLowerCase()) ||
                                      log.actor.toLowerCase().includes(complianceSearch.toLowerCase());
                      const matchesF = complianceFilter === 'all' || log.category === complianceFilter;
                      return matchesS && matchesF;
                    });

                    if (subset.length === 0) {
                      return (
                        <div className="py-12 text-center text-stone-500 font-mono italic">
                          No audit events match these search terms.
                        </div>
                      );
                    }

                    return subset.map((log) => {
                      const catStyle = 
                        log.category === 'security' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        log.category === 'campaign' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        log.category === 'user' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                        'bg-stone-500/10 border-stone-500/20 text-stone-400';

                      return (
                        <div key={log.id} className="p-3 bg-white/1 hover:bg-white/3 transition-colors">
                          <div className="grid grid-cols-12 gap-1 text-left select-text items-center">
                            <div className="col-span-3 font-mono text-[11px] text-stone-400 truncate" title={log.date}>
                              {new Date(log.date).toLocaleString('en-IN', { hour12: false })}
                            </div>
                            <div className="col-span-2">
                              <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold font-mono tracking-wider uppercase block w-max ${catStyle}`}>
                                {log.category}
                              </span>
                            </div>
                            <div className="col-span-3 font-bold text-stone-200">
                              {log.action}
                            </div>
                            <div className="col-span-2 text-stone-400 truncate" title={log.actor}>
                              {log.actor.split('@')[0]}
                            </div>
                            <div className="col-span-2 font-mono text-[11px] text-[#FF4500]">
                              {log.ip}
                            </div>
                          </div>
                          <div className="mt-2 text-[11px] text-stone-500 pl-1 font-sans leading-relaxed border-l border-emerald-500/30">
                            {log.detail}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* WRITE MANUAL INLINE MEMO FOR AUDITORS */}
              <div className="p-4 border border-white/5 rounded-2xl bg-[#0e0707] space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] uppercase font-mono font-bold text-stone-400 tracking-wider">Authorize Manual Audit Ledger Entry</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="Provide reason (e.g. Cleared out stale inactive subscriber cohorts manually)"
                    className="flex-1 bg-white/4 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500/50"
                  />
                  <button
                    onClick={() => {
                      if (!auditNote.trim()) {
                        error('Missing content', 'Provide a manual log description details first.');
                        return;
                      }
                      setIsAuditing(true);
                      setTimeout(() => {
                        addComplianceLog(
                          'MANUAL_AUDIT_LOG', 
                          auditNote.trim(), 
                          'user', 
                          user?.email || 'authenticated-admin'
                        );
                        setAuditNote('');
                        setIsAuditing(false);
                        loadComplianceState();
                        success('Ledger Entry Added', 'The manual reason has been compiled and hardcoded in system audit logbooks permanently.');
                      }, 500);
                    }}
                    disabled={isAuditing}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 font-semibold text-white rounded-xl text-xs transition-all cursor-pointer active:scale-95"
                  >
                    {isAuditing ? 'Publishing...' : 'Log Note'}
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Footer Details */}
            <div className="p-4 border-t border-white/5 bg-[#0e0707] flex justify-between items-center text-[10px] text-stone-500 font-mono">
              <span>Cryptographic Identity: SHA-256 HMAC Sealing</span>
              <span>Ledger Active: 100% compliant</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
