export type Priority = 'Low' | 'Medium' | 'High';
export type Status = 'To Do' | 'In Progress' | 'On Hold' | 'Completed';

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  projectDetails: string;
  priority: Priority;
  deadline: string; // ISO date string
  status: Status;
  createdDate: string; // ISO date string
  startDate?: string; // ISO date string
  completionDate?: string; // ISO date string
  lastUpdated: string; // ISO date string
  roomCode?: string;
}

export interface ColumnType {
  id: Status;
  title: string;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role?: string;
}
