import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Megaphone, 
  TrendingUp, 
  MousePointer, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  AlertCircle,
  Activity,
  Clock,
  ShoppingBag,
  CheckCircle,
  XCircle,
  MessageSquare,
  Mail,
  RefreshCw,
  Search
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import { useToast } from '../components/ui/Toast.js';
import { fetchOverviewAnalytics, fetchCampaigns, launchCampaign, fetchRecentActivity } from '../lib/api.js';
import { Campaign, AnalyticsOverview, RecentActivityItem } from '../types/index.js';
import { CountUp } from '../components/ui/CountUp.js';
import { ChannelBadge } from '../components/ui/ChannelBadge.js';
import { Badge } from '../components/ui/Badge.js';
import { SkeletonCard } from '../components/ui/SkeletonCard.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'trigger' | 'interaction' | 'conversion'>('all');
  const [activitySearch, setActivitySearch] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Controls which row is expanded to show funnel chart
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  // Core data fetching utility
  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [overviewData, campaignsData, activityData] = await Promise.all([
        fetchOverviewAnalytics(),
        fetchCampaigns(),
        fetchRecentActivity()
      ]);
      setAnalytics(overviewData);
      setCampaigns(campaignsData);
      setRecentActivities(activityData);
      setIsError(false);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Unable to sync dashboard analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup silent polling every 5 seconds to show simulated real-time callbacks!
  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleLaunchDraft = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      success('Campaign Launch Protocol', 'Initiating live delivery simulation...');
      await launchCampaign(id);
      success('Success', 'Campaign launched! Watch delivery stats update live.');
      loadDashboardData(true); // silent sync
    } catch (err: any) {
      error('Launch failed', err.message);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedCampaignId(expandedCampaignId === id ? null : id);
  };

  if (isError) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-8 flex flex-col items-center justify-center text-center animate-fade-in my-6">
        <AlertCircle className="w-12 h-12 text-[#EF4444] mb-4" />
        <h3 className="text-lg font-semibold text-white tracking-tight">Analytics Sync Halted</h3>
        <p className="text-stone-400 text-sm mt-2 max-w-sm leading-relaxed">{errorMessage}</p>
        <button 
          onClick={() => loadDashboardData()}
          className="mt-6 px-5 py-2.5 rounded-lg bg-stone-900 border border-white/8 text-sm hover:bg-white/5 active:scale-97 transition-all flex items-center gap-2 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading || !analytics) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard count={4} />
        </div>
        <div className="h-[250px] bg-[#161616] rounded-xl border border-white/8 animate-pulse p-6">
          <div className="w-32 h-4 bg-stone-800 rounded mb-4" />
          <div className="w-full h-32 bg-stone-800 rounded mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ========================================================= */}
      {/* 4 KPI CARDS ROW */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard_kpi_row">
        
        {/* TOTAL CUSTOMERS */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#FF4500]/30 hover:bg-[#120a0a]/40 transition-all shadow-md group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#7a6f6f] uppercase tracking-wider font-mono">
              Total Customers
            </span>
            <div className="p-2 rounded-lg bg-[#FF4500]/10 text-[#FF4500]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
              <CountUp value={analytics.totalCustomers} />
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/12 text-[#22C55E] flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +12.5%
              </span>
              <span className="text-[11px] text-[#7a6f6f]">vs last 30 days</span>
            </div>
          </div>
        </div>

        {/* ACTIVE CAMPAIGNS */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#FF4500]/30 hover:bg-[#120a0a]/40 transition-all shadow-md group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#7a6f6f] uppercase tracking-wider font-mono">
              Active Campaigns
            </span>
            <div className="p-2 rounded-lg bg-[#FF4500]/10 text-[#FF4500]">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
              <CountUp value={analytics.activeCampaigns} />
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/12 text-[#22C55E] flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +3
              </span>
              <span className="text-[11px] text-[#7a6f6f]">sent this week</span>
            </div>
          </div>
        </div>

        {/* DELIVERY RATE */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#FF4500]/30 hover:bg-[#120a0a]/40 transition-all shadow-md group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#7a6f6f] uppercase tracking-wider font-mono">
              Delivery Rate
            </span>
            <div className="p-2 rounded-lg bg-[#FF4500]/10 text-[#FF4500]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
              <CountUp value={analytics.avgDeliveryRate} suffix="%" />
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/12 text-[#22C55E] flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +0.8%
              </span>
              <span className="text-[11px] text-[#7a6f6f]">healthy margin</span>
            </div>
          </div>
        </div>

        {/* AVG CTR */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[#FF4500]/30 hover:bg-[#120a0a]/40 transition-all shadow-md group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#7a6f6f] uppercase tracking-wider font-mono">
              Average CTR
            </span>
            <div className="p-2 rounded-lg bg-[#FF4500]/10 text-[#FF4500]">
              <MousePointer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
              <CountUp value={analytics.avgCtr} suffix="%" />
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/12 text-[#22C55E] flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> +2.1%
              </span>
              <span className="text-[11px] text-[#7a6f6f]">vs standard email</span>
            </div>
          </div>
        </div>

      </section>

      {/* ========================================================= */}
      {/* CAMPAIGN PERFORMANCE REPORT */}
      {/* ========================================================= */}
      <section className="bg-[#0a0505]/30 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
              Campaign Analytics & Engagement Funnel
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Select any row to slide open full campaign conversions inside real-time Recharts.
            </p>
          </div>
          <button 
            onClick={() => navigate('/campaigns')}
            className="text-xs font-semibold text-stone-400 hover:text-white transition-all flex items-center gap-1"
          >
            View All <ChevronRight className="w-3.5 h-3.5 text-[#FF4500]" />
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Megaphone className="w-12 h-12 text-[#5c4a4a] mb-4 animate-bounce" />
            <h4 className="text-sm font-semibold text-white font-display">No campaigns found yet</h4>
            <p className="text-stone-400 text-xs mt-2 max-w-xs leading-relaxed">
              Create and launch an AI draft with our builder to populate conversion details.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#120a0a]/80 text-[10px] font-semibold text-[#8a7f7f] uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-3.5">Campaign Details</th>
                  <th className="px-6 py-3.5 text-right">Audience</th>
                  <th className="px-6 py-3.5 text-right">Sent</th>
                  <th className="px-6 py-3.5 text-right">Delivered</th>
                  <th className="px-6 py-3.5 text-right">Opened</th>
                  <th className="px-6 py-3.5 text-right">Clicked</th>
                  <th className="px-6 py-3.5 text-right">Orders Attributed</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((c) => {
                  const isExpanded = expandedCampaignId === c.campaignId;
                  const delRate = c.sent_count > 0 ? (c.delivered_count / c.sent_count) * 100 : 0;
                  
                  // Setup clean chart coordinates
                  const funnelChartData = [
                    { name: 'Sent', count: c.sent_count, fill: '#4B5563' },
                    { name: 'Delivered', count: c.delivered_count, fill: '#22C55E' },
                    { name: 'Opened', count: c.opened_count, fill: '#3B82F6' },
                    { name: 'Clicked', count: c.clicked_count, fill: '#FF4500' },
                    { name: 'Converted', count: c.orders_attributed, fill: '#FFD700' }
                  ];

                  return (
                    <React.Fragment key={c.campaignId}>
                      <tr 
                        onClick={() => toggleRow(c.campaignId)}
                        className="hover:bg-white/3 transition-all cursor-pointer group h-14"
                      >
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            <span className="text-stone-200 group-hover:text-[#FF8C00] transition-colors font-medium text-xs leading-relaxed max-w-[200px] truncate">
                              {c.name}
                            </span>
                            <div className="mt-1 flex items-center gap-1">
                              <ChannelBadge channel={c.channel} showIcon={false} />
                              <span className="text-[10px] text-stone-550 font-mono">
                                Registered: {c.createdAt}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-xs text-stone-350">
                          {c.matchedCount}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-xs text-stone-350">
                          {c.sent_count}
                        </td>
                        <td className="px-6 py-3 text-right text-xs">
                          <span className={`${c.delivered_count > 0 ? 'text-[#22C55E] font-semibold' : 'text-stone-500'}`}>
                            {c.delivered_count}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-xs">
                          <span className={`${c.opened_count > 0 ? 'text-[#3B82F6] font-semibold' : 'text-stone-500'}`}>
                            {c.opened_count}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-xs">
                          <span className={`${c.clicked_count > 0 ? 'text-[#FF4500] font-semibold' : 'text-stone-500'}`}>
                            {c.clicked_count}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-xs">
                          <div className="flex flex-col text-right">
                            <span className={`${c.orders_attributed > 0 ? 'text-amber-500 font-bold' : 'text-stone-500'}`}>
                              {c.orders_attributed} ord
                            </span>
                            {c.revenue_attributed > 0 && (
                              <span className="text-[9px] text-[#22C55E] font-mono tracking-wide mt-0.5">
                                +₹{(c.revenue_attributed).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center text-xs">
                          <Badge 
                            variant={
                              c.status === 'active' ? 'success' :
                              c.status === 'completed' ? 'info' :
                              'muted'
                            }
                          >
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-center text-xs">
                          <div className="flex items-center justify-center gap-2">
                            {c.status === 'draft' ? (
                              <button
                                onClick={(e) => handleLaunchDraft(e, c.campaignId)}
                                className="p-1 px-2 text-[10px] font-bold rounded bg-[#FF4500]/12 border border-[#FF4500]/25 text-[#FF4500] hover:bg-[#FF4500]/22 active:scale-95 flex items-center gap-1 transition-all cursor-pointer font-sans"
                                title="Launch live simulation"
                              >
                                <Play className="w-3 h-3 fill-current" /> Launch
                              </button>
                            ) : (
                              <span className="text-[#7a6f6f] text-[10px] uppercase font-mono">Running</span>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#A0A0A0]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#606060] group-hover:text-[#A0A0A0]" />
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Funnel Row */}
                      {isExpanded && (
                        <tr className="bg-[#121212]/80 border-t border-b border-white/4">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                              
                              <div className="flex-1 w-full h-[140px] px-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart 
                                    data={funnelChartData} 
                                    layout="horizontal"
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis 
                                      dataKey="name" 
                                      tick={{ fill: '#606060', fontSize: 10, fontFamily: 'monospace' }} 
                                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                                    />
                                    <YAxis 
                                      tick={{ fill: '#606060', fontSize: 10 }}
                                      axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                                    />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: '#1C1C1C', 
                                        borderColor: 'rgba(255,255,255,0.08)',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        fontSize: '11px'
                                      }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Static Summary card side along */}
                              <div className="w-full md:w-64 p-4 rounded-lg bg-stone-900 border border-white/5 flex flex-col gap-2 shrink-0">
                                <h4 className="text-[10px] font-bold tracking-wider uppercase text-[#606060] flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-500" /> AI Insights & Delivery
                                </h4>
                                <div className="flex justify-between mt-1 text-xs">
                                  <span className="text-stone-400">Total Delivery % :</span>
                                  <span className={`font-bold ${delRate >= 70 ? 'text-[#22C55E]' : delRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {Math.round(delRate)}%
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-stone-400">Conversion Rate % :</span>
                                  <span className="font-semibold text-stone-200">
                                    {c.opened_count > 0 ? Math.round((c.clicked_count / c.opened_count) * 100) : 0}%
                                  </span>
                                </div>
                                <p className="text-[10px] text-stone-500 italic mt-2 leading-normal">
                                  "High customer retention shown. Messaging on {c.channel.toUpperCase()} successfully induced ₹{(c.revenue_attributed).toLocaleString()} incremental in-app transaction roastery orders"
                                </p>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* QUICK STATS ROW */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CARD 1: TOP PERFORMING CHANNEL */}
        <div className="bg-[#161616] border border-white/8 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-semibold tracking-wider text-[#606060] uppercase block font-mono">
            Best Performing Channel
          </span>
          <div className="flex items-center gap-2 mt-4">
            <ChannelBadge channel={analytics.topChannel as any} />
            <span className="text-white font-bold text-sm">Top CTR</span>
          </div>
          <p className="text-stone-300 text-2xl font-semibold mt-4">
            {analytics.topChannelRate}% <span className="text-[11px] text-[#22C55E] font-medium font-mono">▲ stable</span>
          </p>
          <span className="text-stone-500 text-[11px] mt-1 block">
            Aggregated delivery success from roastery alerts
          </span>
        </div>

        {/* CARD 2: MOST ACTIVE SEGMENT */}
        <div className="bg-[#161616] border border-white/8 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-semibold tracking-wider text-[#606060] uppercase block font-mono">
            Most Engaged Segment
          </span>
          <p className="text-stone-100 font-bold text-base mt-4 truncate">
            {analytics.mostActiveSegment}
          </p>
          <p className="text-stone-300 text-2xl font-semibold mt-4">
            {analytics.mostActiveSegmentCount} <span className="text-stone-500 text-xs">active buyers</span>
          </p>
          <span className="text-stone-500 text-[11px] mt-1 block">
            Targeting these loyalists leads to 25%+ average CTR
          </span>
        </div>

        {/* CARD 3: MESSAGE COMPLETED VOLUME */}
        <div className="bg-[#161616] border border-white/8 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-semibold tracking-wider text-[#606060] uppercase block font-mono">
            Callbacks Received (Loop)
          </span>
          <p className="text-stone-100 font-bold text-base mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            Live Webhook Status
          </p>
          <p className="text-stone-300 text-2xl font-semibold mt-4">
            {analytics.messagesThisWeek} <span className="text-xs text-[#22C55E] bg-[#22C55E]/12 border border-[#22C55E]/20 rounded-full px-2 py-0.5">100% async</span>
          </p>
          <span className="text-stone-500 text-[11px] mt-1 block">
            Probabilities matches: 70% Deliv, 15% Open, 5% Click
          </span>
        </div>

      </section>

      {/* ========================================================= */}
      {/* REAL-TIME RECENT ACTIVITY CHRONOLOGICAL FEED */}
      {/* ========================================================= */}
      <section className="bg-[#0a0505]/40 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative" id="recent_activity_section">
        
        {/* Absolute top glowing backdrop aura underlay */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-[#FF4500]/5 rounded-full filter blur-3xl pointer-events-none select-none z-0" />

        <div className="px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4500] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4500]"></span>
              </span>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-[#FF4500]" /> Real-Time Workspace Activity Feed
              </h3>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Chronological log of multi-channel campaign dispatch triggers and asynchronous live shopper interactions.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-stone-500 font-mono tracking-wider flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF4500]" /> polling live
            </span>
          </div>
        </div>

        {/* Filters and search deck */}
        <div className="p-4 px-6 bg-black/20 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mr-1 font-mono">Filter Feed:</span>
            {[
              { id: 'all', label: 'All Activities', count: recentActivities.length },
              { id: 'trigger', label: 'Campaign Triggers', count: recentActivities.filter(a => a.type === 'trigger').length },
              { id: 'interaction', label: 'Shopper Interactions', count: recentActivities.filter(a => a.type === 'interaction').length },
              { id: 'conversion', label: 'Conversions', count: recentActivities.filter(a => a.type === 'conversion').length }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setActivityFilter(pill.id as any)}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 select-none ${
                  activityFilter === pill.id
                    ? 'bg-[#FF4500] text-white shadow-lg'
                    : 'bg-stone-900 border border-white/5 text-stone-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activityFilter === pill.id ? 'bg-white/20 text-white' : 'bg-stone-800 text-stone-400'}`}>
                  {pill.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Filter Search Bar */}
          <div className="relative max-w-xs w-full mr-0.5 md:mr-0">
            <input
              type="text"
              placeholder="Search activity, campaign or buyer..."
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              className="w-full text-xs font-medium pl-8 pr-4 py-2 bg-stone-900/90 border border-white/10 rounded-xl text-stone-100 placeholder-stone-500 focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-all"
            />
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
          </div>

        </div>

        {/* Main Feed Core Panel */}
        <div className="p-6 relative z-10 max-h-[460px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
          {(() => {
            const filtered = recentActivities.filter(act => {
              // search evaluation
              const matchesSearch = 
                act.customerName.toLowerCase().includes(activitySearch.toLowerCase()) || 
                (act.campaignName && act.campaignName.toLowerCase().includes(activitySearch.toLowerCase())) ||
                act.detail.toLowerCase().includes(activitySearch.toLowerCase()) ||
                act.type.toLowerCase().includes(activitySearch.toLowerCase());

              if (!matchesSearch) return false;

              // filter evaluation
              if (activityFilter === 'all') return true;
              return act.type === activityFilter;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <Activity className="w-10 h-10 text-[#4c3a3a] mb-3" />
                  <p className="text-sm font-semibold text-stone-300">No matching event logs found</p>
                  <p className="text-xs text-stone-500 max-w-xs mt-1 leading-normal">
                    Try adjusting your filters or search criteria. Launch a live campaign to watch events populate automatically.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filtered.map((activity) => {
                  
                  // Setup custom icon matching the channel and status
                  const getIconComponent = () => {
                    switch (activity.type) {
                      case 'conversion':
                        return <ShoppingBag className="w-4 h-4 text-amber-500" />;
                      case 'trigger':
                        if (activity.channel === 'email') return <Mail className="w-4 h-4 text-blue-400" />;
                        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
                      default:
                        if (activity.status === 'clicked') return <MousePointer className="w-4 h-4 text-[#FF4500]" />;
                        if (activity.status === 'opened') return <CheckCircle className="w-4 h-4 text-[#3B82F6]" />;
                        if (activity.status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
                        return <Clock className="w-4 h-4 text-stone-400" />;
                    }
                  };

                  // Styling constants
                  const getAccentColors = () => {
                    switch (activity.type) {
                      case 'conversion':
                        return {
                          border: 'border-l-4 border-l-amber-500',
                          badgeBg: 'bg-amber-500/10 text-amber-500'
                        };
                      case 'trigger':
                        return {
                          border: 'border-l-4 border-l-blue-500',
                          badgeBg: 'bg-blue-500/10 text-blue-400'
                        };
                      case 'failed':
                        return {
                          border: 'border-l-4 border-l-red-500',
                          badgeBg: 'bg-red-500/10 text-red-400'
                        };
                      default:
                        return {
                          border: 'border-l-4 border-l-green-500',
                          badgeBg: 'bg-green-500/10 text-green-400'
                        };
                    }
                  };

                  const colors = getAccentColors();

                  const formatActivityTime = (dateStr: string) => {
                    try {
                      const d = new Date(dateStr);
                      // Check model year
                      const formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const formattedDate = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                      return `${formattedTime} • ${formattedDate}`;
                    } catch (e) {
                      return dateStr;
                    }
                  };

                  return (
                    <div 
                      key={activity.id}
                      className={`p-4 rounded-xl bg-black/20 border border-white/5 hover:bg-[#120a0a]/35 transition-all select-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${colors.border}`}
                    >
                      <div className="flex items-start gap-3.5">
                        
                        {/* Event Category Icon Bracket */}
                        <div className={`p-2.5 rounded-xl bg-stone-900 border border-white/10 shrink-0 group-hover:scale-105 transition-all`} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                          {getIconComponent()}
                        </div>

                        {/* Interactive message payload metrics */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#FF8C00] font-bold group-hover:underline cursor-pointer" onClick={() => navigate('/customers')}>
                              {activity.customerName}
                            </span>
                            <span className="text-[10px] text-stone-520 font-mono">
                              ({activity.customerId})
                            </span>
                            {activity.campaignName && (
                              <span 
                                onClick={() => navigate('/campaigns')}
                                className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-tight bg-white/5 border border-white/10 text-stone-300 hover:text-[#FF4500] hover:border-[#FF4500]/30 transition-all cursor-pointer select-none"
                              >
                                {activity.campaignName}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-stone-200 font-medium">
                            {activity.detail}
                          </p>

                          {/* Trigger tags */}
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${colors.badgeBg} font-mono`}>
                              {activity.type}
                            </span>
                            {activity.channel && activity.channel !== 'conversion' && (
                              <span className="text-[10px] text-stone-500 capitalize flex items-center gap-1 font-mono">
                                • {activity.channel.toUpperCase()} dispatch
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right Hand timestamp / timing alignment */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t border-white/5 sm:border-0 pt-2 sm:pt-0 shrink-0">
                        <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1 text-right">
                          <Clock className="w-3 h-3 shrink-0 text-stone-600" /> {formatActivityTime(activity.timestamp)}
                        </span>
                        
                        {/* Quick action details link */}
                        <button 
                          onClick={() => {
                            success('Interactive Event Log', `Event ID: ${activity.id}\nStatus: ${activity.status || 'Active'}\nCaptured successfully.`);
                          }}
                          className="text-[10px] text-stone-500 hover:text-white underline mt-1 cursor-pointer font-mono font-bold select-none opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline"
                        >
                          Diagnostic Logs 📄
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </section>

    </div>
  );
}
