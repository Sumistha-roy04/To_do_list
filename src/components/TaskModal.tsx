import React, { useState, useEffect } from 'react';
import { useKanbanStore } from '../store/useKanbanStore';
import type { Priority, Task, Status } from '../types';
import { X } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit }) => {
  const { employees, addTask, updateTask, viewMode, user } = useKanbanStore();
  
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [projectDetails, setProjectDetails] = useState('');
  const [status, setStatus] = useState<Status>('To Do');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setAssignedTo(taskToEdit.assignedTo);
      // Format deadline for datetime-local or date input
      setDeadline(taskToEdit.deadline ? taskToEdit.deadline.split('T')[0] : '');
      setPriority(taskToEdit.priority);
      setProjectDetails(taskToEdit.projectDetails);
      setStatus(taskToEdit.status);
    } else {
      // Reset form
      setTitle('');
      setAssignedTo('Unassigned');
      setDeadline('');
      setPriority('Medium');
      setProjectDetails('');
      setStatus('To Do');
    }
  }, [taskToEdit, isOpen, employees]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title,
      assignedTo: user?.role !== 'member'
        ? assignedTo 
        : (taskToEdit?.assignedTo || (user ? user.fullName : 'Unassigned')),
      deadline,
      priority,
      projectDetails,
      status: (taskToEdit && taskToEdit.id) ? status : ('To Do' as const),
    };

    if (taskToEdit && taskToEdit.id) {
      updateTask(taskToEdit.id, taskData);
    } else {
      addTask(taskData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/50 dark:border-slate-800/80 shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {taskToEdit && taskToEdit.id ? 'Edit Task Details' : 'Create New Task'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Task Title *
            </label>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 text-sm outline-none transition-all placeholder-slate-400 text-slate-700 dark:text-slate-200"
              placeholder="e.g., Design Landing Page"
            />
          </div>

          {user?.role !== 'member' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Assigned To
              </label>
              <select 
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm outline-none cursor-pointer transition-all"
              >
                <option value="Unassigned" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">{emp.name}</option>
                ))}
              </select>
              {employees.length === 0 && (
                <p className="text-xs text-amber-500 dark:text-amber-400 font-medium mt-1">Please import employees in the top bar first.</p>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Deadline
              </label>
              <input 
                type="date" 
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch (err) {
                    console.warn("showPicker is not supported:", err);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm outline-none transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Priority
              </label>
              <select 
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm outline-none cursor-pointer transition-all"
              >
                <option value="Low" className="bg-white dark:bg-slate-900">Low</option>
                <option value="Medium" className="bg-white dark:bg-slate-900">Medium</option>
                <option value="High" className="bg-white dark:bg-slate-900">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Status
            </label>
            <select 
              value={status}
              onChange={e => setStatus(e.target.value as Status)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm outline-none cursor-pointer transition-all"
            >
              <option value="To Do" className="bg-white dark:bg-slate-900">To Do</option>
              <option value="In Progress" className="bg-white dark:bg-slate-900">In Progress</option>
              <option value="On Hold" className="bg-white dark:bg-slate-900">On Hold</option>
              <option value="Completed" className="bg-white dark:bg-slate-900">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Project Details
            </label>
            <textarea 
              rows={3}
              value={projectDetails}
              onChange={e => setProjectDetails(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm outline-none resize-none transition-all placeholder-slate-400"
              placeholder="Provide a detailed description of this task..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-4.5">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10 hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              {taskToEdit && taskToEdit.id ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
