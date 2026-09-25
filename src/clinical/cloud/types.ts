/**
 * Cloud row types — snake_case, exactly what the existing migrations define.
 * No table is redesigned here; these mirror `supabase/migrations/*.sql`.
 */

export type CloudTable =
  | 'clients'
  | 'anamneses'
  | 'appointments'
  | 'sessions'
  | 'test_administrations'
  | 'test_results'
  | 'reports'
  | 'documents'
  | 'notes'
  | 'tasks'
  | 'formulations'
  | 'safety_plans';

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
  status: string;
  profile_extra: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  fee: number | null;
  payment_status: string;
  created_by: string;
  created_at: string;
};

export type SessionRow = {
  id: string;
  client_id: string;
  organization_id: string;
  date: string;
  type: string;
  duration: number | null;
  plan: string | null;
  appointment_id: string | null;
  session_number: number | null;
  start_time: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  risk_level: string;
  risk_notes: string | null;
  homework: string | null;
  fee: number | null;
  payment_status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TestAdministrationRow = {
  id: string;
  client_id: string;
  assessment_id: string | null;
  test_definition_id: string;
  organization_id: string;
  administration_date: string;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type TestResultRow = {
  id: string;
  test_administration_id: string;
  organization_id: string;
  result_data: Record<string, unknown>;
  summary: string | null;
  created_at: string;
};

export type ReportRow = {
  id: string;
  client_id: string;
  organization_id: string;
  created_by: string;
  title: string;
  content: Record<string, unknown>;
  status: 'draft' | 'completed';
  source_snapshot: Record<string, unknown>;
  source_version: string;
  save_reason: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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

/** System test definitions seeded by 20260924000002_phase04_assessments_tests.sql. */
export const SYSTEM_TEST_DEFINITIONS = {
  bai: '00000000-0000-4000-8000-000000000001',
  beck: '00000000-0000-4000-8000-000000000002',
  scl90: '00000000-0000-4000-8000-000000000003',
  gad7: '00000000-0000-4000-8000-000000000004',
  phq9: '00000000-0000-4000-8000-000000000005',
} as const;

export type ScaleKey = keyof typeof SYSTEM_TEST_DEFINITIONS;

/* One row per client: the application keeps a single formulation and a single
   safety plan per client, so both tables carry `unique (client_id)` and the row
   id is derived deterministically from the client id (see mapping.ts). */

export type GoalRow = {
  id: string;
  text: string;
  measure: string;
  status: string;
};

export type FormulationRow = {
  id: string;
  client_id: string;
  organization_id: string;
  modality: string | null;
  predisposing: string | null;
  precipitating: string | null;
  perpetuating: string | null;
  protective: string | null;
  goals: GoalRow[];
  review_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SafetyPlanRow = {
  id: string;
  client_id: string;
  organization_id: string;
  warning_signs: string | null;
  coping: string | null;
  people: string | null;
  professionals: string | null;
  environment: string | null;
  reasons: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
