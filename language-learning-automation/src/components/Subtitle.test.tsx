import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Subtitle, BlankSubtitle } from './Subtitle';

describe('Subtitle Component', () => {
  it('should render text correctly', () => {
    render(<Subtitle text="Hello World" color="#FFFFFF" />);
    expect(screen.getByTestId('subtitle')).toHaveTextContent('Hello World');
  });

  it('should apply correct color', () => {
    render(<Subtitle text="Test" color="#FF0000" />);
    const subtitle = screen.getByTestId('subtitle');
    expect(subtitle).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  });

  it('should apply custom fontSize', () => {
    render(<Subtitle text="Test" color="#FFFFFF" fontSize={64} />);
    const subtitle = screen.getByTestId('subtitle');
    expect(subtitle).toHaveStyle({ fontSize: '64px' });
  });

  it('should apply custom textAlign', () => {
    render(<Subtitle text="Test" color="#FFFFFF" textAlign="left" />);
    const subtitle = screen.getByTestId('subtitle');
    expect(subtitle).toHaveStyle({ textAlign: 'left' });
  });
});

describe('BlankSubtitle Component', () => {
  it('should render text with blank placeholder', () => {
    render(<BlankSubtitle text="This is a _______ sentence." color="#FFFFFF" />);
    expect(screen.getByTestId('blank-subtitle')).toHaveTextContent('This is a _______ sentence.');
  });

  it('should render blank placeholder with different color', () => {
    render(<BlankSubtitle text="Hello _______ world" color="#FFFFFF" blankColor="#FFD700" />);
    const placeholder = screen.getByTestId('blank-placeholder');
    expect(placeholder).toHaveStyle({ color: 'rgb(255, 215, 0)' });
  });

  it('should handle text without blank placeholder', () => {
    render(<BlankSubtitle text="No blank here" color="#FFFFFF" />);
    expect(screen.getByTestId('blank-subtitle')).toHaveTextContent('No blank here');
    expect(screen.queryByTestId('blank-placeholder')).toBeNull();
  });

  it('should handle multiple blank placeholders', () => {
    render(<BlankSubtitle text="First _______ and second _______" color="#FFFFFF" />);
    const placeholders = screen.getAllByTestId('blank-placeholder');
    expect(placeholders.length).toBe(2);
  });
});
