import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/FirebaseProvider.js';
import { useToast } from '../components/ui/Toast.js';
import { Mail, Lock, User, Sparkles, LogIn, KeyRound, Loader, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, loginAnonymously } = useAuth();
  const { success, error, info } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authErrorTip, setAuthErrorTip] = useState<'email-password' | 'anonymous' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      error('Input required', 'Please complete all required fields before proceeding.');
      return;
    }

    setLoading(true);
    setAuthErrorTip(null);
    try {
      if (isLogin) {
        await login(email, password);
        success('Access Granted', 'Welcome back! Your personal CRM database has synced.');
      } else {
        await register(email, password, name);
        success('Account Seeded', `Welcome, ${name}! Your cloud analytics workspace has been prepared.`);
      }
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('operation-not-allowed')) {
        setAuthErrorTip('email-password');
      }
      error('Authentication Error', err.message || 'Details provided are incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setAuthErrorTip(null);
    info('Provisioning Sandbox', 'Bootstrapping temporary verified credentials in the cloud...');
    try {
      await loginAnonymously();
      success('Temporary Session Provisioned', 'Successfully entered CRM workspace in sandbox mode. Cloud Firestore sync is active.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('admin-restricted-operation') || msg.includes('operation-not-allowed')) {
        setAuthErrorTip('anonymous');
      }
      error('Provisioning failed', err.message || 'Failed to authenticate anonymously.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0b0606] min-h-screen text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Background radial copper aura */}
      <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF4500 0%, transparent 70%)' }} />
      <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />

      {/* Top Navigation */}
      <header className="relative w-full z-20 h-20 flex items-center justify-between px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-85 active:scale-98 transition-all select-none group"
          title="Return to Welcome Page"
        >
          {/* Fluxora Overlapping Geometric Logo */}
          <div className="relative w-6 h-6 flex items-center justify-center mr-1">
            <div className="absolute w-3.5 h-3.5 rounded bg-[#FF4500] -translate-x-[4px] -translate-y-[4px] opacity-90 transform rotate-12 transition-transform group-hover:rotate-45" />
            <div className="absolute w-3.5 h-3.5 rounded bg-[#FFD700] translate-x-[4px] -translate-y-[2px] opacity-85 transform -rotate-12 mix-blend-screen transition-transform group-hover:rotate-12" />
            <div className="absolute w-3.5 h-3.5 rounded bg-[#FF5A1F] -translate-x-[2px] translate-y-[4px] opacity-80 transform rotate-45 transition-transform group-hover:-rotate-12" />
            <div className="absolute w-3.5 h-3.5 rounded bg-[#FF4500] translate-x-[4px] translate-y-[4px] opacity-90 transform -rotate-45 transition-transform group-hover:rotate-90" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white font-display flex items-center">
            Fluxora
          </span>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="py-2.5 px-6 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold font-sans select-none flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-white/10"
        >
          Back to Home
        </button>
      </header>

      <div className="flex-1 flex flex-col justify-center items-center p-6 pb-12 z-10">
        <div className="w-full max-w-[440px] bg-black/45 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 relative shadow-2xl z-20">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 active:scale-95 transition-all text-2xl font-bold font-display"
          >
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#FF4500] to-[#FFD700]"></div>
            Xeno<span className="text-[#FF4500]">CRM</span>
          </div>
          <p className="text-[11px] font-semibold text-[#7a6f6f] uppercase tracking-widest mt-2 font-mono">
            Enterprise Client Workspace
          </p>
        </div>

        {/* Action Toggle Tabs */}
        <div className="grid grid-cols-2 bg-stone-900/50 p-1 rounded-xl mb-6 border border-white/5">
          <button
            onClick={() => { setIsLogin(true); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${isLogin ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${!isLogin ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5 font-mono">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Emily Watson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#120a0a]/50 border border-white/8 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-[#FF4500]/60 transition-all font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5 font-mono">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="e.g. emily@watson.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#120a0a]/50 border border-white/8 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-[#FF4500]/60 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5 font-mono">
              Account Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#120a0a]/50 border border-white/8 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-[#FF4500]/60 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF4500] to-[#FF8C00] hover:opacity-90 disabled:opacity-55 active:scale-98 transition-all text-xs font-bold font-sans flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-lg"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                Sign In to Database
              </>
            ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Cloud Profile
                </>
              )}
          </button>
        </form>

        <div className="my-6 flex items-center justify-between text-stone-600 select-none">
          <div className="flex-1 h-[1px] bg-white/5" />
          <span className="text-[9px] font-mono uppercase tracking-widest px-3">or bypass with sandbox</span>
          <div className="flex-1 h-[1px] bg-white/5" />
        </div>

        {/* Sandbox anonymous direct login */}
        <button
          onClick={handleDemoSignIn}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 border border-white/8 text-xs font-semibold hover:border-orange-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-stone-300 active:scale-98 cursor-pointer shadow-md"
        >
          <KeyRound className="w-4 h-4 text-[#FFD700]" />
          Instant Anonymous Sandbox login
        </button>

        {authErrorTip && (
          <div className="mt-5 p-4 rounded-2xl bg-orange-950/30 border border-orange-500/30 text-xs text-stone-200 animate-fade-in space-y-2.5 text-left font-sans">
            <div className="flex items-start gap-2 text-orange-400 font-bold text-[10.5px] uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Authentication Settings Required</span>
            </div>
            <p className="text-stone-300 leading-normal text-[11px]">
              This app is powered by your real Google Firebase project. To support credentials and anonymous testing, please enable these sign-in options in your Firebase Console:
            </p>
            <ol className="list-decimal pl-4.5 space-y-1.5 text-stone-400 font-medium text-[10.5px]">
              <li>Open your <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-[#FF4500] underline font-extrabold hover:text-[#FF8C00]">Firebase Console</a></li>
              <li>Navigate to <strong className="text-stone-300">Authentication</strong> &gt; <strong className="text-stone-300">Sign-in method</strong> tab.</li>
              {authErrorTip === 'email-password' ? (
                <li className="text-white font-semibold">
                  Click <strong className="text-[#FF8C00]">Add new provider</strong> &gt; select <strong className="text-[#FF8C00]">Email/Password</strong>, toggle to <strong className="text-[#FF8C00]">Enable</strong>, and click <strong className="text-[#FF8C00]">Save</strong>.
                </li>
              ) : (
                <li className="text-white font-semibold">
                  Click <strong className="text-[#FF8C00]">Add new provider</strong> &gt; select <strong className="text-[#FF8C00]">Anonymous</strong>, toggle to <strong className="text-[#FF8C00]">Enable</strong>, and click <strong className="text-[#FF8C00]">Save</strong>.
                </li>
              )}
              <li>Once enabled on Firebase, return here and trigger the action again!</li>
            </ol>
            <div className="pt-1 flex justify-end">
              <button 
                onClick={() => setAuthErrorTip(null)}
                className="text-[9.5px] text-stone-500 hover:text-stone-300 font-mono tracking-wider uppercase font-bold cursor-pointer"
              >
                [ Dismiss Tip ]
              </button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-stone-600 text-center font-medium mt-6 select-none font-mono">
          🔐 Authenticated sessions are synchronized directly to a private, isolated, Google Cloud Firestore server.
        </p>

      </div>
      </div>

    </div>
  );
}
