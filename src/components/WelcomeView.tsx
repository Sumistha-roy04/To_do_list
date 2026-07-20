import React from 'react';
import { Users, Building2, ArrowRight } from 'lucide-react';

interface WelcomeViewProps {
  onSelectRole: (role: 'leader' | 'member') => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans relative overflow-hidden select-none">
      
      {/* Top logo */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg text-white">
          <span className="font-extrabold text-sm">KP</span>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">KanbanPro</span>
      </div>

      {/* Main copy */}
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white text-center mb-2">
        Welcome to the workspace.
      </h1>
      <p className="text-xs text-slate-450 text-center max-w-[480px] leading-relaxed mb-12">
        Select the role that best defines your workflow to customize your KanbanPro experience.
      </p>

      {/* Grid containing the two role selection cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[800px] mb-12">
        
        {/* Leader card */}
        <div 
          onClick={() => onSelectRole('leader')}
          className="group relative p-8 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all duration-350 cursor-pointer shadow-xl flex flex-col items-center justify-center text-center h-[280px]"
        >
          {/* Top-right indicator dot */}
          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-400" />

          {/* Visual container for icon */}
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-350 shrink-0">
            <Building2 className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">Leader</h3>
          <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed mb-6">
            Manage teams and projects
          </p>

          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-450 uppercase tracking-wider group-hover:text-indigo-400 transition-colors">
            <span>Continue as Leader</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Team Member card */}
        <div 
          onClick={() => onSelectRole('member')}
          className="group relative p-8 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/60 transition-all duration-350 cursor-pointer shadow-xl flex flex-col items-center justify-center text-center h-[280px]"
        >
          {/* Top-right indicator dot */}
          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-sky-400" />

          {/* Visual container for icon */}
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-350 shrink-0">
            <Users className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">Team Member</h3>
          <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed mb-6">
            Collaborate and track tasks
          </p>

          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-450 uppercase tracking-wider group-hover:text-sky-400 transition-colors">
            <span>Continue as Member</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Footer disclaimer */}
      <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase">
        You can switch roles later in workspace settings
      </span>

    </div>
  );
};
