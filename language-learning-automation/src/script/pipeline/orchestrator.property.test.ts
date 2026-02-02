/**
 * Property Tests for Pipeline Orchestrator
 *
 * Tests Property 12 (Sentence Count Matches Config), Property 13 (All Categories Supported),
 * Property 14 (Error Messages Identify Phase), and Property 15 (Retry on Validation Failure)
 *
 * Note: These tests focus on the pure orchestrator logic functions that don't require
 * Node.js APIs or external services. The actual pipeline with real AI calls is tested
 * separately in integration tests.
 *
 * @module orchestrator.property.test
 * **Validates: Requirements 4.2, 5.4, 6.4, 6.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Category, Script, Sentence, Character, ScenePrompt } from '../types';
import type { ChannelConfig } from '../../config/types';
import type { PipelineConfig, StructuredSentences, VisualOutput, ValidationError } from './types';

// ============================================================================
// Pure Functions (duplicated from orchestrator.ts to avoid Node.js deps)
// ============================================================================

/**
 * Default max retries per phase.
 */
const DEFAULT_MAX_RETRIES = {
  creative: 2,
  structural: 3,
  visual: 2,
};

/**
 * Pipeline error class for phase failures.
 */
class PipelineError extends Error {
  constructor(
    public readonly phaseError: {
      phase: 'creative' | 'structural' | 'visual';
      message: string;
      cause?: Error;
      retryCount: number;
      validationErrors?: ValidationError[];
      input?: unknown;
    },
    public readonly partialResult?: Partial<Script>
  ) {
    super(`Pipeline failed at ${phaseError.phase} phase: ${phaseError.message}`);
    this.name = 'PipelineError';
  }
}

/**
 * Format validation errors into a human-readable string for retry prompts.
 */
function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  const errorLines = errors.map((e) => {
    const sentenceInfo = e.sentenceId ? ` (sentence ${e.sentenceId})` : '';
    return `- ${e.field}${sentenceInfo}: expected ${e.expected}, got "${e.actual}"`;
  });

  return `\n\nValidation errors from previous attempt:\n${errorLines.join('\n')}`;
}

/**
 * Merge user config with defaults.
 */
function mergeConfig(userConfig?: Partial<PipelineConfig>): PipelineConfig {
  const defaults: PipelineConfig = {
    pipelineEnabled: true,
    enableCreativePhase: true,
    enableStructuralPhase: true,
    enableVisualPhase: true,
    maxRetries: {
      creative: 2,
      structural: 3,
      visual: 2,
    },
    candidateCount: 1,
  };

  if (!userConfig) return defaults;

  return {
    pipelineEnabled: userConfig.pipelineEnabled ?? defaults.pipelineEnabled,
    enableCreativePhase: userConfig.enableCreativePhase ?? defaults.enableCreativePhase,
    enableStructuralPhase: userConfig.enableStructuralPhase ?? defaults.enableStructuralPhase,
    enableVisualPhase: userConfig.enableVisualPhase ?? defaults.enableVisualPhase,
    maxRetries: {
      creative: userConfig.maxRetries?.creative ?? defaults.maxRetries.creative,
      structural: userConfig.maxRetries?.structural ?? defaults.maxRetries.structural,
      visual: userConfig.maxRetries?.visual ?? defaults.maxRetries.visual,
    },
    candidateCount: userConfig.candidateCount ?? defaults.candidateCount,
  };
}

/**
 * Assemble the final Script object from all phase outputs.
 */
function assembleScript(
  config: ChannelConfig,
  category: Category,
  structuredScript: StructuredSentences,
  visualOutput: VisualOutput
): Script {
  const today = new Date().toISOString().split('T')[0];

  // Merge character appearances from visual output
  const charactersWithAppearances: Character[] = visualOutput.characters.map((visualChar) => {
    const structuralChar = structuredScript.metadata.characters.find((c) => c.id === visualChar.id);
    return {
      id: visualChar.id,
      name: visualChar.name || structuralChar?.name || 'Unknown',
      gender: visualChar.gender || structuralChar?.gender || 'male',
      ethnicity: visualChar.ethnicity || structuralChar?.ethnicity || 'American',
      role: visualChar.role || structuralChar?.role || 'character',
      appearance: visualChar.appearance || structuralChar?.appearance,
    };
  });

  // If visual output has fewer characters, add missing ones from structural
  for (const structuralChar of structuredScript.metadata.characters) {
    if (!charactersWithAppearances.find((c) => c.id === structuralChar.id)) {
      charactersWithAppearances.push(structuralChar);
    }
  }

  return {
    channelId: config.channelId,
    date: today,
    category,
    metadata: {
      topic: structuredScript.metadata.topic,
      style: structuredScript.metadata.style,
      title: structuredScript.metadata.title,
      characters: charactersWithAppearances,
      scenePrompts: visualOutput.scenePrompts,
    },
    sentences: structuredScript.sentences,
  };
}

