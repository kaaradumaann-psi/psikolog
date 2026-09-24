export type Anamnesis = {
  id: string;
  clientId: string;
  organizationId: string;
  reason: string | null;
  currentStatus: string | null;
  personalHistory: string | null;
  familyHistory: string | null;
  education: string | null;
  profession: string | null;
  socialLife: string | null;
  relationships: string | null;
  previousApplications: string | null;
  previousAssessments: string | null;
  expertNotes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AnamnesisInput = {
  reason?: string | null;
  currentStatus?: string | null;
  personalHistory?: string | null;
  familyHistory?: string | null;
  education?: string | null;
  profession?: string | null;
  socialLife?: string | null;
  relationships?: string | null;
  previousApplications?: string | null;
  previousAssessments?: string | null;
  expertNotes?: string | null;
};

export type AnamnesisRow = {
  id: string;
  client_id: string;
  organization_id: string;
  reason: string | null;
  current_status: string | null;
  personal_history: string | null;
  family_history: string | null;
  education: string | null;
  profession: string | null;
  social_life: string | null;
  relationships: string | null;
  previous_applications: string | null;
  previous_assessments: string | null;
  expert_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToAnamnesis(row: AnamnesisRow): Anamnesis {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: row.organization_id,
    reason: row.reason,
    currentStatus: row.current_status,
    personalHistory: row.personal_history,
    familyHistory: row.family_history,
    education: row.education,
    profession: row.profession,
    socialLife: row.social_life,
    relationships: row.relationships,
    previousApplications: row.previous_applications,
    previousAssessments: row.previous_assessments,
    expertNotes: row.expert_notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
