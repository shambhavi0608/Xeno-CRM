import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Megaphone, 
  MessageSquare, 
  Plus, 
  Smartphone, 
  Mail, 
  Zap,
  Play, 
  Eye, 
  BarChart2, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { fetchCampaigns, launchCampaign } from '../lib/api.js';
import { Campaign } from '../types/index.js';
import { ChannelBadge } from '../components/ui/ChannelBadge.js';
import { Badge } from '../components/ui/Badge.js';
import { useToast } from '../components/ui/Toast.js';
import { SkeletonCard } from '../components/ui/SkeletonCard.js';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'active' | 'completed' | 'paused'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadCampaigns = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await fetchCampaigns(filter);
      setCampaigns(data);
      setIsError(false);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Failed to sync campaign listings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
    
    // Poll to keep metrics updated if campaign is simulating!
    const poll = setInterval(() => {
      loadCampaigns(true);
    }, 5000);

    return () => clearInterval(poll);
  }, [filter]);

  const handleLaunchCampaign = async (id: string) => {
    try {
      success('Campaign Sent', 'Asynchronous CRM execution queuing launched...');
      await launchCampaign(id);
      success('Success', 'Campaign launched successfully! Callback metrics started.');
      loadCampaigns(true);
    } catch (err: any) {
      error('Launch failed', err.message);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="w-5 h-5 text-[#22C55E]" />;
      case 'email':
        return <Mail className="w-5 h-5 text-[#3B82F6]" />;
      case 'sms':
        return <Smartphone className="w-5 h-5 text-[#F59E0B]" />;
      case 'rcs':
        return <Zap className="w-5 h-5 text-[#A855F7]" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Decorative Blur Pools to match Editorial Aesthetic */}
      <div className="absolute top-[-50px] right-[-100px] w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF4500 0%, transparent 70%)' }}></div>

      {/* ========================================================= */}
      {/* HEADER SECTION */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white tracking-tight font-sans">Campaigns</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-stone-900 border border-white/8 text-stone-400">
            {campaigns.length} total
          </span>
        </div>
        <button
          onClick={() => navigate('/campaigns/new')}
          className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold rounded-lg bg-[#FF4500] hover:bg-[#FF8C00] active:scale-97 transition-all cursor-pointer shadow-md font-sans"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* ========================================================= */}
      {/* FILTER TABS */}
      {/* ========================================================= */}
      <div className="flex border-b border-white/10 space-x-1 overflow-x-auto select-none no-scrollbar">
        {(['all', 'draft', 'active', 'completed', 'paused'] as const).map((tab) => {
          const isActive = filter === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`py-3 px-4 text-xs font-medium uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#FF4500] text-white'
                  : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* MAIN CAMPAIGNS CONTAINER */}
      {/* ========================================================= */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard count={3} />
        </div>
      ) : isError ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 text-center flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-[#EF4444] mb-3" />
          <h4 className="text-white font-semibold">Failed to fetch campaigns</h4>
          <p className="text-stone-400 text-xs mt-1">{errorMessage}</p>
          <button 
            onClick={() => loadCampaigns()}
            className="mt-4 px-4 py-2 bg-[#120a0a]/50 border border-white/8 rounded-lg text-xs"
          >
            Retry
          </button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 min-h-[300px]">
          <Megaphone className="w-16 h-16 text-stone-700 mb-4 animate-bounce" />
          <h3 className="text-lg font-semibold text-white">No campaigns found</h3>
          <p className="text-stone-400 text-xs mt-2 max-w-sm leading-relaxed">
            There are no campaigns matching the filter. Start reaching your shoppers using our AI-native campaign planner.
          </p>
          <button
            onClick={() => navigate('/campaigns/new')}
            className="mt-6 py-2.5 px-6 rounded-lg bg-[#FF4500] hover:bg-[#FF8C00] text-xs font-semibold cursor-pointer font-sans"
          >
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const deliveryRate = c.sent_count > 0 ? (c.delivered_count / c.sent_count) * 100 : 0;
            const progressColor = deliveryRate >= 70 ? 'bg-[#22C55E]' : deliveryRate >= 40 ? 'bg-amber-500' : 'bg-[#FF4500]';
            const progressTextColor = deliveryRate >= 70 ? 'text-[#22C55E]' : deliveryRate >= 40 ? 'text-amber-500' : 'text-[#FF4500]';

            return (
              <div
                key={c.campaignId}
                className="bg-[#0a0505]/30 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-[#FF4500]/30 hover:bg-[#120a0a]/20 transition-all flex flex-col justify-between shadow-md"
              >
                <div>
                  {/* TOP ROW */}
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-[14px] font-semibold text-stone-100 tracking-tight leading-normal truncate flex-1" title={c.name}>
                      {c.name}
                    </h3>
                    <ChannelBadge channel={c.channel} />
                  </div>

                  {/* CHANNEL DESCRIP */}
                  <div className="flex items-center gap-2 mt-3 p-1">
                    {getChannelIcon(c.channel)}
                    <span className="text-[11px] font-medium text-stone-400">
                      Via {c.channel.toUpperCase()}
                    </span>
                  </div>

                  {/* PREVIEW BOX */}
                  <div className="mt-4 p-3 bg-black/40 border border-white/5 rounded-lg">
                    <p className="text-stone-330 text-[12px] leading-relaxed line-clamp-2 italic font-serif">
                      "{c.message || 'No text written yet'}"
                    </p>
                  </div>

                  {/* PROGRESS RATE BAR (ONLY FOR LAUNCHED CAMPAIGNS) */}
                  {c.status !== 'draft' && (
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono font-medium">
                        <span className="text-stone-500">Delivery Success:</span>
                        <span className={`font-bold ${progressTextColor}`}>{Math.round(deliveryRate)}%</span>
                      </div>
                      <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${progressColor} transition-all duration-500`}
                          style={{ width: `${deliveryRate}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* MINI COUNTERS ROW */}
                  <div className="mt-4 grid grid-cols-4 border-t border-white/6 pt-4 text-center">
                    <div className="border-r border-white/4">
                      <span className="text-[9px] text-[#7a6f6f] uppercase tracking-widest block font-mono">Sent</span>
                      <span className="text-stone-200 text-xs font-semibold mt-1 block font-sans">{c.sent_count}</span>
                    </div>
                    <div className="border-r border-white/4 px-1">
                      <span className="text-[9px] text-[#22C55E]/70 uppercase tracking-widest block font-mono">Deliv</span>
                      <span className="text-[#22C55E] text-xs font-semibold mt-1 block font-sans">{c.delivered_count}</span>
                    </div>
                    <div className="border-r border-white/4 px-1">
                      <span className="text-[9px] text-[#3B82F6]/70 uppercase tracking-widest block font-mono">Open</span>
                      <span className="text-[#3B82F6] text-xs font-semibold mt-1 block font-sans">{c.opened_count}</span>
                    </div>
                    <div className="px-1">
                      <span className="text-[9px] text-[#FF4500]/70 uppercase tracking-widest block font-mono">Click</span>
                      <span className="text-[#FF4500] text-xs font-semibold mt-1 block font-sans">{c.clicked_count}</span>
                    </div>
                  </div>
                </div>

                {/* FOOTER ACTION CONTROLS */}
                <div className="mt-6 pt-4 border-t border-white/6 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#606060] font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{c.createdAt}</span>
                  </div>

                  <div>
                    {c.status === 'draft' ? (
                      <button
                        onClick={() => handleLaunchCampaign(c.campaignId)}
                        className="py-1.5 px-3.5 rounded-lg text-xs font-bold bg-[#FF4500] hover:bg-[#FF8C00] text-white flex items-center gap-1 active:scale-95 transition-all shadow cursor-pointer font-sans"
                      >
                        <Play className="w-3 h-3 fill-current" /> Launch
                      </button>
                    ) : c.status === 'active' ? (
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="py-1.5 px-3 rounded-lg text-xs font-medium border border-white/8 text-stone-300 hover:border-white/20 hover:text-white flex items-center gap-1 bg-stone-900 active:scale-95 transition-all cursor-pointer font-sans"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#FF4500]" /> Live Stats
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="py-1.5 px-3 rounded-lg text-xs font-medium border border-white/8 text-stone-300 hover:border-white/20 hover:text-white flex items-center gap-1 bg-stone-900 active:scale-95 transition-all cursor-pointer font-sans"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-[#FF4500]" /> Report
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
