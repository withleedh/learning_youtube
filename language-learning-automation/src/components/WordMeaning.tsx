import React from 'react';
import type { Word } from '../script/types';

export interface WordMeaningProps {
  words: Word[];
  color?: string;
  fontSize?: number;
  separator?: string;
}

export const WordMeaning: React.FC<WordMeaningProps> = ({
  words,
  color = '#888888',
  fontSize = 28,
  separator = ' · ',
}) => {
  return (
    <div
      style={{
        color,
        fontSize,
        textAlign: 'center',
        lineHeight: 1.6,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
      data-testid="word-meaning"
    >
      {words.map((word, index) => (
        <span key={index}>
          <span style={{ fontWeight: 600 }} data-testid="word">
            {word.word}
          </span>
          <span style={{ opacity: 0.8 }}> ({word.meaning})</span>
          {index < words.length - 1 && <span>{separator}</span>}
        </span>
      ))}
    </div>
  );
};
