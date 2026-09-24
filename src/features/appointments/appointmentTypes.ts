export type Appointment = {
  id: string;
  clientId: string | null;
  organizationId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  location: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentRow = {
  id: string;
  client_id: string | null;
  organization_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: string;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status as Appointment['status'],
    location: row.location,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
