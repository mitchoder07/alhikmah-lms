// Real brand logos for Paystack and Flutterwave
// Inline SVG so we don't depend on external image hosts

export function PaystackLogo({ className = '', height = 24 }: { className?: string; height?: number }) {
  const width = height * 3.85
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 154 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Paystack"
    >
      {/* Icon: rounded square with sky-blue bg and stylized white P */}
      <rect x="0" y="0" width="40" height="40" rx="8" fill="#00C3F7" />
      <path
        d="M12 9 L12 31 M12 9 L22 9 Q29 9 29 16 Q29 23 22 23 L12 23"
        stroke="white"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Wordmark */}
      <text
        x="50"
        y="27"
        fontFamily="Helvetica, Arial, sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="#011B2C"
        letterSpacing="-0.5"
      >
        Paystack
      </text>
    </svg>
  )
}

export function FlutterwaveLogo({ className = '', height = 24 }: { className?: string; height?: number }) {
  const width = height * 4.6
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 184 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Flutterwave"
    >
      {/* Icon: stylized wave/swirl in Flutterwave brand orange */}
      <path
        d="M6 12 Q12 2 18 12 T30 12"
        stroke="#F5A623"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M6 22 Q12 12 18 22 T30 22"
        stroke="#F5A623"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M6 32 Q12 22 18 32 T30 32"
        stroke="#F5A623"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Wordmark */}
      <text
        x="40"
        y="27"
        fontFamily="Helvetica, Arial, sans-serif"
        fontWeight="700"
        fontSize="19"
        fill="#1A1AFF"
        letterSpacing="-0.3"
      >
        Flutterwave
      </text>
    </svg>
  )
}

// Compact icon-only versions (for tight spaces)
export function PaystackIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-label="Paystack">
      <rect width="40" height="40" rx="8" fill="#00C3F7" />
      <path
        d="M12 9 L12 31 M12 9 L22 9 Q29 9 29 16 Q29 23 22 23 L12 23"
        stroke="white"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FlutterwaveIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size * 0.75} height={size} viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-label="Flutterwave">
      <path d="M3 12 Q9 2 15 12 T27 12" stroke="#F5A623" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M3 22 Q9 12 15 22 T27 22" stroke="#F5A623" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M3 32 Q9 22 15 32 T27 32" stroke="#F5A623" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}
