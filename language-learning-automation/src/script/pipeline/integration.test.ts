/**
 * Integration Tests for Multi-Step Script Pipeline
 *
 * Tests full pipeline end-to-end behavior, backward compatibility,
 * and all 7 categories produce valid output.
 *
 * Uses mocks for AI generation to make tests deterministic and fast.
 *
 * @module integration.test
 * **Validates: Requirements 5.1, 5.2, 5.4**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  scriptSchema,
  type Script,
  type Category,
  type Sentence,
  type Character,
  type ScenePrompt,
} from '../types';
import type { ChannelConfig } from '../../config/types';
import type { ScreenplayOutput, StructuredSentences, VisualOutput } from './types';
import { PipelineError } from './types';

// ============================================================================
// Mock All Dependencies Before Imports
// ============================================================================

vi.mock('./creative-generator', () => ({
  generateCreativeScript: vi.fn(),
  isScreenplayFormat: vi.fn(),
  hasNaturalDialoguePatterns: vi.fn(),
}));

vi.mock('./structural-converter', () => ({
  convertToStructuredFormat: vi.fn(),
}));

vi.mock('./visual-generator', () => ({
  generateVisualPrompts: vi.fn(),
}));

vi.mock('./validators', () => ({
  validateSentences: vi.fn(),
  validateSceneCoverage: vi.fn(),
}));

vi.mock('../generator', () => ({
  generateScript: vi.fn(),
}));

// Import mocked modules
import {
  generateCreativeScript,
  isScreenplayFormat,
  hasNaturalDialoguePatterns,
} from './creative-generator';
import { convertToStructuredFormat } from './structural-converter';
import { generateVisualPrompts } from './visual-generator';
import { validateSentences, validateSceneCoverage } from './validators';
import { generateScript as generateLegacyScript } from '../generator';

// Import the actual orchestrator
import { runScriptPipeline, isPipelineEnabled } from './orchestrator';

// ============================================================================
// Mock Data Generators
// ============================================================================

const ALL_CATEGORIES: Category[] = [
  'story',
  'conversation',
  'news',
  'announcement',
  'travel_business',
  'lesson',
  'fairytale',
];

function createMockChannelConfig(sentenceCount: number = 8): ChannelConfig {
  return {
    channelId: 'test_channel',
    meta: { name: 'Test Channel', targetLanguage: 'English', nativeLanguage: 'Korean' },
    theme: {
      logo: '',
      introSound: '',
      backgroundStyle: 'illustration',
      primaryColor: '#87CEEB',
      secondaryColor: '#FF69B4',
      preferredArtStyle: 'clay_animation',
    },
    colors: {
      maleText: '#4A90D9',
      femaleText: '#E91E63',
      nativeText: '#FFFFFF',
      wordMeaning: '#888888',
      background: '#000000',
    },
    layout: { step3ImageRatio: 0.4, subtitlePosition: 'center', speakerIndicator: 'left' },
    tts: {
      provider: 'google',
      maleVoice: 'en-US-Standard-A',
      femaleVoice: 'en-US-Standard-C',
      targetLanguageCode: 'en-US',
      speed: 1.0,
    },
    content: { sentenceCount, repeatCount: 3, difficulty: 'intermediate' },
    uiLabels: {},
    shortsTheme: {},
    thumbnail: {},
  };
}

function createMockSentence(id: number, speaker: 'M' | 'F' = 'M'): Sentence {
  return {
    id,
    speaker,
    target: `This is test sentence number ${id}.`,
    targetBlank: `This is test _______ number ${id}.`,
    blankAnswer: 'sentence',
    native: `이것은 테스트 문장 ${id}입니다.`,
    words: [{ word: 'sentence', meaning: '문장' }],
    wrongWordChoices: ['presence', 'essence'],
  };
}

function createMockSentences(count: number): Sentence[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSentence(i + 1, i % 2 === 0 ? 'M' : 'F')
  );
}

function createMockCharacter(id: 'M' | 'F'): Character {
  return {
    id,
    name: id === 'M' ? 'James' : 'Sarah',
    gender: id === 'M' ? 'male' : 'female',
    ethnicity: 'American',
    role: 'narrator',
    appearance: {
      age: 'mid-20s',
      hair: 'short brown hair',
      eyes: 'brown eyes',
      skin: 'light complexion',
      build: 'average build',
      clothing: 'casual outfit',
    },
  };
}

function createMockScenePrompts(totalSentences: number): ScenePrompt[] {
  const sceneCount = Math.min(Math.max(3, Math.ceil(totalSentences / 3)), 6);
  const sentencesPerScene = Math.ceil(totalSentences / sceneCount);
  const scenes: ScenePrompt[] = [];
  let start = 1;
  for (let i = 0; i < sceneCount; i++) {
    const end = Math.min(start + sentencesPerScene - 1, totalSentences);
    scenes.push({
      sentenceRange: [start, end],
      setting: `Scene ${i + 1}`,
      mood: 'neutral',
      characterActions: 'Characters present',
      cameraDirection: i % 2 === 0 ? 'Medium shot' : 'Close-up',
    });
    start = end + 1;
    if (start > totalSentences) break;
  }
  return scenes;
}

function createMockScreenplay(topic: string, sentenceCount: number): ScreenplayOutput {
  const dialogueLines = Array.from({ length: sentenceCount }, (_, i) => ({
    speaker: (i % 2 === 0 ? 'M' : 'F') as 'M' | 'F',
    line: `This is test sentence number ${i + 1}.`,
    emotion: 'neutral',
  }));
  return {
    title: topic,
    characters: [
      { id: 'M', name: 'James', description: 'A friendly narrator' },
      { id: 'F', name: 'Sarah', description: 'A helpful assistant' },
    ],
    scenes: [{ sceneNumber: 1, setting: 'A cozy room', dialogue: dialogueLines }],
    rawText: `TITLE: ${topic}\n\nM: Test dialogue\nF: Response`,
  };
}

function createMockStructuredSentences(topic: string, sentenceCount: number): StructuredSentences {
  return {
    metadata: {
      topic,
      style: 'casual',
      title: { target: `Test: ${topic}`, native: `테스트: ${topic}` },
      characters: [createMockCharacter('M'), createMockCharacter('F')],
    },
    sentences: createMockSentences(sentenceCount),
  };
}

function createMockVisualOutput(sentenceCount: number): VisualOutput {
  return {
    characters: [createMockCharacter('M'), createMockCharacter('F')],
    scenePrompts: createMockScenePrompts(sentenceCount),
  };
}

function createMockScript(
  category: Category,
  sentenceCount: number,
  topic: string = 'Test topic'
): Script {
  return {
    channelId: 'test_channel',
    date: new Date().toISOString().split('T')[0],
    category,
    metadata: {
      topic,
      style: 'casual',
      title: { target: `Test: ${topic}`, native: `테스트: ${topic}` },
      characters: [createMockCharacter('M'), createMockCharacter('F')],
      scenePrompts: createMockScenePrompts(sentenceCount),
    },
    sentences: createMockSentences(sentenceCount),
  };
}

// ============================================================================
// Helper to setup all mocks for a successful pipeline run
// ============================================================================

function setupSuccessfulPipelineMocks(topic: string, sentenceCount: number) {
  vi.mocked(isScreenplayFormat).mockReturnValue(true);
  vi.mocked(hasNaturalDialoguePatterns).mockReturnValue(true);
  vi.mocked(generateCreativeScript).mockResolvedValue(createMockScreenplay(topic, sentenceCount));
  vi.mocked(convertToStructuredFormat).mockResolvedValue(
    createMockStructuredSentences(topic, sentenceCount)
  );
  vi.mocked(generateVisualPrompts).mockResolvedValue(createMockVisualOutput(sentenceCount));
  vi.mocked(validateSentences).mockReturnValue([]);
  vi.mocked(validateSceneCoverage).mockReturnValue([]);
}

// ============================================================================
// Test Suite: Full Pipeline End-to-End
// **Validates: Requirements 5.1, 5.2**
// ============================================================================

describe('Integration Tests: Full Pipeline End-to-End', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should produce a valid Script object that passes schema validation', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'A day at the coffee shop';
    const category: Category = 'story';
    setupSuccessfulPipelineMocks(topic, 8);

    const result = await runScriptPipeline(config, category, topic);

    const validationResult = scriptSchema.safeParse(result.script);
    expect(validationResult.success).toBe(true);
    expect(result.script.channelId).toBe('test_channel');
    expect(result.script.category).toBe(category);
    expect(result.script.sentences.length).toBe(8);
    expect(result.script.metadata.topic).toBe(topic);
  });

  it('should execute all three phases in sequence', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Learning to cook';
    const category: Category = 'lesson';
    setupSuccessfulPipelineMocks(topic, 8);

    const result = await runScriptPipeline(config, category, topic);

    expect(generateCreativeScript).toHaveBeenCalledTimes(1);
    expect(convertToStructuredFormat).toHaveBeenCalledTimes(1);
    expect(generateVisualPrompts).toHaveBeenCalledTimes(1);
    expect(result.phases.creative.duration).toBeGreaterThanOrEqual(0);
    expect(result.phases.structural.duration).toBeGreaterThanOrEqual(0);
    expect(result.phases.visual.duration).toBeGreaterThanOrEqual(0);
  });

  it('should pass output between phases correctly', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'My first job interview';
    const category: Category = 'conversation';
    const mockScreenplay = createMockScreenplay(topic, 8);
    const mockStructured = createMockStructuredSentences(topic, 8);
    const mockVisual = createMockVisualOutput(8);

    vi.mocked(isScreenplayFormat).mockReturnValue(true);
    vi.mocked(hasNaturalDialoguePatterns).mockReturnValue(true);
    vi.mocked(generateCreativeScript).mockResolvedValue(mockScreenplay);
    vi.mocked(convertToStructuredFormat).mockResolvedValue(mockStructured);
    vi.mocked(generateVisualPrompts).mockResolvedValue(mockVisual);
    vi.mocked(validateSentences).mockReturnValue([]);
    vi.mocked(validateSceneCoverage).mockReturnValue([]);

    await runScriptPipeline(config, category, topic);

    expect(convertToStructuredFormat).toHaveBeenCalledWith(
      expect.objectContaining({ screenplay: mockScreenplay })
    );
    expect(generateVisualPrompts).toHaveBeenCalledWith(
      expect.objectContaining({ structuredScript: mockStructured })
    );
  });

  it('should include scene prompts in the final output', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'A surprise birthday party';
    const category: Category = 'story';
    setupSuccessfulPipelineMocks(topic, 8);

    const result = await runScriptPipeline(config, category, topic);

    expect(result.script.metadata.scenePrompts).toBeDefined();
    expect(result.script.metadata.scenePrompts!.length).toBeGreaterThanOrEqual(3);
    expect(result.script.metadata.scenePrompts!.length).toBeLessThanOrEqual(6);
  });

  it('should include character appearances in the final output', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'The lost wallet';
    const category: Category = 'story';
    setupSuccessfulPipelineMocks(topic, 8);

    const result = await runScriptPipeline(config, category, topic);

    expect(result.script.metadata.characters.length).toBeGreaterThan(0);
    for (const character of result.script.metadata.characters) {
      expect(character.appearance).toBeDefined();
    }
  });
});

// ============================================================================
// Test Suite: Backward Compatibility
// **Validates: Requirements 5.2, 5.3**
// ============================================================================

describe('Integration Tests: Backward Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fall back to legacy generation when pipeline is disabled', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Meeting an old friend';
    const category: Category = 'conversation';
    const mockLegacyScript = createMockScript(category, 8, topic);
    vi.mocked(generateLegacyScript).mockResolvedValue(mockLegacyScript);

    const result = await runScriptPipeline(config, category, topic, { pipelineEnabled: false });

    expect(generateLegacyScript).toHaveBeenCalledTimes(1);
    expect(generateCreativeScript).not.toHaveBeenCalled();
    expect(convertToStructuredFormat).not.toHaveBeenCalled();
    expect(generateVisualPrompts).not.toHaveBeenCalled();
    expect(scriptSchema.safeParse(result.script).success).toBe(true);
  });

  it('should correctly report pipeline enabled status', () => {
    expect(isPipelineEnabled()).toBe(true);
    expect(isPipelineEnabled({})).toBe(true);
    expect(isPipelineEnabled({ pipelineEnabled: true })).toBe(true);
    expect(isPipelineEnabled({ pipelineEnabled: false })).toBe(false);
  });

  it('should produce output compatible with existing Script type schema', async () => {
    const config = createMockChannelConfig(10);
    const topic = 'A day at the beach';
    const category: Category = 'story';
    setupSuccessfulPipelineMocks(topic, 10);

    const result = await runScriptPipeline(config, category, topic);

    expect(result.script.channelId).toBeDefined();
    expect(result.script.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.script.category).toBeDefined();
    expect(result.script.metadata).toBeDefined();
    expect(result.script.metadata.topic).toBeDefined();
    expect(result.script.metadata.title.target).toBeDefined();
    expect(result.script.metadata.title.native).toBeDefined();
    expect(result.script.sentences).toBeDefined();
    for (const sentence of result.script.sentences) {
      expect(sentence.id).toBeDefined();
      expect(sentence.speaker).toMatch(/^[MF]$/);
      expect(sentence.target).toBeDefined();
      expect(sentence.targetBlank).toBeDefined();
      expect(sentence.blankAnswer).toBeDefined();
      expect(sentence.native).toBeDefined();
      expect(sentence.words.length).toBeGreaterThan(0);
    }
  });

  it('should be usable as a drop-in replacement for existing generation', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Shopping at the mall';
    const category: Category = 'conversation';
    setupSuccessfulPipelineMocks(topic, 8);
    vi.mocked(generateLegacyScript).mockResolvedValue(createMockScript(category, 8, topic));

    const pipelineResult = await runScriptPipeline(config, category, topic, {
      pipelineEnabled: true,
    });
    vi.clearAllMocks();
    vi.mocked(generateLegacyScript).mockResolvedValue(createMockScript(category, 8, topic));
    const legacyResult = await runScriptPipeline(config, category, topic, {
      pipelineEnabled: false,
    });

    expect(scriptSchema.safeParse(pipelineResult.script).success).toBe(true);
    expect(scriptSchema.safeParse(legacyResult.script).success).toBe(true);
    expect(pipelineResult.script.category).toBe(legacyResult.script.category);
    expect(pipelineResult.script.channelId).toBe(legacyResult.script.channelId);
  });
});

// ============================================================================
// Test Suite: All 7 Categories Support
// **Validates: Requirements 5.4**
// ============================================================================

describe('Integration Tests: All 7 Categories Produce Valid Output', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(ALL_CATEGORIES)('should produce valid output for category: %s', async (category) => {
    const config = createMockChannelConfig(8);
    const topic = `Test topic for ${category}`;
    setupSuccessfulPipelineMocks(topic, 8);

    const result = await runScriptPipeline(config, category, topic);

    expect(scriptSchema.safeParse(result.script).success).toBe(true);
    expect(result.script.category).toBe(category);
  });

  it('should support exactly 7 categories', () => {
    expect(ALL_CATEGORIES.length).toBe(7);
    expect(ALL_CATEGORIES).toContain('story');
    expect(ALL_CATEGORIES).toContain('conversation');
    expect(ALL_CATEGORIES).toContain('news');
    expect(ALL_CATEGORIES).toContain('announcement');
    expect(ALL_CATEGORIES).toContain('travel_business');
    expect(ALL_CATEGORIES).toContain('lesson');
    expect(ALL_CATEGORIES).toContain('fairytale');
  });

  it('should produce scripts with correct structure for all categories', async () => {
    const config = createMockChannelConfig(8);
    for (const category of ALL_CATEGORIES) {
      vi.clearAllMocks();
      const topic = `Test topic for ${category}`;
      setupSuccessfulPipelineMocks(topic, 8);

      const result = await runScriptPipeline(config, category, topic);

      expect(result.script.category).toBe(category);
      expect(result.script.sentences.length).toBe(8);
      expect(result.script.metadata.characters.length).toBeGreaterThan(0);
      expect(result.script.metadata.scenePrompts).toBeDefined();
    }
  });

  it('should preserve category through the entire pipeline', async () => {
    const config = createMockChannelConfig(8);
    for (const category of ALL_CATEGORIES) {
      vi.clearAllMocks();
      const topic = `Preserving category: ${category}`;
      setupSuccessfulPipelineMocks(topic, 8);

      const result = await runScriptPipeline(config, category, topic);

      expect(result.script.category).toBe(category);
    }
  });
});

// ============================================================================
// Test Suite: Error Handling
// **Validates: Requirements 4.2**
// ============================================================================

describe('Integration Tests: Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should report errors from creative phase with phase name', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Error test';
    const category: Category = 'story';
    vi.mocked(generateCreativeScript).mockRejectedValue(new Error('Creative phase failed'));

    try {
      await runScriptPipeline(config, category, topic);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      const pipelineError = error as PipelineError;
      expect(pipelineError.phaseError.phase).toBe('creative');
      expect(pipelineError.message).toContain('creative');
    }
  });

  it('should report errors from structural phase with phase name', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Error test';
    const category: Category = 'story';
    vi.mocked(isScreenplayFormat).mockReturnValue(true);
    vi.mocked(hasNaturalDialoguePatterns).mockReturnValue(true);
    vi.mocked(generateCreativeScript).mockResolvedValue(createMockScreenplay(topic, 8));
    vi.mocked(convertToStructuredFormat).mockRejectedValue(new Error('Structural phase failed'));

    try {
      await runScriptPipeline(config, category, topic);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      const pipelineError = error as PipelineError;
      expect(pipelineError.phaseError.phase).toBe('structural');
      expect(pipelineError.message).toContain('structural');
    }
  });

  it('should report errors from visual phase with phase name', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Error test';
    const category: Category = 'story';
    vi.mocked(isScreenplayFormat).mockReturnValue(true);
    vi.mocked(hasNaturalDialoguePatterns).mockReturnValue(true);
    vi.mocked(generateCreativeScript).mockResolvedValue(createMockScreenplay(topic, 8));
    vi.mocked(convertToStructuredFormat).mockResolvedValue(createMockStructuredSentences(topic, 8));
    vi.mocked(validateSentences).mockReturnValue([]);
    vi.mocked(generateVisualPrompts).mockRejectedValue(new Error('Visual phase failed'));

    try {
      await runScriptPipeline(config, category, topic);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      const pipelineError = error as PipelineError;
      expect(pipelineError.phaseError.phase).toBe('visual');
      expect(pipelineError.message).toContain('visual');
    }
  });

  it('should wrap legacy generation errors in PipelineError', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Error test';
    const category: Category = 'story';
    vi.mocked(generateLegacyScript).mockRejectedValue(new Error('Legacy generation failed'));

    try {
      await runScriptPipeline(config, category, topic, { pipelineEnabled: false });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      const pipelineError = error as PipelineError;
      expect(pipelineError.message).toContain('Legacy generation failed');
    }
  });
});

// ============================================================================
// Test Suite: Pipeline Configuration
// **Validates: Requirements 4.5**
// ============================================================================

describe('Integration Tests: Pipeline Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should respect custom retry configuration', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Retry test';
    const category: Category = 'story';
    setupSuccessfulPipelineMocks(topic, 8);

    const result = await runScriptPipeline(config, category, topic, {
      maxRetries: { creative: 5, structural: 5, visual: 5 },
    });

    expect(result.script).toBeDefined();
    expect(scriptSchema.safeParse(result.script).success).toBe(true);
  });

  it('should skip visual phase when disabled', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Skip visual test';
    const category: Category = 'story';
    vi.mocked(isScreenplayFormat).mockReturnValue(true);
    vi.mocked(hasNaturalDialoguePatterns).mockReturnValue(true);
    vi.mocked(generateCreativeScript).mockResolvedValue(createMockScreenplay(topic, 8));
    vi.mocked(convertToStructuredFormat).mockResolvedValue(createMockStructuredSentences(topic, 8));
    vi.mocked(validateSentences).mockReturnValue([]);

    const result = await runScriptPipeline(config, category, topic, { enableVisualPhase: false });

    expect(generateVisualPrompts).not.toHaveBeenCalled();
    expect(result.script).toBeDefined();
    expect(result.script.metadata.scenePrompts).toBeDefined();
  });

  it('should skip creative phase when disabled', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Skip creative test';
    const category: Category = 'story';
    vi.mocked(convertToStructuredFormat).mockResolvedValue(createMockStructuredSentences(topic, 8));
    vi.mocked(generateVisualPrompts).mockResolvedValue(createMockVisualOutput(8));
    vi.mocked(validateSentences).mockReturnValue([]);
    vi.mocked(validateSceneCoverage).mockReturnValue([]);

    const result = await runScriptPipeline(config, category, topic, { enableCreativePhase: false });

    expect(generateCreativeScript).not.toHaveBeenCalled();
    expect(result.script).toBeDefined();
  });

  it('should record phase metrics', async () => {
    const config = createMockChannelConfig(8);
    const topic = 'Metrics test';
    const category: Category = 'story';
    setupSuccessfulPipelineMocks(topic, 8);

    const result = await runScriptPipeline(config, category, topic);

    expect(result.phases).toBeDefined();
    expect(result.phases.creative).toBeDefined();
    expect(result.phases.structural).toBeDefined();
    expect(result.phases.visual).toBeDefined();
    expect(typeof result.phases.creative.duration).toBe('number');
    expect(typeof result.phases.creative.retries).toBe('number');
    expect(typeof result.phases.structural.duration).toBe('number');
    expect(typeof result.phases.structural.retries).toBe('number');
    expect(typeof result.phases.visual.duration).toBe('number');
    expect(typeof result.phases.visual.retries).toBe('number');
  });
});
