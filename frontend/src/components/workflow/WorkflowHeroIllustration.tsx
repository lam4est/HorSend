export default function WorkflowHeroIllustration () {
  return (
    <svg
      className="workflow-hero-illustration"
      viewBox="0 0 320 140"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wh-grad-a" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#009D6B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="wh-grad-b" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c4ecdd" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>
      <rect x="8" y="18" width="304" height="104" rx="16" fill="url(#wh-grad-a)" stroke="#e5e7eb" />
      <circle cx="52" cy="70" r="22" fill="url(#wh-grad-b)" stroke="#009D6B" strokeWidth="2" />
      <path d="M46 70h12M52 64v12" stroke="#009D6B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M86 70h48" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 6" />
      <rect x="142" y="48" width="56" height="44" rx="10" fill="#fff" stroke="#34a853" strokeWidth="2" />
      <path d="M158 62h28M158 70h20" stroke="#34a853" strokeWidth="2" strokeLinecap="round" />
      <path d="M206 70h48" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 6" />
      <rect x="262" y="50" width="40" height="40" rx="20" fill="#fff" stroke="#4285f4" strokeWidth="2" />
      <path d="M278 62v16M270 70h16" stroke="#4285f4" strokeWidth="2" strokeLinecap="round" />
      <circle cx="170" cy="118" r="3" fill="#009D6B" opacity="0.6" />
      <circle cx="200" cy="112" r="2.5" fill="#3b82f6" opacity="0.5" />
      <circle cx="230" cy="118" r="3" fill="#9333ea" opacity="0.45" />
    </svg>
  )
}
