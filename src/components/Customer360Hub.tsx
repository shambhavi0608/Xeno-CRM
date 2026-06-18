import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  TrendingUp, 
  Wallet, 
  Percent, 
  Activity, 
  Briefcase, 
  Calendar, 
  ShieldAlert, 
  DollarSign, 
  Clock, 
  Smartphone, 
  Mail, 
  User, 
  BadgeCheck, 
  Award, 
  ArrowUpRight, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { Customer360Data } from '../types/index.js';

interface Customer360HubProps {
  data: Customer360Data;
}

export function Customer360Hub({ data }: Customer360HubProps) {
  const { customer, company, status, health, revenue, aiInsight, timeline } = data;

  // Prepare chart data chronologically from customer's actual orders (or derive if none)
  const orderEvents = timeline
    .filter(t => t.type === 'order')
    .map(o => {
      // Extract numeric value from title like "Order Placed: ₹3,500"
      const valStr = o.title.replace(/[^\d]/g, '');
      const value = parseInt(valStr, 10) || 0;
      return {
        date: o.timestamp,
        amount: value,
        formattedAmount: o.title.replace('Order Placed: ', '')
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // If no orders on timeline, generate dummy points representing actual customer baseline
  const chartData = orderEvents.length > 0 ? orderEvents : [
    { date: '2026-01-10', amount: Math.round(customer.totalSpent * 0.25) },
    { date: '2026-03-05', amount: Math.round(customer.totalSpent * 0.35) },
    { date: customer.lastOrderDate, amount: Math.round(customer.totalSpent * 0.4) }
  ];

  // Helper hash avatar color
  const hashAvatarBg = (name: string) => {
    const s = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    const colors = [
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'bg-rose-500/10 text-rose-400 border-rose-500/20',
      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    ];
    return colors[s % colors.length];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 25 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left text-white bg-[#111111] p-1 font-sans"
    >
      {/* LEFT COLUMN: PRIMARY PROFILE + REVENUE BLOCK (5 COLS) */}
      <div className="lg:col-span-5 space-y-5">
        
        {/* 1. CUSTOMER PROFILE CARD */}
        <motion.div 
          id="c360_profile_card"
          variants={cardVariants}
          className="relative overflow-hidden bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-full border flex items-center justify-center font-bold text-lg ${hashAvatarBg(customer.name)}`}>
              {customer.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white truncate font-sans">{customer.name}</h3>
                <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${
                  status === 'active' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : status === 'inactive'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-stone-500/15 text-stone-400 border border-stone-500/20'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-stone-400 truncate mt-0.5">{customer.email}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-stone-500" />
                <span>Company</span>
              </span>
              <span className="font-semibold text-white truncate max-w-[180px]">{company}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-stone-500" />
                <span>Phone</span>
              </span>
              <span className="font-mono font-medium text-stone-300">{customer.phone}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                <span>Customer Since</span>
              </span>
              <span className="font-medium text-stone-300">{customer.memberSince}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                <span>Last Interaction</span>
              </span>
              <span className="font-mono text-[11px] text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/15">
                {customer.lastOrderDate}
              </span>
            </div>
          </div>

          {/* Tags cloud */}
          <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap gap-1.5">
            {customer.tags.map((tag) => (
              <span 
                key={tag} 
                className="text-[10px] font-medium bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-stone-300 px-2 py-1 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* 2. REVENUE CARD & RECHARTS TRACKER */}
        <motion.div 
          id="c360_revenue_card"
          variants={cardVariants}
          className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl space-y-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-400 uppercase flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> REVENUE PROFILE
              </span>
              <h4 className="text-xl font-extrabold text-white mt-1.5">₹{revenue.lifetimeValue.toLocaleString()}</h4>
              <p className="text-[10px] text-stone-400 mt-0.5">Aggregate Lifetime Value (LTV)</p>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold font-mono tracking-wider text-[#FF4500] uppercase block">AOV</span>
              <h5 className="text-sm font-bold text-stone-250 mt-1">₹{revenue.averageOrderValue.toLocaleString()}</h5>
              <p className="text-[9px] text-stone-400 mt-0.5">Average Basket</p>
            </div>
          </div>

          {/* Predictive Indicators Container */}
          <div className="grid grid-cols-2 gap-4 bg-white/[0.015] border border-white/5 rounded-xl p-4">
            <div>
              <span className="text-[9px] text-stone-550 block font-mono uppercase">Predicted Q3 Revenue</span>
              <span className="text-white text-base font-extrabold mt-1 block">₹{revenue.predictedRevenue.toLocaleString()}</span>
              <span className="text-[9px] text-indigo-400 flex items-center gap-0.5 mt-0.5 font-medium">
                <TrendingUp className="w-3 h-3" /> AI Target
              </span>
            </div>

            <div>
              <span className="text-[9px] text-stone-550 block font-mono uppercase">Expected Growth</span>
              <span className={`text-base font-extrabold mt-1 block font-mono ${revenue.expectedGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {revenue.expectedGrowth >= 0 ? '+' : ''}{revenue.expectedGrowth}%
              </span>
              <span className="text-[9px] text-stone-400 block mt-0.5">Based on purchase velocity</span>
            </div>
          </div>

          {/* Sparkline chart of spending history */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-mono text-stone-500 font-bold">Purchase Velocity Area</span>
              <span className="text-[9px] font-mono text-stone-550">Y: Amount (₹)</span>
            </div>
            <div className="h-[120px] w-full bg-black/20 rounded-lg overflow-hidden border border-white/5 pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#6c7a89', fontSize: 8 }} 
                    axisLine={false}
                    tickLine={false} 
                    dy={3}
                  />
                  <YAxis 
                    tick={{ fill: '#6c7a89', fontSize: 8 }} 
                    axisLine={false}
                    tickLine={false}
                    width={20}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 15, 20, 0.95)', 
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px', 
                      fontSize: '10px',
                      color: '#ffffff'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#818cf8" 
                    strokeWidth={1.5}
                    fillOpacity={1} 
                    fill="url(#colorAmt)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </motion.div>

      </div>

      {/* RIGHT COLUMN: HEALTH CARD + AI INSIGHT + TIMELINE (7 COLS) */}
      <div className="lg:col-span-7 space-y-5">
        
        {/* 3. CUSTOMER HEALTH CARD */}
        <motion.div 
          id="c360_health_card"
          variants={cardVariants}
          className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold tracking-wider text-stone-300 uppercase font-mono">Cognitive Health Metric</h4>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-stone-500 font-mono uppercase">RFM Anchor</span>
              <span className="font-mono text-xs text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                {health.rfmScore}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 mt-5 items-center">
            
            {/* Health visual progress ring */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 border-r border-white/5">
              <div className="relative w-24 h-24 flex items-center justify-center">
                
                {/* SVG Radial loader */}
                <svg className="absolute inset-0 w-full h-full rotate-270" viewBox="0 0 36 36">
                  <path
                    className="text-stone-900"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      health.healthScore >= 70 
                        ? 'text-emerald-500' 
                        : health.healthScore >= 40 
                          ? 'text-amber-500' 
                          : 'text-red-500'
                    }
                    strokeWidth="3.2"
                    strokeDasharray={`${health.healthScore}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="block text-2xl font-extrabold text-white font-mono">{health.healthScore}</span>
                  <span className="text-[8px] uppercase tracking-wider text-stone-400 font-bold">Health Score</span>
                </div>
              </div>
            </div>

            {/* Score indices blocks */}
            <div className="sm:col-span-7 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-stone-400 font-medium">Engagement Score</span>
                  <span className="text-white font-bold font-mono">{health.engagementScore}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${health.engagementScore}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  <span className="text-[10px] text-stone-500 block font-mono uppercase">Loyalty Status</span>
                  <span className={`text-xs font-bold font-mono mt-1 px-2 py-0.5 rounded border inline-block ${
                    health.churnRisk === 'High' 
                      ? 'text-red-400 bg-red-400/10 border-red-400/20' 
                      : health.churnRisk === 'Medium'
                        ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                        : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                  }`}>
                    {health.churnRisk || 'Low'} Churn Risk
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-500 block font-mono uppercase">AOV Rating</span>
                  <span className="text-xs font-bold text-white block mt-1.5">
                    {revenue.averageOrderValue >= 4000 ? 'High' : revenue.averageOrderValue >= 2000 ? 'Medium' : 'Standard'} Tier
                  </span>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* 4. AI INSIGHT CARD (SPARKLE STYLE) */}
        <motion.div 
          id="c360_ai_insight_card"
          variants={cardVariants}
          className="relative bg-gradient-to-b from-[#18110b] to-[#120a06] border border-[#FF4500]/20 rounded-2xl p-6 shadow-2xl"
        >
          <div className="absolute top-1 right-2 animate-pulse pointer-events-none">
            <Sparkles className="w-5 h-5 text-[#FF4500]/20" />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 px-2 rounded-md bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/25 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase">Gemini Generative Guard</span>
            </div>
            <span className="text-[10px] text-amber-500 font-medium">Cognitive Insights Engine Live</span>
          </div>

          <div className="space-y-4">
            {/* AI Summary */}
            <div className="space-y-1 text-left">
              <h5 className="text-[11px] font-bold text-amber-300 font-mono flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#FF4500]" /> SUMMARY POSITION
              </h5>
              <p className="text-xs text-stone-250 leading-relaxed font-sans">{aiInsight.summary}</p>
            </div>

            {/* Behaviour */}
            <div className="space-y-1 text-left">
              <h5 className="text-[11px] font-bold text-amber-300 font-mono flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#FF4500]" /> CUSTOMER HABIT BEHAVIOUR
              </h5>
              <p className="text-xs text-stone-300 leading-relaxed font-sans">{aiInsight.behaviour}</p>
            </div>

            {/* Growth / Risk */}
            <div className="space-y-1 text-left">
              <h5 className="text-[11px] font-bold text-amber-300 font-mono flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#FF4500]" /> LATEST RISK ANALYSIS
              </h5>
              <p className="text-xs text-stone-300 leading-relaxed font-sans">{aiInsight.riskAnalysis}</p>
            </div>

            {/* Strategy Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-[#FF4500]/10 mt-4">
              <div className="bg-black/40 border border-[#FF4500]/10 rounded-xl p-3.5 text-left">
                <span className="text-[10px] font-bold text-[#FF4500] font-mono block uppercase">Tactical Recommended Action</span>
                <p className="text-xs text-stone-300 mt-1 font-sans">{aiInsight.recommendedAction}</p>
              </div>

              <div className="bg-black/40 border border-[#FF4500]/10 rounded-xl p-3.5 text-left">
                <span className="text-[10px] font-bold text-emerald-400 font-mono block uppercase">Tailored Upsell Pitch</span>
                <p className="text-xs text-stone-300 mt-1 font-sans">{aiInsight.upsellOpportunity}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 5. ACTIVITY TIMELINE */}
        <motion.div 
          id="c360_activity_timeline"
          variants={cardVariants}
          className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4"
        >
          <div>
            <h4 className="text-xs font-bold tracking-wider text-stone-300 uppercase font-mono">Engagement Timeline Log</h4>
            <p className="text-[10px] text-stone-500">Cross-channel touchpoints mapped in chronological sequence</p>
          </div>

          <div className="relative border-l border-white/10 pl-5 ml-2.5 space-y-6 pt-2 pb-2">
            
            {timeline.slice(0, 6).map((item, index) => {
              // Custom colors & icons based on item type
              let dotColor = 'bg-stone-500 border-stone-400 ring-stone-900/40';
              let IconComponent = Clock;

              if (item.type === 'order') {
                dotColor = 'bg-[#FF4500] border-orange-400 ring-orange-950/40';
                IconComponent = DollarSign;
              } else if (item.type === 'sent') {
                dotColor = 'bg-purple-500 border-purple-400 ring-purple-950/40';
                IconComponent = Mail;
              } else if (item.type === 'opened') {
                dotColor = 'bg-cyan-500 border-cyan-400 ring-cyan-950/40';
                IconComponent = Smartphone;
              } else if (item.type === 'responded') {
                dotColor = 'bg-emerald-500 border-emerald-400 ring-emerald-950/40';
                IconComponent = ArrowUpRight;
              } else if (item.type === 'ai_recommendation') {
                dotColor = 'bg-amber-500 border-amber-300 ring-amber-950/40';
                IconComponent = Sparkles;
              }

              return (
                <div key={item.id} className="relative group text-left">
                  {/* Glowing vertical connector checkpoint */}
                  <div className={`absolute -left-[26px] top-1 w-3.5 h-3.5 rounded-full border-2 ${dotColor} ring-4 transition-all group-hover:scale-110 z-10`} />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                      <IconComponent className="w-3 h-3 text-stone-450" />
                      {item.timestamp}
                    </span>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 select-none rounded bg-white/5 text-stone-400 inline-block w-fit">
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>

                  <h5 className="text-[12px] font-bold text-white mt-1 group-hover:text-amber-400 transition-colors font-sans leading-snug">
                    {item.title}
                  </h5>
                  
                  <p className="text-xs text-stone-400 mt-0.5 leading-relaxed font-sans">
                    {item.description}
                  </p>
                </div>
              );
            })}

          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