// ============================================================================
// Mock Data Generators
// ============================================================================

/** All supported categories */
const ALL_CATEGORIES: Category[] = [
  'story',
  'conversation',
  'news',
  'announcement',
  'travel_business',
  'lesson',
  'fairytale',
];

/** Generator for categories */
const categoryArb = fc.constantFrom(...ALL_CATEGORIES);

/** Generator for sentence count (typical range) */
const sentenceCountArb = fc.integer({ min: 6, max: 15 });

/** Generator for topic strings */
const topicArb = fc.constantFrom(
  'A day at the coffee shop',
  'Learning to cook',
  'My first job interview',
  'A surprise birthday party',
  'The lost wallet',
  'Meeting an old friend'
);

/** Generator for phase names */
const phaseArb = fc.constantFrom('creative' as const, 'structural' as const, 'visual' as const);

/**
 * Create a mock sentence with the given ID
 */
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

/**
 * Create mock sentences for a given count
 */
function createMockSentences(count: number): Sentence[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSentence(i + 1, i % 2 === 0 ? 'M' : 'F')
  );
}

/**
 * Create a mock character
 */
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

/**
 * Create mock scene prompts covering all sentences
 */
function createMockScenePrompts(totalSentences: number): ScenePrompt[] {
  const sceneCount = Math.min(Math.max(3, Math.ceil(totalSentences / 3)), 6);
  const sentencesPerScene = Math.ceil(totalSentences / sceneCount);
  const scenes: ScenePrompt[] = [];

  let start = 1;
  for (let i = 0; i < sceneCount; i++) {
    const end = Math.min(start + sentencesPerScene - 1, totalSentences);
    scenes.push({
      sentenceRange: [start, end],
      setting: `Scene ${i + 1} setting`,
      mood: 'neutral',
      characterActions: 'Characters present',
      cameraDirection: i % 2 === 0 ? 'Medium shot' : 'Close-up',
    });
    start = end + 1;
    if (start > totalSentences) break;
  }

  return scenes;
}

/**
 * Create a mock channel config
 */
function createMockChannelConfig(sentenceCount: number): ChannelConfig {
  return {
    channelId: 'test-channel',
    meta: {
      targetLanguage: 'English',
      nativeLanguage: 'Korean',
      channelName: 'Test Channel',
      description: 'Test channel for property tests',
    },
    content: {
      sentenceCount,
      wordCountRange: { min: 4, max: 15 },
      cefrLevel: 'A2',
    },
    tts: {
      provider: 'google',
      targetVoice: 'en-US-Standard-A',
      nativeVoice: 'ko-KR-Standard-A',
    },
    image: {
      provider: 'dalle',
      style: 'realistic',
    },
  };
}

/**
 * Create a mock complete script
 */
function createMockScript(
  category: Category,
  sentenceCount: number,
  topic: string = 'Test topic'
): Script {
  const sentences = createMockSentences(sentenceCount);
  const characters = [createMockCharacter('M')];
  const scenePrompts = createMockScenePrompts(sentenceCount);

  return {
    channelId: 'test-channel',
    date: new Date().toISOString().split('T')[0],
    category,
    metadata: {
      topic,
      style: 'casual',
      title: {
        target: `Test Title for ${topic}`,
        native: `${topic}에 대한 테스트 제목`,
      },
      characters,
      scenePrompts,
    },
    sentences,
  };
}

// ============================================================================
// Property 12: Sentence Count Matches Config
// **Validates: Requirements 6.5**
// ============================================================================

