/** "T + inner fire" mark — geometric T in Ice Blue with a restrained Warm Amber flame. */
export function LogoMark({ size = 40, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {tile && <rect width="64" height="64" rx="16" fill="#17252F" />}
      <rect x="14" y="22" width="36" height="8" rx="4" fill="#A9D9E8" />
      <rect x="28" y="22" width="8" height="30" rx="4" fill="#A9D9E8" />
      <path d="M32 7c3.2 4 5.2 6.6 5.2 9.4a5.2 5.2 0 0 1-10.4 0C26.8 13.6 28.8 11 32 7z" fill="#E7A34B" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-extrabold tracking-tight ${className}`}>tapas</span>
}
