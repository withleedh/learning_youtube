import { describe, it, expect } from 'vitest';
import { scriptSchema, sentenceSchema, categorySchema, type Script, type Sentence } from './types';

describe('Script Schema', () => {
  const validSentence: Sentence = {
    id: 1,
    speaker: 'M',
    target: "Good morning, I'm here for the sunrise tour.",
    targetBlank: "Good morning, I'm here for the _______ tour.",
    blankAnswer: 'sunrise',
    native: '안녕하세요, 일출 투어 왔어요.',
    words: [
      { word: 'sunrise', meaning: '일출' },
      { word: 'tour', meaning: '투어' },
    ],
  };

  const validScript: Script = {
    channelId: 'english_for_korean',
    date: '2026-01-08',
    category: 'travel_business',
    metadata: {
      topic: 'Sunrise Tour',
      style: 'casual',
      title: {
        target: 'My First Sunrise Tour',
        native: '처음 일출 투어 간 날',
      },
    },
    sentences: [validSentence],
  };

  describe('Sentence Schema', () => {
    it('should validate a valid sentence', () => {
      const result = sentenceSchema.safeParse(validSentence);
      expect(result.success).toBe(true);
    });

    it('should reject sentence without target', () => {
      const invalid = { ...validSentence, target: '' };
      const result = sentenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject sentence without targetBlank', () => {
      const invalid = { ...validSentence, targetBlank: '' };
      const result = sentenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject sentence without blankAnswer', () => {
      const invalid = { ...validSentence, blankAnswer: '' };
      const result = sentenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject sentence with empty words array', () => {
      const invalid = { ...validSentence, words: [] };
      const result = sentenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid speaker value', () => {
      const invalid = { ...validSentence, speaker: 'X' };
      const result = sentenceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Category Schema', () => {
    it('should accept valid categories', () => {
      const validCategories = [
        'story',
        'conversation',
        'news',
        'announcement',
        'travel_business',
        'lesson',
        'fairytale',
      ];

      validCategories.forEach((category) => {
        const result = categorySchema.safeParse(category);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid category', () => {
      const result = categorySchema.safeParse('invalid_category');
      expect(result.success).toBe(false);
    });
  });

  describe('Script Schema', () => {
    it('should validate a valid script', () => {
      const result = scriptSchema.safeParse(validScript);
      expect(result.success).toBe(true);
    });

    it('should reject script with invalid date format', () => {
      const invalid = { ...validScript, date: '01-08-2026' };
      const result = scriptSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject script with empty sentences', () => {
      const invalid = { ...validScript, sentences: [] };
      const result = scriptSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject script without channelId', () => {
      const invalid = { ...validScript, channelId: '' };
      const result = scriptSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should apply default style if not provided', () => {
      const scriptWithoutStyle = {
        ...validScript,
        metadata: {
          topic: 'Test',
          title: { target: 'Test', native: '테스트' },
        },
      };
      const result = scriptSchema.safeParse(scriptWithoutStyle);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.style).toBe('casual');
      }
    });
  });
});
