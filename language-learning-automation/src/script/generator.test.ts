import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { saveScript, loadScript, createSampleScript } from './generator';
import type { Script } from './types';
import type { ChannelConfig } from '../config/types';

describe('Script Generator', () => {
  const testOutputDir = path.join(process.cwd(), 'output', 'test');

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
      sentenceCount: 5,
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

  describe('createSampleScript', () => {
    it('should create a valid sample script', () => {
      const script = createSampleScript(mockConfig, 'conversation');

      expect(script.channelId).toBe('test_channel');
      expect(script.category).toBe('conversation');
      expect(script.sentences.length).toBe(5);
    });

    it('should alternate speakers correctly', () => {
      const script = createSampleScript(mockConfig, 'story');

      script.sentences.forEach((sentence, index) => {
        const expectedSpeaker = index % 2 === 0 ? 'M' : 'F';
        expect(sentence.speaker).toBe(expectedSpeaker);
      });
    });

    it('should include blank word data', () => {
      const script = createSampleScript(mockConfig, 'news');

      script.sentences.forEach((sentence) => {
        expect(sentence.targetBlank).toContain('_______');
        expect(sentence.blankAnswer).toBeTruthy();
        expect(sentence.target).toContain(sentence.blankAnswer);
      });
    });

    it('should include words array', () => {
      const script = createSampleScript(mockConfig, 'fairytale');

      script.sentences.forEach((sentence) => {
        expect(sentence.words.length).toBeGreaterThan(0);
      });
    });
  });

  describe('saveScript and loadScript', () => {
    it('should save and load a script correctly', async () => {
      const script = createSampleScript(mockConfig, 'travel_business');

      const savedPath = await saveScript(script, testOutputDir);
      expect(savedPath).toContain('.json');

      const loadedScript = await loadScript(savedPath);
      expect(loadedScript.channelId).toBe(script.channelId);
      expect(loadedScript.category).toBe(script.category);
      expect(loadedScript.sentences.length).toBe(script.sentences.length);
    });

    it('should create output directory if not exists', async () => {
      const newDir = path.join(testOutputDir, 'new_subdir');
      const script = createSampleScript(mockConfig, 'lesson');

      const savedPath = await saveScript(script, newDir);
      const exists = await fs
        .access(savedPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it('should throw error for invalid script file', async () => {
      const invalidPath = path.join(testOutputDir, 'invalid.json');
      await fs.writeFile(invalidPath, JSON.stringify({ invalid: 'data' }));

      await expect(loadScript(invalidPath)).rejects.toThrow('Invalid script file');
    });

    it('should throw error for non-existent file', async () => {
      await expect(loadScript('/non/existent/path.json')).rejects.toThrow();
    });
  });

  describe('Script round-trip', () => {
    it('should preserve all data through save/load cycle', async () => {
      const originalScript: Script = {
        channelId: 'test_channel',
        date: '2026-01-08',
        category: 'announcement',
        metadata: {
          topic: 'Test Topic',
          style: 'formal',
          title: {
            target: 'Test Title',
            native: '테스트 제목',
          },
        },
        sentences: [
          {
            id: 1,
            speaker: 'M',
            target: 'This is a test sentence.',
            targetBlank: 'This is a _______ sentence.',
            blankAnswer: 'test',
            native: '이것은 테스트 문장입니다.',
            words: [
              { word: 'test', meaning: '테스트' },
              { word: 'sentence', meaning: '문장' },
            ],
          },
          {
            id: 2,
            speaker: 'F',
            target: 'Another example here.',
            targetBlank: 'Another _______ here.',
            blankAnswer: 'example',
            native: '또 다른 예시입니다.',
            words: [{ word: 'example', meaning: '예시' }],
          },
        ],
      };

      const savedPath = await saveScript(originalScript, testOutputDir);
      const loadedScript = await loadScript(savedPath);

      expect(loadedScript).toEqual(originalScript);
    });
  });
});
