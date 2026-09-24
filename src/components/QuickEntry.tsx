import { useEffect, useRef, useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { ITEM_COUNT, MMPI_MAX_BLANK, answerLabel, countAnswers, mapQuickKey } from '../workspace/caseTypes';
import type { ItemAnswer } from '../workspace/caseTypes';
import { Icon } from './Icon';

type QuickEntryProps = {
  answers: ItemAnswer[];
  current: number;
  onCurrent: (index: number) => void;
  onAnswers: (next: ItemAnswer[]) => void;
};

function mapExtendedKey(key: string): ItemAnswer | 'ignore' {
  const base = mapQuickKey(key);
  if (base !== 'ignore') return base;
  // Harf kısayolları: D/Y/B (Türkçe klavyede de aynı)
  if (key === 'd' || key === 'D') return 'D';
  if (key === 'y' || key === 'Y') return 'Y';
  if (key === 'b' || key === 'B') return null;
  return 'ignore';
}

export function QuickEntry({ answers, current, onCurrent, onAnswers }: QuickEntryProps) {
  const focus = useRef<HTMLDivElement>(null);
  const counts = countAnswers(answers);
  const item = Math.min(Math.max(current, 0), ITEM_COUNT - 1);
  const value = answers[item];
  const percent = Math.round((counts.entered / ITEM_COUNT) * 100);
  const firstMissing = answers.findIndex(answer => answer === undefined);

  // Undo stack — son 40 değişiklik
  const historyRef = useRef<{ index: number; prev: ItemAnswer; next: ItemAnswer }[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushHistory = useCallback((index: number, prev: ItemAnswer, next: ItemAnswer) => {
    if (prev === next) return;
    historyRef.current.push({ index, prev, next });
    if (historyRef.current.length > 40) historyRef.current.shift();
    setCanUndo(true);
  }, []);

  function setAt(index: number, answer: ItemAnswer) {
    const prev = answers[index];
    if (prev === answer) return;
    pushHistory(index, prev, answer);
    const next = answers.slice();
    next[index] = answer;
    onAnswers(next);
  }

  function apply(answer: ItemAnswer) {
    setAt(item, answer);
    if (item < ITEM_COUNT - 1) onCurrent(item + 1);
    focus.current?.focus();
  }

  function undo() {
    const entry = historyRef.current.pop();
    if (!entry) return;
    const next = answers.slice();
    next[entry.index] = entry.prev;
    onAnswers(next);
    onCurrent(entry.index);
    setCanUndo(historyRef.current.length > 0);
    focus.current?.focus();
  }

  function findNextBlank(from: number): number | null {
    for (let i = from + 1; i < ITEM_COUNT; i++) if (answers[i] === undefined || answers[i] === null) return i;
    for (let i = 0; i <= from; i++) if (answers[i] === undefined || answers[i] === null) return i;
    return null;
  }
  function findPrevBlank(from: number): number | null {
    for (let i = from - 1; i >= 0; i--) if (answers[i] === undefined || answers[i] === null) return i;
    for (let i = ITEM_COUNT - 1; i >= from; i--) if (answers[i] === undefined || answers[i] === null) return i;
    return null;
  }

  useEffect(() => {
    focus.current?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Ctrl+Z / Cmd+Z undo
    if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      undo();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        onCurrent(Math.max(0, item - 1));
      } else {
        onCurrent(Math.min(ITEM_COUNT - 1, item + 1));
      }
      return;
    }
    const mapped = mapExtendedKey(event.key);
    if (mapped !== 'ignore') {
      event.preventDefault();
      apply(mapped);
      return;
    }
    if (event.key === 'Backspace' || event.key === 'ArrowLeft') {
      event.preventDefault();
      onCurrent(Math.max(0, item - 1));
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onCurrent(Math.min(ITEM_COUNT - 1, item + 1));
    }
  }

  const nextBlank = findNextBlank(item);
  const prevBlank = findPrevBlank(item);

  return (
    <section className="ws-panel qe" aria-labelledby="qe-title">
      <header className="ws-panel-head">
        <div>
          <span className="section-badge badge-primary">03 · Veri</span>
          <h2 id="qe-title" className="ws-panel-title">
            Hızlı <em>veri girişi</em>
          </h2>
          <p className="ws-muted">
            1/D = Doğru · 2/Y = Yanlış · 0/B = Boş. Enter = sonraki madde, Shift+Enter = önceki, Ctrl+Z = geri al. Her tuş anında taslağa yazılır; F5 ve internet kesintisinde korunur.
          </p>
        </div>
        <div className="qe-counts" aria-label="İlerleme">
          <span>%{percent} · {counts.entered} / {ITEM_COUNT}</span>
          <span className="ws-chip qe-d">D {counts.correct}</span>
          <span className="ws-chip qe-y">Y {counts.wrong}</span>
          <span className={`ws-chip ${counts.blank > MMPI_MAX_BLANK ? 'qe-blank-over' : ''}`}>Boş {counts.blank}</span>
        </div>
      </header>

      {counts.blank > MMPI_MAX_BLANK && (
        <p className="qe-blank-warning" role="alert">
          Boş bırakılan madde sayısı {MMPI_MAX_BLANK} sınırını aşıyor; bu durum testi geçersiz sayabilir. Kontrol adımında kayıt engellenecek.
        </p>
      )}

      <div
        ref={focus}
        className="qe-stage"
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="group"
        aria-label="Klavye ile madde girişi"
      >
        <p className="qe-current" aria-live="polite">
          Şu anki madde: <strong>{item + 1}</strong> / {ITEM_COUNT} · <span className="text-muted-sm">Kayıtlı: <strong>{answerLabel(value)}</strong></span>
        </p>
        <div className="qe-answer-btns">
          <button
            type="button"
            className={`qe-answer-btn is-d ${value === 'D' ? 'is-on' : ''}`}
            onClick={() => apply('D')}
            aria-pressed={value === 'D'}
          >
            <kbd>1</kbd>/<kbd>D</kbd> Doğru
          </button>
          <button
            type="button"
            className={`qe-answer-btn is-y ${value === 'Y' ? 'is-on' : ''}`}
            onClick={() => apply('Y')}
            aria-pressed={value === 'Y'}
          >
            <kbd>2</kbd>/<kbd>Y</kbd> Yanlış
          </button>
          <button
            type="button"
            className={`qe-answer-btn is-b ${value === null ? 'is-on' : ''}`}
            onClick={() => apply(null)}
            aria-pressed={value === null}
          >
            <kbd>0</kbd>/<kbd>B</kbd> Boş
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={!canUndo}
            onClick={undo}
            title="Ctrl+Z"
            aria-label="Son değişikliği geri al"
          >
            ↩ Geri al
          </button>
        </div>
        <p className="qe-value" style={{ fontSize: 11, color: 'var(--muted,#6b7280)' }}>
          Kısayollar: D/Y/B + Enter (sonraki), Shift+Enter (önceki), Ctrl+Z (geri al). Odak buradayken yazın.
        </p>
        <div className="qe-nav-btns">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={item === 0}
            onClick={() => {
              onCurrent(item - 1);
              focus.current?.focus();
            }}
          >
            <Icon name="left" size={14} /> Önceki
          </button>
          {prevBlank !== null && prevBlank !== item && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                onCurrent(prevBlank);
                focus.current?.focus();
              }}
              title="Önceki boş maddeye atla"
            >
              ← Önceki boş ({prevBlank + 1})
            </button>
          )}
          {firstMissing !== -1 && firstMissing !== item && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                onCurrent(firstMissing);
                focus.current?.focus();
              }}
            >
              İlk eksik ({firstMissing + 1})
            </button>
          )}
          {nextBlank !== null && nextBlank !== item && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                onCurrent(nextBlank);
                focus.current?.focus();
              }}
              title="Sonraki boş maddeye atla"
            >
              Sonraki boş ({nextBlank + 1}) →
            </button>
          )}
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={item >= ITEM_COUNT - 1}
            onClick={() => {
              onCurrent(item + 1);
              focus.current?.focus();
            }}
          >
            Sonraki <Icon name="right" size={14} />
          </button>
        </div>
      </div>

      <div className="qe-progress" role="progressbar" aria-valuenow={counts.entered} aria-valuemin={0} aria-valuemax={ITEM_COUNT} aria-label="Girilen madde">
        <div className="qe-progress-fill" style={{ width: `${(counts.entered / ITEM_COUNT) * 100}%` }} />
      </div>
      <p className="ws-hint">
        {counts.pending === 0
          ? 'Tüm maddeler girildi; Kontrol adımına geçebilirsiniz.'
          : `${counts.pending} madde eksik. Haritadan eksik maddeye dokunarak atlayabilir veya “Sonraki boş” ile dolaşabilirsiniz.`}
      </p>

      <div className="qe-map" role="listbox" aria-label="566 madde haritası">
        {answers.map((answer, index) => {
          const cls = answer === 'D' ? 'is-d' : answer === 'Y' ? 'is-y' : answer === null ? 'is-blank' : 'is-pending';
          return (
            <button
              type="button"
              role="option"
              key={index}
              aria-selected={index === item}
              aria-label={`${index + 1}. madde: ${answerLabel(answer)}`}
              className={`qe-cell ${cls} ${index === item ? 'is-current' : ''}`}
              title={`${index + 1}: ${answerLabel(answer)}`}
              onClick={() => {
                onCurrent(index);
                focus.current?.focus();
              }}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </section>
  );
}
