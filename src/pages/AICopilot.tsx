import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageSquare, Mail, Smartphone, Send, SendHorizontal, HelpCircle, ArrowRight, Loader2, RefreshCw, Layers } from 'lucide-react';
import { useToast } from '../components/ui/Toast.js';
import { aiService, campaignService } from '../services/index.js';

interface CopilotResponse {
  segment: {
    rule: string;
    audienceType: string;
  };
  channel: 'whatsapp' | 'email' | 'sms' | 'rcs';
  message: string;
  prediction: {
    openRate: number;
    clickRate: number;
  };
  explainabilitySteps: string[];
  matchedCount: number;
  intent?: string;
  customers?: {
    name: string;
    risk: 'Low' | 'Medium' | 'High' | string;
    reason: string;
    recommendedAction: string;
  }[];
  summary?: string;
}

export default function AICopilot() {
  const navigate = useNavigate();
  const { success, error, info } = useToast();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copilotData, setCopilotData] = useState<CopilotResponse | null>(null);
  const [showExplain, setShowExplain] = useState(true);

  // Edit fields for campaign launch
  const [editMessage, setEditMessage] = useState('');
  const [editCampaignName, setEditCampaignName] = useState('');
  const [launching, setLaunching] = useState(false);

  const examplePrompts = [
    {
      title: "Predict Cohort Churn",
      text: "Predict churn risk across segments and design targeted recovery offers."
    },
    {
      title: "Show Revenue Forecast",
      text: "Show revenue forecast detail and expected growth figures for the CRM."
    },
    {
      title: "Audit High Value",
      text: "Show high value customer profiles with spend metrics and reservation hooks."
    },
    {
      title: "Lapsed Customer Audit",
      text: "Show inactive customers and design fallback email discounts."
    },
    {
      title: "VIP WhatsApp Push",
      text: "Generate WhatsApp campaign targeting VIP buyers with premium micro-lots."
    },
    {
      title: "Activation Welcome",
      text: "Generate SMS campaign for our first-time buyers with welcome coupon."
    }
  ];

  const handleGenerate = async (text: string) => {
    const activeText = text || prompt;
    if (!activeText.trim()) {
      error('Input Empty', 'Please provide or select a tactical campaign prompt.');
      return;
    }

    setLoading(true);
    info('AI Copilot Orchestrator', 'Analyzing user prompt and evaluating high-potential customer lists...');
    
    try {
      const data = await aiService.chat(activeText);
      setCopilotData(data);
      setEditMessage(data.message);
      
      // Auto-fill a professional campaign title
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setEditCampaignName(`AI Copilot: ${data.segment.audienceType} (${dateStr})`);
      success('Campaign Synthesized', 'Optimized audience segment and conversion copy drafted.');
    } catch (e: any) {
      console.error(e);
      error('Copilot Generation Error', e.message || 'An error occurred during LLM synthesis.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!copilotData) return;
    if (!editCampaignName.trim()) {
      error('Title Missing', 'Please enter a name for this marketing campaign.');
      return;
    }

    setLaunching(true);
    info('Launching Campaign', 'Spawning draft records and initiating dispatch queues...');

    try {
      // 1. Create campaign
      const created = await campaignService.create({
        name: editCampaignName,
        audiencePrompt: copilotData.segment.rule,
        channel: copilotData.channel,
        message: editMessage,
        matchedCount: copilotData.matchedCount,
        status: 'draft'
      });

      // 2. Launch campaign
      const result = await campaignService.launch(created.campaignId);

      if (result.success) {
        success('Campaign Dispatched!', `Successfully sent campaign "${editCampaignName}" to ${copilotData.matchedCount} shoppers!`);
        // Navigate back to campaigns page
        setTimeout(() => {
          navigate('/campaigns');
        }, 1500);
      } else {
        throw new Error('Launch routine flagged channel delivery errors.');
      }
    } catch (e: any) {
      console.error(e);
      error('Launch Failed', e.message || 'Could not instantiate campaign pipelines.');
    } finally {
      setLaunching(false);
    }
  };

  // Helper channel styled badge
  const renderChannelIconAndBadge = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-mono font-bold uppercase">
            <Smartphone className="w-3.5 h-3.5" /> WhatsApp Business
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-xs font-mono font-bold uppercase">
            <Mail className="w-3.5 h-3.5" /> Email Layout
          </span>
        );
      case 'rcs':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#a855f7] text-xs font-mono font-bold uppercase">
            <Layers className="w-3.5 h-3.5" /> RCS Rich Feed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#eab308]/10 border border-[#eab308]/20 text-[#eab308] text-xs font-mono font-bold uppercase">
            <Smartphone className="w-3.5 h-3.5" /> Core SMS
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 select-none" id="ai_copilot_workspace">
      {/* Dynamic Heading card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-[#FF4500]" />
            </div>
            <h1 className="text-2xl font-sans font-bold tracking-tight text-white">AI Campaign Copilot</h1>
          </div>
          <p className="text-xs text-stone-400 font-mono">
            Replace complex segmentation filters with single-sentence marketer strategies.
          </p>
        </div>
      </div>

      {/* Main Terminal Input Block */}
      <div className="bg-[#120a0a]/40 border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4500]/5 rounded-full blur-3xl pointer-events-none" />

        <label className="block text-xs font-bold text-stone-300 font-mono uppercase tracking-wider mb-2.5">
          What is your campaign tactical goal?
        </label>

        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your strategic intent (e.g. 'Identify loyal coffee lovers spent over 8000 and invite them to our luxury single-origin drop...')"
            className="w-full min-h-[100px] text-[15px] bg-black/60 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] placeholder-stone-500 font-sans resize-y leading-relaxed transition-all"
            rows={3}
            id="copilot_textarea"
          />
        </div>

        {/* Suggestion Prompts Row */}
        <div className="mt-4 space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-mono text-stone-500 block">Or select an AI campaign template:</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {examplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(p.text);
                  handleGenerate(p.text);
                }}
                className="text-left p-3.5 bg-black/40 hover:bg-[#FF4500]/5 border border-white/5 hover:border-[#FF4500]/25 rounded-xl text-stone-300 hover:text-white transition-all cursor-pointer group"
              >
                <p className="text-xs font-bold text-[#FF4500] mb-1 font-mono">{p.title}</p>
                <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed group-hover:text-stone-300">{p.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Call to Actions */}
        <div className="mt-6 flex justify-end border-t border-white/5 pt-4">
          <button
            type="button"
            disabled={loading || !prompt.trim()}
            onClick={() => handleGenerate('')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF4500] hover:bg-[#FF5500] active:scale-98 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed text-stone-900 font-bold rounded-xl text-xs uppercase font-mono tracking-wider transition-all cursor-pointer"
            id="copilot_submit_button"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-stone-900" /> Synthesizing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-stone-900" /> Generate Campaign
              </>
            )}
          </button>
        </div>
      </div>

      {/* SKELETON LOADER WHILE REQUEST ACTIVE */}
      {loading && !copilotData && (
        <div className="bg-[#120a0a]/20 border border-white/5 rounded-2xl p-6 space-y-6 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-1/4" />
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded w-3/4" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
          <div className="h-24 bg-white/5 rounded-xl" />
        </div>
      )}

      {/* STAGE RESULT VIEWS */}
      {copilotData && !loading && (
        <div className="bg-[#120a0a]/50 border-2 border-[#FF4500]/25 rounded-2xl p-6 space-y-6 animate-[slideUp_0.3s_ease-out] shadow-2xl relative" id="copilot_results_card">
          <div className="absolute top-3 right-3 select-none">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FF4500]/10 border border-[#FF4500]/25 text-[#FF4500] uppercase font-mono tracking-wider">
              AI Optimized Draft
            </span>
          </div>

          <div className="space-y-4">
            {/* Header segment display */}
            <div>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider font-mono block mb-1">
                Selected Cohort Segments
              </span>
              <h2 className="text-lg font-bold text-white font-serif italic">
                {copilotData.segment.audienceType}
              </h2>
              <div className="mt-2.5 flex flex-wrap gap-2 items-center">
                <span className="p-1 px-2.5 bg-black/40 border border-white/5 text-stone-300 text-xs font-semibold rounded-lg font-mono">
                  Rule: {copilotData.segment.rule}
                </span>
                <span className="p-1 px-2.5 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-semibold rounded-lg font-mono">
                  {copilotData.matchedCount} Customers Matched
                </span>
              </div>
            </div>

            {/* Real-time AI CRM Audit Intelligence widget */}
            {(copilotData.summary || (copilotData.customers && copilotData.customers.length > 0)) && (
              <div className="bg-[#FF4500]/5 border border-[#FF4500]/15 rounded-2xl p-5 space-y-4 select-none animate-[fadeIn_0.3s_ease-out] backdrop-blur-md">
                <div className="flex items-center gap-2 text-[#FF4500]">
                  <Sparkles className="w-4.5 h-4.5" />
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">
                    AI CRM Audit Intelligence ({copilotData.intent ? copilotData.intent.replace(/_/g, ' ') : 'analysis'})
                  </span>
                </div>
                
                {copilotData.summary && (
                  <p className="text-stone-200 text-sm font-medium leading-relaxed font-sans">
                    {copilotData.summary}
                  </p>
                )}

                {copilotData.customers && copilotData.customers.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 pt-1">
                    {copilotData.customers.map((cust, cIdx) => (
                      <div key={cIdx} className="bg-black/60 border border-white/5 hover:border-[#FF4500]/20 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs transition-all duration-300">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-sans text-sm">{cust.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                              cust.risk === 'High' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                              cust.risk === 'Medium' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                              'bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]'
                            }`}>
                              Risk: {cust.risk}
                            </span>
                          </div>
                          <p className="text-stone-300 text-[11px] font-sans leading-relaxed">{cust.reason}</p>
                        </div>
                        <div className="md:text-right font-mono text-[10px] space-y-1 md:max-w-[45%]">
                          <span className="text-[#FF4500] font-sans font-semibold block mb-0.5 uppercase tracking-wider text-[9px]">Recommended Actions:</span>
                          <span className="text-stone-200 antialiased leading-tight bg-white/5 px-2 py-1 rounded inline-block">{cust.recommendedAction}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feature 3: Actionable explainability Toggle */}
            <div className="border-t border-b border-white/5 py-3 bg-black/30 px-4 rounded-xl">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowExplain(!showExplain)}
                  className="text-xs text-[#FF4500] hover:text-[#FF8C00] font-mono flex items-center gap-1 cursor-pointer underline decoration-dotted transition-colors"
                  id="copilot_explain_toggle"
                >
                  {showExplain ? 'Hide Strategy Context' : '[Why This Audience?]'}
                </button>
                <span className="text-[10px] text-stone-500 font-mono">Segment explainability metrics</span>
              </div>

              {showExplain && (
                <div className="mt-3 text-stone-300 text-xs font-sans space-y-1.5 animate-[fadeIn_0.2s_ease-out]">
                  <p className="font-bold text-[#FF4500] uppercase tracking-wider font-mono text-[9px]">Cluster Optimization Steps:</p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[#C0C0C0]">
                    {copilotData.explainabilitySteps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Feature 4: Recommendation statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/40 p-4 rounded-xl border border-white/5 select-none">
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider block mb-1">Recommended Channel</span>
                {renderChannelIconAndBadge(copilotData.channel)}
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider block mb-1">Expected Open Rate</span>
                <span className="text-base font-bold text-white font-mono">{copilotData.prediction.openRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider block mb-1">Expected Click Rate</span>
                <span className="text-base font-bold text-white font-mono">{copilotData.prediction.clickRate}%</span>
              </div>
            </div>

            {/* Edit layout and launching parameters */}
            <div className="space-y-3.5 border-t border-white/5 pt-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-stone-400 mb-1.5">
                  Campaign Recording Name
                </label>
                <input
                  type="text"
                  value={editCampaignName}
                  onChange={(e) => setEditCampaignName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#FF4500] font-mono"
                  placeholder="Enter custom campaign tracker key"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-stone-400">
                    Draft Promotional Message Template
                  </label>
                  <span className="text-[10px] text-amber-500 font-mono">Dynamic tag {"{name}"} active</span>
                </div>
                <textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  className="w-full min-h-[90px] bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-stone-200 focus:outline-none focus:border-[#FF4500] font-sans leading-relaxed"
                  placeholder="Input custom message template details"
                />
              </div>
            </div>

            {/* TERMINATING TRIGGER BAR */}
            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                type="button"
                disabled={launching || !editCampaignName.trim() || !editMessage.trim()}
                onClick={handleLaunchCampaign}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#FF4500] hover:bg-[#FF5500] text-stone-900 font-bold rounded-xl text-xs uppercase font-mono tracking-wider active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
                id="launch_copilot_campaign"
              >
                {launching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-900" /> Launching...
                  </>
                ) : (
                  <>
                    <SendHorizontal className="w-3.5 h-3.5" /> Launch Campaign Instantly
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
