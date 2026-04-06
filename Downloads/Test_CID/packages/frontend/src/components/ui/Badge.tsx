import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: string;
}

export function Badge({ children, color = 'var(--accent)' }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 9,
      background: color,
      color: '#fff',
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1,
      flexShrink: 0,
    }}>
      {children}
    </span>
  );
}
