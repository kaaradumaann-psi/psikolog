import { useState, useEffect } from 'react';
import type { ReportDocument, ReportBlock } from './templateEngine';
import { createEmptyBlock, resolvePlaceholders, evaluateWhen } from './templateEngine';
import type { ReportSourceData } from './templateEngine';
import { useReportAutosave } from './useReportAutosave';
import { showToast } from '../../components/ui/Toast';

type Props = {
  reportId: string;
  initialContent: ReportDocument;
  revision: number;
  sourceData: ReportSourceData;
  onSave: (content: ReportDocument, reason: 'manual' | 'complete') => Promise<void>;
};

export function ReportEditor({ reportId, initialContent, revision, sourceData, onSave }: Props) {
  const [doc, setDoc] = useState<ReportDocument>(initialContent);
  const [history, setHistory] = useState<ReportDocument[]>([initialContent]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const autosave = useReportAutosave(reportId, doc, revision, true);

  useEffect(() => {
    setDoc(initialContent);
    setHistory([initialContent]);
    setHistoryIdx(0);
  }, [reportId, initialContent]);

  const pushHistory = (newDoc: ReportDocument) => {
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(newDoc);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  };

  const updateBlock = (blockId: string, patch: Partial<ReportBlock>) => {
    const newDoc = {
      ...doc,
      blocks: doc.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    };
    setDoc(newDoc);
    pushHistory(newDoc);
  };

  const addBlock = (type: ReportBlock['type']) => {
    const newBlock = createEmptyBlock(type);
    const newDoc = { ...doc, blocks: [...doc.blocks, newBlock] };
    setDoc(newDoc);
    pushHistory(newDoc);
  };

  const deleteBlock = (blockId: string) => {
    const newDoc = { ...doc, blocks: doc.blocks.filter((b) => b.id !== blockId) };
    setDoc(newDoc);
    pushHistory(newDoc);
  };

  const moveBlock = (blockId: string, dir: -1 | 1) => {
    const idx = doc.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= doc.blocks.length) return;
    const blocks = [...doc.blocks];
    const [moved] = blocks.splice(idx, 1);
    if (!moved) return;
    blocks.splice(newIdx, 0, moved);
    const newDoc = { ...doc, blocks };
    setDoc(newDoc);
    pushHistory(newDoc);
  };

  const undo = () => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    const prev = history[newIdx];
    if (prev) setDoc(prev);
  };

  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    const next = history[newIdx];
    if (next) setDoc(next);
  };

  const handleManualSave = async () => {
    try {
      await onSave(doc, 'manual');
      showToast('Kaydedildi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleComplete = async () => {
    try {
      await onSave(doc, 'complete');
      showToast('Rapor tamamlandı', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={undo} disabled={historyIdx <= 0}>
            ↩ Geri Al
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={redo}
            disabled={historyIdx >= history.length - 1}
          >
            ↪ Yinele
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border)', marginInline: 4 }} />
          <button type="button" className="btn btn--soft btn--sm" onClick={() => addBlock('heading1')}>
            H1
          </button>
          <button type="button" className="btn btn--soft btn--sm" onClick={() => addBlock('heading2')}>
            H2
          </button>
          <button type="button" className="btn btn--soft btn--sm" onClick={() => addBlock('paragraph')}>
            Paragraf
          </button>
          <button type="button" className="btn btn--soft btn--sm" onClick={() => addBlock('bulletList')}>
            Liste
          </button>
          <button type="button" className="btn btn--soft btn--sm" onClick={() => addBlock('table')}>
            Tablo
          </button>
          <button type="button" className="btn btn--soft btn--sm" onClick={() => addBlock('dataField')}>
            + Veri alanı
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {autosave.state === 'saving'
                ? 'Kaydediliyor…'
                : autosave.state === 'saved'
                  ? 'Kaydedildi ✓'
                  : autosave.state === 'error'
                    ? `Hata: ${autosave.error}`
                    : 'Otomatik kayıt aktif (1.4s)'}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleManualSave}>
              Kaydet
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={handleComplete}>
              Tamamla
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {doc.blocks.map((block) => {
            if (!evaluateWhen(block.when, sourceData)) return null;
            return (
              <div key={block.id} className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    {block.type} {block.label ? `• ${block.label}` : ''} {block.path ? `• ${block.path}` : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => moveBlock(block.id, -1)}>
                      ↑
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => moveBlock(block.id, 1)}>
                      ↓
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => deleteBlock(block.id)}>
                      Sil
                    </button>
                  </div>
                </div>

                {block.type === 'dataField' ? (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                      Alan: {block.path || '—'} — Değer:{' '}
                      {block.path ? resolvePlaceholders(`{{${block.path}}}`, sourceData) : '—'}
                    </div>
                    <input
                      className="input"
                      value={block.path || ''}
                      onChange={(e) => updateBlock(block.id, { path: e.target.value })}
                      placeholder="patient.fullName"
                    />
                  </div>
                ) : block.type === 'table' ? (
                  <div>
                    {(block.rows || []).map((row, ri) => (
                      <div key={ri} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        {row.map((cell, ci) => (
                          <input
                            key={ci}
                            className="input"
                            value={cell}
                            onChange={(e) => {
                              const newRows = [...(block.rows || [])];
                              const newRow = [...(newRows[ri] || [])];
                              newRow[ci] = e.target.value;
                              newRows[ri] = newRow;
                              updateBlock(block.id, { rows: newRows });
                            }}
                          />
                        ))}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn--soft btn--sm"
                      onClick={() => {
                        const newRows = [...(block.rows || []), ['']];
                        updateBlock(block.id, { rows: newRows });
                      }}
                    >
                      + Satır
                    </button>
                  </div>
                ) : (
                  <div>
                    {(block.runs || []).map((run, ri) => (
                      <textarea
                        key={ri}
                        className="textarea"
                        value={run.text}
                        onChange={(e) => {
                          const newRuns = [...(block.runs || [])];
                          const current = newRuns[ri];
                          if (!current) return;
                          newRuns[ri] = { ...current, text: e.target.value };
                          updateBlock(block.id, { runs: newRuns });
                        }}
                        rows={block.type.startsWith('heading') ? 1 : 3}
                        style={{
                          fontWeight: run.bold ? 600 : undefined,
                          fontStyle: run.italic ? 'italic' : undefined,
                          textDecoration: run.underline ? 'underline' : undefined,
                          fontSize: block.type === 'heading1' ? 20 : block.type === 'heading2' ? 16 : 14,
                          fontFamily: block.type.startsWith('heading') ? 'var(--font-serif)' : undefined,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {doc.blocks.length === 0 && (
            <div className="empty-state-card">
              <div className="empty-state-icon">—</div>
              <h4>Blok yok</h4>
              <p>Yeni blok ekleyin — H1, H2, Paragraf, Liste, Tablo, veri alanı</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="card" style={{ position: 'sticky', top: 80 }}>
          <h4 style={{ fontSize: 13, marginBottom: 8 }}>Önizleme (güvenli)</h4>
          <div style={{ fontSize: 13, lineHeight: 1.6, display: 'grid', gap: 8 }}>
            {doc.blocks.map((block) => {
              if (!evaluateWhen(block.when, sourceData)) return null;
              if (block.type === 'dataField') {
                return (
                  <div key={block.id}>
                    <b>{block.label || block.path}:</b> {block.path ? resolvePlaceholders(`{{${block.path}}}`, sourceData) : '—'}
                  </div>
                );
              }
              if (block.type === 'table') {
                return (
                  <table key={block.id} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {(block.rows || []).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{ border: '1px solid var(--border)', padding: '4px 6px' }}>
                              {resolvePlaceholders(cell, sourceData)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              }
              return (
                <div key={block.id}>
                  {(block.runs || []).map((run, ri) => (
                    <span
                      key={ri}
                      style={{
                        fontWeight: run.bold ? 600 : undefined,
                        fontStyle: run.italic ? 'italic' : undefined,
                        textDecoration: run.underline ? 'underline' : undefined,
                      }}
                    >
                      {resolvePlaceholders(run.text, sourceData)}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
