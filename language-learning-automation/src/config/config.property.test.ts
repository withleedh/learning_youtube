import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { channelConfigSchema, type ChannelConfig } from './types';

/**
 * Feature: language-learning-automation
 * Property 1: Config JSON Round-Trip Consistency
 * Validates: Requirements 1.1
 *
 * For any valid ChannelConfig object, serializing it to JSON and then
 * parsing it back should produce an equivalent object.
 */

// Arbitrary for generating valid hex colors
const hexColorArb = fc
  .tuple(fc.hexaString({ minLength: 6, maxLength: 6 }))
  .map(([hex]) => `#${hex.toUpperCase()}`);

// Arbitrary for generating valid channel IDs (lowercase with underscores)
const channelIdArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'.split('')), {
    minLength: 1,
    maxLength: 20,
  })
  .filter((s) => !s.startsWith('_') && !s.endsWith('_') && !s.includes('__'));

// Arbitrary for generating valid ChannelConfig objects
const channelConfigArb: fc.Arbitrary<ChannelConfig> = fc.record({
  channelId: channelIdArb,
  meta: fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    targetLanguage: fc.string({ minLength: 1, maxLength: 30 }),
    nativeLanguage: fc.string({ minLength: 1, maxLength: 30 }),
    youtubeChannelId: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  }),
  theme: fc.record({
    logo: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: '' }),
    introSound: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: '' }),
    introBackground: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    backgroundStyle: fc.string({ minLength: 1, maxLength: 30 }),
    primaryColor: hexColorArb,
    secondaryColor: hexColorArb,
  }),
  colors: fc.record({
    maleText: hexColorArb,
    femaleText: hexColorArb,
    nativeText: hexColorArb,
    wordMeaning: hexColorArb,
    background: hexColorArb,
  }),
  layout: fc.record({
    step3ImageRatio: fc.double({ min: 0, max: 1, noNaN: true }),
    subtitlePosition: fc.constantFrom('center', 'bottom') as fc.Arbitrary<'center' | 'bottom'>,
    speakerIndicator: fc.constantFrom('left', 'none') as fc.Arbitrary<'left' | 'none'>,
  }),
  tts: fc.record({
    provider: fc.constantFrom('openai', 'google', 'edge') as fc.Arbitrary<
      'openai' | 'google' | 'edge'
    >,
    maleVoice: fc.string({ minLength: 1, maxLength: 30 }),
    femaleVoice: fc.string({ minLength: 1, maxLength: 30 }),
    targetLanguageCode: fc.string({ minLength: 1, maxLength: 10 }),
    speed: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
  }),
  content: fc.record({
    sentenceCount: fc.integer({ min: 1, max: 20 }),
    repeatCount: fc.integer({ min: 1, max: 20 }),
    difficulty: fc.constantFrom('beginner', 'intermediate', 'advanced') as fc.Arbitrary<
      'beginner' | 'intermediate' | 'advanced'
    >,
  }),
  uiLabels: fc.record({
    introTitle: fc.string({ minLength: 1, maxLength: 50 }),
    step1: fc.string({ minLength: 1, maxLength: 30 }),
    step2: fc.string({ minLength: 1, maxLength: 30 }),
    step3: fc.string({ minLength: 1, maxLength: 30 }),
    step4: fc.string({ minLength: 1, maxLength: 30 }),
    step3Title: fc.string({ minLength: 1, maxLength: 50 }),
    phaseIntro: fc.string({ minLength: 1, maxLength: 30 }),
    phaseTraining: fc.string({ minLength: 1, maxLength: 30 }),
    phaseChallenge: fc.string({ minLength: 1, maxLength: 30 }),
    phaseReview: fc.string({ minLength: 1, maxLength: 30 }),
  }),
});

