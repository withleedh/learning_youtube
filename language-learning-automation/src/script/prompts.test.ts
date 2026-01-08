import { describe, it, expect } from 'vitest';
import { generateScriptPrompt, getCategoryForDay } from './prompts';
import type { ChannelConfig } from '../config/types';

describe('Script Prompts', () => {
  const mockConfig: ChannelConfig = {
    channelId: 'english_for_korean',
    meta: {
      name: '귀가 뚫리는 영어',
      targetLanguage: 'English',
      nativeLanguage: 'Korean',
    },
    theme: {
      logo: 'logo.png',
      introSound: 'intro.mp3',
      backgroundStyle: 'illustration',
      primaryColor: '#87CEEB',
      secondaryColor: '#FF69B4',
    },
    colors: {
      maleText: '#87CEEB',
      femaleText: '#FF69B4',
      nativeText: '#FFFFFF',
      wordMeaning: '#888888',
      background: '#000000',
    },
    layout: {
      step3ImageRatio: 0.4,
      subtitlePosition: 'center',
      speakerIndicator: 'left',
    },
    tts: {
      provider: 'openai',
      maleVoice: 'onyx',
      femaleVoice: 'nova',
      targetLanguageCode: 'en-US',
      speed: 1.0,
    },
    content: {
      sentenceCount: 12,
      repeatCount: 10,
      difficulty: 'intermediate',
    },
  };

  describe('generateScriptPrompt', () => {
    it('should include target and native language', () => {
      const prompt = generateScriptPrompt(mockConfig, 'conversation');
      expect(prompt).toContain('English');
      expect(prompt).toContain('Korean');
    });

    it('should include sentence count', () => {
      const prompt = generateScriptPrompt(mockConfig, 'story');
      expect(prompt).toContain('12 sentences');
    });

    it('should include difficulty level', () => {
      const prompt = generateScriptPrompt(mockConfig, 'news');
      expect(prompt).toContain('intermediate');
    });

    it('should include category description', () => {
      const prompt = generateScriptPrompt(mockConfig, 'travel_business');
      expect(prompt).toContain('여행과 업무');
    });

    it('should include specific topic when provided', () => {
      const prompt = generateScriptPrompt(mockConfig, 'story', 'First day at work');
      expect(prompt).toContain('First day at work');
    });

    it('should include JSON output format instructions', () => {
      const prompt = generateScriptPrompt(mockConfig, 'conversation');
      expect(prompt).toContain('Output Format (JSON)');
      expect(prompt).toContain('targetBlank');
      expect(prompt).toContain('blankAnswer');
    });

    it('should mention speaker alternation', () => {
      const prompt = generateScriptPrompt(mockConfig, 'fairytale');
      expect(prompt).toContain('Alternate speakers');
      expect(prompt).toContain('M (male)');
      expect(prompt).toContain('F (female)');
    });
  });

  describe('getCategoryForDay', () => {
    it('should return story for Monday', () => {
      const monday = new Date('2026-01-05'); // Monday
      expect(getCategoryForDay(monday)).toBe('story');
    });

    it('should return conversation for Tuesday', () => {
      const tuesday = new Date('2026-01-06'); // Tuesday
      expect(getCategoryForDay(tuesday)).toBe('conversation');
    });

    it('should return news for Wednesday', () => {
      const wednesday = new Date('2026-01-07'); // Wednesday
      expect(getCategoryForDay(wednesday)).toBe('news');
    });

    it('should return announcement for Thursday', () => {
      const thursday = new Date('2026-01-08'); // Thursday
      expect(getCategoryForDay(thursday)).toBe('announcement');
    });

    it('should return travel_business for Friday', () => {
      const friday = new Date('2026-01-09'); // Friday
      expect(getCategoryForDay(friday)).toBe('travel_business');
    });

    it('should return lesson for Saturday', () => {
      const saturday = new Date('2026-01-10'); // Saturday
      expect(getCategoryForDay(saturday)).toBe('lesson');
    });

    it('should return fairytale for Sunday', () => {
      const sunday = new Date('2026-01-11'); // Sunday
      expect(getCategoryForDay(sunday)).toBe('fairytale');
    });
  });
});
