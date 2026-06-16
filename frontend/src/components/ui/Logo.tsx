import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: 'dark' | 'white';
}

export const Logo: React.FC<LogoProps> = ({
  showText = true,
  textColor = 'dark',
}) => {
  return (
    <div className="flex items-center ">
      {/* Logo image from public folder */}
      <img
        src="../../public/favicon.png"
        alt="emprega+"
        style={{
          width: "80px",
          height: "80px",
          objectFit: 'contain',
        }}
      />

      {showText && (
        <span
          className={`font-extrabold text-xl  ${
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