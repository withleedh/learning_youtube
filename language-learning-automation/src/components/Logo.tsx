import React from 'react';
import { Img, staticFile } from 'remotion';

export interface LogoProps {
  src: string;
  width?: number;
  height?: number;
  opacity?: number;
}

export const Logo: React.FC<LogoProps> = ({ src, width = 200, height = 200, opacity = 1 }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
      data-testid="logo"
    >
      <Img
        src={staticFile(src)}
        style={{
          width,
          height,
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

// Fallback logo component when image is not available
export const FallbackLogo: React.FC<{ text: string; color?: string }> = ({
  text,
  color = '#FFFFFF',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 64,
        fontWeight: 700,
        color,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      data-testid="fallback-logo"
    >
      {text}
    </div>
  );
};
