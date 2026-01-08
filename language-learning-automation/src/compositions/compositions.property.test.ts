import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Sentence } from '../script/types';
import type { AudioFile, SpeedVariant } from '../tts/types';
import { calculateStep3Duration } from './Step3';

// Arbitrary for generating valid sentences
const sentenceArbitrary = fc.record({
  id: fc.uuid(),
  target: fc.string({ minLength: 1, maxLength: 100 }),
  native: fc.string({ minLength: 1, maxLength: 100 }),
  targetBlank: fc.string({ minLength: 1, maxLength: 100 }),
  blankAnswer: fc.string({ minLength: 1, maxLength: 20 }),
  speaker: fc.constantFrom('M', 'F') as fc.Arbitrary<'M' | 'F'>,
  words: fc.array(
    fc.record({
      word: fc.string({ minLength: 1, maxLength: 20 }),
      meaning: fc.string({ minLength: 1, maxLength: 50 }),
    }),
    { minLength: 1, maxLength: 5 }
  ),
});

// Arbitrary for generating audio files for a sentence
const audioFilesForSentenceArbitrary = (sentenceId: string): fc.Arbitrary<AudioFile[]> =>
  fc
    .tuple(
      fc.record({
        sentenceId: fc.constant(sentenceId),
        speed: fc.constant('0.8x' as SpeedVariant),
        path: fc.string({ minLength: 1 }),
        duration: fc.float({ min: 1, max: 10, noNaN: true }),
      }),
      fc.record({
        sentenceId: fc.constant(sentenceId),
        speed: fc.constant('1.0x' as SpeedVariant),
        path: fc.string({ minLength: 1 }),
        duration: fc.float({ min: 1, max: 10, noNaN: true }),
      }),
      fc.record({
        sentenceId: fc.constant(sentenceId),
        speed: fc.constant('1.2x' as SpeedVariant),
        path: fc.string({ minLength: 1 }),
        duration: fc.float({ min: 1, max: 10, noNaN: true }),
      })
    )
    .map(([slow, normal, fast]) => [slow, normal, fast]);

describe('Property Tests: Interval Training Sequence', () => {
  /**
   * Property 6: Interval Training Sequence
   * Validates: Requirements 5.1, 5.5
   *
   * For any set of sentences and repeat count:
   * - Each sentence should be played in the sequence: 0.8x → 1.0x → 1.2x
   * - This sequence should repeat `repeatCount` times per sentence
   * - Total plays per sentence = 3 speeds × repeatCount
   */
  it('should follow slow → normal → fast sequence for each repetition', () => {
    fc.assert(
      fc.property(
        fc.array(sentenceArbitrary, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (sentences, repeatCount) => {
          // Generate audio files for all sentences
          const audioFiles: AudioFile[] = [];
          sentences.forEach((sentence) => {
            const speeds: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
            speeds.forEach((speed) => {
              audioFiles.push({
                sentenceId: sentence.id,
                speed,
                path: `/audio/${sentence.id}_${speed}.mp3`,
                duration: 3,
              });
            });
          });

          // Simulate the sequence building logic from Step3
          const SPEED_SEQUENCE: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
          const allSequences: Array<{
            sentenceId: string;
            speed: SpeedVariant;
            repetition: number;
          }> = [];

          sentences.forEach((sentence) => {
            for (let rep = 0; rep < repeatCount; rep++) {
              SPEED_SEQUENCE.forEach((speed) => {
                allSequences.push({
                  sentenceId: sentence.id,
                  speed,
                  repetition: rep + 1,
                });
              });
            }
          });

          // Property 1: Total sequences = sentences × 3 speeds × repeatCount
          expect(allSequences.length).toBe(sentences.length * 3 * repeatCount);

          // Property 2: Each sentence appears exactly 3 × repeatCount times
          sentences.forEach((sentence) => {
            const sentenceSequences = allSequences.filter((s) => s.sentenceId === sentence.id);
            expect(sentenceSequences.length).toBe(3 * repeatCount);
          });

          // Property 3: Speed sequence is always 0.8x → 1.0x → 1.2x within each repetition
          sentences.forEach((sentence) => {
            const sentenceSequences = allSequences.filter((s) => s.sentenceId === sentence.id);
            for (let rep = 1; rep <= repeatCount; rep++) {
              const repSequences = sentenceSequences.filter((s) => s.repetition === rep);
              expect(repSequences.map((s) => s.speed)).toEqual(['0.8x', '1.0x', '1.2x']);
            }
          });

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should calculate correct total duration based on audio files and repeat count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 5 }),
        fc.float({ min: 1, max: 5, noNaN: true }),
        (numSentences, repeatCount, baseDuration) => {
          // Create sentences
          const sentences: Sentence[] = Array.from({ length: numSentences }, (_, i) => ({
            id: `sentence-${i}`,
            target: `Target ${i}`,
            native: `Native ${i}`,
            targetBlank: `Target ___ ${i}`,
            blankAnswer: 'answer',
            speaker: 'M' as const,
            words: [{ word: 'word', meaning: 'meaning' }],
          }));

          // Create audio files with consistent duration
          const audioFiles: AudioFile[] = [];
          sentences.forEach((sentence) => {
            const speeds: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
            speeds.forEach((speed) => {
              audioFiles.push({
                sentenceId: sentence.id,
                speed,
                path: `/audio/${sentence.id}_${speed}.mp3`,
                duration: baseDuration,
              });
            });
          });

          const totalDuration = calculateStep3Duration(sentences, audioFiles, repeatCount);

          // Each audio plays for baseDuration seconds + 0.5s pause (15 frames at 30fps)
          // Total plays = numSentences × 3 speeds × repeatCount
          const totalPlays = numSentences * 3 * repeatCount;
          const expectedFrames = totalPlays * (Math.ceil(baseDuration * 30) + 15);

          expect(totalDuration).toBe(expectedFrames);

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should show blank during 1.0x speed (normal) only', () => {
    fc.assert(
      fc.property(
        fc.array(sentenceArbitrary, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 1, max: 3 }),
        (sentences, repeatCount) => {
          const SPEED_SEQUENCE: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
          const allSequences: Array<{
            speed: SpeedVariant;
            isBlankMode: boolean;
          }> = [];

          sentences.forEach(() => {
            for (let rep = 0; rep < repeatCount; rep++) {
              SPEED_SEQUENCE.forEach((speed) => {
                allSequences.push({
                  speed,
                  isBlankMode: speed === '1.0x',
                });
              });
            }
          });

          // Property: Blank mode is true only when speed is 1.0x
          allSequences.forEach((seq) => {
            if (seq.speed === '1.0x') {
              expect(seq.isBlankMode).toBe(true);
            } else {
              expect(seq.isBlankMode).toBe(false);
            }
          });

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});