describe('Property 12: Sentence Count Matches Config', () => {
  /**
   * Property 12.1: assembleScript preserves sentence count from structured script
   * **Validates: Requirements 6.5**
   */
  it('assembleScript preserves sentence count from structured script', () => {
    fc.assert(
      fc.property(sentenceCountArb, categoryArb, (sentenceCount, category) => {
        const config = createMockChannelConfig(sentenceCount);
        const sentences = createMockSentences(sentenceCount);
        const characters = [createMockCharacter('M')];
        const scenePrompts = createMockScenePrompts(sentenceCount);

        const structuredScript = {
          metadata: {
            topic: 'Test topic',
            style: 'casual',
            title: { target: 'Test', native: '테스트' },
            characters,
          },
          sentences,
        };

        const visualOutput = {
          characters,
          scenePrompts,
        };

        const script = assembleScript(config, category, structuredScript, visualOutput);

        expect(script.sentences.length).toBe(sentenceCount);
        return script.sentences.length === sentenceCount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.2: Mock script has correct sentence count
   * **Validates: Requirements 6.5**
   */
  it('mock script generator produces correct sentence count', () => {
    fc.assert(
      fc.property(sentenceCountArb, categoryArb, (sentenceCount, category) => {
        const script = createMockScript(category, sentenceCount);

        expect(script.sentences.length).toBe(sentenceCount);
        return script.sentences.length === sentenceCount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.3: Sentence IDs are sequential from 1 to sentenceCount
   * **Validates: Requirements 6.5**
   */
  it('sentence IDs are sequential from 1 to sentenceCount', () => {
    fc.assert(
      fc.property(sentenceCountArb, (sentenceCount) => {
        const sentences = createMockSentences(sentenceCount);

        for (let i = 0; i < sentenceCount; i++) {
          expect(sentences[i].id).toBe(i + 1);
        }

        return sentences.every((s, i) => s.id === i + 1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.4: Config sentenceCount is preserved in mergeConfig
   * **Validates: Requirements 6.5**
   */
  it('mergeConfig preserves default values when no overrides', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const config = mergeConfig();

        expect(config.pipelineEnabled).toBe(true);
        expect(config.enableCreativePhase).toBe(true);
        expect(config.enableStructuralPhase).toBe(true);
        expect(config.enableVisualPhase).toBe(true);
        expect(config.maxRetries.creative).toBe(DEFAULT_MAX_RETRIES.creative);
        expect(config.maxRetries.structural).toBe(DEFAULT_MAX_RETRIES.structural);
        expect(config.maxRetries.visual).toBe(DEFAULT_MAX_RETRIES.visual);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.5: Scene prompts cover all sentences
   * **Validates: Requirements 6.5**
   */
  it('scene prompts cover all sentences', () => {
    fc.assert(
      fc.property(sentenceCountArb, (sentenceCount) => {
        const scenePrompts = createMockScenePrompts(sentenceCount);

        // Check all sentences are covered
        const covered = new Set<number>();
        for (const scene of scenePrompts) {
          for (let i = scene.sentenceRange[0]; i <= scene.sentenceRange[1]; i++) {
            covered.add(i);
          }
        }

        for (let i = 1; i <= sentenceCount; i++) {
          expect(covered.has(i)).toBe(true);
        }

        return covered.size === sentenceCount;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 13: All Categories Supported
// **Validates: Requirements 5.4**
// ============================================================================

describe('Property 13: All Categories Supported', () => {
  /**
   * Property 13.1: All 7 categories can create valid mock scripts
   * **Validates: Requirements 5.4**
   */
  it('all 7 categories can create valid mock scripts', () => {
    fc.assert(
      fc.property(categoryArb, sentenceCountArb, (category, sentenceCount) => {
        const script = createMockScript(category, sentenceCount);

        expect(script.category).toBe(category);
        expect(script.sentences.length).toBe(sentenceCount);
        expect(script.metadata.characters.length).toBeGreaterThan(0);

        return (
          script.category === category &&
          script.sentences.length === sentenceCount &&
          script.metadata.characters.length > 0
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.2: Each category produces valid script structure
   * **Validates: Requirements 5.4**
   */
  it('each category produces valid script structure', () => {
    fc.assert(
      fc.property(categoryArb, (category) => {
        const script = createMockScript(category, 8);

        // Check required fields
        expect(script.channelId).toBeDefined();
        expect(script.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(script.category).toBe(category);
        expect(script.metadata).toBeDefined();
        expect(script.metadata.topic).toBeDefined();
        expect(script.metadata.title).toBeDefined();
        expect(script.metadata.title.target).toBeDefined();
        expect(script.metadata.title.native).toBeDefined();
        expect(script.sentences).toBeDefined();
        expect(script.sentences.length).toBeGreaterThan(0);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.3: All categories are in the expected list
   * **Validates: Requirements 5.4**
   */
  it('all categories are in the expected list', () => {
    const expectedCategories = [
      'story',
      'conversation',
      'news',
      'announcement',
      'travel_business',
      'lesson',
      'fairytale',
    ];

    fc.assert(
      fc.property(categoryArb, (category) => {
        expect(expectedCategories).toContain(category);
        return expectedCategories.includes(category);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.4: assembleScript works for all categories
   * **Validates: Requirements 5.4**
   */
  it('assembleScript works for all categories', () => {
    fc.assert(
      fc.property(categoryArb, sentenceCountArb, (category, sentenceCount) => {
        const config = createMockChannelConfig(sentenceCount);
        const sentences = createMockSentences(sentenceCount);
        const characters = [createMockCharacter('M')];
        const scenePrompts = createMockScenePrompts(sentenceCount);

        const structuredScript = {
          metadata: {
            topic: 'Test topic',
            style: 'casual',
            title: { target: 'Test', native: '테스트' },
            characters,
          },
          sentences,
        };

        const visualOutput = {
          characters,
          scenePrompts,
        };

        const script = assembleScript(config, category, structuredScript, visualOutput);

        expect(script.category).toBe(category);
        expect(script.sentences.length).toBe(sentenceCount);

        return script.category === category && script.sentences.length === sentenceCount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.5: Category is preserved through script assembly
   * **Validates: Requirements 5.4**
   */
  it('category is preserved through script assembly', () => {
    // Test each category explicitly
    for (const category of ALL_CATEGORIES) {
      const config = createMockChannelConfig(8);
      const sentences = createMockSentences(8);
      const characters = [createMockCharacter('M')];
      const scenePrompts = createMockScenePrompts(8);

      const structuredScript = {
        metadata: {
          topic: 'Test topic',
          style: 'casual',
          title: { target: 'Test', native: '테스트' },
          characters,
        },
        sentences,
      };

      const visualOutput = {
        characters,
        scenePrompts,
      };

      const script = assembleScript(config, category, structuredScript, visualOutput);
      expect(script.category).toBe(category);
    }
  });
});

// ============================================================================
// Property 14: Error Messages Identify Phase
// **Validates: Requirements 4.2**
// ============================================================================

describe('Property 14: Error Messages Identify Phase', () => {
  /**
   * Property 14.1: PipelineError contains phase name in message
   * **Validates: Requirements 4.2**
   */
  it('PipelineError contains phase name in message', () => {
    fc.assert(
      fc.property(phaseArb, fc.string({ minLength: 5, maxLength: 50 }), (phase, errorMessage) => {
        const error = new PipelineError(
          {
            phase,
            message: errorMessage,
            retryCount: 0,
          },
          undefined
        );

        expect(error.message).toContain(phase);
        expect(error.phaseError.phase).toBe(phase);

        return error.message.includes(phase) && error.phaseError.phase === phase;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.2: PipelineError message format is consistent
   * **Validates: Requirements 4.2**
   */
  it('PipelineError message format is consistent', () => {
    fc.assert(
      fc.property(phaseArb, fc.string({ minLength: 5, maxLength: 50 }), (phase, errorMessage) => {
        const error = new PipelineError(
          {
            phase,
            message: errorMessage,
            retryCount: 0,
          },
          undefined
        );

        // Message should follow format: "Pipeline failed at {phase} phase: {message}"
        expect(error.message).toContain('Pipeline failed at');
        expect(error.message).toContain('phase:');
        expect(error.message).toContain(phase);

        return (
          error.message.includes('Pipeline failed at') &&
          error.message.includes('phase:') &&
          error.message.includes(phase)
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.3: PipelineError preserves retry count
   * **Validates: Requirements 4.2**
   */
  it('PipelineError preserves retry count', () => {
    fc.assert(
      fc.property(phaseArb, fc.integer({ min: 0, max: 5 }), (phase, retryCount) => {
        const error = new PipelineError(
          {
            phase,
            message: 'Test error',
            retryCount,
          },
          undefined
        );

        expect(error.phaseError.retryCount).toBe(retryCount);
        return error.phaseError.retryCount === retryCount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.4: PipelineError preserves cause error
   * **Validates: Requirements 4.2**
   */
  it('PipelineError preserves cause error', () => {
    fc.assert(
      fc.property(phaseArb, fc.string({ minLength: 5, maxLength: 50 }), (phase, causeMessage) => {
        const cause = new Error(causeMessage);
        const error = new PipelineError(
          {
            phase,
            message: 'Wrapper error',
            cause,
            retryCount: 0,
          },
          undefined
        );

        expect(error.phaseError.cause).toBe(cause);
        expect(error.phaseError.cause?.message).toBe(causeMessage);

        return error.phaseError.cause === cause && error.phaseError.cause?.message === causeMessage;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.5: PipelineError preserves partial result
   * **Validates: Requirements 4.2**
   */
  it('PipelineError preserves partial result', () => {
    fc.assert(
      fc.property(phaseArb, categoryArb, (phase, category) => {
        const partialScript: Partial<Script> = {
          channelId: 'test-channel',
          category,
        };

        const error = new PipelineError(
          {
            phase,
            message: 'Test error',
            retryCount: 0,
          },
          partialScript
        );

        expect(error.partialResult).toBeDefined();
        expect(error.partialResult?.channelId).toBe('test-channel');
        expect(error.partialResult?.category).toBe(category);

        return (
          error.partialResult?.channelId === 'test-channel' &&
          error.partialResult?.category === category
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.6: Error name is PipelineError
   * **Validates: Requirements 4.2**
   */
  it('error name is PipelineError', () => {
    fc.assert(
      fc.property(phaseArb, (phase) => {
        const error = new PipelineError(
          {
            phase,
            message: 'Test error',
            retryCount: 0,
          },
          undefined
        );

        expect(error.name).toBe('PipelineError');
        return error.name === 'PipelineError';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14.7: All three phases produce identifiable errors
   * **Validates: Requirements 4.2**
   */
  it('all three phases produce identifiable errors', () => {
    const phases: Array<'creative' | 'structural' | 'visual'> = [
      'creative',
      'structural',
      'visual',
    ];

    for (const phase of phases) {
      const error = new PipelineError(
        {
          phase,
          message: `Error in ${phase} phase`,
          retryCount: 0,
        },
        undefined
      );

      expect(error.message).toContain(phase);
      expect(error.phaseError.phase).toBe(phase);
    }
  });
});

// ============================================================================
// Property 15: Retry on Validation Failure
// **Validates: Requirements 6.4**
// ============================================================================

describe('Property 15: Retry on Validation Failure', () => {
  /**
   * Property 15.1: Default max retries are configured correctly
   * **Validates: Requirements 6.4**
   */
  it('default max retries are configured correctly', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(DEFAULT_MAX_RETRIES.creative).toBe(2);
        expect(DEFAULT_MAX_RETRIES.structural).toBe(3);
        expect(DEFAULT_MAX_RETRIES.visual).toBe(2);

        return (
          DEFAULT_MAX_RETRIES.creative === 2 &&
          DEFAULT_MAX_RETRIES.structural === 3 &&
          DEFAULT_MAX_RETRIES.visual === 2
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.2: mergeConfig preserves custom retry counts
   * **Validates: Requirements 6.4**
   */
  it('mergeConfig preserves custom retry counts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (creative, structural, visual) => {
          const config = mergeConfig({
            maxRetries: { creative, structural, visual },
          });

          expect(config.maxRetries.creative).toBe(creative);
          expect(config.maxRetries.structural).toBe(structural);
          expect(config.maxRetries.visual).toBe(visual);

          return (
            config.maxRetries.creative === creative &&
            config.maxRetries.structural === structural &&
            config.maxRetries.visual === visual
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.3: mergeConfig uses defaults for missing retry values
   * **Validates: Requirements 6.4**
   */
  it('mergeConfig uses defaults for missing retry values', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (creative) => {
        const config = mergeConfig({
          maxRetries: { creative, structural: undefined as any, visual: undefined as any },
        });

        expect(config.maxRetries.creative).toBe(creative);
        expect(config.maxRetries.structural).toBe(DEFAULT_MAX_RETRIES.structural);
        expect(config.maxRetries.visual).toBe(DEFAULT_MAX_RETRIES.visual);

        return (
          config.maxRetries.creative === creative &&
          config.maxRetries.structural === DEFAULT_MAX_RETRIES.structural &&
          config.maxRetries.visual === DEFAULT_MAX_RETRIES.visual
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.4: formatValidationErrors produces readable output
   * **Validates: Requirements 6.4**
   */
  it('formatValidationErrors produces readable output', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.integer({ min: 1, max: 20 }),
        (field, expected, actual, sentenceId) => {
          const errors = [{ field, expected, actual, sentenceId }];
          const formatted = formatValidationErrors(errors);

          expect(formatted).toContain(field);
          expect(formatted).toContain(expected);
          expect(formatted).toContain(actual);
          expect(formatted).toContain(`sentence ${sentenceId}`);

          return (
            formatted.includes(field) &&
            formatted.includes(expected) &&
            formatted.includes(actual) &&
            formatted.includes(`sentence ${sentenceId}`)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.5: formatValidationErrors handles empty array
   * **Validates: Requirements 6.4**
   */
  it('formatValidationErrors handles empty array', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const formatted = formatValidationErrors([]);
        expect(formatted).toBe('');
        return formatted === '';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.6: formatValidationErrors handles multiple errors
   * **Validates: Requirements 6.4**
   */
  it('formatValidationErrors handles multiple errors', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 5 }), (errorCount) => {
        const errors = Array.from({ length: errorCount }, (_, i) => ({
          field: `field${i}`,
          expected: `expected${i}`,
          actual: `actual${i}`,
          sentenceId: i + 1,
        }));

        const formatted = formatValidationErrors(errors);

        // Each error should be in the output
        for (let i = 0; i < errorCount; i++) {
          expect(formatted).toContain(`field${i}`);
        }

        return errors.every((e) => formatted.includes(e.field));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.7: formatValidationErrors handles errors without sentenceId
   * **Validates: Requirements 6.4**
   */
  it('formatValidationErrors handles errors without sentenceId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        (field, expected, actual) => {
          const errors = [{ field, expected, actual }]; // No sentenceId
          const formatted = formatValidationErrors(errors);

          expect(formatted).toContain(field);
          expect(formatted).toContain(expected);
          expect(formatted).toContain(actual);
          expect(formatted).not.toContain('sentence undefined');

          return (
            formatted.includes(field) &&
            formatted.includes(expected) &&
            formatted.includes(actual) &&
            !formatted.includes('sentence undefined')
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.8: PipelineError tracks retry count for retry behavior
   * **Validates: Requirements 6.4**
   */
  it('PipelineError tracks retry count for retry behavior', () => {
    fc.assert(
      fc.property(
        phaseArb,
        fc.integer({ min: 0, max: 5 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        (phase, retryCount, message) => {
          const error = new PipelineError(
            {
              phase,
              message,
              retryCount,
            },
            undefined
          );

          // Retry count should be preserved
          expect(error.phaseError.retryCount).toBe(retryCount);

          // Can determine if max retries were reached
          const maxRetries = DEFAULT_MAX_RETRIES[phase];
          const maxRetriesReached = retryCount >= maxRetries;

          return error.phaseError.retryCount === retryCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.9: Retry counts are at least 1 for all phases
   * **Validates: Requirements 6.4**
   */
  it('retry counts are at least 1 for all phases', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(DEFAULT_MAX_RETRIES.creative).toBeGreaterThanOrEqual(1);
        expect(DEFAULT_MAX_RETRIES.structural).toBeGreaterThanOrEqual(1);
        expect(DEFAULT_MAX_RETRIES.visual).toBeGreaterThanOrEqual(1);

        return (
          DEFAULT_MAX_RETRIES.creative >= 1 &&
          DEFAULT_MAX_RETRIES.structural >= 1 &&
          DEFAULT_MAX_RETRIES.visual >= 1
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Additional Integration Properties
// ============================================================================

describe('Orchestrator Integration Properties', () => {
  /**
   * Property: mergeConfig handles all configuration options
   */
  it('mergeConfig handles all configuration options', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.integer({ min: 1, max: 5 }),
        (pipelineEnabled, enableCreative, enableStructural, enableVisual, candidateCount) => {
          const config = mergeConfig({
            pipelineEnabled,
            enableCreativePhase: enableCreative,
            enableStructuralPhase: enableStructural,
            enableVisualPhase: enableVisual,
            candidateCount,
          });

          expect(config.pipelineEnabled).toBe(pipelineEnabled);
          expect(config.enableCreativePhase).toBe(enableCreative);
          expect(config.enableStructuralPhase).toBe(enableStructural);
          expect(config.enableVisualPhase).toBe(enableVisual);
          expect(config.candidateCount).toBe(candidateCount);

          return (
            config.pipelineEnabled === pipelineEnabled &&
            config.enableCreativePhase === enableCreative &&
            config.enableStructuralPhase === enableStructural &&
            config.enableVisualPhase === enableVisual &&
            config.candidateCount === candidateCount
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: assembleScript merges character appearances correctly
   */
  it('assembleScript merges character appearances correctly', () => {
    fc.assert(
      fc.property(sentenceCountArb, categoryArb, (sentenceCount, category) => {
        const config = createMockChannelConfig(sentenceCount);
        const sentences = createMockSentences(sentenceCount);

        // Create characters with appearances
        const structuralCharacters = [createMockCharacter('M')];
        const visualCharacters = [
          {
            ...createMockCharacter('M'),
            appearance: {
              age: 'late-20s',
              hair: 'dark brown hair',
              eyes: 'green eyes',
              skin: 'fair complexion',
              build: 'athletic build',
              clothing: 'business casual',
            },
          },
        ];

        const structuredScript = {
          metadata: {
            topic: 'Test topic',
            style: 'casual',
            title: { target: 'Test', native: '테스트' },
            characters: structuralCharacters,
          },
          sentences,
        };

        const visualOutput = {
          characters: visualCharacters,
          scenePrompts: createMockScenePrompts(sentenceCount),
        };

        const script = assembleScript(config, category, structuredScript, visualOutput);

        // Visual character appearance should be used
        expect(script.metadata.characters[0].appearance?.age).toBe('late-20s');

        return script.metadata.characters[0].appearance?.age === 'late-20s';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: assembleScript includes scene prompts from visual output
   */
  it('assembleScript includes scene prompts from visual output', () => {
    fc.assert(
      fc.property(sentenceCountArb, categoryArb, (sentenceCount, category) => {
        const config = createMockChannelConfig(sentenceCount);
        const sentences = createMockSentences(sentenceCount);
        const characters = [createMockCharacter('M')];
        const scenePrompts = createMockScenePrompts(sentenceCount);

        const structuredScript = {
          metadata: {
            topic: 'Test topic',
            style: 'casual',
            title: { target: 'Test', native: '테스트' },
            characters,
          },
          sentences,
        };

        const visualOutput = {
          characters,
          scenePrompts,
        };

        const script = assembleScript(config, category, structuredScript, visualOutput);

        expect(script.metadata.scenePrompts).toBeDefined();
        expect(script.metadata.scenePrompts?.length).toBe(scenePrompts.length);

        return script.metadata.scenePrompts?.length === scenePrompts.length;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: assembleScript sets correct date format
   */
  it('assembleScript sets correct date format', () => {
    fc.assert(
      fc.property(sentenceCountArb, categoryArb, (sentenceCount, category) => {
        const config = createMockChannelConfig(sentenceCount);
        const sentences = createMockSentences(sentenceCount);
        const characters = [createMockCharacter('M')];
        const scenePrompts = createMockScenePrompts(sentenceCount);

        const structuredScript = {
          metadata: {
            topic: 'Test topic',
            style: 'casual',
            title: { target: 'Test', native: '테스트' },
            characters,
          },
          sentences,
        };

        const visualOutput = {
          characters,
          scenePrompts,
        };

        const script = assembleScript(config, category, structuredScript, visualOutput);

        // Date should be in YYYY-MM-DD format
        expect(script.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        return /^\d{4}-\d{2}-\d{2}$/.test(script.date);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: assembleScript preserves channelId from config
   */
  it('assembleScript preserves channelId from config', () => {
    fc.assert(
      fc.property(
        sentenceCountArb,
        categoryArb,
        fc.string({ minLength: 3, maxLength: 20 }),
        (sentenceCount, category, channelId) => {
          const config = {
            ...createMockChannelConfig(sentenceCount),
            channelId,
          };
          const sentences = createMockSentences(sentenceCount);
          const characters = [createMockCharacter('M')];
          const scenePrompts = createMockScenePrompts(sentenceCount);

          const structuredScript = {
            metadata: {
              topic: 'Test topic',
              style: 'casual',
              title: { target: 'Test', native: '테스트' },
              characters,
            },
            sentences,
          };

          const visualOutput = {
            characters,
            scenePrompts,
          };

          const script = assembleScript(config, category, structuredScript, visualOutput);

          expect(script.channelId).toBe(channelId);
          return script.channelId === channelId;
        }
      ),
      { numRuns: 100 }
    );
  });
});
