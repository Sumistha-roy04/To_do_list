import React, { useRef } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import { parseEmployeeExcel } from '../utils/excelParser';
import { Sun, Moon, Upload, Plus, Search, Layers, Calendar, LayoutGrid, LogOut } from 'lucide-react';
import clsx from 'clsx';

interface TopBarProps {
  onOpenTaskModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenTaskModal }) => {
  const { 
    theme, 
    toggleTheme, 
    setEmployees, 
    employees, 
    searchQuery, 
    setSearchQuery, 
    assigneeFilter, 
    setAssigneeFilter,
    dateFilter,
    setDateFilter,
    viewMode,
    setViewMode,
    user,
    logoutUser
  } = useKanbanStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const parsedEmployees = await parseEmployeeExcel(file);
        
        if (user && user.role !== 'member' && user.roomCode) {
          const res = await fetch('/api/leader/import-members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomCode: user.roomCode,
              members: parsedEmployees.map(emp => ({
                name: emp.name,
                email: emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '')}@workspace.com`
              }))
            })
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to save members to server');
          }
        }

        setEmployees(parsedEmployees);
        alert(`Successfully imported ${parsedEmployees.length} employees and saved to backend.`);
      } catch (error: any) {
        console.error("Error parsing excel file:", error);
        alert(error.message || "Failed to parse Excel file.");
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row justify-between items-center backdrop-blur-md bg-white/70 dark:bg-slate-900/60 p-4 lg:px-6 py-4 rounded-3xl mb-8 gap-4 border border-slate-200/50 dark:border-slate-800/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_30px_-4px_rgba(0,0,0,0.3)] transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20 text-white">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-100 dark:to-white">
            Kanban<span className="text-indigo-500 dark:text-indigo-400 font-extrabold">Pro</span>
          </h1>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Enterprise Workflow Manager</p>
        </div>
        {user && user.role !== 'member' && user.roomCode && (
          <div className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-550/15 border border-indigo-550/20 text-indigo-650 dark:text-indigo-350 shadow-sm shrink-0">
            <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">Room:</span>
            <span className="text-xs font-mono font-bold tracking-wider text-indigo-700 dark:text-indigo-300">{user.roomCode}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(user.roomCode || '');
                alert("Room code copied to clipboard!");
              }}
              className="p-1 hover:bg-indigo-500/20 dark:hover:bg-indigo-400/20 rounded transition-colors cursor-pointer text-indigo-500 dark:text-indigo-400"
              title="Copy Room Code"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
        <div className="relative flex-1 sm:flex-initial sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Search tasks or details..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/60 focus:border-indigo-500/80 dark:focus:border-indigo-500/80 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500/10 text-sm outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Assignee Filter */}
          <select 
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/60 text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500/10 text-sm outline-none cursor-pointer transition-all min-w-[140px]"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">All Assignees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.name} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">{emp.name}</option>
            ))}
          </select>

          {/* Due Date Filter */}
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/60 text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500/10 text-sm outline-none cursor-pointer transition-all min-w-[140px]"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">All Due Dates</option>
            <option value="this-week" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Due This Week</option>
            <option value="next-week" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Due Next Week</option>
          </select>

          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl bg-slate-100/60 hover:bg-slate-200/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-200/40 dark:border-slate-700/40 transition-all text-slate-600 dark:text-slate-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>

          {/* TopBar Logout Action */}
          {user && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to log out?')) {
                  logoutUser();
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 transition-all text-xs font-bold cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title={`Logged in as ${user.fullName}. Click to logout.`}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}

          <input 
            type="file" 
            accept=".xlsx,.csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100/60 hover:bg-slate-200/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-200/40 dark:border-slate-700/40 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Import Employees from Excel/CSV"
          >
            <Upload className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>Import</span>
          </button>

          {/* View Toggles (Board vs Calendar) */}
          <div className="flex items-center bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl p-0.5 shadow-sm shrink-0">
            <button
              onClick={() => setViewMode('board')}
              className={clsx(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                viewMode === 'board'
                  ? "bg-white dark:bg-slate-900 text-indigo-500 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
              title="Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={clsx(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                viewMode === 'calendar'
                  ? "bg-white dark:bg-slate-900 text-indigo-500 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
              title="Calendar View"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Conditionally Render Add Task button only in Team view */}
          {viewMode === 'team' && (
            <button 
              onClick={() => onOpenTaskModal && onOpenTaskModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm cursor-pointer"
              title="Add Task"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Add Task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
