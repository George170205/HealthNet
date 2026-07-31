interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
  className?: string
}

const sizes = {
  sm: { icon: 28, text: 18, sub: 9 },
  md: { icon: 40, text: 26, sub: 13 },
  lg: { icon: 56, text: 36, sub: 18 },
}

export default function Logo({ size = 'md', variant = 'full', className = '' }: LogoProps) {
  const s = sizes[size]

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Ícono — corazón con línea ECG */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Corazón */}
        <path
          d="M20 34C20 34 4 24 4 13.5C4 9.36 7.36 6 11.5 6C14.24 6 16.63 7.45 18.13 9.6L20 12L21.87 9.6C23.37 7.45 25.76 6 28.5 6C32.64 6 36 9.36 36 13.5C36 24 20 34 20 34Z"
          stroke="#637FA8"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Línea ECG dentro del corazón */}
        <polyline
          points="7,17 11,17 13,12 16,22 19,15 21,19 23,17 33,17"
          stroke="#637FA8"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {variant === 'full' && (
        <>
          {/* Separador */}
          <div
            style={{ width: 1.5, height: s.icon * 0.8 }}
            className="bg-hn-500 opacity-60"
          />
          {/* Texto */}
          <div className="flex flex-col leading-none">
            <span
              style={{ fontSize: s.text, letterSpacing: '0.05em' }}
              className="font-extrabold text-hn-800 tracking-wide"
            >
              HEALTH
            </span>
            <span
              style={{ fontSize: s.sub, letterSpacing: '0.35em' }}
              className="font-semibold text-hn-500 tracking-widest"
            >
              NET
            </span>
          </div>
        </>
      )}
    </div>
  )
}
