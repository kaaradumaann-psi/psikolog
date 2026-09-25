/**
 * Repository: one place that knows how each clinical entity is written to and
 * read from the database. UI components never call this directly — the stores
 * do, and the bootstrap does.
 */

import type { DbPort, StoragePort } from './ports';
import { dataUrlToBytes } from './ports';
import type {
  AnamnesisRow,
  AppointmentRow,
  ClientRow,
  DocumentRow,
  NoteRow,
  ReportRow,
  SessionRow,
  TaskRow,
  TestAdministrationRow,
  TestResultRow,
} from './types';
import type { Owner } from './mapping';
import {
  clientToAnamnesisRow,
  clientToRow,
  documentStoragePath,
  documentToRow,
  noteToRow,
  reportToRow,
  sessionToRow,
  taskToRow,
  testToAdministrationRow,
  testToResultRow,
  appointmentToRow,
} from './mapping';
import type { LocalTestRecord } from './mapping';
import type { Appointment, ClinicalReport, Client, SoapSession } from '../clinicalTypes';
import type { PracticeDocument, PracticeNote, PracticeTask } from '../practiceStore';

export type CloudSnapshot = {
  clients: ClientRow[];
  anamneses: AnamnesisRow[];
  appointments: AppointmentRow[];
  sessions: SessionRow[];
  tests: { administration: TestAdministrationRow; result: TestResultRow }[];
  reports: ReportRow[];
  documents: DocumentRow[];
  notes: NoteRow[];
  tasks: TaskRow[];
};