describe('Property Tests: Config JSON Round-Trip', () => {
  it('Property 1: serializing to JSON and parsing back produces equivalent object', () => {
    fc.assert(
      fc.property(channelConfigArb, (config) => {
        // Serialize to JSON
        const jsonString = JSON.stringify(config);

        // Parse back from JSON
        const parsed = JSON.parse(jsonString);

        // Validate with schema
        const result = channelConfigSchema.safeParse(parsed);

        // Should be valid
        expect(result.success).toBe(true);

        if (result.success) {
          // Core fields should match
          expect(result.data.channelId).toBe(config.channelId);
          expect(result.data.meta.name).toBe(config.meta.name);
          expect(result.data.meta.targetLanguage).toBe(config.meta.targetLanguage);
          expect(result.data.meta.nativeLanguage).toBe(config.meta.nativeLanguage);
          expect(result.data.tts.provider).toBe(config.tts.provider);
          expect(result.data.content.sentenceCount).toBe(config.content.sentenceCount);
          expect(result.data.content.repeatCount).toBe(config.content.repeatCount);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: language-learning-automation
 * Property 2: Config Validation Rejects Invalid Configs
 * Validates: Requirements 1.3, 1.4
 *
 * For any ChannelConfig JSON with one or more required fields removed,
 * the validator should return an error indicating the missing field(s).
 */

describe('Property Tests: Config Validation', () => {
  // Required top-level fields
  const requiredFields = ['channelId', 'meta', 'theme', 'colors', 'tts', 'content'] as const;

  // Required nested fields
  const requiredMetaFields = ['name', 'targetLanguage', 'nativeLanguage'] as const;
  // logo and introSound are now optional
  const requiredColorsFields = ['maleText', 'femaleText', 'nativeText'] as const;
  const requiredTtsFields = ['provider', 'maleVoice', 'femaleVoice', 'targetLanguageCode'] as const;
  const requiredContentFields = ['sentenceCount', 'repeatCount'] as const;

  // Base valid config for testing
  const baseValidConfig = {
    channelId: 'test_channel',
    meta: {
      name: 'Test Channel',
      targetLanguage: 'English',
      nativeLanguage: 'Korean',
    },
    theme: {
      // logo and introSound are optional now
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

  it('Property 2: removing any required top-level field should fail validation', () => {
    fc.assert(
      fc.property(fc.constantFrom(...requiredFields), (fieldToRemove) => {
        // Create config with one required field removed
        const invalidConfig = { ...baseValidConfig };
        delete (invalidConfig as Record<string, unknown>)[fieldToRemove];

        const result = channelConfigSchema.safeParse(invalidConfig);

        // Should fail validation
        expect(result.success).toBe(false);

        // Error should mention the missing field
        if (!result.success) {
          const errorPaths = result.error.issues.map((issue) => issue.path[0]);
          expect(errorPaths).toContain(fieldToRemove);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: removing any required meta field should fail validation', () => {
    fc.assert(
      fc.property(fc.constantFrom(...requiredMetaFields), (fieldToRemove) => {
        const invalidConfig = {
          ...baseValidConfig,
          meta: { ...baseValidConfig.meta },
        };
        delete (invalidConfig.meta as Record<string, unknown>)[fieldToRemove];

        const result = channelConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // theme fields are now all optional, so no test needed

  it('Property 2: removing any required colors field should fail validation', () => {
    fc.assert(
      fc.property(fc.constantFrom(...requiredColorsFields), (fieldToRemove) => {
        const invalidConfig = {
          ...baseValidConfig,
          colors: { ...baseValidConfig.colors },
        };
        delete (invalidConfig.colors as Record<string, unknown>)[fieldToRemove];

        const result = channelConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: removing any required tts field should fail validation', () => {
    fc.assert(
      fc.property(fc.constantFrom(...requiredTtsFields), (fieldToRemove) => {
        const invalidConfig = {
          ...baseValidConfig,
          tts: { ...baseValidConfig.tts },
        };
        delete (invalidConfig.tts as Record<string, unknown>)[fieldToRemove];

        const result = channelConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: removing any required content field should fail validation', () => {
    fc.assert(
      fc.property(fc.constantFrom(...requiredContentFields), (fieldToRemove) => {
        const invalidConfig = {
          ...baseValidConfig,
          content: { ...baseValidConfig.content },
        };
        delete (invalidConfig.content as Record<string, unknown>)[fieldToRemove];

        const result = channelConfigSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
