import { useMemo } from 'react';
import type { FormDefinition } from '../omr/omrTypes';
import { createPageQr } from '../form/pageIdentity';

export function PageQr({ definition, batchId, pageNumber }: {
  definition: FormDefinition;
  batchId: string;
  pageNumber: number;
}) {
  const qr = useMemo(() => createPageQr(definition, batchId, pageNumber), [definition, batchId, pageNumber]);
  const { size, data, quiet, area } = qr;
  const box = size + quiet * 2;
  const modules: { x: number; y: number }[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // qrcode's BitMatrix stores modules row-major: get(row, col) === data[row * size + col].
      if (data[y * size + x]) modules.push({ x, y });
    }
  }
  return <svg className="page-qr" viewBox={`0 0 ${box} ${box}`} aria-hidden="true"
    style={{ left: `${area.x}mm`, top: `${area.y}mm`, width: `${area.width}mm`, height: `${area.height}mm` }}>
    <title>Sayfa kimliği</title>
    <rect width={box} height={box} fill="#fff" />
    {modules.map(module => <rect key={`${module.x}-${module.y}`} x={module.x + quiet} y={module.y + quiet}
      width={1} height={1} fill="#000" />)}
  </svg>;
}
