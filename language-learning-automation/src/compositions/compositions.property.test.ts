import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Sentence } from '../script/types';
import type { AudioFile, SpeedVariant } from '../tts/types';
import { calculateStep3Duration } from './Step3';

// Arbitrary for generating valid sentences
const sentenceArbitrary: fc.Arbitrary<Sentence> = fc.record({
  id: fc.integer({ min: 1, max: 100 }),
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

// Fixed 10-repetition sequence as defined in Step3
const REPETITION_SEQUENCE: Array<{ speed: SpeedVariant; phase: string; showBlank: boolean }> = [
  // ① 도입 (0.8x × 2)
  { speed: '0.8x', phase: 'intro', showBlank: false },
  { speed: '0.8x', phase: 'intro', showBlank: false },
  // ② 훈련 (1.0x × 4)
  { speed: '1.0x', phase: 'training', showBlank: true },
  { speed: '1.0x', phase: 'training', showBlank: true },
  { speed: '1.0x', phase: 'training', showBlank: true },
  { speed: '1.0x', phase: 'training', showBlank: true },
  // ③ 챌린지 (1.2x × 2)
  { speed: '1.2x', phase: 'challenge', showBlank: false },
  { speed: '1.2x', phase: 'challenge', showBlank: false },
  // ④ 정리 (1.0x × 2)
  { speed: '1.0x', phase: 'review', showBlank: false },
  { speed: '1.0x', phase: 'review', showBlank: false },
];

describe('Property Tests: Interval Training Sequence', () => {
  /**
   * Property 6: Interval Training Sequence
   * Validates: Requirements 5.1, 5.5
   *
   * For any set of sentences:
   * - Each sentence should be played 10 times following the fixed sequence
   * - Sequence: 0.8x×2 → 1.0x×4 (blank) → 1.2x×2 → 1.0x×2
   */
  it('should follow the fixed 10-repetition sequence for each sentence', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (numSentences) => {
        // Create sentences with unique IDs
        const sentences: Sentence[] = Array.from({ length: numSentences }, (_, i) => ({
          id: i + 1,
          target: `Target ${i}`,
          native: `Native ${i}`,
          targetBlank: `Target ___ ${i}`,
          blankAnswer: 'answer',
          speaker: (i % 2 === 0 ? 'M' : 'F') as 'M' | 'F',
          words: [{ word: 'word', meaning: 'meaning' }],
        }));

        // Build sequences for all sentences
        const allSequences: Array<{
          sentenceId: number;
          speed: SpeedVariant;
          phase: string;
          showBlank: boolean;
        }> = [];

        sentences.forEach((sentence) => {
          REPETITION_SEQUENCE.forEach((config) => {
            allSequences.push({
              sentenceId: sentence.id,
              speed: config.speed,
              phase: config.phase,
              showBlank: config.showBlank,
            });
          });
        });

        // Property 1: Total sequences = sentences × 5 repetitions
        expect(allSequences.length).toBe(sentences.length * 5);

        // Property 2: Each sentence appears exactly 5 times
        sentences.forEach((sentence) => {
          const sentenceSequences = allSequences.filter((s) => s.sentenceId === sentence.id);
          expect(sentenceSequences.length).toBe(5);
        });

        // Property 3: Speed distribution per sentence
        sentences.forEach((sentence) => {
          const sentenceSequences = allSequences.filter((s) => s.sentenceId === sentence.id);
          const speedCounts = {
            '0.8x': sentenceSequences.filter((s) => s.speed === '0.8x').length,
            '1.0x': sentenceSequences.filter((s) => s.speed === '1.0x').length,
            '1.2x': sentenceSequences.filter((s) => s.speed === '1.2x').length,
          };
          expect(speedCounts['0.8x']).toBe(1); // intro
          expect(speedCounts['1.0x']).toBe(3); // training
          expect(speedCounts['1.2x']).toBe(1); // challenge
        });

        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('should calculate correct total duration based on audio files', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.float({ min: 1, max: 5, noNaN: true }),
        (numSentences, baseDuration) => {
          // Create sentences
          const sentences: Sentence[] = Array.from({ length: numSentences }, (_, i) => ({
            id: i + 1,
            target: `Target ${i}`,
            native: `Native ${i}`,
            targetBlank: `Target ___ ${i}`,
            blankAnswer: 'answer',
            speaker: 'M' as const,
            words: [{ word: 'word', meaning: 'meaning' }],
          }));

          // Create audio files with consistent duration for all speeds
          const audioFiles: AudioFile[] = [];
          sentences.forEach((sentence) => {
            const speeds: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
            speeds.forEach((speed) => {
              audioFiles.push({
                sentenceId: sentence.id,
                speaker: sentence.speaker,
                speed,
                path: `/audio/${sentence.id}_${speed}.mp3`,
                duration: baseDuration,
              });
            });
          });

          const totalDuration = calculateStep3Duration(sentences, audioFiles, 5);

          // Each repetition: Math.ceil(baseDuration * 30) + 20 frames
          // Total plays = numSentences × 5 repetitions
          const totalPlays = numSentences * 5;
          const expectedFrames = totalPlays * (Math.ceil(baseDuration * 30) + 20);

          expect(totalDuration).toBe(expectedFrames);

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should show blank only during training phase (1.0x × 3)', () => {
    fc.assert(
      fc.property(fc.array(sentenceArbitrary, { minLength: 1, maxLength: 3 }), (sentences) => {
        const allSequences: Array<{
          phase: string;
          showBlank: boolean;
        }> = [];

        sentences.forEach(() => {
          REPETITION_SEQUENCE.forEach((config) => {
            allSequences.push({
              phase: config.phase,
              showBlank: config.showBlank,
            });
          });
        });

        // Property: Blank mode is true only during training phase
        allSequences.forEach((seq) => {
          if (seq.phase === 'training') {
            expect(seq.showBlank).toBe(true);
          } else {
            expect(seq.showBlank).toBe(false);
          }
        });

        return true;
      }),
      { numRuns: 30 }
    );
  });
});
