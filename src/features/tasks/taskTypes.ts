export type Task = {
  id: string;
  clientId: string | null;
  organizationId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskRow = {
  id: string;
  client_id: string | null;
  organization_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
