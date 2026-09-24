export type TestDefinition = {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  source: string;
  isSystem: boolean;
  createdAt: string;
};

export type TestAdministration = {
  id: string;
  clientId: string;
  assessmentId: string | null;
  testDefinitionId: string;
  organizationId: string;
  administrationDate: string;
  status: string;
  externalSource: string | null;
  externalAssessmentId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  definition?: TestDefinition;
};

export type TestResult = {
  id: string;
  testAdministrationId: string;
  organizationId: string;
  resultData: Record<string, unknown>;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TestDefinitionRow = {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  source: string;
  is_system: boolean;
  created_at: string;
};

export type TestAdminRow = {
  id: string;
  client_id: string;
  assessment_id: string | null;
  test_definition_id: string;
  organization_id: string;
  administration_date: string;
  status: string;
  external_source: string | null;
  external_assessment_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TestResultRow = {
  id: string;
  test_administration_id: string;
  organization_id: string;
  result_data: Record<string, unknown>;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToTestDefinition(row: TestDefinitionRow): TestDefinition {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    source: row.source,
    isSystem: row.is_system,
    createdAt: row.created_at,
  };
}

export function rowToTestAdmin(row: TestAdminRow): TestAdministration {
  return {
    id: row.id,
    clientId: row.client_id,
    assessmentId: row.assessment_id,
    testDefinitionId: row.test_definition_id,
    organizationId: row.organization_id,
    administrationDate: row.administration_date,
    status: row.status,
    externalSource: row.external_source,
    externalAssessmentId: row.external_assessment_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToTestResult(row: TestResultRow): TestResult {
  return {
    id: row.id,
    testAdministrationId: row.test_administration_id,
    organizationId: row.organization_id,
    resultData: row.result_data,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
