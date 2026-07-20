import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Status, Task } from '../types';
import { TaskCard } from './TaskCard';
import { FolderPlus, Plus } from 'lucide-react';
import clsx from 'clsx';

interface ColumnProps {
  id: Status;
  title: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAddClick?: () => void;
}

const statusStyles = {
  'To Do': {
    border: 'border-t-2 border-indigo-500 dark:border-indigo-400',
    bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
    hoverBg: 'bg-indigo-50/20 dark:bg-indigo-900/10 border-indigo-200/50 dark:border-indigo-900/50',
  },
  'In Progress': {
    border: 'border-t-2 border-sky-500 dark:border-sky-400',
    bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500 dark:bg-sky-400',
    hoverBg: 'bg-sky-50/20 dark:bg-sky-900/10 border-sky-200/50 dark:border-sky-900/50',
  },
  'On Hold': {
    border: 'border-t-2 border-amber-500 dark:border-amber-400',
    bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500 dark:bg-amber-400',
    hoverBg: 'bg-amber-50/20 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-900/50',
  },
  'Completed': {
    border: 'border-t-2 border-emerald-500 dark:border-emerald-400',
    bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    hoverBg: 'bg-emerald-50/20 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-900/50',
  },
};

export const Column: React.FC<ColumnProps> = ({ id, title, tasks, onEditTask, onAddClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'Column',
      columnId: id,
    },
  });

  const taskIds = tasks.map(task => task.id);
  const style = statusStyles[id];

  return (
    <div className="flex flex-col flex-1 min-w-[310px] max-w-[420px] h-[calc(100vh-200px)]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3.5 px-2">
        <div className="flex items-center gap-2">
          <span className={clsx("w-2.5 h-2.5 rounded-full shadow-sm", style.dot)} />
          <h2 className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-200">
            {title}
          </h2>
          <span className={clsx("ml-1.5 flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold", style.bg)}>
            {tasks.length}
          </span>
        </div>

        {/* Add Task button for To Do column */}
        {id === 'To Do' && typeof (onAddClick) === 'function' && (
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        )}
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={clsx(
          "flex flex-col gap-3.5 p-4 rounded-3xl flex-1 overflow-y-auto custom-scrollbar transition-all duration-300",
          "bg-slate-100/40 dark:bg-slate-900/20 border border-slate-200/40 dark:border-slate-850/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]",
          style.border,
          isOver ? style.hoverBg : ""
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={onEditTask} />
            ))}
          </div>
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-8 text-center bg-slate-50/20 dark:bg-slate-950/10 min-h-[250px]">
            <span className="w-10 h-10 rounded-full bg-slate-100/80 dark:bg-slate-900/50 flex items-center justify-center mb-2 border border-slate-200/40 dark:border-slate-800/40">
              <FolderPlus className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Empty Column</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[180px] mx-auto leading-relaxed">
              Drag & drop tasks here or click "Add Task" to start.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
