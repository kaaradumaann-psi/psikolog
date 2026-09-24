import type { ReportSourceData } from './reportDataAdapter';
import {
  blockText,
  hasData,
  inlineLines,
  resolvePlaceholders,
  visibleBlocks,
  type Inline,
  type ReportBlock,
  type ReportDocument,
} from './templateEngine';

export function InlineText({ runs }: { runs: Inline[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <span
          key={i}
          style={{
            fontWeight: r.bold ? 700 : undefined,
            fontStyle: r.italic ? 'italic' : undefined,
            textDecoration: r.underline ? 'underline' : undefined,
          }}
        >
          {r.text}
        </span>
      ))}
    </>
  );
}

export function ReportBlockView({
  block: b,
  source,
  tableNumber,
}: {
  block: ReportBlock;
  source: ReportSourceData;
  tableNumber?: number;
}) {
  if (!hasData(source, b.when)) return null;
  const text = <InlineText runs={b.runs || []} />;
  if (b.type === 'heading1') return <h1 className="apa-level-1">{text}</h1>;
  if (b.type === 'heading2') return <h2 className="apa-level-2">{text}</h2>;
  if (b.type === 'dataField')
    return (
      <p className="psych-field">
        <span className="psych-field-label">{b.label || b.path}:</span>
        <span className="psych-field-value">{blockText(b, source)}</span>
      </p>
    );
  if (b.type === 'dataTable' || b.type === 'table') {
    const t =
      b.type === 'dataTable' && b.path
        ? source.tables[b.path]
        : {
            columns: (b.rows?.[0] || []).map((c) => resolvePlaceholders(c, source)),
            rows: (b.rows?.slice(1) || []).map((r) => r.map((c) => resolvePlaceholders(c, source))),
          };
    if (!t?.rows.length) return null;
    const baseLabel = (t as { label?: string }).label || b.label || '';
    // APA 7: Table n on own line bold, then title italic on next line
    const tableNumLabel = tableNumber ? `Tablo ${tableNumber}` : undefined;
    const tableTitle = baseLabel ? baseLabel.charAt(0).toUpperCase() + baseLabel.slice(1) : undefined;
    return (
      <figure className="apa-table">
        {tableNumLabel && <figcaption className="apa-table-number">{tableNumLabel}</figcaption>}
        {tableTitle && <figcaption className="apa-table-title">{tableTitle}</figcaption>}
        <table>
          <thead>
            <tr>
              {t.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, i) => (
              <tr key={i}>
                {row.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <figcaption className="apa-table-note">
          Not. T puanları Türk normlarına göre hesaplanmıştır. Ham = ham puan, K+ = K düzeltmesi eklenmiş
          değer, Düzey = klinik aralık etiketi. Boş hücreler “Veri mevcut değil” olarak bırakılmıştır.
        </figcaption>
      </figure>
    );
  }
  if (b.type === 'bulletList' || b.type === 'numberedList') {
    const Tag = b.type === 'bulletList' ? 'ul' : 'ol';
    return (
      <Tag className="apa-list">
        {inlineLines(b.runs || []).map((line, i) => (
          <li key={i}>
            <InlineText runs={line} />
          </li>
        ))}
      </Tag>
    );
  }
  const body = blockText(b, source).trim();
  if (!body) return null;
  return (
    <p className="apa-paragraph">
      <InlineText runs={b.runs || []} />
    </p>
  );
}

export function safeReportImage(value?: string): string | undefined {
  return value && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length < 1000000
    ? value
    : undefined;
}

export function ReportPreview({
  content,
  source,
  title: _title,
  date: _date,
  status,
}: {
  content: ReportDocument;
  source: ReportSourceData;
  title: string;
  date: string;
  status: string;
}) {
  const h = content.letterhead;
  const hasLetterhead = Boolean(h?.institution || h?.name || safeReportImage(h?.logo));
  const isDraft = status === 'draft';
  const blocks = visibleBlocks(content, source);
  // Number dataTables sequentially for APA Table 1, 2...
  let tableCounter = 0;
  return (
    <article className={`psych-paper apa-paper ${isDraft ? 'is-draft' : 'is-final'}`} aria-label="APA 7 psikolog raporu">
      {/* watermark for draft — behind content */}
      {isDraft && (
        <div className="psych-draft-watermark" aria-hidden="true">
          TASLAK
        </div>
      )}

      {isDraft && (
        <div className="psych-draft-banner" role="note" aria-label="Taslak uyarısı">
          — TASLAK — Klinik onayı beklenmektedir
        </div>
      )}

      {hasLetterhead ? (
        <div className="psych-letterhead">
          {safeReportImage(h?.logo) && <img src={safeReportImage(h?.logo)} alt="Kurum logosu" />}
          <div className="psych-letterhead-text">
            <div className="psych-letterhead-institution">{h?.institution || 'Psikolojik Değerlendirme Birimi'}</div>
            {(h?.name || h?.title) && (
              <div className="psych-letterhead-person">{[h?.name, h?.title].filter(Boolean).join(' · ')}</div>
            )}
            {(h?.phone || h?.email || h?.address) && (
              <div className="psych-letterhead-contact">
                {[h?.phone, h?.email, h?.address].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="apa-title-block">
        <h1 className="apa-cover-title">Minnesota Çok Yönlü Kişilik Envanteri (MMPI) Raporu</h1>
      </div>

      {blocks.map((b) => {
        const isTable = b.type === 'dataTable' || b.type === 'table';
        const num = isTable ? ++tableCounter : undefined;
        return <ReportBlockView key={b.id} block={b} source={source} tableNumber={num} />;
      })}

      {safeReportImage(h?.signature) && (
        <footer className="psych-signature">
          <img src={safeReportImage(h?.signature)} alt="İmza" />
          <p className="psych-signature-name">{h?.name}</p>
          {h?.title && <p className="psych-signature-title">{h?.title}</p>}
        </footer>
      )}

      <footer className="psych-disclaimer">
        Gizli ve kişiye özeldir. Bu rapor yalnızca yetkin ruh sağlığı uzmanı tarafından klinik görüşme ve diğer
        bulgularla birlikte değerlendirilmelidir. APA 7. baskı raporlama ilkelerine uygun olarak hazırlanmıştır.
        {isDraft && <span className="psych-disclaimer-draft"> — TASLAK nüsha, resmi arşiv sayılmaz.</span>}
      </footer>
    </article>
  );
}
