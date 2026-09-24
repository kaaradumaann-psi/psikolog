import { FORM } from '../form/layout';

export function RegistrationMarks() {
  const { pageWidthMm: w, pageHeightMm: h, markerInsetMm: inset, markerSizeMm: size } = FORM;
  const corners = [[inset, inset], [w - inset - size, inset],
    [inset, h - inset - size], [w - inset - size, h - inset - size]];
  return <svg className="registration-marks" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
    {corners.map(([x, y], i) => <rect key={i} x={x} y={y} width={size} height={size} fill="#000" />)}
    <rect x={inset + size + 2} y={inset} width="1.5" height={size} fill="#000" />
  </svg>;
}