export type Repository = {
  ensureOrganization(): Promise<string>;
  pullAll(): Promise<CloudSnapshot>;
  pushClient(client: Client): Promise<void>;
  deleteClient(id: string): Promise<void>;
  pushAppointment(appointment: Appointment): Promise<void>;
  deleteAppointment(id: string): Promise<void>;
  pushSession(session: SoapSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  pushTest(record: LocalTestRecord): Promise<void>;
  deleteTest(record: LocalTestRecord): Promise<void>;
  pushReport(report: ClinicalReport, snapshot: Record<string, unknown>): Promise<void>;
  deleteReport(id: string): Promise<void>;
  pushDocument(document: PracticeDocument): Promise<PracticeDocument>;
  deleteDocument(document: PracticeDocument): Promise<void>;
  pushNote(note: PracticeNote): Promise<void>;
  deleteNote(id: string): Promise<void>;
  pushTask(task: PracticeTask): Promise<void>;
  deleteTask(id: string): Promise<void>;
};

export function createRepository(deps: { db: DbPort; storage: StoragePort; owner: Owner }): Repository {
  const { db, storage, owner } = deps;

  function requireClient(entity: string, clientId: string | undefined): string {
    if (!clientId) {
      throw new Error(`${entity} bir danışana bağlı olmadan buluta yazılamaz. Önce dosyayı seçin.`);
    }
    return clientId;
  }

  return {
    /**
     * A psychologist with no organization cannot write anything (`is_org_member(null)`
     * is false). The RPC creates one personal organization on first use.
     */
    async ensureOrganization(): Promise<string> {
      if (owner.organizationId) return owner.organizationId;
      const orgId = await db.rpc<string>('ensure_personal_organization');
      if (!orgId) throw new Error('Çalışma alanı kurumu oluşturulamadı.');
      owner.organizationId = orgId;
      return orgId;
    },

    async pullAll(): Promise<CloudSnapshot> {
      const [clients, anamneses, appointments, sessions, administrations, reports, documents, notes, tasks] =
        await Promise.all([
          db.list<ClientRow>('clients'),
          db.list<AnamnesisRow>('anamneses'),
          db.list<AppointmentRow>('appointments'),
          db.list<SessionRow>('sessions'),
          db.list<TestAdministrationRow>('test_administrations'),
          db.list<ReportRow>('reports'),
          db.list<DocumentRow>('documents'),
          db.list<NoteRow>('notes'),
          db.list<TaskRow>('tasks'),
        ]);

      const results = administrations.length
        ? await db.list<TestResultRow>('test_results', [
            { column: 'test_administration_id', op: 'in', value: administrations.map((row) => row.id) },
          ])
        : [];
      const resultByAdmin = new Map(results.map((row) => [row.test_administration_id, row]));
      const tests = administrations.flatMap((administration) => {
        const result = resultByAdmin.get(administration.id);
        return result ? [{ administration, result }] : [];
      });

      return { clients, anamneses, appointments, sessions, tests, reports, documents, notes, tasks };
    },

    async pushClient(client: Client): Promise<void> {
      await db.upsert<ClientRow>('clients', clientToRow(client, owner));
      // The anamnesis lives in its own table but is edited on the client form.
      await db.upsert<AnamnesisRow>('anamneses', clientToAnamnesisRow(client, owner));
    },

    async deleteClient(id: string): Promise<void> {
      // Every clinical table cascades from clients(id).
      await db.remove('clients', id);
    },

    async pushAppointment(appointment: Appointment): Promise<void> {
      await db.upsert<AppointmentRow>('appointments', appointmentToRow(appointment, owner));
    },

    async deleteAppointment(id: string): Promise<void> {
      await db.remove('appointments', id);
    },

    async pushSession(session: SoapSession): Promise<void> {
      requireClient('Seans', session.clientId);
      await db.upsert<SessionRow>('sessions', sessionToRow(session, owner));
    },

    async deleteSession(id: string): Promise<void> {
      await db.remove('sessions', id);
    },

    async pushTest(record: LocalTestRecord): Promise<void> {
      requireClient('Test sonucu', record.clientId);
      // Parent first: test_results references test_administrations.
      await db.upsert<TestAdministrationRow>('test_administrations', testToAdministrationRow(record, owner));
      await db.upsert<TestResultRow>('test_results', testToResultRow(record, owner));
    },

    async deleteTest(record: LocalTestRecord): Promise<void> {
      // Deleting the administration cascades to its result row.
      await db.remove('test_administrations', record.id);
    },

    async pushReport(report: ClinicalReport, snapshot: Record<string, unknown>): Promise<void> {
      requireClient('Rapor', report.clientId);
      await db.upsert<ReportRow>('reports', reportToRow(report, owner, snapshot));
    },

    async deleteReport(id: string): Promise<void> {
      await db.remove('reports', id);
    },

    /**
     * Uploads the binary into the private bucket and stores only metadata in the
     * table. Returns the document with its storage path filled in.
     */
    async pushDocument(document: PracticeDocument): Promise<PracticeDocument> {
      requireClient('Belge', document.clientId);
      const path = document.filePath || documentStoragePath(owner, document);
      if (document.dataUrl) {
        const decoded = dataUrlToBytes(document.dataUrl);
        if (!decoded) throw new Error('Belge içeriği okunamadı.');
        await storage.upload(path, decoded.bytes, decoded.mimeType);
      }
      await db.upsert<DocumentRow>('documents', documentToRow(document, owner, path));
      return { ...document, filePath: path };
    },

    async deleteDocument(document: PracticeDocument): Promise<void> {
      if (document.filePath) {
        try {
          await storage.remove(document.filePath);
        } catch {
          // A dangling object is less harmful than a failed delete of the record.
        }
      }
      await db.remove('documents', document.id);
    },

    async pushNote(note: PracticeNote): Promise<void> {
      requireClient('Not', note.clientId);
      await db.upsert<NoteRow>('notes', noteToRow(note, owner));
    },

    async deleteNote(id: string): Promise<void> {
      await db.remove('notes', id);
    },

    async pushTask(task: PracticeTask): Promise<void> {
      await db.upsert<TaskRow>('tasks', taskToRow(task, owner));
    },

    async deleteTask(id: string): Promise<void> {
      await db.remove('tasks', id);
    },
  };
}
