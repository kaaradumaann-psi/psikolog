import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AuthenticatedUser } from '../auth/authTypes';
import type { MMPIProfile } from '../scoring/mmpiScoring';
import type { ParsedRecordPayload } from '../workspace/caseTypes';
import { buildAiProfileSummary, requestAiInterpretation } from '../ai/aiInterpretation';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { ReportSourceData } from './reportDataAdapter';
import { createTemplate, listVersions, type ReportVersion, type SavedReport } from './reportsApi';
import {
  dataCatalog,
  instantiateTemplate,
  newBlock,
  refreshDocumentData,
  standardTemplate,
  templateFromDocument,
  type Inline,
  type Letterhead,
  type ReportBlock,
  type ReportDocument,
  type TextKind,
} from './templateEngine';
import { ReportBlockView, ReportPreview } from './ReportPreview';
import { PaperViewport } from '../components/PaperViewport';
import { loadReportContext } from './loadReportContext';
import { pickChange, useReportAutosave } from './useReportAutosave';

/** Whitelist DOM → inline marks. No HTML, event handlers, links or images enter the document. */
export function readInline(root: HTMLElement): Inline[] {
  const runs: Inline[] = [];
  function walk(node: Node, marks: Omit<Inline, 'text'> = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      runs.push({ ...marks, text: node.textContent || '' });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === 'BR') {
      const parent = node.parentElement;
      // A lone BR in an empty DIV is the browser's caret placeholder, not a second newline.
      if (parent !== root && parent?.tagName === 'DIV' && parent.childNodes.length === 1) return;
      runs.push({ text: '\n' });
      return;
    }
    const next = { ...marks };
    if (
      ['B', 'STRONG'].includes(node.tagName) ||
      node.style.fontWeight === '700' ||
      node.style.fontWeight === 'bold'
    )
      next.bold = true;
    if (['I', 'EM'].includes(node.tagName) || node.style.fontStyle === 'italic') next.italic = true;
    if (node.tagName === 'U' || node.style.textDecoration.includes('underline')) next.underline = true;
    if (
      node !== root &&
      ['DIV', 'P'].includes(node.tagName) &&
      runs.length &&
      !runs.at(-1)?.text.endsWith('\n')
    )
      runs.push({ text: '\n' });
    node.childNodes.forEach((n) => walk(n, next));
  }
  walk(root);
  return runs.length ? runs : [{ text: '' }];
}
function EditableText({
  block,
  onChange,
  onFocus,
}: {
  block: ReportBlock;
  onChange: (runs: Inline[]) => void;
  onFocus: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || JSON.stringify(readInline(el)) === JSON.stringify(block.runs)) return;
    el.replaceChildren(
      ...(block.runs || []).map((r) => {
        const span = document.createElement('span');
        span.textContent = r.text;
        if (r.bold) span.style.fontWeight = '700';
        if (r.italic) span.style.fontStyle = 'italic';
        if (r.underline) span.style.textDecoration = 'underline';
        return span;
      }),
    );
  }, [block.runs]);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Rapor metni"
      aria-multiline="true"
      data-kind={block.type}
      onFocus={onFocus}
      onInput={() => {
        if (ref.current) onChange(readInline(ref.current));
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
      onDrop={(e) => e.preventDefault()}
    />
  );
}
export function ReportEditor({
  initial,
  latestSource,
  profile,
  parsed,
  viewer,
  letterhead,
  previewInitially = false,
}: {
  initial: SavedReport;
  latestSource: ReportSourceData;
  profile: MMPIProfile | null;
  parsed: ParsedRecordPayload;
  viewer: AuthenticatedUser;
  letterhead: Letterhead;
  previewInitially?: boolean;
}) {
  const [doc, setDoc] = useState(initial.content);
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState(initial.status);
  const [source, setSource] = useState(initial.source_data_snapshot);
  const [observedVersion, setObservedVersion] = useState(latestSource.source_data_version);
  const [generatedAt, setGeneratedAt] = useState(initial.generated_at);
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState(previewInitially ? 'preview' : 'editor');
  const [confirm, setConfirm] = useState<'refresh' | 'complete' | 'restore' | 'reset' | null>(null);
  const [versions, setVersions] = useState<ReportVersion[] | null>(null);
  const [restoreVersion, setRestoreVersion] = useState<ReportVersion | null>(null);
  const [notice, setNotice] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateBusy, setTemplateBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [pendingSave, setPendingSave] = useState<'complete' | 'refresh' | 'restore' | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const undo = useRef<ReportDocument[]>([]);
  const redo = useRef<ReportDocument[]>([]);
  const lastEdit = useRef(0);
  useEffect(() => {
    let alive = true;
    const checkSource = () => {
      void loadReportContext(initial.mmpi_record_id)
        .then((fresh) => {
          if (alive) setObservedVersion(fresh.source.source_data_version);
        })
        .catch(() => {
          /* An offline check never changes the saved snapshot. */
        });
    };
    window.addEventListener('focus', checkSource);
    return () => {
      alive = false;
      window.removeEventListener('focus', checkSource);
    };
  }, [initial.mmpi_record_id]);
  const change = useMemo(
    () => ({
      title,
      content: doc,
      status,
      source_data_snapshot: source,
      source_data_version: source.source_data_version,
      generated_at: generatedAt,
    }),
    [title, doc, status, source, generatedAt],
  );
  const autosave = useReportAutosave(initial, change);
  useEffect(() => {
    if (pendingSave && !autosave.busy) {
      const reason = pendingSave;
      setPendingSave(null);
      void autosave.save(reason);
    }
  }, [pendingSave, autosave.busy, autosave.save]);
  useEffect(() => {
    const old = document.title;
    document.title = title || 'MMPI Psikolog Raporu';
    return () => {
      document.title = old;
    };
  }, [title]);
  function edit(next: ReportDocument, coalesce = false) {
    if (!coalesce || Date.now() - lastEdit.current > 650) undo.current.push(doc);
    if (undo.current.length > 80) undo.current.shift();
    redo.current = [];
    lastEdit.current = Date.now();
    setDoc(next);
    setHistoryTick((t) => t + 1);
  }
  function updateBlock(id: string, patch: Partial<ReportBlock>, coalesce = false) {
    edit({ ...doc, blocks: doc.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }, coalesce);
  }
  function add(block: ReportBlock) {
    const blocks = [...doc.blocks];
    const at = blocks.findIndex((b) => b.id === selected);
    blocks.splice(at < 0 ? blocks.length : at + 1, 0, block);
    edit({ ...doc, blocks });
    setSelected(block.id);
  }
  function history(direction: 'undo' | 'redo') {
    const from = direction === 'undo' ? undo : redo,
      to = direction === 'undo' ? redo : undo;
    const next = from.current.pop();
    if (!next) return;
    to.current.push(doc);
    setDoc(next);
    setHistoryTick((t) => t + 1);
  }
  async function print() {
    if (!(await autosave.save('manual'))) return;
    window.print();
  }
  const catalog = useMemo(() => dataCatalog(source), [source]);
  return (
    <div className="report-workspace">
      <div className="screen-only">
        <div className="report-editor-top">
          <div className="report-editor-top-main">
            <a className="report-back-link" href={`/kayitlar/${initial.mmpi_record_id}/raporlar`}>
              ← Raporlar
            </a>
            <span className={`status-pill ${status === 'draft' ? 'status-draft' : 'status-completed'}`}>
              <span className="status-dot" aria-hidden="true" />
              {status === 'draft' ? 'Taslak' : 'Tamamlandı'}
            </span>
            <span
              role="status"
              className={`report-save-status ${autosave.busy ? 'is-saving' : autosave.error ? 'is-error' : ''}`}
            >
              {autosave.busy
                ? 'Kaydediliyor…'
                : autosave.dirty && !autosave.error
                  ? 'Değişiklikler kaydedilecek…'
                  : autosave.error
                    ? autosave.error
                    : autosave.message || (status === 'draft' ? 'Taslak otomatik kaydedilir' : 'Kaydedildi')}
            </span>
          </div>
          {status === 'draft' ? (
            <div className="draft-explain">
              <strong>Taslak modunda</strong> — Bu rapor henüz tamamlanmadı. Önizlemede ve baskıda{' '}
              <strong>TASLAK</strong> filigranı görünür. Otomatik kaydedilir; hazır olduğunuzda{' '}
              <em>Raporu Tamamla</em> ile nihai nüshaya geçebilirsiniz — tamamlamak kilitlemez, düzenlemeye devam
              edebilirsiniz.
            </div>
          ) : (
            <div className="draft-explain draft-explain--completed">
              <strong>Tamamlandı</strong> — Klinik onay verildi. Önizleme ve baskı “nihai nüsha” olarak görünür.
              Düzenlemeye devam edebilirsiniz; her değişiklik sürümlenir ve “Taslağa Çevir” ile tekrar taslağa
              alabilirsiniz.
            </div>
          )}
        </div>
        <label className="report-title-input">
          Rapor adı
          <input maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="report-actions">
          <button
            className="btn-primary"
            disabled={autosave.busy || !title.trim()}
            onClick={() => void autosave.save('manual')}
          >
            Kaydet
          </button>
          <button
            className="btn-secondary"
            disabled={autosave.busy || !title.trim()}
            onClick={() => setConfirm('complete')}
          >
            Raporu Tamamla
          </button>
          {status === 'completed' && (
            <button className="btn-secondary" disabled={autosave.busy} onClick={() => setStatus('draft')}>
              Taslağa Çevir
            </button>
          )}
          <button
            className="btn-secondary"
            disabled={autosave.busy}
            onClick={async () => {
              try {
                setVersions(await listVersions(initial.id));
              } catch (e) {
                setNotice(String(e));
              }
            }}
          >
            Sürüm Geçmişi
          </button>
          <button className="btn-secondary" disabled={autosave.busy} onClick={() => setConfirm('refresh')}>
            Verileri Güncelle
          </button>
          <button className="btn-secondary" disabled={autosave.busy} onClick={() => setConfirm('reset')}>
            Raporu Sıfırla
          </button>
        </div>
        {autosave.error && (
          <p className="status-banner error-banner" role="alert">
            {autosave.error} <button onClick={() => void autosave.save('manual')}>Yeniden Dene</button>
          </p>
        )}
        {source.source_data_version !== observedVersion && (
          <p className="status-banner info-banner">
            Kaynak MMPI verileri bu rapor oluşturulduktan sonra değişmiş olabilir. Rapor kayıtlı veri anlık
            görüntüsünü kullanıyor.
          </p>
        )}
        {notice && (
          <p role="status" className="status-banner info-banner">
            {notice}
            <button onClick={() => setNotice('')}>Kapat</button>
          </p>
        )}
        <div className="report-mobile-tabs">
          <button aria-pressed={mobileView === 'editor'} onClick={() => setMobileView('editor')}>
            Editör
          </button>
          <button aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}>
            A4 Önizleme
          </button>
        </div>
        <div className={`report-split show-${mobileView}`}>
          <section className="report-edit-pane" aria-label="Psikolog raporu editörü">
                      <div className="report-toolbar" role="toolbar" aria-label="Metin biçimlendirme">
            <div className="report-toolbar-group" role="group" aria-label="Biçim">
              {(['bold', 'italic', 'underline'] as const).map((cmd, i) => <button key={cmd} title={['Kalın', 'İtalik', 'Altı çizili'][i]} aria-label={['Kalın', 'İtalik', 'Altı çizili'][i]} onMouseDown={e => e.preventDefault()} onClick={() => {
                const active = document.activeElement; if (active instanceof HTMLElement && active.isContentEditable) { document.execCommand(cmd); active.dispatchEvent(new Event('input', { bubbles: true })); }
              }}><span style={{ fontWeight: cmd==='bold'?700:400, fontStyle: cmd==='italic'?'italic':'normal', textDecoration: cmd==='underline'?'underline':'none' }}>{['B', 'I', 'U'][i]}</span></button>)}
            </div>
            <span className="report-toolbar-sep" aria-hidden />
            <div className="report-toolbar-group" role="group" aria-label="Yapı">
              {(['heading1', 'heading2', 'paragraph', 'bulletList', 'numberedList'] as TextKind[]).map((kind, i) => <button key={kind} title={['Başlık 1', 'Başlık 2', 'Paragraf', 'Madde listesi', 'Numaralı liste'][i]} onClick={() => {
                const b = doc.blocks.find(b => b.id === selected); if (b && !['dataField', 'dataTable', 'table'].includes(b.type)) updateBlock(b.id, { type: kind }); else add(newBlock(kind));
              }}>{['H1', 'H2', 'Paragraf', '• Liste', '1. Liste'][i]}</button>)}
              <button title="Tablo ekle" onClick={() => add({ ...newBlock('table'), rows: [['Başlık', 'Başlık'], ['', ''], ['', '']] })}>Tablo</button>
            </div>
            <span className="report-toolbar-sep" aria-hidden />
            <div className="report-toolbar-group" role="group" aria-label="Ekle">
              <select aria-label="MMPI verisi ekle" value="" onChange={e => {
                const idx = Number(e.target.value);
                const entry = catalog[idx];
                if (entry) add({ ...newBlock(entry.table ? 'dataTable' : 'dataField'), path: entry.path, label: entry.label });
                e.currentTarget.selectedIndex = 0;
              }}>
                <option value="">+ MMPI Verisi ekle</option>
                {Array.from(new Set(catalog.map(c => c.group))).map(g => (
                  <optgroup key={g} label={g}>
                    {catalog
                      .map((c, i) => ({ c, i }))
                      .filter(({ c }) => c.group === g)
                      .map(({ c, i }) => (
                        <option key={`${c.group}-${c.path}`} value={i}>
                          {c.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <button onClick={() => add(newBlock('paragraph'))}>+ Paragraf</button>
            </div>
            <span className="report-toolbar-sep" aria-hidden />
            <div className="report-toolbar-group" role="group" aria-label="Geçmiş">
              <button disabled={!undo.current.length} data-history={historyTick} onClick={() => history('undo')} title="Geri al (Ctrl+Z)">Geri Al</button>
              <button disabled={!redo.current.length} onClick={() => history('redo')} title="Yinele (Ctrl+Shift+Z)">Yinele</button>
            </div>
          </div>
          <p className="report-editor-hint">Metni seçip biçimlendirin. Mavi çerçeveli alanlar doğrulanmış MMPI çıktısıdır — salt okunur. Listelerde her satır bir madde.</p>
            <div
              className="report-blocks"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                  e.preventDefault();
                  history(e.shiftKey ? 'redo' : 'undo');
                }
              }}
            >
              {doc.blocks.map((b, index) => (
                <div
                  key={b.id}
                  className={`report-edit-block ${selected === b.id ? 'is-selected' : ''} ${b.type.startsWith('data') ? 'is-locked' : ''}`}
                  onClick={() => setSelected(b.id)}
                >
                  <div className={`report-block-controls ${b.type.startsWith('data') ? 'report-block-controls--locked' : ''}`}>
                    <small>{b.type.startsWith('data') ? '🔒' : `${index + 1}`}</small>
                    {!b.type.startsWith('data') && (
                      <>
                        <button title="Yukarı" disabled={index === 0} onClick={(e) => { e.stopPropagation(); const blocks = [...doc.blocks]; [blocks[index - 1], blocks[index]] = [blocks[index]!, blocks[index - 1]!]; edit({ ...doc, blocks }); }}>↑</button>
                        <button title="Aşağı" disabled={index === doc.blocks.length - 1} onClick={(e) => { e.stopPropagation(); const blocks = [...doc.blocks]; [blocks[index + 1], blocks[index]] = [blocks[index]!, blocks[index + 1]!]; edit({ ...doc, blocks }); }}>↓</button>
                      </>
                    )}
                    <button title="Sil" onClick={(e) => { e.stopPropagation(); edit({ ...doc, blocks: doc.blocks.filter((x) => x.id !== b.id) }); }}>✕</button>
                  </div>
                  {b.type.startsWith('data') ? (
                    <ReportBlockView block={b} source={source} />
                  ) : b.type === 'table' ? (
                    <div className="report-edit-table">
                      <table>
                        <tbody>
                          {b.rows?.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td key={j}>
                                  <textarea
                                    aria-label={`Satır ${i + 1}, sütun ${j + 1}`}
                                    value={cell}
                                    onChange={(e) =>
                                      updateBlock(
                                        b.id,
                                        {
                                          rows: b.rows!.map((r, ri) =>
                                            r.map((c, ci) => (ri === i && ci === j ? e.target.value : c)),
                                          ),
                                        },
                                        true,
                                      )
                                    }
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={() =>
                          updateBlock(b.id, {
                            rows: [...(b.rows || []), (b.rows?.[0] || ['', '']).map(() => '')],
                          })
                        }
                      >
                        + Satır
                      </button>
                      <button onClick={() => updateBlock(b.id, { rows: b.rows?.map((r) => [...r, '']) })}>
                        + Sütun
                      </button>
                      <button
                        disabled={(b.rows?.length || 0) < 2}
                        onClick={() => updateBlock(b.id, { rows: b.rows?.slice(0, -1) })}
                      >
                        Son Satırı Sil
                      </button>
                      <button
                        disabled={(b.rows?.[0]?.length || 0) < 2}
                        onClick={() => updateBlock(b.id, { rows: b.rows?.map((r) => r.slice(0, -1)) })}
                      >
                        Son Sütunu Sil
                      </button>
                    </div>
                  ) : (
                    <EditableText
                      block={b}
                      onFocus={() => setSelected(b.id)}
                      onChange={(runs) =>
                        updateBlock(b.id, { runs, sourceTemplate: undefined, when: undefined }, true)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="report-actions">
              <button className="btn-secondary" onClick={() => edit({ ...doc, letterhead })}>
                Kayıtlı anteti bu rapora uygula
              </button>
              <button
                className="btn-secondary"
                disabled={!profile || aiBusy}
                onClick={async () => {
                  if (!profile) return;
                  setAiBusy(true);
                  setNotice('');
                  try {
                    const result = await requestAiInterpretation({
                      summary: buildAiProfileSummary(
                        profile,
                        parsed.method ?? 'quick',
                        parsed.client && typeof parsed.client.age === 'number'
                          ? { age: parsed.client.age }
                          : null,
                      ),
                      recordId: initial.mmpi_record_id,
                    });
                    // Use latest document rather than a stale closure while network request was pending.
                    redo.current = [];
                    setHistoryTick((t) => t + 1);
                    setDoc((current) => {
                      undo.current.push(current);
                      return {
                        ...current,
                        blocks: [
                          ...current.blocks,
                          newBlock('heading2', 'Yapay Zekâ Yorumu — uzman kontrolü gerekir'),
                          newBlock('paragraph', result.text),
                        ],
                      };
                    });
                  } catch (e) {
                    setNotice(e instanceof Error ? e.message : 'AI yorumu alınamadı.');
                  } finally {
                    setAiBusy(false);
                  }
                }}
              >
                {aiBusy ? 'AI yorumu alınıyor…' : 'AI yorumunu ekle (düzenlenebilir)'}
              </button>
            </div>
            <details className="report-template-save">
              <summary>Yeni Şablon / Kopyasını Oluştur</summary>
              <p>
                MMPI bağlantıları korunur. Düzenlenmiş serbest metinler şablonda kalır: danışana özgü kişisel
                bilgileri kaydetmeden önce çıkarın. Sistem şablonu değiştirilmez.
              </p>
              <input
                aria-label="Yeni şablon adı"
                placeholder="Şablon adı"
                maxLength={180}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <button
                disabled={!templateName.trim() || templateBusy}
                onClick={async () => {
                  setTemplateBusy(true);
                  try {
                    await createTemplate(templateName.trim(), templateFromDocument(doc), viewer.id);
                    setNotice('Kişisel şablonunuz kaydedildi. Yeni rapor ekranından seçebilirsiniz.');
                    setTemplateName('');
                  } catch (e) {
                    setNotice(String(e));
                  } finally {
                    setTemplateBusy(false);
                  }
                }}
              >
                Şablonu Kaydet
              </button>
            </details>
          </section>
          <section className="report-preview-pane" aria-label="Canlı önizleme">
            <div className="report-preview-label">
              <span>
                CANLI ÖNİZLEME · A4{' '}
                <span
                  style={{
                    fontWeight: 400,
                    textTransform: 'none',
                    letterSpacing: 0,
                    marginLeft: 6,
                    color: 'var(--soft)',
                  }}
                >
                  APA 7 · 1 inç kenar · çift aralıklı
                </span>{' '}
                <span
                  className={`status-pill ${status === 'draft' ? 'status-draft' : 'status-completed'}`}
                  style={{ marginLeft: 8, fontSize: 9, padding: '3px 8px', verticalAlign: 'middle' }}
                >
                  <span className="status-dot" aria-hidden="true" />
                  {status === 'draft' ? 'TASLAK' : 'NİHAİ'}
                </span>
              </span>
              <span className="report-preview-actions">
                <button
                  type="button"
                  disabled={autosave.busy || !title.trim()}
                  onClick={() => void print()}
                  title="Yazdır / PDF olarak kaydet (tarayıcı)"
                >
                  Yazdır / PDF
                </button>
              </span>
            </div>
            <PaperViewport frameClassName="report-preview-paper" label="Canlı önizleme kâğıdı">
              <ReportPreview content={doc} source={source} title={title} status={status} date={generatedAt} />
            </PaperViewport>
          </section>
        </div>
        {versions && (
          <section className="report-history">
            <h2>Sürüm Geçmişi</h2>
            <p>
              Son 100 sürüm. Otomatik kayıtlar 10 dakikalık aralıklarla; Kaydet, Tamamla, Verileri Güncelle ve
              Geri Yükle işlemleri her seferinde sürüm oluşturur.
            </p>
            <button onClick={() => setVersions(null)}>Kapat</button>
            {versions.map((v) => (
              <div key={v.id}>
                <strong>V{v.version_number}</strong> · {new Date(v.created_at).toLocaleString('tr-TR')} ·{' '}
                {v.reason}{' '}
                <button
                  disabled={autosave.busy}
                  onClick={() => {
                    setRestoreVersion(v);
                    setConfirm('restore');
                  }}
                >
                  Geri Yükle
                </button>
              </div>
            ))}
          </section>
        )}
        {confirm && (
          <ConfirmDialog
            title={
              confirm === 'complete'
                ? 'Raporu tamamla'
                : confirm === 'restore'
                  ? 'Sürümü geri yükle'
                  : confirm === 'reset'
                    ? 'Raporu sıfırla'
                    : 'Kaynak verileri güncelle'
            }
            description={
              confirm === 'complete'
                ? 'Rapor tamamlandı olarak kaydedilecek. Daha sonra düzenlemeye devam edebilirsiniz.'
                : confirm === 'restore'
                  ? 'Mevcut metin ve kaynak anlık görüntüsü seçilen sürümle değişir. Önce mevcut haliniz kaydedilir; geri yükleme de yeni bir sürümdür.'
                  : confirm === 'reset'
                    ? 'Düzenlediğiniz metinler silinecek ve rapor mevcut sistem şablonunun (Minnesota… başlıklı APA iskelet) güncel MMPI verileriyle doldurulmuş haline dönecek. Antet korunur, imza ve sürüm geçmişi silinmez. Önce mevcut haliniz sürümlenir.'
                    : 'Kilitli alanlar ve henüz düzenlemediğiniz otomatik yorumlar güncellenir. Elle düzenlediğiniz metinler korunur; yeni verilerle uyumunu kontrol etmelisiniz. Önce mevcut haliniz sürümlenir.'
            }
            confirmLabel="Onayla"
            tone="neutral"
            busy={autosave.busy || refreshBusy}
            onCancel={() => setConfirm(null)}
            onConfirm={async () => {
              if (confirm === 'complete') {
                setStatus('completed');
                setPendingSave('complete');
                setConfirm(null);
                return;
              }
              if (confirm === 'reset') {
                if (!(await autosave.save('manual'))) return;
                try {
                  const freshTpl = instantiateTemplate(standardTemplate(), source);
                  // Preserve current letterhead (antet) inside the report document
                  const next = { ...freshTpl, letterhead: doc.letterhead } as typeof doc;
                  edit(next);
                  setPendingSave('refresh');
                  setNotice('Rapor sıfırlandı — sistem şablonuna dönüldü. Kaydediliyor…');
                } catch (e) {
                  setNotice(e instanceof Error ? e.message : 'Rapor sıfırlanamadı.');
                }
                setConfirm(null);
                return;
              }
              if (!(await autosave.save('manual'))) return;
              if (confirm === 'refresh') {
                setRefreshBusy(true);
                try {
                  const fresh = await loadReportContext(initial.mmpi_record_id);
                  edit(refreshDocumentData(doc, fresh.source));
                  setSource(fresh.source);
                  setObservedVersion(fresh.source.source_data_version);
                  setGeneratedAt(new Date().toISOString());
                  setPendingSave('refresh');
                } catch (e) {
                  setNotice(e instanceof Error ? e.message : 'Veriler güncellenemedi.');
                } finally {
                  setRefreshBusy(false);
                }
              } else if (restoreVersion) {
                const v = restoreVersion.snapshot;
                const restored = pickChange(v);
                edit(restored.content);
                setTitle(restored.title);
                setStatus(restored.status);
                setSource(restored.source_data_snapshot);
                setGeneratedAt(restored.generated_at);
                setPendingSave('restore');
                setVersions(null);
              }
              setConfirm(null);
            }}
          />
        )}
      </div>
      <div className="print-only psych-print">
        <ReportPreview content={doc} source={source} title={title} status={status} date={generatedAt} />
      </div>
    </div>
  );
}
