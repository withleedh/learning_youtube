import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { createMockAudioFiles, getAudioFilesForSentence, getAudioFile } from './generator';
import { createSampleScript } from '../script/generator';
import type { ChannelConfig } from '../config/types';

describe('TTS Generator', () => {
  const testOutputDir = path.join(process.cwd(), 'output', 'test_tts');

  const mockConfig: ChannelConfig = {
    channelId: 'test_channel',
    meta: {
      name: 'Test Channel',
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
      sentenceCount: 3,
      repeatCount: 10,
      difficulty: 'intermediate',
    },
    uiLabels: {
      step3Title: 'STEP 3 · 반복 훈련',
      phaseIntro: '🎧 천천히 듣기',
      phaseTraining: '🧩 빈칸 퀴즈',
      phaseChallenge: '⚡ 빠르게 듣기',
      phaseReview: '✨ 마무리',
    },
  };

  beforeEach(async () => {
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('createMockAudioFiles', () => {
    it('should create correct number of audio files', async () => {
      const script = createSampleScript(mockConfig, 'conversation');
      const audioFiles = await createMockAudioFiles(script, testOutputDir);

      // 3 sentences × 3 speeds = 9 files
      expect(audioFiles.length).toBe(9);
    });

    it('should create files for all speed variants', async () => {
      const script = createSampleScript(mockConfig, 'story');
      const audioFiles = await createMockAudioFiles(script, testOutputDir);

      const speeds = audioFiles.map((af) => af.speed);
      expect(speeds).toContain('0.8x');
      expect(speeds).toContain('1.0x');
      expect(speeds).toContain('1.2x');
    });

    it('should create files with correct speaker assignment', async () => {
      const script = createSampleScript(mockConfig, 'news');
      const audioFiles = await createMockAudioFiles(script, testOutputDir);

      // First sentence should be M, second F, third M
      const sentence1Files = audioFiles.filter((af) => af.sentenceId === 1);
      const sentence2Files = audioFiles.filter((af) => af.sentenceId === 2);
      const sentence3Files = audioFiles.filter((af) => af.sentenceId === 3);

      expect(sentence1Files.every((af) => af.speaker === 'M')).toBe(true);
      expect(sentence2Files.every((af) => af.speaker === 'F')).toBe(true);
      expect(sentence3Files.every((af) => af.speaker === 'M')).toBe(true);
    });

    it('should create actual files on disk', async () => {
      const script = createSampleScript(mockConfig, 'fairytale');
      const audioFiles = await createMockAudioFiles(script, testOutputDir);

      for (const audioFile of audioFiles) {
        const exists = await fs
          .access(audioFile.path)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });

  describe('getAudioFilesForSentence', () => {
    it('should return all audio files for a specific sentence', async () => {
      const script = createSampleScript(mockConfig, 'lesson');
      const audioFiles = await createMockAudioFiles(script, testOutputDir);

      const sentence1Files = getAudioFilesForSentence(audioFiles, 1);
      expect(sentence1Files.length).toBe(3); // 3 speed variants
      expect(sentence1Files.every((af) => af.sentenceId === 1)).toBe(true);
    });

    it('should return empty array for non-existent sentence', async () => {
      const script = createSampleScript(mockConfig, 'announcement');
      const audioFiles = await createMockAudioFiles(script, testOutputDir);

      const nonExistent = getAudioFilesForSentence(audioFiles, 999);
      expect(nonExistent.length).toBe(0);
    });
  });

  describe('getAudioFile', () => {
    it('should return specific audio file by sentence and speed', async () => {
      const script = createSampleScript(mockConfig, 'travel_business');
      const audioFiles = await createMockAudioFiles(script, testOutputDir);

      const audioFile = getAudioFile(audioFiles, 1, '1.0x');
      expect(audioFile).toBeDefined();
      expect(audioFile?.sentenceId).toBe(1);
      expect(audioFile?.speed).toBe('1.0x');
    });

    it('should return undefined for non-existent combination', async () => {
      const script = createSampleScript(mockConfig, 'story');
      const audioFiles = await createMockAudioFiles(script, testOutputDir);

      const audioFile = getAudioFile(audioFiles, 999, '1.0x');
      expect(audioFile).toBeUndefined();
    });
  });
});
