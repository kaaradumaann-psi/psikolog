export type Document = {
  id: string;
  clientId: string;
  organizationId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentRow = {
  id: string;
  client_id: string;
  organization_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: row.organization_id,
    filePath: row.file_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const MAX_SIZE = 50 * 1024 * 1024;
