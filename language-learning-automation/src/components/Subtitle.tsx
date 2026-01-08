import React from 'react';

export interface SubtitleProps {
  text: string;
  color: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  marginBottom?: number;
}

export const Subtitle: React.FC<SubtitleProps> = ({
  text,
  color,
  fontSize = 48,
  fontWeight = 600,
  textAlign = 'center',
  marginBottom = 20,
}) => {
  return (
    <div
      style={{
        color,
        fontSize,
        fontWeight,
        textAlign,
        marginBottom,
        lineHeight: 1.4,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      data-testid="subtitle"
    >
      {text}
    </div>
  );
};

export interface BlankSubtitleProps extends Omit<SubtitleProps, 'text'> {
  text: string;
  blankPlaceholder?: string;
  blankColor?: string;
}

export const BlankSubtitle: React.FC<BlankSubtitleProps> = ({
  text,
  color,
  blankPlaceholder = '_______',
  blankColor = '#FFD700',
  fontSize = 48,
  fontWeight = 600,
  textAlign = 'center',
  marginBottom = 20,
}) => {
  // Split text by blank placeholder and render with different styling
  const parts = text.split(blankPlaceholder);

  return (
    <div
      style={{
        color,
        fontSize,
        fontWeight,
        textAlign,
        marginBottom,
        lineHeight: 1.4,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      data-testid="blank-subtitle"
    >
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <span style={{ color: blankColor, fontWeight: 700 }} data-testid="blank-placeholder">
              {blankPlaceholder}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
