type Props = {
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
};

export function Badge({ children, tone = 'default' }: Props) {
  return <span className={`kicker kicker--${tone}`}>{children}</span>;
}

export function DotBadge({ tone = 'default' }: { tone?: Props['tone'] }) {
  return <span className={`kicker-dot kicker-dot--${tone}`} />;
}
