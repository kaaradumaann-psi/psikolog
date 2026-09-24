import type { ScaleResult } from '../../scoring/mmpiScoring';

type Props = {
  /** Geçerlik + klinik ölçekler (sıralama bileşen içinde yapılır). */
  scales: ScaleResult[];
};

const ORDER: string[] = ['?', 'L', 'F', 'K', 'Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si'];

/* Site paleti: tek vurgu (Apple mavi) + mürekkep/gri + durumsal renkler. */
const COLOR_VALIDITY = '#57575a';
const COLOR_CLINICAL = '#0a84ff';
const COLOR_HIGH = '#d2453a';
const COLOR_CANNOT = '#8e8e93';
const GRID = '#e9e9eb';
const AXIS = '#c9c9ce';
const LABEL_MUTED = '#8e8e93';
const LABEL_INK = '#3a3a3c';

const WIDTH = 1400;
const HEIGHT = 470;
const PAD = { top: 26, right: 26, bottom: 48, left: 58 };

const Y_MIN = 24;
const Y_MAX = 122;
const Y_TICKS = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

/** 0 = tepe (T 122), 100 = taban (T 24). HTML ve SVG aynı yüzdeyi kullanır. */
function yPercent(t: number): number {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, t));
  return ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * 100;
}

function pointTitle(s: ScaleResult): string {
  return s.id === '?'
    ? `? — Boş bırakılan madde sayısı: ${s.rawScore} (T skoru değildir)`
    : `${s.shortName}: T ${s.tScore.toFixed(1)}`;
}

function pointFill(s: ScaleResult): string {
  if (s.id === '?') {
    if (s.rawScore >= 30) return COLOR_HIGH;
    if (s.rawScore >= 11) return '#b4770b';
    return COLOR_CANNOT;
  }
  if (s.tScore >= 70) return COLOR_HIGH;
  return s.group === 'validity' ? COLOR_VALIDITY : COLOR_CLINICAL;
}

/**
 * Dar ekran profili. Yazılar SVG user-unit değil, gerçek CSS puntolarıdır;
 * 320px telefonda da 12px'in altına düşmez. Noktalar etiket sütunlarıyla
 * aynı yüzdeyi paylaşır: (i + 0.5) / n.
 */
