interface TokenIconProps {
  className?: string;
}

export function TokenIcon({ className = '' }: TokenIconProps) {
  return (
    <span
      className={`font-extrabold text-violet-400 ${className}`}
      style={{
        letterSpacing: '-0.02em',
        verticalAlign: 'baseline',
        lineHeight: 'inherit',
      }}
    >
      결
    </span>
  );
}
