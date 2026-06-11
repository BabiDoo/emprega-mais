import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: 'dark' | 'white';
}

export const Logo: React.FC<LogoProps> = ({
  size = 40,
  showText = true,
  textColor = 'dark',
}) => {
  return (
    <div className="flex items-center gap-2.5">
      {/* Logo icon - inline SVG based on the emprega+ brand */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer circle */}
        <circle cx="45" cy="50" r="40" stroke="#0D3D85" strokeWidth="6" fill="none" />
        {/* Elderly person */}
        <circle cx="32" cy="22" r="8" fill="#0D3D85" />
        <rect x="25" y="30" width="14" height="20" rx="4" fill="#0D3D85" />
        {/* Woman */}
        <circle cx="52" cy="20" r="8" fill="#0D3D85" />
        <path d="M44 30 Q52 28 60 30 L58 50 H46 Z" fill="#0D3D85" />
        {/* Wheelchair person */}
        <circle cx="42" cy="52" r="6" fill="#0D3D85" />
        <path
          d="M36 58 L48 58 L50 68 L34 68 Z"
          fill="#7ACB2D"
        />
        <circle cx="36" cy="72" r="5" stroke="#0D3D85" strokeWidth="3" fill="none" />
        <circle cx="50" cy="72" r="5" stroke="#0D3D85" strokeWidth="3" fill="none" />
        {/* Plus sign */}
        <rect x="72" y="38" width="6" height="24" rx="3" fill="#7ACB2D" />
        <rect x="63" y="47" width="24" height="6" rx="3" fill="#7ACB2D" />
      </svg>

      {showText && (
        <span
          className={`font-extrabold text-xl tracking-tight ${
            textColor === 'white' ? 'text-white' : 'text-primary'
          }`}
        >
          emprega
          <span className="text-accent">+</span>
        </span>
      )}
    </div>
  );
};
