import type { ReportSourceData } from './templateEngine';
import { MISSING } from './templateEngine';
import type { Client } from '../clients/clientTypes';
import type { Assessment } from '../assessments/assessmentTypes';
import type { Anamnesis } from '../anamnesis/anamnesisTypes';
import type { Session } from '../sessions/sessionTypes';
import type { TestAdministration, TestResult } from '../tests/testTypes';
import { formatDateTR } from '../../lib/dateGuards';

export type ReportContext = {
  client: Client;
  assessment?: Assessment | null;
  anamnesis?: Anamnesis | null;
  sessions?: Session[];
  testAdministrations?: (TestAdministration & { results?: TestResult[] })[];
  psychologist?: { firstName: string; lastName: string; title?: string; institution?: string };
};

export function buildSourceData(ctx: ReportContext): ReportSourceData {
  const fields: Record<string, unknown> = {
    patient: {
      fullName: `${ctx.client.firstName} ${ctx.client.lastName}`,
      firstName: ctx.client.firstName,
      lastName: ctx.client.lastName,
      birthDate: ctx.client.birthDate ? formatDateTR(ctx.client.birthDate) : MISSING,
      age: ctx.client.birthDate ? calculateAge(ctx.client.birthDate) : MISSING,
      fileNumber: ctx.client.fileNumber,
      profession: ctx.client.profession || MISSING,
      education: ctx.client.education || MISSING,
      phone: ctx.client.phone || MISSING,
      email: ctx.client.email || MISSING,
    },
    assessment: ctx.assessment
      ? {
          reason: ctx.assessment.reason || MISSING,
          date: formatDateTR(ctx.assessment.assessmentDate),
          method: ctx.assessment.method || MISSING,
          interview: ctx.assessment.interview || MISSING,
          observation: ctx.assessment.observation || MISSING,
          findings: ctx.assessment.findings || MISSING,
          expertEvaluation: ctx.assessment.expertEvaluation || MISSING,
          result: ctx.assessment.result || MISSING,
          recommendations: ctx.assessment.recommendations || MISSING,
        }
      : {},
    anamnesis: ctx.anamnesis
      ? {
          reason: ctx.anamnesis.reason || MISSING,
          currentStatus: ctx.anamnesis.currentStatus || MISSING,
          personalHistory: ctx.anamnesis.personalHistory || MISSING,
          familyHistory: ctx.anamnesis.familyHistory || MISSING,
          education: ctx.anamnesis.education || MISSING,
          profession: ctx.anamnesis.profession || MISSING,
          socialLife: ctx.anamnesis.socialLife || MISSING,
          relationships: ctx.anamnesis.relationships || MISSING,
          previousApplications: ctx.anamnesis.previousApplications || MISSING,
          previousAssessments: ctx.anamnesis.previousAssessments || MISSING,
          expertNotes: ctx.anamnesis.expertNotes || MISSING,
        }
      : {},
    test: ctx.assessment
      ? {
          date: formatDateTR(ctx.assessment.assessmentDate),
          psychologist: ctx.psychologist ? `${ctx.psychologist.firstName} ${ctx.psychologist.lastName}` : MISSING,
          method: ctx.assessment.method || MISSING,
        }
      : {
          date: new Date().toLocaleDateString('tr-TR'),
          psychologist: ctx.psychologist ? `${ctx.psychologist.firstName} ${ctx.psychologist.lastName}` : MISSING,
        },
    expert: ctx.psychologist
      ? {
          name: `${ctx.psychologist.firstName} ${ctx.psychologist.lastName}`,
          title: ctx.psychologist.title || MISSING,
          institution: ctx.psychologist.institution || MISSING,
        }
      : {},
  };

  const tables: ReportSourceData['tables'] = {};

  if (ctx.sessions && ctx.sessions.length > 0) {
    tables['sessions'] = {
      headers: ['Tarih', 'Tür', 'Süre', 'Önemli Noktalar'],
      rows: ctx.sessions.map((s) => [
        formatDateTR(s.date),
        s.type,
        s.duration ? `${s.duration} dk` : MISSING,
        s.keyPoints || s.notes?.slice(0, 80) || MISSING,
      ]),
    };
  }

  if (ctx.testAdministrations && ctx.testAdministrations.length > 0) {
    tables['tests'] = {
      headers: ['Tarih', 'Test', 'Durum', 'Özet'],
      rows: ctx.testAdministrations.map((ta) => [
        formatDateTR(ta.administrationDate),
        ta.definition?.name || ta.testDefinitionId.slice(0, 8),
        ta.status,
        ta.results?.[0]?.summary || ta.notes || MISSING,
      ]),
    };
  }

  return { fields: fields as ReportSourceData['fields'], tables };
}

function calculateAge(birthDate: string): string {
  try {
    const birth = new Date(birthDate + 'T00:00:00Z');
    const now = new Date();
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const m = now.getUTCMonth() - birth.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
    return `${age}`;
  } catch {
    return MISSING;
  }
}
