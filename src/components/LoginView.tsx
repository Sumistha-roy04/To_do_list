import React, { useState } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';

interface LoginViewProps {
  onToggleRegister: () => void;
  onBackToWelcome: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onToggleRegister, onBackToWelcome }) => {
  const registerUser = useKanbanStore((state: any) => state.registerUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
      } else {
        // Successful login
        registerUser(data); // sets the user session in store
      }
    } catch (err) {
      console.error('Login connection error:', err);
      // Resilient fallback logic in case server is not running:
      // Search in localStorage kanban-storage for registered users or mock it
      setError('Connection to backend failed. Logged in via offline demo session.');
      setTimeout(() => {
        registerUser({
          fullName: 'Alexander Pierce',
          email,
          orgName: 'Acme Enterprise'
        });
      }, 800);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // Mock login immediately via Google/Azure
    registerUser({
      fullName: `${provider} Leader`,
      email: `${provider.toLowerCase()}@acme-enterprise.com`,
      orgName: 'Acme Enterprise'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans">
      <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left branding pane */}
        <div className="lg:col-span-6 flex flex-col justify-center text-left">
          
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg text-white">
              <span className="font-extrabold text-lg">KP</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">KanbanPro</span>
          </div>

          {/* Heading copy */}
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-slate-100 mb-4 tracking-tight">
            Lead with Precision.
          </h1>
          
          {/* Paragraph copy */}
          <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-10 max-w-[480px]">
            Access your enterprise dashboard to coordinate teams, track deliverables, and optimize workflow velocity in real-time.
          </p>

          {/* Graphical Panel Mockup */}
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/[0.02] max-w-[440px] mb-12 flex items-center justify-between gap-6 relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-350">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Live Performance</span>
              {/* Sprint progress */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-3">
                <div className="bg-indigo-500 h-full rounded-full w-[80%]" />
              </div>
              <span className="text-[10px] text-slate-500 block">Sprint Progress</span>
            </div>

            {/* Mock screenshot representation inside the left panel card */}
            <div className="w-24 h-20 rounded-xl bg-slate-900 border border-slate-800 flex flex-col p-2 gap-1.5 shrink-0 overflow-hidden shadow-inner select-none relative">
              <div className="flex items-center justify-between">
                <span className="w-2.5 h-1 bg-indigo-500 rounded-full" />
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded" />
              <div className="w-[80%] h-2 bg-slate-850 rounded" />
              <div className="flex justify-between items-center mt-auto">
                <span className="w-5 h-2 bg-indigo-500/10 rounded" />
                <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700" />
              </div>
            </div>
          </div>

          {/* Trusted banner */}
          <div className="flex flex-col gap-4 items-start">
            <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase">
              Trusted by Global Operations Teams
            </span>
            <button 
              onClick={onBackToWelcome}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-350 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          </div>

        </div>

        {/* Right form card pane */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-[480px] p-8 md:p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Top gradient blur accent */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50" />

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Welcome Back</h2>
              <p className="text-xs text-slate-500 mt-1">Please enter your leader credentials to continue.</p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold mb-4 leading-normal">
                {error}
              </div>
            )}

            {/* Social register options */}
            <div className="grid grid-cols-2 gap-3.5 mb-5">
              <button 
                type="button" 
                onClick={() => handleSocialLogin('Google')}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-white/[0.02] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.477 0-6.3-2.823-6.3-6.3s2.823-6.3 6.3-6.3c1.637 0 3.129.626 4.26 1.649l3.056-3.056C19.227 2.626 15.937 1.5 12.24 1.5 6.31 1.5 1.5 6.31 1.5 12.24s4.81 10.74 10.74 10.74c6.113 0 10.74-4.302 10.74-10.74 0-.712-.064-1.396-.188-1.955H12.24z"/>
                </svg>
                <span>Google</span>
              </button>
              
              <button 
                type="button" 
                onClick={() => handleSocialLogin('Azure')}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-white/[0.02] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                  <path fill="#F25022" d="M0 0h11v11H0z"/>
                  <path fill="#7FBA00" d="M12 0h11v11H12z"/>
                  <path fill="#00A4EF" d="M0 12h11v11H0z"/>
                  <path fill="#FFB900" d="M12 12h11v11H12z"/>
                </svg>
                <span>Azure</span>
              </button>
            </div>

            {/* Separator label */}
            <div className="relative flex py-4 items-center mb-1.5">
              <div className="flex-grow border-t border-slate-800/60"></div>
              <span className="flex-shrink mx-4 text-[8px] font-bold text-slate-500 uppercase tracking-widest">OR EMAIL</span>
              <div className="flex-grow border-t border-slate-800/60"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Work Email input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-sm outline-none transition-all text-slate-100 placeholder-slate-650 focus:border-indigo-500/80 focus:bg-slate-950/80"
                    required
                  />
                </div>
              </div>

              {/* Password input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">Password</label>
                  <span className="text-[10px] text-indigo-400 hover:text-indigo-300 font-extrabold cursor-pointer transition-colors">Forgot password?</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-sm outline-none transition-all text-slate-100 placeholder-slate-650 focus:border-indigo-500/80 focus:bg-slate-950/80"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-350 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember device checkbox */}
              <div className="flex items-center gap-2 pl-0.5 select-none pt-1">
                <input 
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-550/30 bg-slate-950"
                />
                <label htmlFor="remember-me" className="text-[10px] font-medium text-slate-450 hover:text-slate-300 cursor-pointer transition-colors">
                  Remember this device for 30 days
                </label>
              </div>

              {/* Submit button */}
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3 bg-indigo-600 hover:bg-indigo-550 text-indigo-50 font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
                <LogIn className="w-4 h-4" />
              </button>

            </form>

            {/* Footer switcher */}
            <div className="mt-8 text-center text-xs text-slate-400 select-none">
              Don't have a leader account yet? <span onClick={onToggleRegister} className="text-white hover:text-indigo-400 font-extrabold cursor-pointer transition-colors ml-1">Register as Leader</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
