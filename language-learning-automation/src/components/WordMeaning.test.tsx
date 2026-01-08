import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordMeaning } from './WordMeaning';

describe('WordMeaning Component', () => {
  const sampleWords = [
    { word: 'hello', meaning: '안녕' },
    { word: 'world', meaning: '세계' },
  ];

  it('should render all words', () => {
    render(<WordMeaning words={sampleWords} />);
    const words = screen.getAllByTestId('word');
    expect(words.length).toBe(2);
  });

  it('should display word text correctly', () => {
    render(<WordMeaning words={sampleWords} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('should display meanings in parentheses', () => {
    render(<WordMeaning words={sampleWords} />);
    expect(screen.getByText('(안녕)')).toBeInTheDocument();
    expect(screen.getByText('(세계)')).toBeInTheDocument();
  });

  it('should apply custom color', () => {
    render(<WordMeaning words={sampleWords} color="#FF0000" />);
    const container = screen.getByTestId('word-meaning');
    expect(container).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });

  it('should apply custom fontSize', () => {
    render(<WordMeaning words={sampleWords} fontSize={36} />);
    const container = screen.getByTestId('word-meaning');
    expect(container).toHaveStyle({ fontSize: '36px' });
  });

  it('should handle empty words array', () => {
    render(<WordMeaning words={[]} />);
    const container = screen.getByTestId('word-meaning');
    expect(container).toBeEmptyDOMElement();
  });

  it('should handle single word', () => {
    render(<WordMeaning words={[{ word: 'test', meaning: '테스트' }]} />);
    const words = screen.getAllByTestId('word');
    expect(words.length).toBe(1);
  });
});
