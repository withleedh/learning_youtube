import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  selectVoice,
  calculateExpectedAudioCount,
  speedVariants,
  type SpeedVariant,
  type TTSProvider,
} from './types';

/**
 * Feature: language-learning-automation
 * Property 4: TTS Provider Selection
 * Validates: Requirements 3.1, 3.2
 *
 * For any TTS generation request with a given ChannelConfig, the selected
 * provider should match config.tts.provider, and the voice should be
 * maleVoice when speaker is 'M' and femaleVoice when speaker is 'F'.
 */

/**
 * Feature: language-learning-automation
 * Property 5: Audio File Generation Completeness
 * Validates: Requirements 3.3, 3.5
 *
 * For any Script with N sentences, TTS generation should produce exactly
 * N × 3 audio files (one for each speed: 0.8x, 1.0x, 1.2x per sentence).
 */

// Arbitrary for generating voice names
const voiceNameArb = fc.string({ minLength: 1, maxLength: 20 });

// Arbitrary for generating speaker
const speakerArb: fc.Arbitrary<'M' | 'F'> = fc.constantFrom('M', 'F');

// Arbitrary for generating provider
const providerArb: fc.Arbitrary<TTSProvider> = fc.constantFrom('openai', 'google');

// Arbitrary for generating speed variant
const speedVariantArb: fc.Arbitrary<SpeedVariant> = fc.constantFrom(...speedVariants);

describe('Property Tests: TTS Provider Selection', () => {
  it('Property 4.1: selectVoice returns maleVoice for M speaker', () => {
    fc.assert(
      fc.property(voiceNameArb, voiceNameArb, (maleVoice, femaleVoice) => {
        const result = selectVoice('M', maleVoice, femaleVoice);
        expect(result).toBe(maleVoice);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4.2: selectVoice returns femaleVoice for F speaker', () => {
    fc.assert(
      fc.property(voiceNameArb, voiceNameArb, (maleVoice, femaleVoice) => {
        const result = selectVoice('F', maleVoice, femaleVoice);
        expect(result).toBe(femaleVoice);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4.3: voice selection is deterministic for same inputs', () => {
    fc.assert(
      fc.property(speakerArb, voiceNameArb, voiceNameArb, (speaker, maleVoice, femaleVoice) => {
        const result1 = selectVoice(speaker, maleVoice, femaleVoice);
        const result2 = selectVoice(speaker, maleVoice, femaleVoice);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property Tests: Audio File Generation Completeness', () => {
  it('Property 5.1: expected audio count equals sentenceCount × 3', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (sentenceCount) => {
        const expectedCount = calculateExpectedAudioCount(sentenceCount);
        expect(expectedCount).toBe(sentenceCount * 3);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 5.2: expected audio count is always positive for positive sentence count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (sentenceCount) => {
        const expectedCount = calculateExpectedAudioCount(sentenceCount);
        expect(expectedCount).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 5.3: expected audio count scales linearly with sentence count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (count1, count2) => {
          const expected1 = calculateExpectedAudioCount(count1);
          const expected2 = calculateExpectedAudioCount(count2);
          // Linear scaling: if count2 = 2 * count1, then expected2 = 2 * expected1
          expect(expected1 / count1).toBe(expected2 / count2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5.4: there are exactly 3 speed variants', () => {
    expect(speedVariants.length).toBe(3);
    expect(speedVariants).toContain('0.8x');
    expect(speedVariants).toContain('1.0x');
    expect(speedVariants).toContain('1.2x');
  });
});
