export type Assessment = {
  id: string;
  clientId: string;
  organizationId: string;
  reason: string | null;
  assessmentDate: string;
  method: string | null;
  interview: string | null;
  observation: string | null;
  findings: string | null;
  expertEvaluation: string | null;
  result: string | null;
  recommendations: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentInput = {
  reason?: string | null;
  assessmentDate: string;
  method?: string | null;
  interview?: string | null;
  observation?: string | null;
  findings?: string | null;
  expertEvaluation?: string | null;
  result?: string | null;
  recommendations?: string | null;
};

export type AssessmentRow = {
  id: string;
  client_id: string;
  organization_id: string;
  reason: string | null;
  assessment_date: string;
  method: string | null;
  interview: string | null;
  observation: string | null;
  findings: string | null;
  expert_evaluation: string | null;
  result: string | null;
  recommendations: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function rowToAssessment(row: AssessmentRow): Assessment {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: row.organization_id,
    reason: row.reason,
    assessmentDate: row.assessment_date,
    method: row.method,
    interview: row.interview,
    observation: row.observation,
    findings: row.findings,
    expertEvaluation: row.expert_evaluation,
    result: row.result,
    recommendations: row.recommendations,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
