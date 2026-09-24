import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  soft?: boolean;
  interactive?: boolean;
};

export function Card({ soft = false, interactive = false, className = '', ...rest }: Props) {
  const classes = ['card', soft ? 'card--soft' : '', interactive ? 'card--interactive' : '', className]
    .filter(Boolean)
    .join(' ');
  return <div className={classes} {...rest} />;
}
