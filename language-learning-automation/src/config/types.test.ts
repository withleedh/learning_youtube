import { describe, it, expect } from 'vitest';
import { channelConfigSchema, type ChannelConfig } from './types';

describe('ChannelConfig Schema', () => {
  const validConfig: ChannelConfig = {
    channelId: 'english_for_korean',
    meta: {
      name: '귀가 뚫리는 영어',
      targetLanguage: 'English',
      nativeLanguage: 'Korean',
    },
    theme: {
      logo: 'assets/english/logo.png',
      introSound: 'assets/english/intro.mp3',
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

  it('should validate a valid config', () => {
    const result = channelConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid channelId format', () => {
    const invalidConfig = { ...validConfig, channelId: 'English-Channel' };
    const result = channelConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should reject missing required meta fields', () => {
    const invalidConfig = {
      ...validConfig,
      meta: { name: '테스트' }, // missing targetLanguage and nativeLanguage
    };
    const result = channelConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should reject invalid hex color format', () => {
    const invalidConfig = {
      ...validConfig,
      colors: { ...validConfig.colors, maleText: 'blue' },
    };
    const result = channelConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should reject invalid TTS provider', () => {
    const invalidConfig = {
      ...validConfig,
      tts: { ...validConfig.tts, provider: 'azure' },
    };
    const result = channelConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should reject sentenceCount out of range', () => {
    const invalidConfig = {
      ...validConfig,
      content: { ...validConfig.content, sentenceCount: 25 },
    };
    const result = channelConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should apply default values for optional fields', () => {
    const minimalConfig = {
      channelId: 'test_channel',
      meta: {
        name: 'Test',
        targetLanguage: 'English',
        nativeLanguage: 'Korean',
      },
      theme: {
        logo: 'logo.png',
        introSound: 'intro.mp3',
      },
      colors: {
        maleText: '#0000FF',
        femaleText: '#FF00FF',
        nativeText: '#FFFFFF',
      },
      tts: {
        provider: 'openai' as const,
        maleVoice: 'onyx',
        femaleVoice: 'nova',
        targetLanguageCode: 'en-US',
      },
      content: {
        sentenceCount: 10,
        repeatCount: 5,
      },
    };

    const result = channelConfigSchema.safeParse(minimalConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme.backgroundStyle).toBe('illustration');
      expect(result.data.colors.background).toBe('#000000');
      expect(result.data.layout.step3ImageRatio).toBe(0.4);
      expect(result.data.tts.speed).toBe(1.0);
      expect(result.data.content.difficulty).toBe('intermediate');
    }
  });
});
