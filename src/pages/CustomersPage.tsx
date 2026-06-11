import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  DollarSign, 
  ShoppingBag, 
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Database,
  Upload,
  X,
  RefreshCw,
  Download
} from 'lucide-react';
import { fetchCustomers, fetchCustomerDetails, ingestCustomerData } from '../lib/api.js';
import { Customer, Order } from '../types/index.js';
import { Badge } from '../components/ui/Badge.js';
import { Drawer } from '../components/ui/Drawer.js';
import { SkeletonCard } from '../components/ui/SkeletonCard.js';
import { useToast } from '../components/ui/Toast.js';

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'High Value', value: 'high-value' },
  { label: 'At Risk', value: 'at-risk' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'New', value: 'new' }
];

// picks a luxury dark tone for the initials circle
const hashAvatarBg = (name: string) => {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  const palettes = [
    'bg-[#1A2A3A] border-blue-500/20 text-blue-300',
    'bg-[#2A1A2A] border-purple-500/20 text-purple-300',
    'bg-[#1A2A1A] border-green-500/20 text-green-300',
    'bg-[#2A2015] border-amber-500/20 text-amber-300',
    'bg-[#2E1A1A] border-red-500/20 text-red-300'
  ];
  return palettes[code % palettes.length];
};

export default function CustomersPage() {
  const { success, error } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Drawer state management
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  // Ingest state management
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isIngestersLoading, setIsIngestersLoading] = useState(false);

  // Export Customer CSV Database
  const exportCustomersCSV = () => {
    try {
      const headers = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Member Since',
        'Total Spent (INR)',
        'Order Count',
        'Last Order Date',
        'Tags',
        'Health Score',
        'Engagement Score',
        'Churn Risk'
      ];

      const rows = customers.map(c => [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.email.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        c.memberSince,
        c.totalSpent,
        c.orderCount,
        c.lastOrderDate,
        `"${c.tags.join(', ')}"`,
        c.healthScore || 0,
        c.engagementScore || 0,
        c.churnRisk || 'Low'
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `xeno_crm_customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('Database Export Complete', 'Customer roster downloaded successfully.');
    } catch (err: any) {
      error('Export Failed', err.message || 'Unable to generate customer CSV.');
    }
  };
  const [ingestErrorStr, setIngestErrorStr] = useState<string | null>(null);
  const [ingestResult, setIngestResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      addedCustomers: number;
      addedOrders: number;
      totalCustomers: number;
      totalOrders: number;
    }
  } | null>(null);

  const [ingestPayload, setIngestPayload] = useState(
    JSON.stringify({
      "customers": [
        {
          "id": "c_user_950",
          "name": "Reyansh Deshmukh",
          "email": "reyansh.deshmukh@nestcafe.in",
          "phone": "+919811223344",
          "tags": ["high-value", "espresso-connoisseur"],
          "totalSpent": 15400,
          "orderCount": 5,
          "lastOrderDate": "2026-06-08"
        },
        {
          "id": "c_user_951",
          "name": "Shanaya Kapoor",
          "email": "shanaya.k@rediffmail.com",
          "phone": "+919933112233",
          "tags": ["new", "chemex-user"],
          "totalSpent": 3200,
          "orderCount": 1,
          "lastOrderDate": "2026-06-09"
        }
      ],
      "orders": [
        {
          "orderId": "ord_ing_9901",
          "customerId": "c_user_950",
          "amount": 3400,
          "items": ["Peaberry Special Roast Bag", "Stainless Steel Mesh Spoon"],
          "timestamp": "2026-06-08"
        },
        {
          "orderId": "ord_ing_9902",
          "customerId": "c_user_951",
          "amount": 3200,
          "items": ["6-Cup Glass Chemex Brewer Pot"],
          "timestamp": "2026-06-09"
        }
      ]
    }, null, 2)
  );

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await fetchCustomers(search, selectedTag);
      setCustomers(data);
    } catch (err) {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngestSubmit = async () => {
    try {
      setIsIngestersLoading(true);
      setIngestErrorStr(null);
      setIngestResult(null);

      let parsed;
      try {
        parsed = JSON.parse(ingestPayload);
      } catch (err: any) {
        throw new Error(`JSON Syntax Error: ${err.message}`);
      }

      const res = await ingestCustomerData(parsed);
      setIngestResult({
        success: true,
        message: res.message || 'Data Ingested Successfully!',
        stats: res.stats
      });
      
      // Reload customer roster live!
      loadCustomers();
    } catch (err: any) {
      setIngestErrorStr(err.message || 'Unknown Ingestion Error');
    } finally {
      setIsIngestersLoading(false);
    }
  };

  // Run initial search
  useEffect(() => {
    loadCustomers();
  }, [search, selectedTag]);

  const handleOpenCustomer = async (cust: Customer) => {
    setActiveCustomer(cust);
    setIsDrawerOpen(true);
    setIsDrawerLoading(true);
    try {
      const details = await fetchCustomerDetails(cust.id);
      setActiveOrders(details.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const getRelativeOrderDays = (dateStr: string) => {
    const last = new Date(dateStr);
    const now = new Date('2026-06-10T12:43:29Z'); // Use standard local anchor date
    const diffMs = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  const getRelativeOrderColor = (dateStr: string) => {
    const last = new Date(dateStr);
    const now = new Date('2026-06-10T12:43:29Z');
    const diffMs = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return 'text-[#22C55E]';
    if (diffDays <= 60) return 'text-amber-500';
    return 'text-[#EF4444]';
  };

  return (
    <div className="space-y-6 animate-fade-in text-white leading-normal relative">
      
      {/* Decorative Blur Pools to match Editorial Aesthetic */}
      <div className="absolute top-[-50px] right-[-100px] w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF4500 0%, transparent 70%)' }}></div>

      {/* ========================================================= */}
      {/* HEADER BAR */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-white font-sans">Customers</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-stone-900 border border-white/8 text-stone-400">
            {customers.length} synced
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Customers CSV Button */}
          <button 
            onClick={exportCustomersCSV}
            className="flex text-xs font-semibold py-2 px-4 rounded-lg bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 shadow-lg shadow-[#22C55E]/5 transition-all cursor-pointer font-sans items-center gap-1.5 active:scale-95"
            id="export_customers_csv_btn"
          >
            <Download className="w-3.5 h-3.5" />
            Export Customers
          </button>

          {/* Data Ingestion Utility Trigger */}
          <button 
            onClick={() => setIsIngestOpen(true)}
            className="flex text-xs font-semibold py-2 px-4 rounded-lg bg-[#FF4500]/95 hover:bg-[#FF4500] text-white border border-[#FF4500]/25 shadow-lg shadow-[#FF4500]/10 transition-all cursor-pointer font-sans items-center gap-1.5 active:scale-95"
          >
            <Database className="w-3.5 h-3.5" />
            Ingest Data Suite
          </button>
          
          {/* Diagnostic Ingestion Utility */}
          {customers.length > 0 && (
            <button 
              onClick={() => handleOpenCustomer(customers[0])}
              className="hidden sm:flex text-xs font-semibold py-2 px-4 rounded-lg border border-white/10 text-stone-400 hover:text-white hover:bg-white/4 backdrop-blur-md transition-all cursor-pointer font-mono items-center gap-1.5"
            >
              Open Inspector
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SEARCH + FILTER CHIPS */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-500" />
          <input
            type="text"
            className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-stone-600 focus:border-[#FF4500]/50 focus:ring-1 focus:ring-[#FF4500]/20 focus:outline-none transition-all font-sans"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 select-none">
          {TABS.map((tab) => {
            const isSelected = selectedTag === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedTag(tab.value)}
                className={`text-xs px-4 py-2 rounded-full border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF4500]/12 border-[#FF4500] text-[#FF4500] font-semibold'
                    : 'bg-[#120a0a]/50 border-white/8 text-stone-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CUSTOMERS GRID */}
      {/* ========================================================= */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard count={3} />
        </div>
      ) : isError ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[#EF4444] mx-auto mb-3" />
          <h4 className="text-white font-semibold">Failed to load shoppers</h4>
          <button onClick={loadCustomers} className="mt-4 px-4 py-2 bg-[#120a0a]/50 border border-white/8 rounded-lg text-xs cursor-pointer">
            Retry
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-[#5c4a4a] mb-3 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">No customers found</h3>
          <p className="text-stone-400 text-xs mt-1">Try refining search parameters or reset demo metrics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => {
            const initials = c.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2);

            const labelTag = c.tags[0] || 'regular';

            return (
              <div
                key={c.id}
                onClick={() => handleOpenCustomer(c)}
                className="bg-[#0a0505]/30 backdrop-blur-xl border border-white/10 hover:border-[#FF4500]/30 hover:bg-[#120a0a]/10 rounded-2xl p-5 hover:-translate-y-0.5 shadow-md active:scale-99 cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* TOP ROW */}
                  <div className="flex gap-3.5">
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${hashAvatarBg(c.name)}`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-sm font-semibold text-stone-100 group-hover:text-[#FF8C00] transition-colors truncate font-sans">
                        {c.name}
                      </h3>
                      <p className="text-[11px] text-stone-550 truncate mt-0.5">{c.email}</p>
                    </div>

                    <div className="shrink-0 h-fit">
                      <Badge
                        variant={
                          labelTag === 'high-value' ? 'success' :
                          labelTag === 'at-risk' ? 'warning' :
                          labelTag === 'new' ? 'info' :
                          'muted'
                        }
                      >
                        {labelTag}
                      </Badge>
                    </div>
                  </div>

                  {/* STATS ROW */}
                  <div className="grid grid-cols-3 gap-1 mt-6 border border-white/5 py-3/5 text-center bg-black/40 rounded-xl p-2.5">
                    <div>
                      <span className="text-[9px] text-[#7a6f6f] uppercase tracking-wider block font-mono">Spent</span>
                      <span className="text-stone-200 text-xs font-bold mt-1 block font-sans">₹{c.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="border-l border-r border-white/5">
                      <span className="text-[9px] text-[#7a6f6f] uppercase tracking-wider block font-mono">Orders</span>
                      <span className="text-stone-200 text-xs font-bold mt-1 block font-sans">{c.orderCount}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#7a6f6f] uppercase tracking-wider block font-mono">Last Act</span>
                      <span className={`text-[#A0A0A0] text-xs font-bold mt-1 block font-mono ${getRelativeOrderColor(c.lastOrderDate)}`}>
                        {getRelativeOrderDays(c.lastOrderDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PHONE FOOTER ROW */}
                <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-stone-550 leading-none">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-[#5c4a4a]" />
                    <span>{c.phone}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#FF4500]" />
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* CUSTOMER PROFILE DRAWER DETAIL */}
      {/* ========================================================= */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Shopper Comprehensive Summary"
        width="max-w-md"
      >
        {activeCustomer && (
          <div className="p-6 space-y-6">
            
            {/* HERO SEGMENT */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-white/6">
              <div className={`w-16 h-16 rounded-full border flex items-center justify-center font-bold text-xl mb-4 ${hashAvatarBg(activeCustomer.name)}`}>
                {activeCustomer.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
              </div>
              <h3 className="text-base font-bold text-white tracking-tight font-sans">{activeCustomer.name}</h3>
              <p className="text-xs text-stone-400 mt-1">{activeCustomer.email}</p>
              
              <div className="mt-3 flex gap-1 flex-wrap justify-center">
                {activeCustomer.tags.map((tag, i) => (
                  <Badge 
                    key={tag} 
                    variant={
                      i === 0 ? 'brand' : 'muted'
                    }
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* AI PREDICTIVE METRICS & HEALTH SCORE */}
            <div className="space-y-3" id="drawer_ai_health_score_section">
              <h4 className="text-[10px] uppercase tracking-wider text-[#FF4500] font-bold font-mono flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Health & Churn Risk
              </h4>
              <div className="bg-[#120a0a]/50 border border-[#FF4500]/20 rounded-xl p-4 space-y-4">
                
                {/* Visual health score progress bar */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-stone-400 font-medium">Customer Health Score</span>
                    <span className="text-[#FF4500] font-bold font-mono">{activeCustomer.healthScore || 0}/100</span>
                  </div>
                  <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${activeCustomer.healthScore || 0}%` }}
                    />
                  </div>
                </div>

                {/* Substats for Churn Risk and Engagement Score */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[9px] text-stone-500 font-mono block uppercase">Churn Risk Level</span>
                    <span className={`text-xs font-bold font-mono mt-1 px-2 py-0.5 rounded border inline-block ${
                      activeCustomer.churnRisk === 'High' 
                        ? 'text-red-400 bg-red-400/10 border-red-400/25' 
                        : activeCustomer.churnRisk === 'Medium'
                          ? 'text-amber-400 bg-amber-400/10 border-amber-400/25'
                          : 'text-green-400 bg-green-400/10 border-green-400/25'
                    }`}>
                      {activeCustomer.churnRisk || 'Low'} Risk
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-stone-500 font-mono block uppercase">Engagement Score</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-white text-sm font-bold font-mono">{activeCustomer.engagementScore || 0}%</span>
                      <span className="text-[10px] text-stone-400">({
                        (activeCustomer.engagementScore || 0) > 75 
                          ? 'Excellent' 
                          : (activeCustomer.engagementScore || 0) > 40
                            ? 'Moderate'
                            : 'Failing'
                      })</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* OVERVIEW SUB-STAT CONTAINER */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider text-[#7a6f6f] font-bold font-mono">
                Financial Footprint
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <span className="text-[10px] text-stone-500 font-mono block">Aggregate LTV</span>
                  <span className="text-white text-lg font-bold mt-1.5 block font-sans">₹{activeCustomer.totalSpent.toLocaleString()}</span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <span className="text-[10px] text-stone-500 font-mono block">Order Frequency</span>
                  <span className="text-white text-lg font-bold mt-1.5 block font-sans">{activeCustomer.orderCount} purchase(s)</span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <span className="text-[10px] text-stone-500 font-mono block">Last Order Interval</span>
                  <span className={`text-sm font-bold mt-1.5 block font-mono ${getRelativeOrderColor(activeCustomer.lastOrderDate)}`}>
                    {activeCustomer.lastOrderDate}
                  </span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <span className="text-[10px] text-stone-500 font-mono block">VIP Cohort JoinDate</span>
                  <span className="text-white text-sm font-bold mt-1.5 block font-sans">{activeCustomer.memberSince}</span>
                </div>
              </div>
            </div>

            {/* RECENT ORDERS SUITE */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider text-[#7a6f6f] font-bold font-mono">
                Order Activity Log
              </h4>

              {isDrawerLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-10 bg-stone-900 rounded-lg" />
                  <div className="h-10 bg-stone-900 rounded-lg" />
                </div>
              ) : activeOrders.length === 0 ? (
                <p className="text-stone-500 text-xs italic">No orders logged.</p>
              ) : (
                <div className="space-y-2">
                  {activeOrders.map((o) => (
                    <div 
                      key={o.orderId}
                      className="p-3 bg-black/40 border border-white/5 rounded-xl flex justify-between items-center"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-stone-500 block">ID: {o.orderId}</span>
                        <span className="text-stone-300 text-xs font-semibold mt-1 leading-normal truncate block font-sans">
                          {o.items.join(', ')}
                        </span>
                        <span className="text-[10px] text-stone-500 block mt-1 font-mono">{o.timestamp}</span>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-white text-sm font-bold block font-sans">₹{o.amount.toLocaleString()}</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-green-500/10 text-green-500 border border-green-500/20 capitalize mt-1 inline-block">
                          Completed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </Drawer>

      {/* ========================================================= */}
      {/* INGEST CUSTOMER DATA & ORDER SUITE MODAL (Durable & Relational) */}
      {/* ========================================================= */}
      {isIngestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
          <div className="w-full max-w-2xl rounded-3xl bg-[#0e0707] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-[#FF4500]/10 border border-[#FF4500]/25 rounded-xl flex items-center justify-center text-[#FF4500]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans text-left">Data Ingestion Suite</h3>
                  <p className="text-[10px] text-stone-500 font-mono uppercase text-left">Batch Relational Customer & Order Inwarding</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsIngestOpen(false);
                  setIngestResult(null);
                  setIngestErrorStr(null);
                }}
                className="p-1.5 rounded-lg hover:bg-white/5 border border-white/5 text-stone-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-left">
              
              <div className="space-y-1.5 text-left">
                <span className="text-xs uppercase font-bold text-[#FF8C00] block font-mono">Relational Schema Blueprint</span>
                <p className="text-stone-400 text-xs font-light leading-relaxed">
                  Supply custom user rosters and order logs together. The backend engine instantly maps contacts, links order logs by matched ID, increments aggregate LTV values, and triggers the workspace live statistics.
                </p>
              </div>

              {/* Sample loader row */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-white/5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse animate-spin" />
                  <span className="text-stone-300 font-sans font-medium">Auto-Generate Mock Roster?</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const rnd = Math.floor(Math.random() * 899 + 100);
                    setIngestPayload(JSON.stringify({
                      "customers": [
                        {
                          "id": `c_user_${rnd}`,
                          "name": "Prof. Ishaan Sen",
                          "email": `ishaan.sen_${rnd}@roasteryclub.in`,
                          "phone": `+91987000${rnd}`,
                          "tags": ["high-value", "single-origin-fans"],
                          "totalSpent": 18200,
                          "orderCount": 6,
                          "lastOrderDate": "2026-06-08"
                        },
                        {
                          "id": `c_user_${rnd+1}`,
                          "name": "Kriti Malhotra",
                          "email": `kriti.m_${rnd}@gmail.com`,
                          "phone": `+91993200${rnd}`,
                          "tags": ["new"],
                          "totalSpent": 2750,
                          "orderCount": 1,
                          "lastOrderDate": "2026-06-09"
                        }
                      ],
                      "orders": [
                        {
                          "orderId": `ord_inw_${Date.now()}_1`,
                          "customerId": `c_user_${rnd}`,
                          "amount": 4250,
                          "items": ["South Indian Filter Roast Grind Pack", "Brass Traditional Dabara Set"],
                          "timestamp": "2026-06-08"
                        },
                        {
                          "orderId": `ord_inw_${Date.now()}_2`,
                          "customerId": `c_user_${rnd+1}`,
                          "amount": 2750,
                          "items": ["French Press Plunger Unit Matte Black"],
                          "timestamp": "2026-06-09"
                        }
                      ]
                    }, null, 2));
                    setIngestResult(null);
                    setIngestErrorStr(null);
                  }}
                  className="px-2.5 py-1 rounded bg-[#FF4500]/15 hover:bg-[#FF4500]/25 text-[#FF4500] hover:text-[#FF8C00] font-semibold border border-[#FF4500]/20 transition-all cursor-pointer font-sans text-[11px]"
                >
                  Generate Demo Seed 🔄
                </button>
              </div>

              {/* Payload textarea */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold text-stone-500 block font-mono">
                  Ingress JSON Data Payload
                </label>
                <textarea
                  className="w-full h-56 bg-black p-4 rounded-xl border border-white/5 focus:border-[#FF4500]/50 focus:outline-none font-mono text-xs text-stone-300 custom-scrollbar leading-relaxed"
                  value={ingestPayload}
                  onChange={(e) => setIngestPayload(e.target.value)}
                  placeholder="Paste JSON structure here..."
                />
              </div>

              {/* Logging Results */}
              {ingestResult && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-2 text-left">
                  <div className="flex items-center gap-2 text-[#22C55E] font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-ping" />
                    <span>{ingestResult.message}</span>
                  </div>
                  {ingestResult.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-stone-400">
                      <div>Added Shoppers: <strong className="text-white">{ingestResult.stats.addedCustomers}</strong></div>
                      <div>Added Orders: <strong className="text-white">{ingestResult.stats.addedOrders}</strong></div>
                      <div>Total Shoppers: <strong className="text-white">{ingestResult.stats.totalCustomers}</strong></div>
                      <div>Total Orders: <strong className="text-white">{ingestResult.stats.totalOrders}</strong></div>
                    </div>
                  )}
                </div>
              )}

              {ingestErrorStr && (
                <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 text-xs text-red-400 font-mono text-left">
                  🚨 {ingestErrorStr}
                </div>
              )}

            </div>

            {/* Footer triggers */}
            <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-between">
              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">ORM Compliance Active</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsIngestOpen(false);
                    setIngestResult(null);
                    setIngestErrorStr(null);
                  }}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all font-semibold font-sans text-xs cursor-pointer border border-white/5"
                >
                  Close
                </button>
                <button
                  onClick={handleIngestSubmit}
                  disabled={isIngestersLoading}
                  className="px-5 py-2 rounded-xl bg-[#FF4500] hover:bg-[#FF8C00] disabled:bg-[#FF4500]/50 text-white font-bold font-sans text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#FF4500]/20 active:scale-98 transition-all"
                >
                  {isIngestersLoading ? 'Ingesting...' : 'Inward Batch Data'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
