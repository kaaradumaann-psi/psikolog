export type ClientStatus = 'active' | 'archived';

export type Client = {
  id: string;
  organizationId: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  profession: string | null;
  education: string | null;
  status: ClientStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = {
  fileNumber?: string; // auto if empty
  firstName: string;
  lastName: string;
  birthDate?: string | null; // YYYY-MM-DD
  phone?: string | null;
  email?: string | null;
  profession?: string | null;
  education?: string | null;
  status?: ClientStatus;
};

export type ClientRow = {
  id: string;
  organization_id: string;
  file_number: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  profession: string | null;
  education: string | null;
  status: ClientStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    organizationId: row.organization_id,
    fileNumber: row.file_number,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    phone: row.phone,
    email: row.email,
    profession: row.profession,
    education: row.education,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function generateFileNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `F-${year}-${time}${rand}`;
}

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: 'Aktif',
  archived: 'Arşiv',
};
