import React, { useState } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import { Mail, Building2, Lock, Eye, EyeOff, ArrowRight, Shield, BarChart3, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { getBackendUrl } from '../utils/api';

interface RegisterViewProps {
  onToggleLogin: () => void;
  onBackToWelcome: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onToggleLogin, onBackToWelcome }) => {
  const registerUser = useKanbanStore((state: any) => state.registerUser);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) newErrors.email = 'A valid work email is required';
    if (!orgName.trim()) newErrors.orgName = 'Organization Name is required';
    if (password.length < 12) newErrors.password = 'Password must be at least 12 characters long';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, orgName, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setErrors({ general: data.error || 'Registration failed' });
      } else {
        // Automatically direct to login page after registering!
        onToggleLogin();
      }
    } catch (err) {
      console.error('Registration API error:', err);
      setErrors({ general: 'Failed to connect to the backend. Please check if the server is running.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMockRegister = (provider: string) => {
    // Fill with pre-set mock data for ease of review
    const mockUser = {
      fullName: provider === 'Login' ? 'Alexander Pierce' : `${provider} Leader`,
      email: `${provider.toLowerCase()}@acme-enterprise.com`,
      orgName: orgName || 'Acme Enterprise',
      roomCode: '852934',
      role: 'leader'
    };
    registerUser(mockUser);
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
            Empower your team with executive-level oversight.
          </h1>
          
          {/* Paragraph copy */}
          <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-10 max-w-[480px]">
            Join the Enterprise network of high-performance leaders. Manage workflows, track performance metrics, and scale your organization with precision.
          </p>

          {/* Side-by-side card features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-indigo-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-450 border border-indigo-500/20 shrink-0">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-200">Deep Analytics</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Real-time team reporting</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-amber-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-450 border border-amber-500/20 shrink-0">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-200">Enterprise Sec</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">SSO & data protection</p>
              </div>
            </div>
          </div>

          {/* Capacity stats overlay */}
          <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.02] max-w-[420px]">
            <div className="flex items-center justify-between mb-3.5">
              {/* Overlapping avatars */}
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full border-2 border-slate-950 bg-indigo-500 flex items-center justify-center text-[9px] font-bold">MS</div>
                <div className="w-7 h-7 rounded-full border-2 border-slate-950 bg-emerald-500 flex items-center justify-center text-[9px] font-bold">ST</div>
                <div className="w-7 h-7 rounded-full border-2 border-slate-950 bg-rose-500 flex items-center justify-center text-[9px] font-bold">PR</div>
                <div className="w-7 h-7 rounded-full border-2 border-slate-950 bg-amber-500 flex items-center justify-center text-[9px] font-bold">SH</div>
              </div>
              <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 border border-indigo-550/20 text-indigo-400 rounded-full font-bold uppercase tracking-wider">
                ACTIVE TEAMS
              </span>
            </div>
            
            {/* Animated progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: '75%' }} />
            </div>
            
            <p className="text-[10px] text-slate-500 mt-3">
              Your organization is currently at 75% capacity for this sprint.
            </p>
          </div>

          <button 
            onClick={onBackToWelcome}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-350 transition-colors uppercase tracking-wider cursor-pointer mt-5 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

        </div>

        {/* Right form card pane */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-[480px] p-8 md:p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Top gradient blur accent */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50" />

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Leader Registration</h2>
              <p className="text-xs text-slate-500 mt-1">Establish your enterprise workspace today.</p>
            </div>

            {/* Error banner */}
            {errors.general && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold mb-4 leading-normal">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Alexander Pierce" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={clsx(
                    "w-full px-4 py-2.5 rounded-xl bg-slate-950/40 border text-sm outline-none transition-all text-slate-100 placeholder-slate-650",
                    errors.fullName ? "border-rose-500/50 focus:border-rose-500" : "border-slate-800 focus:border-indigo-500/80 focus:bg-slate-950/80"
                  )}
                />
                {errors.fullName && <p className="text-[10px] text-rose-500 mt-1 pl-0.5">{errors.fullName}</p>}
              </div>

              {/* Work Email input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    placeholder="alex@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={clsx(
                      "w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/40 border text-sm outline-none transition-all text-slate-100 placeholder-slate-650",
                      errors.email ? "border-rose-500/50 focus:border-rose-500" : "border-slate-800 focus:border-indigo-500/80 focus:bg-slate-950/80"
                    )}
                  />
                </div>
                {errors.email && <p className="text-[10px] text-rose-500 mt-1 pl-0.5">{errors.email}</p>}
              </div>

              {/* Organization Name input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">Organization Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Acme Enterprise" 
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className={clsx(
                      "w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/40 border text-sm outline-none transition-all text-slate-100 placeholder-slate-650",
                      errors.orgName ? "border-rose-500/50 focus:border-rose-500" : "border-slate-800 focus:border-indigo-500/80 focus:bg-slate-950/80"
                    )}
                  />
                </div>
                {errors.orgName && <p className="text-[10px] text-rose-500 mt-1 pl-0.5">{errors.orgName}</p>}
              </div>

              {/* Password input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-0.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={clsx(
                      "w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/40 border text-sm outline-none transition-all text-slate-100 placeholder-slate-650",
                      errors.password ? "border-rose-500/50 focus:border-rose-500" : "border-slate-800 focus:border-indigo-500/80 focus:bg-slate-950/80"
                    )}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-350 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-[10px] text-rose-500 mt-1 pl-0.5">{errors.password}</p>
                ) : (
                  <p className="text-[9px] text-slate-500 mt-1.5 pl-0.5">Must be at least 12 characters with special symbols.</p>
                )}
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Registering...' : 'Register as Leader'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </form>

            {/* Separator label */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-800/60"></div>
              <span className="flex-shrink mx-4 text-[8px] font-bold text-slate-500 uppercase tracking-widest">OR REGISTER WITH</span>
              <div className="flex-grow border-t border-slate-800/60"></div>
            </div>

            {/* Social register options */}
            <div className="grid grid-cols-2 gap-3.5">
              <button 
                type="button" 
                onClick={() => handleMockRegister('Google')}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-white/[0.02] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                {/* SVG Google icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.477 0-6.3-2.823-6.3-6.3s2.823-6.3 6.3-6.3c1.637 0 3.129.626 4.26 1.649l3.056-3.056C19.227 2.626 15.937 1.5 12.24 1.5 6.31 1.5 1.5 6.31 1.5 12.24s4.81 10.74 10.74 10.74c6.113 0 10.74-4.302 10.74-10.74 0-.712-.064-1.396-.188-1.955H12.24z"/>
                </svg>
                <span>Google</span>
              </button>
              
              <button 
                type="button" 
                onClick={() => handleMockRegister('Azure')}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-white/[0.02] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                {/* Microsoft icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                  <path fill="#F25022" d="M0 0h11v11H0z"/>
                  <path fill="#7FBA00" d="M12 0h11v11H12z"/>
                  <path fill="#00A4EF" d="M0 12h11v11H0z"/>
                  <path fill="#FFB900" d="M12 12h11v11H12z"/>
                </svg>
                <span>Azure</span>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-slate-400 select-none">
              Already have a leader account? <span onClick={onToggleLogin} className="text-white hover:text-indigo-400 font-extrabold cursor-pointer transition-colors ml-1">Log In</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
