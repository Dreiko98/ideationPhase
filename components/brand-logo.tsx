type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

function Drop({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 52 72" aria-hidden="true">
      <path d="M26 2C23 13 5 31 5 48c0 14 9 23 21 23s21-9 21-23C47 31 29 13 26 2Z" fill="currentColor" />
    </svg>
  );
}

export function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  if (compact) {
    return (
      <span className={`inline-flex items-end text-brand-700 ${className}`} aria-label="GOTA">
        <span className="brand-g">G</span>
        <Drop className="-ml-1 mb-[0.08em] h-[0.52em] w-[0.38em] text-brand-300" />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center text-brand-700 ${className}`} aria-label="GOTA">
      <span className="brand-word">G</span>
      <Drop className="mx-[0.02em] h-[0.9em] w-[0.64em] text-brand-300" />
      <span className="brand-word">TA</span>
    </span>
  );
}
