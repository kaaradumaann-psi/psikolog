import { useEffect, useRef } from 'react';
import type { FormEventHandler, ReactNode, Ref } from 'react';
import { createPortal } from 'react-dom';

/** Shared accessible frame for the clinic's long intake and editor dialogs.
 * Keeps focus inside, locks background scrolling, and restores the trigger on
 * close. The form variant lets native required-field validation keep working. */
export function ClinicalDialog({
  titleId,
  onClose,
  children,
  wide = false,
  onSubmit,
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const dialogRef = useRef<HTMLDivElement | HTMLFormElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const panel = dialogRef.current;
    (panel?.querySelector<HTMLElement>('.clinical-modal-head .btn-icon') ?? panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getClientRects().length > 0);
      if (!focusables.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      previousFocus?.focus();
    };
  }, []);

  const panelClass = `clinical-modal${wide ? ' clinical-modal-wide' : ''}`;
  const backdrop = (
    <div className="clinical-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeRef.current();
    }}>
      {onSubmit ? (
        <form ref={dialogRef as Ref<HTMLFormElement>} className={panelClass} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onSubmit={onSubmit}>
          {children}
        </form>
      ) : (
        <div ref={dialogRef as Ref<HTMLDivElement>} className={panelClass} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
          {children}
        </div>
      )}
    </div>
  );
  return createPortal(backdrop, document.body);
}
