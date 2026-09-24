import type { ScoreReading } from '../../clinical/casework';
import { formatScore } from '../../clinical/casework';
import '../../styles/dashboard.css';

export function ScoreChips({ readings }: { readings: ScoreReading[] }) {
  if (!readings.length) {
    return <span className="score-empty">Bu dosyada henüz ölçek yok.</span>;
  }
  return (
    <div className="score-row">
      {readings.map((reading) => (
        <span key={reading.scale} className={`score-chip score-${reading.direction}${reading.flag ? ' score-flag' : ''}`}>
          <strong>{reading.scale}</strong>
          <span>{formatScore(reading)}</span>
          {reading.delta !== undefined && (
            <em>{reading.delta > 0 ? `+${reading.delta}` : reading.delta}</em>
          )}
          {reading.flag && <em>{reading.flag}</em>}
        </span>
      ))}
    </div>
  );
}
