import React from 'react';
import { Home, Users, BarChart2, Settings, MessageSquare, Video, FolderOpen } from 'lucide-react';
import { useKanbanStore } from '../store/useKanbanStore';
import clsx from 'clsx';

export const Sidebar: React.FC = () => {
  const setViewMode = useKanbanStore((s: any) => s.setViewMode);
  const viewMode = useKanbanStore((s: any) => s.viewMode);
  const user = useKanbanStore((s: any) => s.user);
  const logoutUser = useKanbanStore((s: any) => s.logoutUser);

  const userInitials = user 
    ? user.fullName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) 
    : '??';

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-50 flex flex-row items-center justify-between px-4 py-2 h-16 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 backdrop-blur-lg rounded-2xl shadow-2xl md:relative md:bottom-auto md:left-auto md:right-auto md:z-0 md:flex-col md:h-auto md:w-16 md:py-6 md:px-2 md:rounded-3xl md:bg-transparent md:border-transparent md:backdrop-blur-none md:shadow-none shrink-0">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 items-center justify-center shadow-lg text-white hidden md:flex">
        <span className="font-bold">KP</span>
      </div>

      <nav className="flex flex-row md:flex-col items-center gap-2 md:gap-3 flex-1 justify-around md:justify-start md:mt-2 w-full">
        <button 
          onClick={() => setViewMode('board')} 
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
            viewMode === 'board' || viewMode === 'calendar'
              ? "text-white bg-indigo-600 shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-indigo-600/20 dark:text-slate-400 dark:hover:text-slate-100"
          )}
          title="Board View"
        >
          <Home className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setViewMode('team')} 
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
            viewMode === 'team'
              ? "text-white bg-indigo-600 shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-indigo-600/20 dark:text-slate-400 dark:hover:text-slate-100"
          )}
          title="Team Directory"
        >
          <Users className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setViewMode('timeline')} 
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
            viewMode === 'timeline'
              ? "text-white bg-indigo-600 shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-indigo-600/20 dark:text-slate-400 dark:hover:text-slate-100"
          )}
          title="Deadline Timeline"
        >
          <BarChart2 className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setViewMode('chat')} 
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
            viewMode === 'chat'
              ? "text-white bg-indigo-600 shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-indigo-600/20 dark:text-slate-400 dark:hover:text-slate-100"
          )}
          title="Team Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setViewMode('meetings')} 
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
            viewMode === 'meetings'
              ? "text-white bg-indigo-600 shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-indigo-600/20 dark:text-slate-400 dark:hover:text-slate-100"
          )}
          title="Video Call & Meetings"
        >
          <Video className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setViewMode('documents')} 
          className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
            viewMode === 'documents'
              ? "text-white bg-indigo-600 shadow-md shadow-indigo-600/20"
              : "text-slate-400 hover:text-white hover:bg-indigo-600/20 dark:text-slate-400 dark:hover:text-slate-100"
          )}
          title="Documents Repository"
        >
          <FolderOpen className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600/20 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer hidden md:flex" title="Settings">
          <Settings className="w-5 h-5" />
        </button>
      </nav>

      <div className="flex md:flex-col items-center gap-2 md:mt-auto md:mb-2 ml-2 md:ml-0 shrink-0">
        {user && (
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                logoutUser();
              }
            }}
            className="w-10 h-10 rounded-xl bg-indigo-650 hover:bg-rose-600 text-white flex items-center justify-center text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer group"
            title={`Logged in as ${user.fullName} (${user.orgName}). Click to logout.`}
          >
            <span className="group-hover:hidden">{userInitials}</span>
            <span className="hidden group-hover:inline text-[9px] uppercase tracking-wider">Exit</span>
          </button>
        )}
      </div>
    </aside>
  );
};
