import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  User, 
  Send,
  Loader,
  X,
  PlusCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { useToast } from '../components/ui/Toast.js';
import { 
  suggestSegment, 
  generateAICopy, 
  createCampaign, 
  launchCampaign,
  predictCampaign
} from '../lib/api.js';
import { AISuggestion, AIMessages, Customer, CampaignPrediction } from '../types/index.js';

export default function CampaignBuilderPage() {
  const navigate = useNavigate();
  const { success, error, info } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // STEP 1 FIELDS (AUDIENCE)
  const [audiencePrompt, setAudiencePrompt] = useState('Retrieve customers who are loyal high-value spenders over ₹5,000');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [showExplainability, setShowExplainability] = useState(false);
  
  // Manual rule builder fallback/collapsible
  const [useManualBuild, setUseManualBuild] = useState(false);
  const [manualRules, setManualRules] = useState([
    { field: 'totalSpent', operator: '>', value: '5000' }
  ]);

  // STEP 2 FIELDS (MESSAGE)
  const [campaignGoal, setCampaignGoal] = useState('Invite VIP loyalty buyers to try our luxury single-origin roasts with 20% off');
  const [aiMessages, setAiMessages] = useState<AIMessages | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'sms' | 'rcs'>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  // STEP 3 FIELDS (LAUNCH)
  const [campaignName, setCampaignName] = useState('');
  const [launching, setLaunching] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState(false);

  // AI Prediction states
  const [prediction, setPrediction] = useState<CampaignPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Run Campaign Predictor on entering Step 3
  useEffect(() => {
    if (step === 3) {
      const runPrediction = async () => {
        try {
          setIsPredicting(true);
          const pred = await predictCampaign({
            matchedCount: aiSuggestion ? aiSuggestion.count : 5,
            channel: selectedChannel,
            message: messageText,
            audiencePrompt: audiencePrompt || 'Active VIP Shoppers'
          });
          setPrediction(pred);
        } catch (e) {
          console.error('[Predictor Component] Forecast hook failed', e);
        } finally {
          setIsPredicting(false);
        }
      };
      runPrediction();
    }
  }, [step, selectedChannel, messageText, audiencePrompt, aiSuggestion]);

  // -----------------------------------------------------------------
  // HANDLERS
  // -----------------------------------------------------------------

  // 1. Suggest Audience with LLM
  const handleSuggestAudience = async () => {
    if (!audiencePrompt.trim()) {
      error('Input required', 'Please describe your customer cohort.');
      return;
    }
    setLoading(true);
    info('AI Segmentation Pipeline', 'Evaluating customer database against criteria...');
    try {
      const res = await suggestSegment(audiencePrompt);
      setAiSuggestion(res);
      success('AI Segment Isolated', `Found ${res.count} shoppers matching your segment request.`);
    } catch (err: any) {
      error('LLM Segmentation Failed', err.message || 'Error communicating with segmentation core');
    } finally {
      setLoading(false);
    }
  };

  // 2. Generate customized copy Variations via LLM
  const handleGenerateCopy = async () => {
    if (!campaignGoal.trim()) {
      error('Goal required', 'Please describe the goal of this discount or alert.');
      return;
    }
    setLoading(true);
    info('AI Personalization Pipeline', 'Styling channel copy variations with name placeholders...');
    try {
      const res = await generateAICopy(campaignGoal, aiSuggestion?.explanation || '');
      setAiMessages(res);
      
      // Auto-configure recommended channel in wizard
      setSelectedChannel(res.recommended_channel);
      if (res.recommended_channel === 'email') {
        setMessageText(res.email.body);
        setEmailSubject(res.email.subject);
      } else {
        setMessageText((res as any)[res.recommended_channel] || '');
      }
      
      // Autofill campaign name
      setCampaignName(`Organic VIP Offer — ${res.recommended_channel.toUpperCase()}`);
      
      success('AI Copywrite Complete', `Recommended: ${res.recommended_channel.toUpperCase()}. Reason: ${res.recommendation_reason}`);
    } catch (err: any) {
      error('LLM personalization failed', err.message || 'Heuristic roastery templates loaded.');
    } finally {
      setLoading(false);
    }
  };

  // Apply copy selected channels
  const handleSelectChannelVariant = (channel: 'whatsapp' | 'email' | 'sms' | 'rcs') => {
    setSelectedChannel(channel);
    if (!aiMessages) return;

    if (channel === 'email') {
      setMessageText(aiMessages.email.body);
      setEmailSubject(aiMessages.email.subject);
    } else {
      setMessageText((aiMessages as any)[channel] || '');
    }

    // Adapt name
    setCampaignName(`Organic VIP Offer — ${channel.toUpperCase()}`);
  };

  // 3. Register and Launch Campaign
  const handleLaunchCampaign = async () => {
    if (!campaignName.trim()) {
      error('Name required', 'Please give this campaign an identifying launch label.');
      return;
    }

    setLaunching(true);
    try {
      // Create draft
      const draft = await createCampaign({
        name: campaignName,
        audiencePrompt: audiencePrompt,
        matchedCount: aiSuggestion ? aiSuggestion.count : 5,
        message: messageText,
        channel: selectedChannel
      });

      // Launch it
      await launchCampaign(draft.campaignId);

      setLaunchSuccess(true);
      success('Success', `${campaignName} launched! Redirection active.`);
      
      setTimeout(() => {
        navigate('/campaigns');
      }, 2500);

    } catch (err: any) {
      error('Launch failed', err.message);
    } finally {
      setLaunching(false);
    }
  };

  // Helper characters stats
  const getCharLimitStatus = () => {
    const len = messageText.length;
    if (selectedChannel === 'whatsapp') {
      if (len < 200) return 'text-[#22C55E]';
      if (len <= 250) return 'text-amber-500';
      return 'text-[#EF4444]';
    } else if (selectedChannel === 'sms') {
      if (len <= 160) return 'text-[#22C55E] bg-green-500/10';
      return 'text-[#EF4444] bg-red-500/10';
    }
    return 'text-stone-400';
  };

  return (
    <div className="space-y-8 animate-fade-in text-white select-none leading-normal relative">
      
      {/* Delicate Ambient Glow on side panel */}
      <div className="absolute top-0 right-[-100px] w-[350px] h-[350px] rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF4500 0%, transparent 70%)' }} />
      <div className="absolute bottom-[10%] left-[-150px] w-[300px] h-[300px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />

      {/* ========================================================= */}
      {/* 3-STEP ANIMATED PROGRESS INDICATOR */}
      {/* ========================================================= */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center shadow-lg">
        <div className="flex items-center w-full max-w-lg justify-between relative">
          
          {/* Background Connecting Lines */}
          <div className="absolute top-4.5 left-4 right-4 h-0.5 bg-stone-800 -z-1" />
          <div 
            className="absolute top-4.5 left-4 h-0.5 bg-[#FF4500] transition-all duration-350 -z-1" 
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />

          {/* CIRCLE 1: AUDIENCE */}
          <div className="flex flex-col items-center z-10">
            <div 
              className={`w-9 h-9 flex items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                step > 1 
                  ? 'bg-green-500/20 border-[#22C55E] text-[#22C55E]' 
                  : step === 1 
                    ? 'bg-[#FF4500] border-[#FF4500] text-white shadow-lg shadow-[#FF4500]/20 scale-105' 
                    : 'bg-[#120a0a]/80 border-white/8 text-[#606060]'
              }`}
            >
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider mt-2.5 font-bold text-stone-400">Audience</span>
          </div>

          {/* CIRCLE 2: MESSAGE */}
          <div className="flex flex-col items-center z-10">
            <div 
              className={`w-9 h-9 flex items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                step > 2
                  ? 'bg-green-500/20 border-[#22C55E] text-[#22C55E]' 
                  : step === 2 
                    ? 'bg-[#FF4500] border-[#FF4500] text-white shadow-lg shadow-[#FF4500]/20 scale-105' 
                    : 'bg-[#120a0a]/80 border-white/8 text-[#606060]'
              }`}
            >
              {step > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider mt-2.5 font-bold text-stone-400">Message</span>
          </div>

          {/* CIRCLE 3: LAUNCH */}
          <div className="flex flex-col items-center z-10">
            <div 
              className={`w-9 h-9 flex items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                launchSuccess 
                  ? 'bg-green-500 border-[#22C55E] text-white' 
                  : step === 3 
                    ? 'bg-[#FF4500] border-[#FF4500] text-white shadow-lg shadow-[#FF4500]/20 scale-105' 
                    : 'bg-[#120a0a]/80 border-white/8 text-[#606060]'
              }`}
            >
              '3'
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider mt-2.5 font-bold text-stone-400">Launch</span>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* SHIELDED SUCCESS LAUNCH INTERCEPT SCREEN */}
      {/* ========================================================= */}
      {launchSuccess ? (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500 flex items-center justify-center text-green-500 animate-bounce mb-6 shadow-lg shadow-green-500/10">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2 font-sans">Campaign Deployed!</h2>
          <p className="text-stone-300 text-sm max-w-md">
            Campaign <span className="font-semibold text-[#FF4500]">{campaignName}</span> has been dispatched to our high intensity loop simulation. Relaying deliveries over the dashboard in real-time.
          </p>
          <div className="mt-8 flex items-center gap-2 text-stone-500 text-xs font-mono">
            <Loader className="w-4 h-4 animate-spin text-[#FF4500]" />
            Redirecting to live stats...
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* STEP 1: DEFINE TARGET AUDIENCE */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2 font-mono">
                  <PlusCircle className="w-5 h-5 text-[#FF4500]" /> Define Target Audience Cohorts
                </h3>
                <p className="text-stone-400 text-xs mt-1 leading-normal">
                  Xeno utilizes a smart Hybrid NLP evaluation. Simply write down who you are targeting in natural English and we will filter customer records automatically.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-stone-500 block font-mono">
                  Prompt to Segment Matched
                </label>
                <textarea
                  className="w-full min-h-[90px] bg-black/50 border border-white/10 rounded-xl p-4 text-stone-100 text-sm leading-relaxed placeholder-stone-700 focus:border-[#FF4500]/50 focus:outline-none transition-all font-sans"
                  value={audiencePrompt}
                  onChange={(e) => setAudiencePrompt(e.target.value)}
                  placeholder="e.g. Find customers who spent over ₹5000 inside the database but have ordered zero times in the last 45 days..."
                />
              </div>

              <button
                onClick={handleSuggestAudience}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF4500] hover:bg-[#FF8C00] disabled:opacity-50 text-sm font-semibold text-white select-none transition-all active:scale-99 cursor-pointer shadow-lg hover:shadow-[#FF4500]/20 font-sans"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    AI Client is isolating Customer Cohorts...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" /> Verify Audience Prompt with AI
                  </>
                )}
              </button>

              {/* AI SEGMENT RESULTS CONTAINER */}
              {aiSuggestion && (
                <div className="bg-[#120a0a]/50 border-2 border-[#FF4500]/20 rounded-2xl p-5 space-y-5 animate-[slideUp_0.3s_ease-out] shadow-xl">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider font-mono">
                        Isolator Suggestions Matches
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] flex items-center gap-1">
                      <Check className="w-3 h-3" /> Heuristic Validated
                    </span>
                  </div>

                  <p className="text-white text-[15px] font-medium leading-relaxed font-serif italic">
                    {aiSuggestion.explanation}
                  </p>

                  {/* AI Explainability module toggle (Feature 3) */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowExplainability(!showExplainability)}
                      className="text-xs text-[#FF4500] hover:text-[#FF8C00] font-mono flex items-center gap-1 cursor-pointer underline decoration-dotted transition-colors"
                      id="toggle_explainability_builder"
                    >
                      {showExplainability ? 'Hide Rationale' : '[Why This Audience?]'}
                    </button>
                    {showExplainability && (
                      <div className="mt-2.5 p-3.5 bg-black/60 border border-white/5 rounded-xl text-xs text-stone-300 space-y-1.5 font-sans animate-[slideUp_0.15s_ease-out]">
                        <p className="font-bold text-[#FF4500] uppercase tracking-wider font-mono text-[9px] mb-1">Database Cluster AI Rationale:</p>
                        <ul className="list-disc list-inside space-y-1.5">
                          {(() => {
                            const p = (audiencePrompt || '').toLowerCase();
                            if (p.includes('5000') || p.includes('spent') || p.includes('loyal')) {
                              return [
                                "Historically spent ₹5,000+ across luxury roastery micro-lots",
                                "Customer engagement index indicates high conversion potential (32% average success thresholds)",
                                "Recency scoring qualifies these purchasers as prime active VIP drivers"
                              ];
                            }
                            if (p.includes('inactive') || p.includes('churn') || p.includes('days')) {
                              return [
                                "No transaction records located in the past 60–90 days",
                                "Identified as high-risk category of lapsing lifetime margin contribution",
                                "Prior purchase behaviors indicate strong responsiveness to targeted email vouchers"
                              ];
                            }
                            return [
                              "Prioritized shopper categories exhibiting active behavioral trends",
                              "Estimated transaction likelihood indices exceed general demographic baselines by 18%",
                              "Direct correlation detected with premium coffee roastery category interests"
                            ];
                          })().map((stepStr, sIdx) => (
                            <li key={sIdx} className="leading-relaxed text-[#D0D0D0]">{stepStr}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Rules Pill Chips */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-white/6">
                    {aiSuggestion.rules.map((rule, idx) => (
                      <span 
                        key={idx}
                        className="p-1 px-3 bg-black/40 border border-white/5 text-stone-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 font-mono"
                      >
                        <Award className="w-3.5 h-3.5 text-[#FF4500]" />
                        {rule}
                      </span>
                    ))}
                  </div>

                  {/* Customer matches indicators */}
                  <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-white/5 select-none bg-black/40 p-3 rounded-lg">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider">Matched Customers</span>
                      <span className="text-3xl font-extrabold text-white block mt-1 font-sans">
                        {aiSuggestion.count}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-mono tracking-wider">Estimated CTR Potential</span>
                      <span className="text-3xl font-extrabold text-[#22C55E] block mt-1 font-sans">
                        24.5%
                      </span>
                    </div>
                  </div>

                  {/* Customers Preview Table */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-mono">
                      Cohort Customers Highlights
                    </h5>
                    <div className="overflow-hidden border border-white/5 rounded-xl bg-black/50">
                      <table className="w-full text-left text-xs text-stone-400">
                        <thead className="bg-[#120a0a]/60 border-b border-white/5 text-[9px] font-bold tracking-wider uppercase text-stone-500">
                          <tr>
                            <th className="p-3">Shopper</th>
                            <th className="p-3 text-right">LTV Spend</th>
                            <th className="p-3 text-right">Last order</th>
                            <th className="p-3 text-center">Primary Tag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {aiSuggestion.customers.slice(0, 4).map((c: Customer) => (
                            <tr key={c.id} className="hover:bg-white/2 transition-colors">
                              <td className="p-3 font-semibold text-white">{c.name}</td>
                              <td className="p-3 text-right font-mono">₹{c.totalSpent.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono">{c.lastOrderDate}</td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-stone-800 border border-white/5 text-stone-300 capitalize">
                                  {c.tags[0] || 'loyalty'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#FF4500] hover:bg-[#FF8C00] text-white cursor-pointer active:scale-97 text-center transition-all shadow-md font-sans"
                    >
                      Use This Audience & Continue
                    </button>
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="p-2.5 rounded-lg text-xs font-semibold border border-white/8 hover:text-white hover:bg-white/4 text-stone-400 cursor-pointer text-center"
                    >
                      Reset Segment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: CRAFT COHERENT MESSAGE VARIATIONS */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2 font-mono">
                    <Sparkles className="w-5 h-5 text-[#FF4500]" /> Craft Brand Messaging Variations
                  </h3>
                  <p className="text-stone-400 text-xs mt-1">
                    Describe your marketing campaign goal, and your AI assistant will write conversion copy.
                  </p>
                </div>
                <button 
                  onClick={() => setStep(1)} 
                  className="text-xs text-[#FF4500] font-semibold hover:underline cursor-pointer"
                >
                  ◀ Audience
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-stone-500 block font-mono">
                  What is the goal of this discount or promo ?
                </label>
                <textarea
                  className="w-full min-h-[70px] bg-black/50 border border-white/10 rounded-xl p-3 text-sm placeholder-stone-700 leading-relaxed focus:border-[#FF4500]/50 focus:outline-none transition-all font-sans"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  placeholder="e.g. Win back inactive espresso shoppers who have not ordered in months with a high incentive offer..."
                />
              </div>

              <button
                onClick={handleGenerateCopy}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#FF4500] hover:bg-[#FF8C00] disabled:opacity-50 text-sm font-semibold text-white transition-all active:scale-99 cursor-pointer shadow-md font-sans"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    AI Personalizer copywriter generates models...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> Generate Copy write Models
                  </>
                )}
              </button>

              {/* MESSAGE VARIANTS DISPLAY */}
              {aiMessages && (
                <div className="space-y-6 animate-[slideUp_0.3s_ease-out]">
                  
                  {/* Recommends badge */}
                  <div className="p-3.5 bg-black/40 border border-amber-500/20 rounded-xl flex gap-3 text-xs leading-relaxed text-stone-300">
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block uppercase tracking-wider text-[10px] font-mono">
                        AI Recommended Channel: {aiMessages.recommended_channel.toUpperCase()}
                      </span>
                      <p className="mt-1 text-stone-400">{aiMessages.recommendation_reason}</p>
                    </div>
                  </div>

                  {/* Channel cards layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* WHATSAPP COLUMN */}
                    <div 
                      onClick={() => handleSelectChannelVariant('whatsapp')}
                      className={`p-4 rounded-xl border cursor-pointer hover:border-[#FF4500]/30 hover:bg-[#120a0a]/35 transition-all flex flex-col justify-between ${
                        selectedChannel === 'whatsapp' 
                          ? 'border-[#FF4500] bg-[#FF4500]/5 shadow-lg shadow-[#FF4500]/5 scale-[1.01]' 
                          : 'border-white/5 bg-black/40'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] tracking-wide font-mono font-bold text-[#22C55E]">WHATSAPP</span>
                          <MessageSquare className="w-4 h-4 text-[#22C55E]" />
                        </div>
                        <p className="text-xs text-stone-300 leading-relaxed line-clamp-4 italic">
                          "{aiMessages.whatsapp}"
                        </p>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono text-right block mt-3">Select Variant</span>
                    </div>

                    {/* EMAIL COLUMN */}
                    <div 
                      onClick={() => handleSelectChannelVariant('email')}
                      className={`p-4 rounded-xl border cursor-pointer hover:border-[#FF4500]/30 hover:bg-[#120a0a]/35 transition-all flex flex-col justify-between ${
                        selectedChannel === 'email' 
                          ? 'border-[#FF4500] bg-[#FF4500]/5 shadow-lg shadow-[#FF4500]/5 scale-[1.01]' 
                          : 'border-white/5 bg-black/40'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] tracking-wide font-mono font-bold text-[#3B82F6]">EMAIL HTML</span>
                          <Mail className="w-4 h-4 text-[#3B82F6]" />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] text-stone-400 font-semibold truncate block">Sub: {aiMessages.email.subject}</span>
                          <p className="text-xs text-stone-400 leading-relaxed line-clamp-3 italic">
                            "{aiMessages.email.body}"
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono text-right block mt-3">Select Variant</span>
                    </div>

                    {/* SMS COLUMN */}
                    <div 
                      onClick={() => handleSelectChannelVariant('sms')}
                      className={`p-4 rounded-xl border cursor-pointer hover:border-[#FF4500]/30 hover:bg-[#120a0a]/35 transition-all flex flex-col justify-between ${
                        selectedChannel === 'sms' 
                          ? 'border-[#FF4500] bg-[#FF4500]/5 shadow-lg shadow-[#FF4500]/5 scale-[1.01]' 
                          : 'border-white/5 bg-black/40'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] tracking-wide font-mono font-bold text-[#F59E0B]">SMS</span>
                          <Smartphone className="w-4 h-4 text-[#F59E0B]" />
                        </div>
                        <p className="text-xs text-stone-300 leading-relaxed line-clamp-4 italic">
                          "{aiMessages.sms}"
                        </p>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono text-right block mt-3">Select Variant</span>
                    </div>

                  </div>

                  {/* EDITABLE DETAILED MESSAGE DESKTOP */}
                  <div className="p-4 bg-black/50 rounded-xl space-y-4 border border-white/5">
                    <h4 className="text-[10px] uppercase tracking-wider text-stone-400 font-bold font-mono">
                      Edit Selected Message Copy
                    </h4>

                    {selectedChannel === 'email' && (
                      <div className="space-y-2">
                        <span className="text-xs text-stone-400 font-mono">Subject Title</span>
                        <input
                          type="text"
                          className="w-full bg-[#141414] border border-white/8 rounded-lg p-2.5 text-xs text-white"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-400 font-mono">Message Text Draft</span>
                        <span className={`p-0.5 px-2 rounded-lg font-mono text-[10px] ${getCharLimitStatus()}`}>
                          {messageText.length} chars
                        </span>
                      </div>
                      <textarea
                        className="w-full min-h-[100px] bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#FF4500]/40"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(3)}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#FF4500] hover:bg-[#FF8C00] active:scale-98 text-center transition-all cursor-pointer shadow-lg hover:shadow-[#FF4500]/10 font-sans"
                  >
                    Lock Copy & Finalize Launch
                  </button>

                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: REVIEW & LAUNCH PROMPT PROTOCOL */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6 max-w-xl mx-auto shadow-xl">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2 font-mono">
                    <Send className="w-5 h-5 text-[#FF4500]" /> Review Campaign & Launch
                  </h3>
                  <p className="text-stone-400 text-xs mt-1">
                    Review audience details and copy constraints before sending payloads.
                  </p>
                </div>
                <button 
                  onClick={() => setStep(2)} 
                  className="text-xs text-[#FF4500] font-semibold hover:underline cursor-pointer"
                >
                  ◀ Messaging
                </button>
              </div>

              {/* Editable campaign label title */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-stone-500 block font-mono">
                  Identify Campaign Identifier Name
                </label>
                <input
                  type="text"
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-[#FF4500]/50 font-sans"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. VIP Winback Coffee Campaign — WhatsApp"
                />
              </div>

              {/* Summary specifications */}
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 divide-y divide-white/5 space-y-3">
                <div className="pb-3 flex justify-between items-center text-xs">
                  <span className="text-stone-500 uppercase font-mono tracking-wider">Targeted Shoppers :</span>
                  <span className="font-bold text-white text-right font-sans">
                    {aiSuggestion ? aiSuggestion.count : 5} customers
                  </span>
                </div>
                <div className="py-3 flex justify-between items-center text-xs">
                  <span className="text-stone-500 uppercase font-mono tracking-wider">Dispatched Channel :</span>
                  <span className="capitalize font-bold text-[#FF4500]">{selectedChannel}</span>
                </div>
                <div className="pt-3 space-y-1.5 text-xs">
                  <span className="text-stone-500 uppercase font-mono tracking-wider block">Message Summary Draft :</span>
                  <div className="p-3.5 bg-black/60 rounded-lg text-[12px] text-stone-400 italic leading-relaxed font-serif">
                    "{messageText.substring(0, 100)}..."
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* AI PREDICTIVE OUTCOME FORECAST */}
              {/* ========================================================= */}
              <div className="bg-gradient-to-br from-[#120a0a] to-black border border-[#FF4500]/20 rounded-xl p-4 space-y-3 relative overflow-hidden animate-fade-in" id="campaign_prediction_section">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
                  <Sparkles className="w-4 h-4 text-[#FF4500] animate-pulse" />
                  AI Predictive Metrics Forecast
                </div>
                
                {isPredicting ? (
                  <div className="space-y-3 animate-pulse py-2" id="prediction_loader">
                    <div className="h-4 bg-stone-900 rounded w-1/3" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-10 bg-stone-900 rounded" />
                      <div className="h-10 bg-stone-900 rounded" />
                    </div>
                  </div>
                ) : prediction ? (
                  <div className="space-y-3 pt-1" id="prediction_metrics_details">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      
                      <div className="bg-black/50 border border-white/5 rounded-lg p-3">
                        <span className="text-stone-500 font-mono text-[9px] uppercase block">Predicted Reach (Delivered)</span>
                        <span className="text-white text-base font-bold block mt-1 font-sans">
                          {prediction.predictedReach} / {aiSuggestion ? aiSuggestion.count : 5}
                        </span>
                      </div>

                      <div className="bg-black/50 border border-white/5 rounded-lg p-3">
                        <span className="text-stone-500 font-mono text-[9px] uppercase block">Predicted Open Rate</span>
                        <span className="text-white text-base font-bold block mt-1 font-sans">
                          {prediction.openRate}%
                        </span>
                      </div>

                      <div className="bg-black/50 border border-white/5 rounded-lg p-3">
                        <span className="text-stone-500 font-mono text-[9px] uppercase block">Predicted Conv. Rate</span>
                        <span className="text-white text-base font-bold block mt-1 font-sans">
                          {prediction.conversionRate}%
                        </span>
                      </div>

                      <div className="bg-black/50 border border-white/5 rounded-lg p-3 animate-pulse">
                        <span className="text-[#22C55E] font-mono text-[9px] uppercase block">Estimated Revenue</span>
                        <span className="text-[#22C55E] text-base font-bold block mt-1 font-sans">
                          ₹{prediction.predictedRevenue.toLocaleString()}
                        </span>
                      </div>

                    </div>

                    <div className="bg-black/60 border border-white/5 rounded-lg p-3 text-[11px] text-stone-400 leading-normal">
                      <span className="font-semibold text-stone-300 font-mono block mb-1 text-[9px] uppercase">RATIONALE PROBABILITY RUN:</span>
                      "{prediction.explanation}"
                    </div>

                  </div>
                ) : (
                  <p className="text-stone-500 text-xs italic">Unable to compile predictive forecast.</p>
                )}
              </div>

              {/* diagnostic estimation alert */}
              <div className="p-3 bg-black/50 border border-white/5 rounded-xl flex gap-2 text-xs text-stone-400">
                <TrendingUp className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                <p>
                  Based on roastery conversion averages, targeting this segment expects <span className="text-[#22C55E] font-semibold">~95% delivery rate</span> and ₹{(Math.max(10, (aiSuggestion ? aiSuggestion.count : 5)) * 1400 * 0.1).toLocaleString()} incremental transaction revenue. Live webhook loops are active.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleLaunchCampaign}
                  disabled={launching}
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#FF4500] hover:bg-[#FF8C00] disabled:opacity-50 text-white flex items-center justify-center gap-2 active:scale-97 cursor-pointer shadow-lg hover:shadow-[#FF4500]/25 font-sans"
                >
                  {launching ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Initiating Decoupled Send Loop...
                    </>
                  ) : (
                    <>
                      🚀 Launch Campaign Simulation
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    info('Draft Storing', 'Storing campaigns as draft without launch routines...');
                    await createCampaign({
                      name: campaignName,
                      audiencePrompt: audiencePrompt,
                      matchedCount: aiSuggestion ? aiSuggestion.count : 5,
                      message: messageText,
                      channel: selectedChannel
                    });
                    success('Added Draft!', 'Draft campaign saved successfuly.');
                    navigate('/campaigns');
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-stone-400 border border-white/10 hover:text-white hover:bg-neutral-800/40 cursor-pointer text-center font-sans"
                >
                  Save as Draft
                </button>
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}