function MobileProfile({
  title,
  note,
  scales,
  lineIds,
  stroke,
}: {
  title: string;
  note: string;
  scales: ScaleResult[];
  /** null ise paneldeki bütün noktalar birleşir; aksi halde yalnızca bu kimlikler. */
  lineIds: Set<string> | null;
  stroke: string;
}) {
  if (scales.length === 0) return null;
  const n = scales.length;
  const xPercent = (index: number) => ((index + 0.5) / n) * 100;
  const linked = scales
    .map((s, i) => ({ s, i }))
    .filter(p => (lineIds ? lineIds.has(p.s.id) : true));
  const poly = linked.map(p => `${xPercent(p.i).toFixed(2)},${yPercent(p.s.tScore).toFixed(2)}`).join(' ');

  return (
    <figure className="mmpi-mini">
      <figcaption className="mmpi-mini-title">
        <strong>{title}</strong>
        <span>{note}</span>
      </figcaption>
      <div className="mmpi-mini-row">
        <div className="mmpi-mini-y" aria-hidden="true">
          {Y_TICKS.map(t => (
            <span key={t} className={t === 70 ? 'is-limit' : t === 50 ? 'is-mean' : undefined} style={{ top: `${yPercent(t)}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="mmpi-mini-plot" aria-hidden="true">
          {Y_TICKS.map(t => (
            <span
              key={t}
              className={`mmpi-mini-grid${t === 70 ? ' is-limit' : t === 50 ? ' is-mean' : t === 30 ? ' is-base' : ''}`}
              style={{ top: `${yPercent(t)}%` }}
            />
          ))}
          {linked.length >= 2 && (
            <svg className="mmpi-mini-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={poly}
                fill="none"
                stroke={stroke}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          {scales.map((s, i) => (
            <span
              key={s.id}
              className="mmpi-mini-dot"
              style={{ left: `${xPercent(i)}%`, top: `${yPercent(s.tScore)}%`, background: pointFill(s) }}
            />
          ))}
        </div>
      </div>
      <div className="mmpi-mini-x" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {scales.map(s => (
          <span
            key={s.id}
            title={pointTitle(s)}
            aria-label={pointTitle(s)}
            className={s.id !== '?' && s.tScore >= 70 ? 'is-high' : undefined}
          >
            <b>{s.shortName}</b>
            <small>{s.id === '?' ? s.rawScore : s.tScore.toFixed(0)}</small>
          </span>
        ))}
      </div>
    </figure>
  );
}

/**
 * MMPI profil grafiği — T skorları.
 * Tek, sade profil çizgisi: geçerlik (L-F-K) ile klinik (Hs-Si) bölümleri
 * ara ayracıyla ayrılır; T=70 klinik sınır ve T=50 ortalama rehber çizgilerdir.
 */
export function MMPIScoreChart({ scales }: Props) {
  const ordered = [...scales].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  if (ordered.length === 0) return null;

  const chartW = WIDTH - PAD.left - PAD.right;
  const chartH = HEIGHT - PAD.top - PAD.bottom;

  const xStep = chartW / (ordered.length - 1 || 1);
  const yPos = (t: number) => {
    const clamped = Math.max(Y_MIN, Math.min(Y_MAX, t));
    return PAD.top + chartH - ((clamped - Y_MIN) / (Y_MAX - Y_MIN)) * chartH;
  };
  const xPos = (index: number) => PAD.left + index * xStep;

  const validityIds = new Set(['L', 'F', 'K']);
  const validityPoints = ordered.map((s, i) => ({ s, i })).filter(p => validityIds.has(p.s.id));
  const clinicalPoints = ordered.map((s, i) => ({ s, i })).filter(p => !validityIds.has(p.s.id) && p.s.id !== '?');

  const linePath = (points: { s: ScaleResult; i: number }[]) =>
    points.length < 2
      ? ''
      : points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xPos(p.i).toFixed(2)} ${yPos(p.s.tScore).toFixed(2)}`).join(' ');

  const separatorX = xPos(3) + xStep / 2;

  const validityScales = ordered.filter(s => s.id === '?' || validityIds.has(s.id));
  const clinicalScales = ordered.filter(s => !validityIds.has(s.id) && s.id !== '?');

  return (
    <div className="mmpi-chart-wrap">
      {/* Geniş ekran: tek profil. Dar ekranda kart içindeki CSS bunu gizler;
          yerine alttaki okunabilir paneller gelir. Baskı bu SVG'yi kullanır. */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="MMPI Profil Grafiği: geçerlik ve klinik ölçek T skorları"
        className="mmpi-chart-svg mmpi-chart-desktop"
      >
        {/* Yatay ızgara + T etiketleri */}
        {Y_TICKS.map(t => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yPos(t)}
              y2={yPos(t)}
              stroke={t === 30 ? AXIS : GRID}
              strokeWidth={t === 30 ? 1.2 : 0.9}
              strokeDasharray={t === 30 ? undefined : '3 4'}
            />
            <text x={PAD.left - 12} y={yPos(t) + 4} textAnchor="end" fontSize="12" fill={LABEL_MUTED}>
              {t}
            </text>
          </g>
        ))}

        {/* T=70 klinik sınır */}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={yPos(70)}
          y2={yPos(70)}
          stroke={COLOR_HIGH}
          strokeWidth="1.3"
          strokeDasharray="7 5"
        />
        <text x={PAD.left + 6} y={yPos(70) + 16} fontSize="11.5" fontWeight={600} fill={COLOR_HIGH}>
          T=70 Sınır
        </text>

        {/* T=50 ortalama */}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={yPos(50)}
          y2={yPos(50)}
          stroke={AXIS}
          strokeWidth="1"
          strokeDasharray="4 5"
        />
        <text x={PAD.left + 6} y={yPos(50) + 16} fontSize="11.5" fontWeight={600} fill={LABEL_MUTED}>
          T=50 Ortalama
        </text>

        {/* Geçerlik | klinik ayracı */}
        <line
          x1={separatorX}
          x2={separatorX}
          y1={PAD.top - 6}
          y2={PAD.top + chartH}
          stroke={AXIS}
          strokeWidth="1"
          strokeDasharray="5 5"
        />
        <text x={separatorX} y={PAD.top + chartH + 22} textAnchor="middle" fontSize="13" fill={AXIS}>
          |
        </text>

        {/* Profil çizgileri */}
        <path d={linePath(validityPoints)} fill="none" stroke={COLOR_VALIDITY} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d={linePath(clinicalPoints)} fill="none" stroke={COLOR_CLINICAL} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

        {/* Noktalar */}
        {ordered.map((s, i) => (
          <circle
            key={s.id}
            cx={xPos(i)}
            cy={yPos(s.tScore)}
            r={5.5}
            fill={pointFill(s)}
            stroke="#ffffff"
            strokeWidth="1.5"
          >
            {/* '?' klinik T skoru değildir; nokta yalnızca boş madde sayısını görsel
                ölçeğe taşır (t: null — findings'te doğru şekilde raporlanır). */}
            <title>
              {s.id === '?'
                ? `? — Boş bırakılan madde sayısı: ${s.rawScore} (T skoru değildir)`
                : `${s.shortName}: T ${s.tScore.toFixed(1)}`}
            </title>
          </circle>
        ))}

        {/* X ekseni etiketleri */}
        {ordered.map((s, i) => (
          <text
            key={`label-${s.id}`}
            x={xPos(i)}
            y={PAD.top + chartH + 22}
            textAnchor="middle"
            fontSize="12.5"
            fontWeight={700}
            fill={s.id === '?' ? LABEL_MUTED : LABEL_INK}
          >
            {s.shortName}
          </text>
        ))}
      </svg>

      {/* Telefon / dar ekran: 1400px viewBox küçültülmez (etiketler 3–6px'e düşerdi).
          İki panel, gerçek CSS puntoları (≥12px) ve her ölçeğin altında T skoru. */}
      <div className="mmpi-chart-mobile">
        <p className="mmpi-mini-note">
          Kırmızı kesik çizgi T=70 klinik sınır, gri kesik çizgi T=50 ortalamadır. Adın altındaki sayı T skorudur.
        </p>
        <MobileProfile
          title="Geçerlik ölçekleri"
          note="?, L, F, K — ? boş madde sayısıdır, T skoru değildir."
          scales={validityScales}
          lineIds={validityIds}
          stroke={COLOR_VALIDITY}
        />
        <MobileProfile
          title="Klinik ölçekler"
          note="Hs–Si. Yüksek T skorları kırmızıyla işaretlidir."
          scales={clinicalScales}
          lineIds={null}
          stroke={COLOR_CLINICAL}
        />
      </div>

      <div className="mmpi-chart-legend" aria-hidden="true">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: COLOR_VALIDITY }} /> Geçerlik Ölçekleri (L, F, K)
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: COLOR_CLINICAL }} /> Klinik Ölçekler (HS–SI)
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: COLOR_HIGH }} /> Klinik Yükseklik (T ≥ 70)
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: COLOR_CANNOT }} /> ? — Boş madde sayısı (klinik T skoru değildir)
        </span>
      </div>
    </div>
  );
}
