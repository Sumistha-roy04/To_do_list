import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { useKanbanStore } from '../store/useKanbanStore';
import { formatDateTime, formatDate } from '../utils/dateUtils';
import { Calendar, Clock, Trash2, Edit2, Play, CheckCircle2, Pause } from 'lucide-react';
import clsx from 'clsx';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

const priorityLeftBorder = {
  Low: 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400',
  Medium: 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
  High: 'border-l-4 border-l-rose-500 dark:border-l-rose-400',
};

const priorityBadges = {
  Low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/10',
  Medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/10',
  High: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/10',
};

const getInitials = (name: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarBg = (name: string) => {
  const colors = [
    'bg-indigo-500 text-white',
    'bg-emerald-500 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-purple-500 text-white',
    'bg-pink-500 text-white',
    'bg-cyan-500 text-white',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit }) => {
  const { deleteTask, moveTask } = useKanbanStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTask(task.id);
    }
  };

  const handleStartTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveTask(task.id, 'In Progress');
  };

  const handleCompleteTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveTask(task.id, 'Completed');
  };

  const handleHoldTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveTask(task.id, 'On Hold');
  };

  const handleResumeTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveTask(task.id, 'In Progress');
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="opacity-40 bg-indigo-500/10 dark:bg-indigo-950/10 border-2 border-dashed border-indigo-500/40 dark:border-indigo-400/40 rounded-2xl h-[160px]" 
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "group relative bg-white dark:bg-slate-900 p-4 rounded-2xl transition-all duration-300 border border-slate-200/40 dark:border-slate-800/80 flex flex-col gap-3 cursor-grab active:cursor-grabbing",
        priorityLeftBorder[task.priority],
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]",
        "hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45)] hover:border-slate-300 dark:hover:border-slate-700/80 hover:scale-[1.01]"
      )}
    >
      {/* Header Info */}
      <div className="flex justify-between items-start gap-2.5">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[13.5px] leading-snug tracking-tight">
          {task.title}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:text-slate-500 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-all cursor-pointer"
            title="Edit Task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={handleDelete}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {task.projectDetails && (
        <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {task.projectDetails}
        </p>
      )}

      {/* Meta Info: Assignee & Priority */}
      <div className="flex items-center justify-between mt-1 pt-1">
        <div className="flex items-center gap-2">
          <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm", getAvatarBg(task.assignedTo))}>
            {getInitials(task.assignedTo)}
          </div>
          <span className="text-xs text-slate-650 dark:text-slate-350 font-medium">{task.assignedTo}</span>
        </div>
        
        <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold", priorityBadges[task.priority])}>
          {task.priority}
        </span>
      </div>

      {/* Dates & Milestones */}
      {(task.deadline || task.startDate || task.completionDate) && (
        <div className="flex flex-col gap-1.5 mt-1 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          {task.deadline && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-550 dark:text-slate-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-orange-500/80 dark:text-orange-400/80" />
              <span>Due: {formatDate(task.deadline)}</span>
            </div>
          )}
          
          {task.startDate && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-550 dark:text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-500/80 dark:text-indigo-400/80" />
              <span>Started: {formatDateTime(task.startDate)}</span>
            </div>
          )}

          {task.completionDate && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-550 dark:text-slate-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 dark:text-emerald-400/80" />
              <span>Completed: {formatDateTime(task.completionDate)}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons based on Status */}
      {task.status !== 'Completed' && (
        <div className="flex justify-end gap-2 mt-1">
          {task.status === 'To Do' && (
            <>
              <button
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={handleHoldTask}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                title="Put On Hold"
              >
                <Pause className="w-3 h-3" />
                <span>Hold</span>
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={handleStartTask}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold transition-all hover:shadow-md hover:shadow-indigo-500/15 active:scale-95 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start</span>
              </button>
            </>
          )}
          {task.status === 'In Progress' && (
            <>
              <button
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={handleHoldTask}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                title="Put On Hold"
              >
                <Pause className="w-3 h-3" />
                <span>Hold</span>
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={handleCompleteTask}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-all hover:shadow-md hover:shadow-emerald-500/15 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Complete</span>
              </button>
            </>
          )}
          {task.status === 'On Hold' && (
            <button
              onPointerDown={(e) => e.stopPropagation()} 
              onClick={handleResumeTask}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold transition-all hover:shadow-md hover:shadow-sky-500/15 active:scale-95 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Resume Task</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
