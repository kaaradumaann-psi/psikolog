import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  children,
  ...rest
}: Props) {
  const base = 'btn';
  const v = `btn--${variant}`;
  const s = `btn--${size}`;
  const f = full ? 'btn--full' : '';
  return (
    <button className={`${base} ${v} ${s} ${f} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
