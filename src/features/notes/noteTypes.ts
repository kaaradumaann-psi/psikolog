export type Note = {
  id: string;
  clientId: string;
  organizationId: string;
  content: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteRow = {
  id: string;
  client_id: string;
  organization_id: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: row.organization_id,
    content: row.content,
    isPinned: row.is_pinned,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
