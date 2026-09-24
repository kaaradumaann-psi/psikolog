export type Session = {
  id: string;
  clientId: string;
  organizationId: string;
  date: string;
  type: string;
  duration: number | null;
  notes: string | null;
  observation: string | null;
  keyPoints: string | null;
  plan: string | null;
  followUp: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionInput = {
  date: string;
  type: string;
  duration?: number | null;
  notes?: string | null;
  observation?: string | null;
  keyPoints?: string | null;
  plan?: string | null;
  followUp?: string | null;
};

export type SessionRow = {
  id: string;
  client_id: string;
  organization_id: string;
  date: string;
  type: string;
  duration: number | null;
  notes: string | null;
  observation: string | null;
  key_points: string | null;
  plan: string | null;
  follow_up: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: row.organization_id,
    date: row.date,
    type: row.type,
    duration: row.duration,
    notes: row.notes,
    observation: row.observation,
    keyPoints: row.key_points,
    plan: row.plan,
    followUp: row.follow_up,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const SESSION_TYPES = [
  'İlk Görüşme',
  'Takip',
  'Değerlendirme',
  'Kriz',
  'Aile Görüşmesi',
  'Çift Görüşmesi',
  'Online',
  'Diğer',
] as const;
