import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig, validateConfig, listChannels } from './loader';

const TEST_CHANNELS_DIR = path.join(process.cwd(), 'channels');

describe('Config Loader', () => {
  const validConfigContent = JSON.stringify({
    channelId: 'test_channel',
    meta: {
      name: 'Test Channel',
      targetLanguage: 'English',
      nativeLanguage: 'Korean',
    },
    theme: {
      logo: 'assets/test/logo.png',
      introSound: 'assets/test/intro.mp3',
    },
    colors: {
      maleText: '#0000FF',
      femaleText: '#FF00FF',
      nativeText: '#FFFFFF',
    },
    tts: {
      provider: 'openai',
      maleVoice: 'onyx',
      femaleVoice: 'nova',
      targetLanguageCode: 'en-US',
    },
    content: {
      sentenceCount: 10,
      repeatCount: 5,
    },
  });

  beforeEach(async () => {
    // Ensure channels directory exists
    await fs.mkdir(TEST_CHANNELS_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(path.join(TEST_CHANNELS_DIR, 'test_channel.json'));
    } catch {
      // File might not exist
    }
  });

  describe('loadConfig', () => {
    it('should load and parse a valid config file', async () => {
      await fs.writeFile(path.join(TEST_CHANNELS_DIR, 'test_channel.json'), validConfigContent);

      const config = await loadConfig('test_channel');

      expect(config.channelId).toBe('test_channel');
      expect(config.meta.name).toBe('Test Channel');
      expect(config.tts.provider).toBe('openai');
    });

    it('should throw error for non-existent channel', async () => {
      await expect(loadConfig('non_existent')).rejects.toThrow();
    });

    it('should throw error for invalid JSON', async () => {
      await fs.writeFile(path.join(TEST_CHANNELS_DIR, 'test_channel.json'), 'invalid json {');

      await expect(loadConfig('test_channel')).rejects.toThrow();
    });

    it('should throw error for invalid config schema', async () => {
      await fs.writeFile(
        path.join(TEST_CHANNELS_DIR, 'test_channel.json'),
        JSON.stringify({ channelId: 'test' }) // Missing required fields
      );

      await expect(loadConfig('test_channel')).rejects.toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const config = JSON.parse(validConfigContent);
      expect(validateConfig(config)).toBe(true);
    });

    it('should return false for invalid config', () => {
      expect(validateConfig({ channelId: 'test' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(validateConfig(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateConfig(undefined)).toBe(false);
    });
  });

  describe('listChannels', () => {
    it('should list available channel IDs', async () => {
      await fs.writeFile(path.join(TEST_CHANNELS_DIR, 'test_channel.json'), validConfigContent);

      const channels = await listChannels();

      expect(channels).toContain('test_channel');
    });

    it('should only include .json files', async () => {
      await fs.writeFile(path.join(TEST_CHANNELS_DIR, 'test_channel.json'), validConfigContent);
      await fs.writeFile(path.join(TEST_CHANNELS_DIR, 'readme.txt'), 'not a config');

      const channels = await listChannels();

      expect(channels).toContain('test_channel');
      expect(channels).not.toContain('readme');

      // Clean up
      await fs.unlink(path.join(TEST_CHANNELS_DIR, 'readme.txt'));
    });
  });
});
