import type { ReportDocument, ReportSourceData } from './templateEngine';
import { resolvePlaceholders, evaluateWhen } from './templateEngine';

type Props = {
  doc: ReportDocument;
  sourceData: ReportSourceData;
};

export function ReportPreview({ doc, sourceData }: Props) {
  return (
    <div className="psych-report card">
      {doc.letterhead && (doc.letterhead.name || doc.letterhead.institution) && (
        <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            {doc.letterhead.name && <div style={{ fontWeight: 600 }}>{doc.letterhead.name}</div>}
            {doc.letterhead.title && <div style={{ fontSize: 13, color: 'var(--soft)' }}>{doc.letterhead.title}</div>}
            {doc.letterhead.institution && <div style={{ fontSize: 13 }}>{doc.letterhead.institution}</div>}
            {doc.letterhead.phone && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{doc.letterhead.phone}</div>}
            {doc.letterhead.email && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{doc.letterhead.email}</div>}
          </div>
          {doc.letterhead.logo && (
            <img src={doc.letterhead.logo} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {doc.blocks.map((block) => {
          if (!evaluateWhen(block.when, sourceData)) return null;

          if (block.type === 'heading1') {
            return (
              <h1 key={block.id} style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>
                {(block.runs || []).map((r, i) => (
                  <span key={i}>{resolvePlaceholders(r.text, sourceData)}</span>
                ))}
              </h1>
            );
          }
          if (block.type === 'heading2') {
            return (
              <h2 key={block.id} style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>
                {(block.runs || []).map((r, i) => (
                  <span key={i}>{resolvePlaceholders(r.text, sourceData)}</span>
                ))}
              </h2>
            );
          }
          if (block.type === 'dataField') {
            return (
              <div key={block.id} style={{ display: 'flex', gap: 8 }}>
                <b style={{ minWidth: 140 }}>{block.label || block.path}:</b>
                <span>{block.path ? resolvePlaceholders(`{{${block.path}}}`, sourceData) : '—'}</span>
              </div>
            );
          }
          if (block.type === 'table') {
            return (
              <table key={block.id} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {(block.rows || []).map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ border: '1px solid var(--border)', padding: '6px 8px', fontSize: 13 }}>
                          {resolvePlaceholders(cell, sourceData)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }
          if (block.type === 'dataTable') {
            const table = block.path ? sourceData.tables[block.path.replace('tables.', '')] : undefined;
            if (!table) return null;
            return (
              <div key={block.id}>
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>{block.label || block.path}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {table.headers.map((h, i) => (
                        <th key={i} style={{ border: '1px solid var(--border)', padding: '6px 8px', textAlign: 'left', fontSize: 12, background: 'var(--bg-soft)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ border: '1px solid var(--border)', padding: '6px 8px', fontSize: 12 }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          // paragraph, bulletList, numberedList
          return (
            <div key={block.id} style={{ fontSize: 14, lineHeight: 1.6 }}>
              {(block.runs || []).map((r, i) => (
                <span
                  key={i}
                  style={{
                    fontWeight: r.bold ? 600 : undefined,
                    fontStyle: r.italic ? 'italic' : undefined,
                    textDecoration: r.underline ? 'underline' : undefined,
                    display: block.type === 'bulletList' ? 'list-item' : undefined,
                    marginLeft: block.type === 'bulletList' ? 20 : undefined,
                  }}
                >
                  {resolvePlaceholders(r.text, sourceData)}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <div className="report-footer" style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
        <span>psikolog.halilkaraduman.com.tr — Profesyonel çalışma platformu</span>
        <span>{new Date().toLocaleDateString('tr-TR')}</span>
      </div>

      {doc.letterhead?.signature && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <img src={doc.letterhead.signature} alt="İmza" style={{ width: 120, height: 60, objectFit: 'contain', marginLeft: 'auto' }} />
        </div>
      )}
    </div>
  );
}
