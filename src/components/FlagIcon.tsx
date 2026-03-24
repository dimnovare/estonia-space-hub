interface FlagIconProps {
  lang: string;
  className?: string;
}

export function FlagIcon({
  lang,
  className = "h-4 w-6 rounded-sm",
}: FlagIconProps) {
  if (lang === "et") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 21 15"
        className={className}
        aria-label="Eesti"
      >
        <rect width="21" height="5" fill="#0072CE" />
        <rect y="5" width="21" height="5" fill="#000000" />
        <rect y="10" width="21" height="5" fill="#FFFFFF" />
      </svg>
    );
  }

  if (lang === "en") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 60 30"
        className={className}
        aria-label="English"
      >
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
      </svg>
    );
  }

  if (lang === "ru") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 21 15"
        className={className}
        aria-label="Русский"
      >
        <rect width="21" height="5" fill="#FFFFFF" />
        <rect y="5" width="21" height="5" fill="#0039A6" />
        <rect y="10" width="21" height="5" fill="#D52B1E" />
      </svg>
    );
  }

  return (
    <span className="text-xs font-semibold tracking-wide uppercase">
      {lang}
    </span>
  );
}
