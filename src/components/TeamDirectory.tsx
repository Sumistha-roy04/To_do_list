import React, { useState } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import clsx from 'clsx';
import { Plus, Search } from 'lucide-react';
import { getBackendUrl } from '../utils/api';

interface TeamDirectoryProps {
  onAddTaskForEmployee?: (name: string) => void;
}

const statusColors: Record<string, string> = {
  'In Progress': 'bg-sky-500',
  'On Hold': 'bg-amber-500',
  'Completed': 'bg-emerald-500',
  'To Do': 'bg-slate-500',
};

export const TeamDirectory: React.FC<TeamDirectoryProps> = ({ onAddTaskForEmployee }) => {
  const employees = useKanbanStore((state: any) => state.employees || []);
  const tasks = useKanbanStore((state: any) => state.tasks || []);
  const setEmployees = useKanbanStore((state: any) => state.setEmployees);
  const user = useKanbanStore((state: any) => state.user);
  const [searchName, setSearchName] = useState('');

  const filteredEmployees = employees.filter((emp: any) => 
    emp.name.toLowerCase().includes(searchName.toLowerCase()) || 
    (emp.role && emp.role.toLowerCase().includes(searchName.toLowerCase()))
  );

  const getStats = (empName: string) => {
    const assigned = tasks.filter((t: any) => t.assignedTo === empName);
    const completed = assigned.filter((t: any) => t.status === 'Completed');
    const active = assigned.filter((t: any) => t.status !== 'Completed');
    const activeCount = active.length;
    const total = assigned.length;
    const progress = total === 0 ? 0 : Math.round((completed.length / total) * 100);
    return { activeCount, total, completed: completed.length, progress, currentTasks: active };
  };

  const handleAddMember = async () => {
    const name = window.prompt('New member name:');
    if (!name) return;
    const email = window.prompt('Member email (needed for member login):');
    if (!email) return;
    const role = window.prompt('Role / Title (optional):') || '';
    const newEmp = { id: crypto.randomUUID(), name, role, email };
    setEmployees([...(employees || []), newEmp]);

    if (user && user.roomCode) {
      try {
        const res = await fetch(`${getBackendUrl()}/api/leader/add-member`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            roomCode: user.roomCode
          })
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to save member to server');
        }
      } catch (err) {
        console.error('Failed to sync new member to server:', err);
      }
    }
  };

  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Team Directory</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your workspace members and their task workloads</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Search members or roles..." 
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/70 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-800 text-sm outline-none transition-all focus:border-indigo-500 dark:focus:border-indigo-500/80 focus:bg-white dark:focus:bg-slate-900 placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {employees.length === 0 ? (
          <div className="col-span-full p-10 text-center bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent dark:from-indigo-550/10 dark:via-purple-500/5 dark:to-transparent border border-dashed border-indigo-500/30 dark:border-indigo-500/20 rounded-3xl flex flex-col items-center justify-center gap-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-650 dark:text-indigo-450 border border-indigo-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="max-w-md">
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Your Team Directory is Empty</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Please upload the employee Excel spreadsheet using the <strong className="text-indigo-650 dark:text-indigo-400">Import</strong> button in the top bar to automatically populate your team directory and assign tasks, or add members manually.
              </p>
            </div>
          </div>
        ) : filteredEmployees.length === 0 && searchName ? (
          <div className="col-span-full p-8 text-center bg-white/40 dark:bg-slate-800/20 border border-dashed border-slate-250 dark:border-slate-700/40 rounded-2xl">
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No members found matching "{searchName}"</p>
          </div>
        ) : (
          filteredEmployees.map((emp: any) => {
            const stats = getStats(emp.name);
            return (
            <div key={emp.id} className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 flex flex-col h-[380px] justify-between transition-all duration-300 hover:border-slate-350 dark:hover:border-slate-600/40 hover:bg-white dark:hover:bg-slate-800/50 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] dark:shadow-none">
              {/* Header: Avatar and Employee Info */}
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-800 dark:text-white font-bold text-lg border border-slate-200/50 dark:border-slate-600/30 shadow-inner">
                    {emp.name ? emp.name.split(' ').filter(Boolean).map((s: string) => s[0]).slice(0, 2).join('').toUpperCase() : '?'}
                  </div>
                  <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100 truncate" title={emp.name}>{emp.name}</div>
                  <div className="text-xs text-indigo-650 dark:text-indigo-300 font-medium truncate" title={emp.role || 'Team Member'}>{emp.role || 'Team Member'}</div>
                </div>
              </div>

              {/* Workload and Progress Stats */}
              <div className="mt-4">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Task Progress</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{stats.completed}/{stats.total} done</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={clsx(
                        'h-2 rounded-full transition-all duration-500', 
                        stats.progress >= 100 ? 'bg-emerald-500' : stats.progress >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      )} 
                      style={{ width: `${stats.progress}%` }} 
                    />
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-650/30">
                    {stats.activeCount} active
                  </span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="mt-4 flex-1 flex flex-col min-h-0">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Current Tasks</div>
                {stats.currentTasks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700/30 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic">No active tasks assigned</div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
                    {stats.currentTasks.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 rounded-xl px-3 py-2 border border-slate-200/60 dark:border-slate-750/20 hover:border-slate-300 dark:hover:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800/80 shadow-[0_2px_4px_rgba(0,0,0,0.01)] dark:shadow-none transition-all duration-200">
                        <div className="text-xs text-slate-700 dark:text-slate-200 truncate mr-2 font-medium max-w-[120px] sm:max-w-[140px]" title={t.title}>
                          {t.title || 'Untitled'}
                        </div>
                        <span className={clsx(
                          'text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider whitespace-nowrap shrink-0 text-white', 
                          statusColors[t.status] || 'bg-slate-500'
                        )}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Task Button at bottom of card */}
              {onAddTaskForEmployee && (
                <button
                  onClick={() => onAddTaskForEmployee(emp.name)}
                  className="mt-4 w-full py-2 bg-indigo-50/80 dark:bg-indigo-600/10 hover:bg-indigo-600 text-indigo-650 dark:text-indigo-400 hover:text-white text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-500 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow-indigo-500/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              )}
            </div>
          );
        })
      )}

        {/* Add New Member card */}
        <div className="h-[380px] p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700/30 flex flex-col items-center justify-center bg-transparent cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all duration-200" onClick={handleAddMember}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800/30 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/40"><Plus /></div>
            <div className="text-lg text-slate-700 dark:text-slate-300 font-semibold">Add New Member</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Expand your workforce</div>
          </div>
        </div>
      </div>
    </section>
  );
};
