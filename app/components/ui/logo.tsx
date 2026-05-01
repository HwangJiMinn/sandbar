interface LogoProps {
  className?: string;
}

export function Logo({ className = 'h-20 w-auto' }: LogoProps) {
  return <img src="/logo.png" alt="운결" className={className} />;
}
