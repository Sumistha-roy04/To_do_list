import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Status, Employee } from '../types';
import { getBackendUrl } from '../utils/api';

interface KanbanState {
  tasks: Task[];
  employees: Employee[];
  searchQuery: string;
  assigneeFilter: string;
  theme: 'light' | 'dark';
  dateFilter: 'all' | 'this-week' | 'next-week';
  viewMode: 'board' | 'calendar' | 'team' | 'timeline' | 'account' | 'chat' | 'meetings' | 'documents';
  user: { fullName: string; email: string; orgName: string; role?: string; roomCode?: string } | null;
  
  // Actions
  addTask: (task: Omit<Task, 'id' | 'createdDate' | 'lastUpdated'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: Status) => void;
  setEmployees: (employees: Employee[]) => void;
  setSearchQuery: (query: string) => void;
  setAssigneeFilter: (assigneeId: string) => void;
  setDateFilter: (filter: 'all' | 'this-week' | 'next-week') => void;
  setViewMode: (mode: 'board' | 'calendar' | 'team' | 'timeline' | 'account' | 'chat' | 'meetings' | 'documents') => void;
  toggleTheme: () => void;
  registerUser: (user: { fullName: string; email: string; orgName: string; role?: string; roomCode?: string }) => void;
  logoutUser: () => void;
}

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set) => ({
      tasks: [],
      employees: [],
      searchQuery: '',
      assigneeFilter: '',
      theme: 'light',
      dateFilter: 'all',
      viewMode: 'board',
      user: null,

      addTask: async (taskData) => {
        const now = new Date().toISOString();
        const roomCode = useKanbanStore.getState().user?.roomCode || '';
        const newTask: Task = {
          ...taskData,
          id: crypto.randomUUID(),
          createdDate: now,
          lastUpdated: now,
          roomCode
        };

        // If task created already in progress or completed, set start/completion timestamps
        if (newTask.status === 'In Progress' && !newTask.startDate) {
          newTask.startDate = now;
        }
        if (newTask.status === 'Completed' && !newTask.completionDate) {
          newTask.completionDate = now;
        }
        set((state) => ({ tasks: [...state.tasks, newTask] }));

        if (roomCode) {
          try {
            await fetch(`${getBackendUrl()}/api/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newTask)
            });
          } catch (err) {
            console.error('Failed to sync addTask:', err);
          }
        }
      },

      updateTask: async (id, updates) => {
        const now = new Date().toISOString();
        const roomCode = useKanbanStore.getState().user?.roomCode || '';

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, ...updates, lastUpdated: now, roomCode }
              : task
          ),
        }));

        const updatedTask = useKanbanStore.getState().tasks.find((task) => task.id === id);
        if (roomCode && updatedTask) {
          try {
            await fetch(`${getBackendUrl()}/api/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedTask)
            });
          } catch (err) {
            console.error('Failed to sync updateTask:', err);
          }
        }
      },

      deleteTask: async (id) => {
        const roomCode = useKanbanStore.getState().user?.roomCode || '';
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));

        if (roomCode) {
          try {
            await fetch(`${getBackendUrl()}/api/tasks/${id}?roomCode=${roomCode}`, {
              method: 'DELETE'
            });
          } catch (err) {
            console.error('Failed to sync deleteTask:', err);
          }
        }
      },

      moveTask: async (id, newStatus) => {
        const now = new Date().toISOString();
        const roomCode = useKanbanStore.getState().user?.roomCode || '';

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;
            
            const updates: Partial<Task> = { status: newStatus, lastUpdated: now, roomCode };
            if (newStatus === 'In Progress' && !task.startDate) {
              updates.startDate = now;
            }
            if (newStatus === 'Completed' && !task.completionDate) {
              updates.completionDate = now;
            }

            return { ...task, ...updates };
          }),
        }));

        const updatedTask = useKanbanStore.getState().tasks.find((task) => task.id === id);
        if (roomCode && updatedTask) {
          try {
            await fetch(`${getBackendUrl()}/api/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedTask)
            });
          } catch (err) {
            console.error('Failed to sync moveTask:', err);
          }
        }
      },

      setEmployees: (employees) => set({ employees }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setAssigneeFilter: (assigneeFilter) => set({ assigneeFilter }),
      setDateFilter: (dateFilter) => set({ dateFilter }),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      registerUser: (user) => set({ 
        user,
        tasks: [],
        employees: [],
        searchQuery: '',
        assigneeFilter: '',
        dateFilter: 'all',
        viewMode: 'board'
      }),
      logoutUser: () => set({ 
        user: null,
        tasks: [],
        employees: [],
        searchQuery: '',
        assigneeFilter: '',
        dateFilter: 'all',
        viewMode: 'board'
      }),
    }),
    {
      name: 'kanban-storage',
      version: 2,
      partialize: (state) => ({
        tasks: state.tasks,
        employees: state.employees,
        theme: state.theme,
        viewMode: state.viewMode,
        user: state.user,
      }),
      migrate: (persistedState) => {
        const state = persistedState as Partial<KanbanState>;

        return {
          tasks: state.tasks ?? [],
          employees: state.employees ?? [],
          theme: state.theme ?? 'light',
          viewMode: state.viewMode ?? 'board',
          user: state.user ?? null,
        };
      },
    }
  )
);
