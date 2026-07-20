import React, { useState } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import { LogIn, ArrowLeft, Mail, ShieldAlert } from 'lucide-react';

interface MemberAccessViewProps {
  onBackToWelcome: () => void;
}

export const MemberAccessView: React.FC<MemberAccessViewProps> = ({ onBackToWelcome }) => {
  const registerUser = useKanbanStore((state: any) => state.registerUser);

  const [email, setEmail] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !roomCode.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/member-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          roomCode: roomCode.trim() 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials or room code');
      } else {
        // Successful login
        registerUser(data); // sets the user session in store
      }
    } catch (err) {
      console.error('Member login connection error:', err);
      setError('Connection to backend failed. Please check if the server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans">
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left branding pane */}
        <div className="lg:col-span-6 flex flex-col justify-center text-left">
          
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg text-white">
              <span className="font-extrabold text-lg">KP</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">KanbanPro</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-slate-100 mb-4 tracking-tight">
            Collaborate and track tasks.
          </h1>
          
          <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-10 max-w-[480px]">
            Access your workspace using your email and the 6-digit room code shared by your team leader.
          </p>

          <button 
            onClick={onBackToWelcome}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-350 transition-colors uppercase tracking-wider self-start cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

        </div>

        {/* Right form card pane */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-[480px] p-8 md:p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Top gradient blur accent */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-sky-500/50 via-indigo-500/50 to-purple-500/50" />

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Member Sign-in
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your details to access the workspace.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold mb-4 leading-normal">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-0.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    placeholder="you@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-sm outline-none transition-all text-slate-100 placeholder-slate-650 focus:border-sky-500/80 focus:bg-slate-950/80"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-0.5">6-Digit Room Code</label>
                <div className="relative">
                  <ShieldAlert className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="e.g. 583921" 
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-sm outline-none transition-all text-slate-100 placeholder-slate-650 focus:border-sky-500/80 focus:bg-slate-950/80"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || !email || !roomCode}
                className="w-full py-3 bg-sky-600 hover:bg-sky-550 text-sky-50 font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 active:scale-[0.98] disabled:opacity-40"
              >
                <span>{isSubmitting ? 'Entering...' : 'Enter Workspace'}</span>
                <LogIn className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-slate-400 select-none">
              Need to register a leader account? <span onClick={onBackToWelcome} className="text-white hover:text-sky-400 font-extrabold cursor-pointer transition-colors ml-1">Go Back</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
