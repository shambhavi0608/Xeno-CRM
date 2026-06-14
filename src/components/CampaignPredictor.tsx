import React, { useState, useEffect } from 'react';
import { predictCampaign } from '../lib/api.js';
import { Campaign, CampaignPrediction } from '../types/index.js';
import { Sparkles, TrendingUp, HelpCircle, Users, Percent, DollarSign, MessageSquare, Lightbulb } from 'lucide-react';

interface CampaignPredictorProps {
  campaigns: Campaign[];
}

export default function CampaignPredictor({ campaigns }: CampaignPredictorProps) {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'sms' | 'rcs'>('whatsapp');
  const [cohortSize, setCohortSize] = useState<number>(30);
  const [promoType, setPromoType] = useState<string>('discount_15');
  const [prediction, setPrediction] = useState<CampaignPrediction | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Calculate historical baselines from previous completed campaigns
  const completedCamp = campaigns.filter(c => c.status === 'completed' || c.sent_count > 0);
  const totalSent = completedCamp.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalDelivered = completedCamp.reduce((sum, c) => sum + (c.delivered_count || 0), 0);
  const totalOpened = completedCamp.reduce((sum, c) => sum + (c.opened_count || 0), 0);
  const totalClicked = completedCamp.reduce((sum, c) => sum + (c.clicked_count || 0), 0);
  const totalRevenue = completedCamp.reduce((sum, c) => sum + (c.revenue_attributed || 0), 0);

  const histOpenRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 74;
  const histConvRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 48;
  const histAvgRevenue = completedCamp.length > 0 ? Math.round(totalRevenue / completedCamp.length) : 1850;

  // Run the predictor algorithm using both client heuristics and real API formulas
  const runPredictor = async () => {
    setIsSimulating(true);
    try {
      // Create artificial processing delay for visual punch
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const res = await predictCampaign({
        channel,
        matchedCount: cohortSize,
        message: 'Generic trial copy containing {name} placeholder and coupon codes.',
        audiencePrompt: 'Segment of spent over target limits'
      });

      // Factor promo type weights into conversion
      let multiplier = 1.0;
      if (promoType === 'discount_20') multiplier = 1.25;
      if (promoType === 'cashback_500') multiplier = 1.4;
      if (promoType === 'announce') multiplier = 0.7;

      const adjustedConv = Math.min(95, Math.round(res.conversionRate * multiplier));
      const adjustedRev = Math.round(res.predictedRevenue * multiplier);

      setPrediction({
        predictedReach: res.predictedReach,
        openRate: res.openRate,
        conversionRate: adjustedConv,
        predictedRevenue: adjustedRev,
        explanation: res.explanation
      });
    } catch (e) {
      console.error('Error generating predictive model:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    runPredictor();
  }, [channel, cohortSize, promoType]);

  // Propose a contextual optimization hint based on configuration selected
  const getOptimizationHint = () => {
    if (channel === 'sms') {
      return {
        text: 'SMS has a rigid 160-char cost block. Upgrade to WhatsApp to increase overall conversion rates by ~35% with full graphic coupon card attachments.',
        impact: '+35% CTR Potential'
      };
    }
    if (channel === 'email' && cohortSize > 50) {
      return {
        text: 'Bulk email streams perform best when segmented under ₹5,000 orders. Split audience into micro-offers to avoid spam categories.',
        impact: '-12% Bounce Risk'
      };
    }
    if (promoType === 'announce') {
      return {
        text: 'Informational announcements generate high open rates but dry checkout lines. Attach a limited 10% voucher code to boost purchase intent.',
        impact: '₹1,500+ Revenue Boost'
      };
    }
    return {
      text: 'Your current selections represent highly optimized D2C retention parameters! Proceed to draft creation.',
      impact: 'Highly Optimized'
    };
  };

  const hint = getOptimizationHint();

  return (
    <div className="bg-[#0a0505]/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Visual top bar header */}
      <div className="absolute top-0 right-0 w-[250px] h-[150px] bg-[#FF4500]/5 rounded-full filter blur-[80px] pointer-events-none select-none" />
      
      <div className="mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4.5 h-4.5 text-[#FF4500]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-white flex items-center gap-1.5">
            AI Campaign Performance Predictor (Feature 4)
          </h3>
        </div>
        <p className="text-xs text-stone-400 mt-1 leading-normal font-sans">
          Simulate marketing return on investment models by blending live CRM logs with predictive hybrid parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10 flex-1">
        
        {/* Left: Interactive Controls configuration panel */}
        <div className="space-y-4 bg-black/30 p-4 rounded-xl border border-white/5">
          <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest font-mono block">Simulation Deck</span>
          
          {/* Target Channel Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-stone-400 font-mono block">Outbound Channel</label>
            <div className="grid grid-cols-4 gap-1">
              {(['whatsapp', 'email', 'sms', 'rcs'] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`py-1 rounded text-[10px] font-mono font-bold capitalize transition-all cursor-pointer ${
                    channel === ch 
                      ? 'bg-[#FF4500]/10 border border-[#FF4500] text-[#FF4500]' 
                      : 'bg-[#120a0a]/50 border border-white/5 text-stone-400 hover:text-white'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Target Cohort Size Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-stone-400">Recipient Cohort Size</span>
              <span className="text-white font-bold">{cohortSize} contacts</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={cohortSize}
              onChange={(e) => setCohortSize(Number(e.target.value))}
              className="w-full accent-[#FF4500] h-1 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Selective Promotion Type Voucher */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-stone-400 font-mono block font-sans">Promotion Core Offer</label>
            <select
              value={promoType}
              onChange={(e) => setPromoType(e.target.value)}
              className="w-full bg-[#120a0a]/80 border border-white/10 rounded-lg p-2 text-[11px] text-stone-200 focus:outline-none focus:border-[#FF4500]/50 font-sans"
            >
              <option value="discount_15">VIP Reward Perks (15% Off Code)</option>
              <option value="discount_20">Aggressive Churn Loss Mitigation (20% Off)</option>
              <option value="cashback_500">Urgent Flash Buyback (₹500 Direct Cash reward)</option>
              <option value="announce">Plain Newsletter (No discount, content only)</option>
            </select>
          </div>

          {/* Baseline Reference Stats */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-stone-500">
            <span>Historical baseline references:</span>
            <span className="font-bold text-stone-450">{histOpenRate}% Open / {histConvRate}% Conv</span>
          </div>
        </div>

        {/* Right: Real-time simulation outputs */}
        <div className="flex flex-col justify-between space-y-4">
          
          {isSimulating ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 bg-black/20 rounded-xl border border-white/4">
              <div className="w-6 h-6 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-[10px] font-mono text-[#FF4500] tracking-widest uppercase font-bold">Predicting returns...</p>
            </div>
          ) : prediction ? (
            <div className="space-y-3 flex-1">
              <div className="grid grid-cols-2 gap-2">
                
                {/* Simulated deliveries */}
                <div className="bg-white/2 p-2.5 rounded-xl border border-white/5 text-center">
                  <span className="text-[8px] font-mono text-stone-500 uppercase tracking-wider block">Estimated Reach</span>
                  <div className="text-sm font-bold text-white flex items-center justify-center gap-1 mt-1">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>{prediction.predictedReach} <span className="text-[10px] font-normal text-stone-500">/ {cohortSize}</span></span>
                  </div>
                </div>

                {/* Estimated Revenue */}
                <div className="bg-white/2 p-2.5 rounded-xl border border-white/5 text-center">
                  <span className="text-[8px] font-mono text-stone-500 uppercase tracking-wider block">Projected Revenue</span>
                  <div className="text-sm font-extrabold text-emerald-400 mt-1 flex items-center justify-center gap-0.5">
                    <span className="text-xs font-normal">₹</span>
                    <span>{prediction.predictedRevenue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Average Open Rate predicted */}
                <div className="bg-white/2 p-2.5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-mono text-stone-500 uppercase tracking-wider">Estimated Open</span>
                    <Percent className="w-2.5 h-2.5 text-blue-450" />
                  </div>
                  <div className="text-xs font-bold text-white mt-1 font-mono flex items-baseline gap-1">
                    <span>{prediction.openRate}%</span>
                    <span className={`text-[8px] font-normal ${prediction.openRate >= histOpenRate ? 'text-emerald-500' : 'text-red-400'}`}>
                      {prediction.openRate >= histOpenRate ? '▲' : '▼'} {Math.abs(prediction.openRate - histOpenRate)}% vs ref
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${prediction.openRate}%` }} />
                  </div>
                </div>

                {/* Estimated Click to open */}
                <div className="bg-white/2 p-2.5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-mono text-stone-500 uppercase tracking-wider">Conversion rate</span>
                    <Percent className="w-2.5 h-2.5 text-amber-500" />
                  </div>
                  <div className="text-xs font-bold text-white mt-1 font-mono flex items-baseline gap-1">
                    <span>{prediction.conversionRate}%</span>
                    <span className={`text-[8px] font-normal ${prediction.conversionRate >= histConvRate ? 'text-emerald-500' : 'text-red-400'}`}>
                      {prediction.conversionRate >= histConvRate ? '▲' : '▼'} {Math.abs(prediction.conversionRate - histConvRate)}% vs ref
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300" style={{ width: `${prediction.conversionRate}%` }} />
                  </div>
                </div>

              </div>

              {/* Context Summary description paragraph */}
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[8px] font-bold text-amber-500 uppercase font-mono tracking-wider block">Live Feedback Insights</span>
                  <p className="text-[10px] text-stone-400 leading-relaxed mt-0.5">
                    {prediction.explanation}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Optimization Recommendation Capsule */}
          <div className="p-3 bg-[#FF4500]/5 border border-[#FF4500]/15 rounded-xl flex items-start gap-2 select-none">
            <Sparkles className="w-3.5 h-3.5 text-[#FF4500] shrink-0 mt-0.5 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold text-[#FF4500] uppercase font-mono tracking-wider">AI Optimization Suggestion</span>
                <span className="text-[7px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 rounded uppercase tracking-wide border border-emerald-500/25">{hint.impact}</span>
              </div>
              <p className="text-[9px] text-stone-400 mt-1 leading-normal">
                {hint.text}
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
