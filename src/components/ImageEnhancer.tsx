import { useId } from 'react';
import { ENHANCEMENT_DESCRIPTIONS, ENHANCEMENT_LABELS, ENHANCEMENT_MODES } from '../scanner/enhancement';
import type { EnhancementMode } from '../scanner/enhancement';
import { Icon } from './Icon';

export type ImageEnhancerProps = {
  mode: EnhancementMode;
  onChange: (mode: EnhancementMode) => void;
};

/**
 * Mode selector used inside the scan-result preview. The actual image transformation lives in
 * `src/scanner/enhancement.ts`; this component is the user-facing surface for choosing which
 * rendering of the normalised page to display alongside the raw OMR output.
 */
export function ImageEnhancer({ mode, onChange }: ImageEnhancerProps) {
  const id = useId();
  return <div className="scan-enhancer" role="group" aria-labelledby={`${id}-title`}>
    <div className="scan-enhancer-header">
      <span className="section-badge badge-primary">Görünüm</span>
      <h4 id={`${id}-title`} className="section-heading-sm">Görüntü İyileştirme</h4>
      <p className="scan-enhancer-hint">{ENHANCEMENT_DESCRIPTIONS[mode]}</p>
    </div>
    <div className="scan-enhancer-pills">
      {ENHANCEMENT_MODES.map(option => (
        <button
          key={option}
          type="button"
          className={`scan-enhancer-pill ${option === mode ? 'is-active' : ''}`}
          aria-pressed={option === mode}
          onClick={() => onChange(option)}
        >
          <Icon name={option === mode ? 'check' : 'sparkles'} size={13} />
          <span>{ENHANCEMENT_LABELS[option]}</span>
        </button>
      ))}
    </div>
    <p className="scan-enhancer-note">
      <Icon name="sparkles" size={13} />
      <span>Yalnızca önizleme içindir; otomatik okuma sonucunu değiştirmez.</span>
    </p>
  </div>;
}
