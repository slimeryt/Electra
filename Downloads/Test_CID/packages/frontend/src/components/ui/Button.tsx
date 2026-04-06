import { ButtonHTMLAttributes, forwardRef, CSSProperties } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variantStyles: Record<string, CSSProperties> = {
  primary: { background: 'var(--accent)', color: '#fff' },
  secondary: { background: 'var(--bg-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)' },
  danger: { background: 'var(--danger)', color: '#fff' },
  icon: { background: 'transparent', color: 'var(--text-secondary)', padding: '6px' },
};

const sizeStyles: Record<string, CSSProperties> = {
  sm: { padding: '4px 12px', fontSize: 12, height: 28 },
  md: { padding: '8px 16px', fontSize: 14, height: 36 },
  lg: { padding: '10px 20px', fontSize: 14, height: 44 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, children, style, disabled, onMouseEnter, onMouseLeave, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontFamily: 'inherit',
          fontWeight: 500,
          borderRadius: 'var(--radius-md)',
          border: 'none',
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          transition: 'var(--transition)',
          opacity: disabled || isLoading ? 0.5 : 1,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          outline: 'none',
          ...variantStyles[variant],
          ...sizeStyles[variant === 'icon' ? 'sm' : size],
          ...style,
        }}
        onMouseEnter={e => {
          if (!disabled && !isLoading) {
            const el = e.currentTarget;
            if (variant === 'primary') el.style.background = 'var(--accent-hover)';
            if (variant === 'secondary' || variant === 'ghost' || variant === 'icon') el.style.background = 'var(--bg-hover)';
            if (variant === 'danger') el.style.filter = 'brightness(1.1)';
            if (variant === 'ghost' || variant === 'icon') el.style.color = 'var(--text-primary)';
          }
          onMouseEnter?.(e);
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          const vs = variantStyles[variant];
          el.style.background = (vs.background as string) || '';
          el.style.color = (vs.color as string) || '';
          el.style.filter = '';
          onMouseLeave?.(e);
        }}
        {...props}
      >
        {isLoading ? (
          <span style={{
            width: 14, height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }} />
        ) : children}
      </button>
    );
  }
);
Button.displayName = 'Button';
