import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ALLOWED_DOCUMENT_MIMES,
  MAX_LOCAL_DOCUMENT_BYTES,
  deleteDocument,
  deleteNote,
  getDocumentsByClient,
  getNotesByClient,
  newId,
  saveDocument,
  saveNote,
  subscribePracticeStore,
  type PracticeDocument,
  type PracticeNote,
} from '../../clinical/practiceStore';
import { isSafeDocumentUrl } from '../../clinical/recordRules';
import { Icon } from '../Icon';

export function ClientNotes({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<PracticeNote[]>(() => getNotesByClient(clientId));
  const [draft, setDraft] = useState('');

  useEffect(() => subscribePracticeStore(() => setNotes(getNotesByClient(clientId))), [clientId]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    const now = new Date().toISOString();
    saveNote({ id: newId('note'), clientId, content, pinned: false, createdAt: now, updatedAt: now });
    setDraft('');
  }

  function togglePin(note: PracticeNote) {
    saveNote({ ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() });
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="modern-table-card" style={{ padding: 16, marginBottom: 14 }}>
        <label htmlFor="note-draft" style={{ fontSize: 13, fontWeight: 650 }}>Yeni klinik not</label>
        <textarea id="note-draft" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={4000} placeholder="Seans dışı hatırlatma, gözlem, idari not…" style={{ width: '100%', marginTop: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="submit" className="btn-primary btn-sm">Notu kaydet</button>
        </div>
      </form>
      {notes.length === 0 ? (
        <div className="empty-state-card"><h4>Not yok</h4><p>Sabitlenebilir kısa notlar dosyada kalır.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map((note) => (
            <article key={note.id} className="modern-table-card" style={{ padding: 14 }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{note.content}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => togglePin(note)}>{note.pinned ? 'Sabiti kaldır' : 'Sabitle'}</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => deleteNote(note.id)}>Sil</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientDocuments({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<PracticeDocument[]>(() => getDocumentsByClient(clientId));
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => subscribePracticeStore(() => setDocs(getDocumentsByClient(clientId))), [clientId]);

  function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!ALLOWED_DOCUMENT_MIMES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIMES)[number])) {
      setError('İzin verilen türler: PDF, JPG, PNG, WEBP, TXT.');
      return;
    }
    if (file.size > MAX_LOCAL_DOCUMENT_BYTES) {
      setError('Yerel kasa 1.5 MB ile sınırlıdır. Daha büyük dosya için Supabase özel kovası kullanılır.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      saveDocument({
        id: newId('doc'),
        clientId,
        fileName: file.name.slice(0, 180),
        mimeType: file.type,
        sizeBytes: file.size,
        description: description.trim() || undefined,
        dataUrl,
        createdAt: new Date().toISOString(),
      });
      setDescription('');
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="modern-table-card" style={{ padding: 16, marginBottom: 14 }}>
        <strong>Cihaz içi belge kasası</strong>
        <p style={{ margin: '6px 0 12px', color: 'var(--soft)', fontSize: 13 }}>
          Dosya bu tarayıcıda kalır, herkese açık bağlantı üretilmez. Bulut kurulursa belgeler özel kovada ve 1 saatlik imzalı URL ile okunur.
        </p>
        <label className="form-group">
          <span>Açıklama</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} />
        </label>
        <label className="btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          <Icon name="file" size={14} />
          <span>Dosya seç</span>
          <input
            type="file"
            accept={ALLOWED_DOCUMENT_MIMES.join(',')}
            style={{ display: 'none' }}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </label>
        {error && <p style={{ color: 'var(--danger-ink)', fontSize: 13 }}>{error}</p>}
      </div>
      {docs.length === 0 ? (
        <div className="empty-state-card"><h4>Belge yok</h4><p>Onam, sevk veya dış yazışma ekleyebilirsiniz.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {docs.map((doc) => (
            <article key={doc.id} className="modern-table-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{doc.fileName}</strong>
                <div style={{ fontSize: 12, color: 'var(--soft)' }}>{doc.mimeType} · {Math.ceil(doc.sizeBytes / 1024)} KB · {doc.description || 'Açıklama yok'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {isSafeDocumentUrl(doc.dataUrl) && (
                  <a className="btn-secondary btn-sm" href={doc.dataUrl} download={doc.fileName}>İndir</a>
                )}
                <button type="button" className="btn-secondary btn-sm" onClick={() => deleteDocument(doc.id)}>Sil</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
