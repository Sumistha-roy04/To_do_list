import React, { useState } from 'react';
import type { Task } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import clsx from 'clsx';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAddTaskWithDate: (dateStr: string) => void;
}

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const getTaskTime = (dateStr: string) => {
  if (!dateStr) return '';
  if (!dateStr.includes('T')) return '';
  try {
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
};

const toLocalDateKey = (dateStr: string) => {
  if (!dateStr) return '';

  // Date-only format (YYYY-MM-DD) is already stable and timezone-safe.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  const parsedDate = new Date(dateStr);
  if (Number.isNaN(parsedDate.getTime())) return '';

  const y = parsedDate.getFullYear();
  const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const d = String(parsedDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};


const priorityDotColors = {
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-500',
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const YEAR_START = 2020;
const YEAR_END = 2035;

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEditTask, onAddTaskWithDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const prevMonthDays = Array.from({ length: firstDayIndex }, (_, i) => {
    const d = daysInPrevMonth - firstDayIndex + i + 1;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    return { day: d, month: m, year: y, isCurrentMonth: false };
  });

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
    return { day: i + 1, month, year, isCurrentMonth: true };
  });

  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const remainingDays = 42 - totalCells; // Standard 6-week layout

  const nextMonthDays = Array.from({ length: remainingDays }, (_, i) => {
    const d = i + 1;
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    return { day: d, month: m, year: y, isCurrentMonth: false };
  });

  const calendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleMonthChange = (newMonth: number) => {
    setCurrentDate(new Date(year, newMonth, 1));
  };

  const handleYearChange = (newYear: number) => {
    setCurrentDate(new Date(newYear, month, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (d: number, m: number, y: number) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === m && today.getFullYear() === y;
  };

  const getTasksForDay = (d: number, m: number, y: number) => {
    const dayKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    return tasks.filter(task => {
      const dateToUse = task.deadline;
      if (!dateToUse) return false;
      return toLocalDateKey(dateToUse) === dayKey;
    });
  };

  const handleDayClick = (d: number, m: number, y: number) => {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onAddTaskWithDate(dateStr);
  };

  const getDayLabel = (d: number, isCurrent: boolean, m: number) => {
    if (d === 1 && isCurrent) {
      const monthAbbrev = MONTH_NAMES[m].slice(0, 3);
      return `${monthAbbrev} 1`;
    }
    return String(d);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full gap-4">
      {/* Calendar Header Controls */}
      <div className="flex justify-between items-center backdrop-blur-md bg-white/40 dark:bg-slate-900/20 p-3 px-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/60 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-850 dark:text-slate-100">
            {MONTH_NAMES[month]}, {year}
          </h2>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/20 dark:border-slate-750/20 shadow-sm">
            <label className="sr-only" htmlFor="calendar-month-select">Month</label>
            <select
              id="calendar-month-select"
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer text-slate-700 dark:text-slate-200 font-semibold"
            >
              {MONTH_NAMES.map((monthName, index) => (
                <option key={monthName} value={index} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                  {monthName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/20 dark:border-slate-750/20 shadow-sm">
            <label className="sr-only" htmlFor="calendar-year-select">Year</label>
            <select
              id="calendar-year-select"
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer text-slate-700 dark:text-slate-200 font-semibold"
            >
              {Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, index) => {
                const optionYear = YEAR_START + index;
                return (
                  <option key={optionYear} value={optionYear} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                    {optionYear}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Combined Navigation Control Group */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-0.5 rounded-xl border border-slate-200/25 dark:border-slate-700/25 shadow-sm">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleToday}
              className="px-3.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              Today
            </button>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 min-h-0 flex flex-col bg-slate-100/40 dark:bg-slate-900/10 border border-slate-200/40 dark:border-slate-850/80 rounded-3xl overflow-hidden shadow-sm">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200/45 dark:border-slate-800/45 bg-slate-50/50 dark:bg-slate-900/30 text-center py-2.5">
          {WEEKDAYS.map(day => (
            <span key={day} className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {day}
            </span>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div
          className="flex-1 min-h-0 grid grid-cols-7 divide-x divide-y divide-slate-200/40 dark:divide-slate-800/40 bg-slate-200/20 dark:bg-slate-950/5"
          style={{ gridTemplateRows: 'repeat(6, minmax(64px, 1fr))', minHeight: 'min(512px, 60vh)' }}
        >
          {calendarDays.map((cell, idx) => {
            const dayTasks = getTasksForDay(cell.day, cell.month, cell.year);
            const isCellToday = isToday(cell.day, cell.month, cell.year);

            return (
              <div 
                key={idx}
                onClick={() => handleDayClick(cell.day, cell.month, cell.year)}
                className={clsx(
                  "p-4 flex flex-col gap-2 min-h-0 overflow-hidden relative group transition-all duration-200 cursor-pointer select-none",
                  cell.isCurrentMonth 
                    ? "bg-white dark:bg-slate-900/30 text-slate-800 dark:text-slate-250 hover:bg-slate-50/50 dark:hover:bg-slate-900/40" 
                    : "bg-slate-50/20 dark:bg-slate-950/15 text-slate-400 dark:text-slate-600 hover:bg-slate-100/30 dark:hover:bg-slate-950/30",
                  isCellToday ? "bg-sky-500/[0.04] dark:bg-sky-400/[0.03]" : ""
                )}
              >
                {/* Day Header Info */}
                <div className="flex justify-between items-center mb-1">
                  <span className={clsx(
                    "text-xs font-bold w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all",
                    isCellToday 
                      ? "bg-sky-500 text-white shadow-md shadow-sky-500/25 font-bold" 
                      : cell.isCurrentMonth 
                        ? "text-slate-600 dark:text-slate-400" 
                        : "text-slate-400 dark:text-slate-600"
                  )}>
                    {getDayLabel(cell.day, cell.isCurrentMonth, cell.month)}
                  </span>
                  
                  {/* Subtle hover indicator for adding task */}
                  <span className="opacity-0 group-hover:opacity-100 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all">
                    <Plus className="w-3 h-3" />
                  </span>
                </div>

                {dayTasks.length > 0 && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold shadow-sm pointer-events-none">
                    {dayTasks.length}
                  </div>
                )}

                {/* Day Tasks List */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-0.5 pb-0.5">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering day addition modal
                        onEditTask(task);
                      }}
                      className="w-full min-h-[52px] px-2.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-md hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer min-w-0"
                      title={`${task.title} (Due: ${getTaskTime(task.deadline) || 'All day'} | ${task.assignedTo})`}
                    >
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className={clsx("w-2.5 h-2.5 rounded-full shrink-0 shadow-sm mt-1", priorityDotColors[task.priority])} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold leading-snug text-slate-800 dark:text-slate-100 break-words">
                            {task.title}
                          </div>
                          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {task.assignedTo} {getTaskTime(task.deadline) ? `· ${getTaskTime(task.deadline)}` : '· All day'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
