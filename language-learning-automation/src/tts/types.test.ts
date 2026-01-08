import { describe, it, expect } from 'vitest';
import {
  ttsOptionsSchema,
  audioFileSchema,
  selectVoice,
  generateAudioFilename,
  calculateExpectedAudioCount,
  speedVariants,
  speedMultipliers,
} from './types';

describe('TTS Types', () => {
  describe('ttsOptionsSchema', () => {
    it('should validate valid TTS options', () => {
      const validOptions = {
        text: 'Hello world',
        voice: 'onyx',
        speed: 1.0,
        provider: 'openai',
        languageCode: 'en-US',
      };
      const result = ttsOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
    });

    it('should reject empty text', () => {
      const invalid = {
        text: '',
        voice: 'onyx',
        speed: 1.0,
        provider: 'openai',
        languageCode: 'en-US',
      };
      const result = ttsOptionsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid provider', () => {
      const invalid = {
        text: 'Hello',
        voice: 'onyx',
        speed: 1.0,
        provider: 'azure',
        languageCode: 'en-US',
      };
      const result = ttsOptionsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject speed out of range', () => {
      const tooSlow = {
        text: 'Hello',
        voice: 'onyx',
        speed: 0.3,
        provider: 'openai',
        languageCode: 'en-US',
      };
      const tooFast = {
        text: 'Hello',
        voice: 'onyx',
        speed: 2.5,
        provider: 'openai',
        languageCode: 'en-US',
      };
      expect(ttsOptionsSchema.safeParse(tooSlow).success).toBe(false);
      expect(ttsOptionsSchema.safeParse(tooFast).success).toBe(false);
    });
  });

  describe('audioFileSchema', () => {
    it('should validate valid audio file metadata', () => {
      const validAudioFile = {
        sentenceId: 1,
        speaker: 'M',
        speed: '1.0x',
        path: '/path/to/audio.mp3',
        duration: 3.5,
      };
      const result = audioFileSchema.safeParse(validAudioFile);
      expect(result.success).toBe(true);
    });

    it('should reject invalid speed variant', () => {
      const invalid = {
        sentenceId: 1,
        speaker: 'M',
        speed: '0.5x',
        path: '/path/to/audio.mp3',
        duration: 3.5,
      };
      const result = audioFileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const invalid = {
        sentenceId: 1,
        speaker: 'M',
        speed: '1.0x',
        path: '/path/to/audio.mp3',
        duration: -1,
      };
      const result = audioFileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('selectVoice', () => {
    it('should return male voice for M speaker', () => {
      expect(selectVoice('M', 'onyx', 'nova')).toBe('onyx');
    });

    it('should return female voice for F speaker', () => {
      expect(selectVoice('F', 'onyx', 'nova')).toBe('nova');
    });
  });

  describe('generateAudioFilename', () => {
    it('should generate correct filename format', () => {
      expect(generateAudioFilename(1, 'M', '1.0x')).toBe('sentence_01_M_10x.mp3');
      expect(generateAudioFilename(12, 'F', '0.8x')).toBe('sentence_12_F_08x.mp3');
      expect(generateAudioFilename(5, 'M', '1.2x')).toBe('sentence_05_M_12x.mp3');
    });

    it('should pad sentence ID with zeros', () => {
      expect(generateAudioFilename(1, 'M', '1.0x')).toContain('_01_');
      expect(generateAudioFilename(9, 'F', '1.0x')).toContain('_09_');
    });
  });

  describe('calculateExpectedAudioCount', () => {
    it('should calculate correct count for given sentence count', () => {
      // 3 speed variants per sentence
      expect(calculateExpectedAudioCount(1)).toBe(3);
      expect(calculateExpectedAudioCount(5)).toBe(15);
      expect(calculateExpectedAudioCount(12)).toBe(36);
    });
  });

  describe('speedVariants and speedMultipliers', () => {
    it('should have three speed variants', () => {
      expect(speedVariants.length).toBe(3);
      expect(speedVariants).toContain('0.8x');
      expect(speedVariants).toContain('1.0x');
      expect(speedVariants).toContain('1.2x');
    });

    it('should have correct multiplier values', () => {
      expect(speedMultipliers['0.8x']).toBe(0.8);
      expect(speedMultipliers['1.0x']).toBe(1.0);
      expect(speedMultipliers['1.2x']).toBe(1.2);
    });
  });
});
