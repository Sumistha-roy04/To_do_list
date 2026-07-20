import React, { useState } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import type { Task } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Plus } from 'lucide-react';
import clsx from 'clsx';

interface TimelineViewProps {
  onEditTask?: (task: Task) => void;
  onAddTask?: (preset?: Partial<Task>) => void;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getAvatarBg = (name: string) => {
  const colors = [
    'bg-indigo-500 text-white shadow-indigo-500/10',
    'bg-emerald-500 text-white shadow-emerald-500/10',
    'bg-amber-500 text-white shadow-amber-500/10',
    'bg-rose-500 text-white shadow-rose-500/10',
    'bg-purple-500 text-white shadow-purple-500/10',
    'bg-pink-500 text-white shadow-pink-500/10',
    'bg-cyan-500 text-white shadow-cyan-500/10',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

const toDateKey = (dateStr: string) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return '';
  }
};

const layoutTasksForMember = (memberTasks: Task[], timelineDates: Date[]) => {
  if (memberTasks.length === 0) return [];
  
  const timelineStartMs = timelineDates[0].getTime();
  const timelineEndMs = timelineDates[timelineDates.length - 1].getTime() + 24 * 60 * 60 * 1000;

  // Filter tasks that overlap with the timeline range
  const visibleTasks = memberTasks.filter(t => {
    if (!t.deadline) return false;
    const dMs = new Date(t.deadline).getTime();
    const sMs = t.startDate ? new Date(t.startDate).getTime() : dMs;
    return (sMs < timelineEndMs && dMs >= timelineStartMs);
  });

  // Sort by startDate/deadline
  visibleTasks.sort((a, b) => {
    const aStart = a.startDate ? new Date(a.startDate).getTime() : new Date(a.deadline).getTime();
    const bStart = b.startDate ? new Date(b.startDate).getTime() : new Date(b.deadline).getTime();
    return aStart - bStart;
  });

  const tracks: Task[][] = [];
  visibleTasks.forEach(task => {
    const taskStartMs = task.startDate ? new Date(task.startDate).getTime() : new Date(task.deadline).getTime();
    const taskEndMs = new Date(task.deadline).getTime();

    let trackIdx = -1;
    for (let i = 0; i < tracks.length; i++) {
      const hasOverlap = tracks[i].some(t => {
        const tStart = t.startDate ? new Date(t.startDate).getTime() : new Date(t.deadline).getTime();
        const tEnd = new Date(t.deadline).getTime();
        return (taskStartMs <= tEnd && taskEndMs >= tStart);
      });
      if (!hasOverlap) {
        trackIdx = i;
        break;
      }
    }

    if (trackIdx === -1) {
      tracks.push([task]);
    } else {
      tracks[trackIdx].push(task);
    }
  });

  return tracks;
};

export const TimelineView: React.FC<TimelineViewProps> = ({ onEditTask, onAddTask }) => {
  const employees = useKanbanStore((state: any) => state.employees || []);
  const tasks = useKanbanStore((state: any) => state.tasks || []);
  const [timelineStart, setTimelineStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const numDays = 14;

  const getDates = () => {
    const arr = [];
    for (let i = 0; i < numDays; i++) {
      const nextDate = new Date(timelineStart);
      nextDate.setDate(timelineStart.getDate() + i);
      arr.push(nextDate);
    }
    return arr;
  };

  const dates = getDates();

  const handlePrevWeek = () => {
    const nextStart = new Date(timelineStart);
    nextStart.setDate(timelineStart.getDate() - 7);
    setTimelineStart(nextStart);
  };

  const handleNextWeek = () => {
    const nextStart = new Date(timelineStart);
    nextStart.setDate(timelineStart.getDate() + 7);
    setTimelineStart(nextStart);
  };

  const handleResetToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setTimelineStart(today);
  };

  const getTimelineRangeHeader = () => {
    const end = new Date(timelineStart);
    end.setDate(timelineStart.getDate() + numDays - 1);
    
    const startMonth = timelineStart.toLocaleString('default', { month: 'short' });
    const endMonth = end.toLocaleString('default', { month: 'short' });
    const startYear = timelineStart.getFullYear();
    const endYear = end.getFullYear();

    if (startYear !== endYear) {
      return `${startMonth} ${timelineStart.getDate()}, ${startYear} – ${endMonth} ${end.getDate()}, ${endYear}`;
    }
    if (startMonth !== endMonth) {
      return `${startMonth} ${timelineStart.getDate()} – ${endMonth} ${end.getDate()}, ${startYear}`;
    }
    return `${startMonth} ${timelineStart.getDate()} – ${end.getDate()}, ${startYear}`;
  };

  const getTasksForMember = (empName: string) => {
    return tasks.filter((t: any) => {
      const tAssignee = t.assignedTo || 'Unassigned';
      const targetAssignee = empName || 'Unassigned';
      return tAssignee === targetAssignee;
    });
  };

  const handleCellClick = (memberName: string, dateKey: string) => {
    if (onAddTask) {
      onAddTask({
        assignedTo: memberName === 'Unassigned' ? '' : memberName,
        deadline: dateKey,
      });
    }
  };

  const allMembersList = [...employees, { id: 'unassigned', name: 'Unassigned', role: 'Unassigned Tasks' }];

  // Compute live stats for the summary bar at the bottom
  const pendingDeadlines = tasks.filter((t: any) => t.status !== 'Completed' && t.deadline).length;
  
  const completedThisWeek = tasks.filter((t: any) => {
    if (t.status !== 'Completed' || !t.completionDate) return false;
    const compMs = new Date(t.completionDate).getTime();
    const oneWeekAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
    return compMs >= oneWeekAgo;
  }).length;

  const overdueCritical = tasks.filter((t: any) => {
    if (t.status === 'Completed' || !t.deadline) return false;
    const deadlineMs = new Date(t.deadline).getTime();
    const todayMs = new Date().setHours(0, 0, 0, 0);
    return deadlineMs < todayMs && t.priority === 'High';
  }).length;

  return (
    <div className="w-full bg-white/70 dark:bg-slate-900/60 rounded-3xl border border-slate-200/50 dark:border-slate-800/80 p-6 shadow-sm transition-all duration-300 relative">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            <span>Deadline Timeline</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track upcoming employee task deadlines day-by-day</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleResetToday}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/40 dark:border-slate-700/40 transition-colors cursor-pointer"
          >
            Today
          </button>
          
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/40 dark:border-slate-700/40">
            <button 
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Prev Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
              {getTimelineRangeHeader()}
            </span>
            <button 
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid container with horizontal scrolling for timeline cells */}
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div className="min-w-[1200px] flex flex-col gap-4">
          
