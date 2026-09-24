import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../Icon';

/**
 * Sonuç ekranlarının ortak açılır-kapanır (disclosure) yapı taşları.
 *
 * Pedagojik kural: bir bölümde yalnızca ÖNE ÇIKAN satırlar açık gelir, geri
 * kalanı kapalı durur ve kullanıcı istediğinde tek tek ya da topluca açar.
 * İçerik her zaman DOM'da kalır (`hidden` ile gizlenir), böylece ekran
 * okuyucular ve sunucu tarafı render testleri içeriği kaybetmez.
 */

export type DisclosureTone = 'alert' | 'watch' | 'ok' | 'neutral';

/**
 * Aynı listedeki satırların açık/kapalı durumunu birlikte yönetir.
 *
 * Varsayılan açık satır kümesi değiştiğinde (ör. başka bir kayıt açıldığında)
 * durum render sırasında yeniden türetilir; böylece kullanıcı bir kaydın
 * satırlarını açık bıraktığı için sonraki kayıtta karışıklık oluşmaz.
 */
export function useDisclosureGroup(defaultOpenIds: readonly string[] = []) {
  const signature = defaultOpenIds.join('|');
  const [state, setState] = useState<{ signature: string; open: ReadonlySet<string> }>(() => ({
    signature,
    open: new Set(defaultOpenIds),
  }));

  if (state.signature !== signature) {
    setState({ signature, open: new Set(defaultOpenIds) });
  }

  function apply(next: ReadonlySet<string>) {
    setState({ signature, open: next });
  }

  function toggle(id: string) {
    const next = new Set(state.open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  }

  function openAll(ids: readonly string[]) {
    apply(new Set(ids));
  }

  function closeAll() {
    apply(new Set());
  }

  return {
    isOpen: (id: string) => state.open.has(id),
    toggle,
    openAll,
    closeAll,
    openCount: state.open.size,
  };
}

type ControlsProps = {
  /** Listelenen satırların tüm kimlikleri (“Tümünü aç” için). */
  ids: readonly string[];
  group: Pick<ReturnType<typeof useDisclosureGroup>, 'openAll' | 'closeAll' | 'openCount'>;
  /** Satır sayısı; başlıkta “3 / 12 açık” biçiminde gösterilir. */
  total: number;
};

/** Grup başlığındaki “Tümünü aç / Tümünü kapat” denetimi. */
export function DisclosureControls({ ids, group, total }: ControlsProps) {
  return (
    <div className="mmpi-disc-controls">
      <span className="mmpi-disc-counter">
        {group.openCount > 0 ? `${group.openCount} / ${total} açık` : `${total} kayıt`}
      </span>
      <button type="button" className="quicknav-chip" onClick={() => group.openAll(ids)} disabled={group.openCount === total}>
        Tümünü aç
      </button>
      <button type="button" className="quicknav-chip" onClick={group.closeAll} disabled={group.openCount === 0}>
        Tümünü kapat
      </button>
    </div>
  );
}

type RowProps = {
  id: string;
  title: ReactNode;
  /** Başlık altındaki tek satırlık açıklama. */
  summary?: ReactNode;
  /** Sağda gösterilen değer/rozet alanı — kapalıyken de görünür. */
  value?: ReactNode;
  tone?: DisclosureTone;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
};

/** Tek bir açılır satır: başlık her zaman görünür, ayrıntı istendiğinde açılır. */
export function DisclosureRow({ id, title, summary, value, tone = 'neutral', open, onToggle, children }: RowProps) {
  const bodyId = `${useId()}-body`;
  return (
    <article className={`mmpi-disc tone-${tone} ${open ? 'is-open' : ''}`}>
      <h5 className="mmpi-disc-heading">
        <button
          type="button"
          className="mmpi-disc-head"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => onToggle(id)}
        >
          <span className="mmpi-disc-chevron" aria-hidden="true">
            <Icon name="right" size={14} />
          </span>
          <span className="mmpi-disc-text">
            <span className="mmpi-disc-title">{title}</span>
            {summary && <span className="mmpi-disc-summary">{summary}</span>}
          </span>
          {value && <span className="mmpi-disc-value">{value}</span>}
        </button>
      </h5>
      <div id={bodyId} className="mmpi-disc-body" hidden={!open}>
        {children}
      </div>
    </article>
  );
}

export type { RowProps as DisclosureRowProps, ControlsProps as DisclosureControlsProps };

type SectionProps = {
  title: string;
  /** Başlığın yanındaki kısa açıklama (kaç kayıt, kaçı öne çıkıyor). */
  note?: ReactNode;
  ids: readonly string[];
  group: Pick<ReturnType<typeof useDisclosureGroup>, 'openAll' | 'closeAll' | 'openCount'>;
  children: ReactNode;
};

/** Başlıklı liste kartı: başlık + “Tümünü aç/kapat” + açılır satırlar. */
export function ResultSection({ title, note, ids, group, children }: SectionProps) {
  return (
    <section className="mmpi-list-card">
      <header className="mmpi-list-head">
        <div className="mmpi-list-title">
          <span className="mmpi-card-dot" />
          <b>{title}</b>
          {note && <span className="mmpi-list-note">{note}</span>}
        </div>
        <DisclosureControls ids={ids} group={group} total={ids.length} />
      </header>
      <div className="mmpi-disc-list">{children}</div>
    </section>
  );
}

type CardProps = {
  title: string;
  note?: ReactNode;
  /** Kapalıyken de görünen sağ taraf değeri (ör. “3 belirgin”). */
  value?: ReactNode;
  tone?: DisclosureTone;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Bölüm düzeyinde açılır kart — tablo veya ızgara gibi tek parça hâlinde
 * duran, varsayılan olarak kapalı gelmesi gereken içerik için.
 */
export function DisclosureCard({ title, note, value, tone = 'neutral', defaultOpen = false, children }: CardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `${useId()}-card`;
  return (
    <section className={`mmpi-disc mmpi-disc-card tone-${tone} ${open ? 'is-open' : ''}`}>
      <h5 className="mmpi-disc-heading">
        <button
          type="button"
          className="mmpi-disc-head"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(state => !state)}
        >
          <span className="mmpi-disc-chevron" aria-hidden="true">
            <Icon name="right" size={14} />
          </span>
          <span className="mmpi-disc-text">
            <span className="mmpi-disc-title">{title}</span>
            {note && <span className="mmpi-disc-summary">{note}</span>}
          </span>
          {value && <span className="mmpi-disc-value">{value}</span>}
        </button>
      </h5>
      <div id={bodyId} className="mmpi-disc-body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
