import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
} from '@dnd-kit/core';
import type {
  DragStartEvent, 
  DragOverEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { useKanbanStore } from '../store/useKanbanStore';
import type { Status, Task } from '../types';
import { TaskModal } from './TaskModal';
import { getBackendUrl, getWsUrl } from '../utils/api';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { TeamDirectory } from './TeamDirectory';
import { CalendarView } from './CalendarView';
import { TimelineView } from './TimelineView';
import { ChatView } from './ChatView';
import { MeetingsView } from './MeetingsView';
import { DocumentsView } from './DocumentsView';

const COLUMNS: { id: Status; title: string }[] = [
  { id: 'To Do', title: 'To Do' },
  { id: 'In Progress', title: 'In Progress' },
  { id: 'On Hold', title: 'On Hold' },
  { id: 'Completed', title: 'Completed' },
];

const getWeekRange = (date: Date) => {
  const current = new Date(date);
  const day = current.getDay(); // 0 = Sun, 6 = Sat
  
  // Start of week (Sunday 00:00:00)
  const start = new Date(current);
  start.setDate(current.getDate() - day);
  start.setHours(0, 0, 0, 0);
  
  // End of week (Saturday 23:59:59)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const Board: React.FC = () => {
  const { tasks, moveTask, searchQuery, assigneeFilter, dateFilter, viewMode, user } = useKanbanStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Load tasks and team directory from backend
  const fetchBackendData = async () => {
    if (!user || !user.roomCode) return;
    try {
      // 1. Fetch tasks
      const taskRes = await fetch(`${getBackendUrl()}/api/tasks?roomCode=${user.roomCode}`);
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        useKanbanStore.setState({ tasks: taskData });
      }

      // 2. Fetch team members (employees)
      const memberRes = await fetch(`${getBackendUrl()}/api/leader/members?roomCode=${user.roomCode}`);
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        useKanbanStore.setState({ employees: memberData });
      }
    } catch (err) {
      console.error('Failed to sync backend data:', err);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, [user?.roomCode]);

  useEffect(() => {
    if (!user || !user.roomCode) return;

    // Connect WebSockets for live board & team updates
    const wsUrl = getWsUrl();
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomCode: user.roomCode,
        user: { fullName: user.fullName, email: user.email }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'task_update' || parsed.type === 'member_update') {
          fetchBackendData();
        }
      } catch (err) {
        console.error('Board WS message error:', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [user?.roomCode]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    
    // Determine the column we are hovering over
    const isOverAColumn = COLUMNS.some(col => col.id === overId);
    const isOverATask = tasks.some(t => t.id === overId);

    if (!activeTask) return;

    if (isOverAColumn && activeTask.status !== overId) {
      moveTask(activeId.toString(), overId as Status);
    } else if (isOverATask) {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask && activeTask.status !== overTask.status) {
        moveTask(activeId.toString(), overTask.status);
      }
    }
  };

  const handleDragEnd = () => {
    setActiveTask(null);
  };

  const handleOpenTaskModal = (task?: Task) => {
    if (task) {
      setTaskToEdit(task);
    } else {
      setTaskToEdit(null);
    }
    setIsModalOpen(true);
  };

  const handleAddTaskWithDate = (dateStr: string) => {
    const dummyTask: Task = {
      id: '',
      title: '',
      assignedTo: 'Unassigned',
      projectDetails: '',
      priority: 'Medium',
      deadline: dateStr,
      status: 'To Do',
      createdDate: '',
      lastUpdated: ''
    };
    setTaskToEdit(dummyTask);
    setIsModalOpen(true);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    // If user is a Member, restrict view to tasks assigned to them (case-insensitive)
    if (user && user.role === 'member' && task.assignedTo.toLowerCase() !== user.fullName.toLowerCase()) {
      return false;
    }

    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.projectDetails.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssignee = assigneeFilter ? task.assignedTo === assigneeFilter : true;

    const matchesDate = (() => {
      if (dateFilter === 'all') return true;
      if (!task.deadline) return false;
      
      const deadlineDate = new Date(task.deadline);
      const today = new Date();
      
      if (dateFilter === 'this-week') {
        const thisWeek = getWeekRange(today);
        return deadlineDate >= thisWeek.start && deadlineDate <= thisWeek.end;
      }
      
      if (dateFilter === 'next-week') {
        const nextWeekDate = new Date(today);
        nextWeekDate.setDate(today.getDate() + 7);
        const nextWeek = getWeekRange(nextWeekDate);
        return deadlineDate >= nextWeek.start && deadlineDate <= nextWeek.end;
      }
      
      return true;
    })();
    return matchesSearch && matchesAssignee && matchesDate;
  });

  // Filter tasks for calendar (ignore dateFilter, but respect search and assignee)
  const calendarFilteredTasks = tasks.filter(task => {
    // If user is a Member, restrict view to tasks assigned to them (case-insensitive)
    if (user && user.role === 'member' && task.assignedTo.toLowerCase() !== user.fullName.toLowerCase()) {
      return false;
    }

    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.projectDetails.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssignee = assigneeFilter ? task.assignedTo === assigneeFilter : true;
    return matchesSearch && matchesAssignee;
  });

  return (
    <div className="h-full flex flex-col md:flex-row p-4 pb-24 md:pb-8 md:p-8 overflow-hidden max-w-[1600px] mx-auto gap-6">
      <Sidebar />
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <TopBar onOpenTaskModal={() => handleOpenTaskModal()} />

        <div className="flex-1 min-h-0 overflow-auto pb-4 custom-scrollbar flex flex-col">
        {viewMode === 'team' ? ( 
          <div className="px-1"> 
            <TeamDirectory onAddTaskForEmployee={(name: string) => { 
              const dummyTask: Task = { 
                id: '', 
                title: '', 
                assignedTo: name, 
                projectDetails: '', 
                priority: 'Medium', 
                deadline: '', 
                status: 'To Do', 
                createdDate: '', 
                lastUpdated: '' 
              }; 
              handleOpenTaskModal(dummyTask); 
            }} /> 
          </div> 
        ) : viewMode === 'calendar' ? ( 
          <CalendarView 
            tasks={calendarFilteredTasks}
            onEditTask={handleOpenTaskModal}
            onAddTaskWithDate={handleAddTaskWithDate}
          />
        ) : viewMode === 'timeline' ? (
          <TimelineView 
            onEditTask={handleOpenTaskModal}
            onAddTask={(preset) => {
              const dummyTask: Task = {
                id: '',
                title: '',
                assignedTo: preset?.assignedTo || '',
                projectDetails: '',
                priority: preset?.priority || 'Medium',
                deadline: preset?.deadline || '',
                status: preset?.status || 'To Do',
                createdDate: '',
                lastUpdated: ''
              };
              handleOpenTaskModal(dummyTask);
            }}
          />
        ) : viewMode === 'chat' ? (
          <ChatView />
        ) : viewMode === 'meetings' ? (
          <MeetingsView />
        ) : viewMode === 'documents' ? (
          <DocumentsView />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full items-start min-w-max">
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  tasks={filteredTasks.filter((t) => t.status === col.id)}
                  onEditTask={handleOpenTaskModal}
                  onAddClick={col.id === 'To Do' ? () => handleOpenTaskModal() : undefined}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} onEdit={() => {}} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        taskToEdit={taskToEdit} 
      />
    </div>
    </div>
  );
};