          {/* Header row: Left placeholder + Days headers */}
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
            <div className="w-48 shrink-0 pl-2">Member</div>
            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
              {dates.map((date, idx) => {
                const isToday = toDateKey(date.toISOString()) === toDateKey(new Date().toISOString());
                const dayName = date.toLocaleDateString('default', { weekday: 'short' });
                const dayNum = date.getDate();
                return (
                  <div 
                    key={idx} 
                    className={clsx(
                      "flex flex-col items-center py-2.5 rounded-xl border transition-all text-center select-none",
                      isToday 
                        ? "bg-indigo-650 border-indigo-650 text-white font-extrabold shadow-md shadow-indigo-650/20" 
                        : "bg-slate-50/50 dark:bg-slate-850/40 border-slate-200/40 dark:border-slate-800/40 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <span className="text-[10px] uppercase font-semibold">{dayName}</span>
                    <span className={clsx("text-sm mt-0.5 font-bold", isToday ? "text-white" : "text-slate-850 dark:text-slate-100")}>{dayNum}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Employee rows */}
          <div className="flex flex-col gap-3">
            {allMembersList.map((member: any) => {
              const isUnassigned = member.id === 'unassigned';
              const memberTasks = getTasksForMember(member.name);
              const tracks = layoutTasksForMember(memberTasks, dates);
              const numTracks = Math.max(tracks.length, 1);
              const rowHeight = numTracks * 64 + (numTracks - 1) * 8; // Card height is 64px, gap is 8px

              return (
                <div key={member.id} className="flex items-center gap-4 p-2 rounded-2xl bg-slate-50/30 dark:bg-slate-850/20 border border-slate-100 dark:border-slate-800/20 hover:border-slate-200/50 dark:hover:border-slate-700/30 transition-all duration-200">
                  
                  {/* Left Column: Member Card Details */}
                  <div className="w-48 shrink-0 flex items-center gap-2.5 pl-1.5">
                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm shrink-0 border border-slate-200/20", isUnassigned ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400" : getAvatarBg(member.name))}>
                      {isUnassigned ? <User className="w-4 h-4" /> : getInitials(member.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-750 dark:text-slate-100 truncate" title={member.name}>
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {member.role || 'Member'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: 14-day cells area */}
                  <div className="relative flex-1" style={{ height: `${rowHeight}px` }}>
                    
                    {/* Background Grid Cells */}
                    <div className="absolute inset-0 grid gap-2" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))', gridTemplateRows: '1fr' }}>
                      {dates.map((date, idx) => {
                        const dateKey = toDateKey(date.toISOString());
                        const isToday = dateKey === toDateKey(new Date().toISOString());
                        return (
                          <div 
                            key={idx} 
                            onClick={() => handleCellClick(member.name, dateKey)}
                            className={clsx(
                              "group flex items-center justify-center rounded-xl border border-dashed transition-all cursor-pointer",
                              isToday
                                ? "bg-indigo-500/[0.02] border-indigo-500/10 hover:border-indigo-500/30"
                                : "bg-slate-100/10 dark:bg-slate-900/10 border-transparent hover:border-slate-350 dark:hover:border-slate-700/50 hover:bg-slate-100/30 dark:hover:bg-slate-900/30"
                            )}
                          >
                            <Plus className="w-4.5 h-4.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Tasks Overlay */}
                    <div className="absolute inset-0 grid gap-2 pointer-events-none" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))', gridTemplateRows: `repeat(${numTracks}, minmax(0, 1fr))` }}>
                      {tracks.flatMap((track, trackIdx) => 
                        track.map(task => {
                          const startKey = toDateKey(task.startDate || task.deadline);
                          let startIndex = dates.findIndex(d => toDateKey(d.toISOString()) === startKey);
                          if (startIndex === -1) startIndex = 0;

                          const endKey = toDateKey(task.deadline);
                          let endIndex = dates.findIndex(d => toDateKey(d.toISOString()) === endKey);
                          if (endIndex === -1) endIndex = 13;

                          return (
                            <div 
                              key={task.id}
                              onClick={() => onEditTask && onEditTask(task)}
                              style={{
                                gridColumn: `${startIndex + 1} / ${endIndex + 2}`,
                                gridRow: `${trackIdx + 1} / ${trackIdx + 2}`
                              }}
                              className={clsx(
                                "pointer-events-auto flex flex-col justify-between p-2.5 rounded-xl border bg-white dark:bg-slate-850 cursor-pointer select-none transition-all hover:scale-[1.01] hover:shadow-md",
                                task.priority === 'High' 
                                  ? "border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-700/60" 
                                  : task.priority === 'Medium' 
                                    ? "border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700/60" 
                                    : "border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700/60"
                              )}
                              title={`${task.title} (${task.status}) - Click to edit`}
                            >
                              <div className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate leading-snug">
                                {task.title || 'Untitled'}
                              </div>
                              <div className="flex items-center justify-between mt-1 gap-1">
                                <span className={clsx(
                                  "text-[7px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider whitespace-nowrap",
                                  task.status === 'Completed' 
                                    ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" 
                                    : task.status === 'In Progress'
                                      ? "bg-sky-500/10 text-sky-500 dark:text-sky-400"
                                      : task.status === 'On Hold'
                                        ? "bg-amber-500/10 text-amber-500 dark:text-amber-400"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                )}>
                                  {task.status === 'In Progress' ? 'PROGRESS' : task.status === 'Completed' ? 'DONE' : task.status}
                                </span>
                                <span className={clsx(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  task.priority === 'High' ? 'bg-rose-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                                )} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                  
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Bottom stats capsules */}
      <div className="flex flex-wrap items-center gap-4 mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-800/50 select-none">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.02)]">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {pendingDeadlines} Pending Deadlines
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.02)]">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {completedThisWeek} Completed This Week
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.02)]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {overdueCritical} Overdue Critical Tasks
          </span>
        </div>
      </div>

      {/* Floating Action Button (FAB) at bottom right */}
      <button 
        onClick={() => onAddTask && onAddTask()}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-105 hover:rotate-90 transition-all duration-300 cursor-pointer z-50"
        title="Add Task"
      >
        <Plus className="w-6 h-6" />
      </button>

    </div>
  );
};
