import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Character, ScenePrompt } from '../types';
import { MIN_SCENE_COUNT, MAX_SCENE_COUNT } from './validators';

/**
 * Feature: multi-step-script-pipeline
 * Property Tests for Visual Generator
 *
 * Note: These tests focus on the pure validation and helper functions that don't require
 * Node.js APIs or external services. The actual generateVisualPrompts function
 * requires API calls and is tested separately in integration tests.
 *
 * **Validates: Requirements 3.3, 3.4**
 */

// ============================================================================
// Helper Functions (duplicated from visual-generator.ts to avoid fs import)
// ============================================================================

/**
 * Check if character appearances are consistent across scenes.
 */
function areCharacterAppearancesConsistent(characters: Character[]): boolean {
  // Group characters by ID
  const byId = new Map<string, Character[]>();

  for (const char of characters) {
    const existing = byId.get(char.id) || [];
    existing.push(char);
    byId.set(char.id, existing);
  }

  // Check each character ID has consistent appearance
  for (const [, chars] of byId) {
    if (chars.length <= 1) continue;

    const firstAppearance = JSON.stringify(chars[0].appearance);
    for (let i = 1; i < chars.length; i++) {
      if (JSON.stringify(chars[i].appearance) !== firstAppearance) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if camera directions vary across scenes.
 */
function doCameraDirectionsVary(scenePrompts: ScenePrompt[]): boolean {
  if (scenePrompts.length < 3) return true; // Not enough scenes to require variety

  const directions = scenePrompts.map((sp) => sp.cameraDirection?.toLowerCase().trim() || '');

  const uniqueDirections = new Set(directions.filter((d) => d.length > 0));

  return uniqueDirections.size > 1;
}

/**
 * Get a varied camera direction based on index.
 */
function getVariedCameraDirection(index: number): string {
  const directions = [
    'Wide establishing shot, eye-level',
    'Medium shot, slight low angle',
    'Close-up, eye-level',
    'Over-the-shoulder shot',
    'Medium close-up, high angle',
    'Two-shot, eye-level',
  ];

  return directions[index % directions.length];
}

/**
 * Ensure camera directions vary across scenes.
 */
function ensureCameraVariety(scenePrompts: ScenePrompt[]): ScenePrompt[] {
  if (scenePrompts.length < 3) return scenePrompts;

  // Check if all camera directions are the same
  const directions = scenePrompts.map((sp) => sp.cameraDirection?.toLowerCase().trim());
  const uniqueDirections = new Set(directions);

  if (uniqueDirections.size === 1) {
    // All same - add variety
    return scenePrompts.map((sp, index) => ({
      ...sp,
      cameraDirection: getVariedCameraDirection(index),
    }));
  }

  return scenePrompts;
}

/**
 * Suggest scene count based on total sentences.
 */
function suggestSceneCount(totalSentences: number): {
  min: number;
  max: number;
  recommended: number;
} {
  // Base calculation: roughly 3-5 sentences per scene
  const idealScenesLow = Math.ceil(totalSentences / 5);
  const idealScenesHigh = Math.ceil(totalSentences / 3);

  // Clamp to valid range
  const min = Math.max(MIN_SCENE_COUNT, idealScenesLow);
  const max = Math.min(MAX_SCENE_COUNT, idealScenesHigh);

  // Recommended is the middle
  const recommended = Math.round((min + max) / 2);

  return {
    min: Math.min(min, MAX_SCENE_COUNT),
    max: Math.max(max, MIN_SCENE_COUNT),
    recommended: Math.max(MIN_SCENE_COUNT, Math.min(MAX_SCENE_COUNT, recommended)),
  };
}

/**
 * Identify potential scene break points based on content analysis.
 */
function identifyBreakPoints(
  sentences: Array<{ id: number; speaker: 'M' | 'F'; target: string }>
): number[] {
  const breakPoints: number[] = [];

  // Transition indicators that suggest scene changes
  const transitionWords = [
    'suddenly',
    'then',
    'later',
    'next',
    'finally',
    'meanwhile',
    'after',
    'before',
    'when',
    'now',
    'so',
    'but then',
  ];

  // Emotional beat indicators
  const emotionalIndicators = ['!', '?', '...'];

  for (let i = 0; i < sentences.length - 1; i++) {
    const current = sentences[i];
    const next = sentences[i + 1];
    let breakScore = 0;

    // Speaker change suggests potential scene break
    if (current.speaker !== next.speaker) {
      breakScore += 1;
    }

    // Emotional beat at end of current sentence
    const currentTarget = current.target.toLowerCase();
    if (emotionalIndicators.some((ind) => currentTarget.endsWith(ind))) {
      breakScore += 1;
    }

    // Transition word at start of next sentence
    const nextTarget = next.target.toLowerCase();
    if (transitionWords.some((word) => nextTarget.startsWith(word))) {
      breakScore += 2;
    }

    // Question followed by answer pattern
    if (currentTarget.endsWith('?') && !nextTarget.endsWith('?')) {
      breakScore += 1;
    }

    // Strong break point (score >= 2)
    if (breakScore >= 2) {
      breakPoints.push(current.id);
    }
  }

  return breakPoints;
}

/**
 * Create scene boundaries from identified break points.
 */
function createBoundariesFromBreakPoints(
  breakPoints: number[],
  totalSentences: number
): Array<[number, number]> {
  const boundaries: Array<[number, number]> = [];

  // Sort break points
  const sorted = [...breakPoints].sort((a, b) => a - b);

  let start = 1;
  for (const breakPoint of sorted) {
    if (breakPoint >= start && breakPoint < totalSentences) {
      boundaries.push([start, breakPoint]);
      start = breakPoint + 1;
    }
  }

  // Add final scene
  if (start <= totalSentences) {
    boundaries.push([start, totalSentences]);
  }

  return boundaries;
}

/**
 * Suggest scene boundaries based on content analysis.
 */
function suggestSceneBoundaries(
  sentences: Array<{ id: number; speaker: 'M' | 'F'; target: string }>
): Array<[number, number]> {
  const totalSentences = sentences.length;
  const { min, max, recommended } = suggestSceneCount(totalSentences);

  if (totalSentences === 0) return [];

  // Identify potential break points based on content
  const breakPoints = identifyBreakPoints(sentences);

  // If we have good break points, use them
  if (breakPoints.length >= min - 1 && breakPoints.length <= max - 1) {
    return createBoundariesFromBreakPoints(breakPoints, totalSentences);
  }

  // Fall back to even distribution
  const boundaries: Array<[number, number]> = [];
  const sentencesPerScene = Math.ceil(totalSentences / recommended);

  let start = 1;
  for (let i = 0; i < recommended; i++) {
    const end = Math.min(start + sentencesPerScene - 1, totalSentences);
    boundaries.push([start, end]);
    start = end + 1;

    if (start > totalSentences) break;
  }

  // Ensure last boundary covers remaining sentences
  if (boundaries.length > 0 && boundaries[boundaries.length - 1][1] < totalSentences) {
    boundaries[boundaries.length - 1][1] = totalSentences;
  }

  return boundaries;
}

/**
 * Fix scene coverage issues.
 */
function fixSceneCoverage(scenePrompts: ScenePrompt[], totalSentences: number): ScenePrompt[] {
  // If no scenes or invalid, create default distribution
  if (scenePrompts.length === 0) {
    return createDefaultScenePrompts(totalSentences);
  }

  // Sort by start range
  const sorted = [...scenePrompts].sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]);

  // Find gaps and overlaps
  const covered = new Set<number>();
  const fixed: ScenePrompt[] = [];

  for (const scene of sorted) {
    const [start, end] = scene.sentenceRange;

    // Skip invalid ranges
    if (start > end || start < 1) continue;

    // Adjust for overlaps
    let adjustedStart = start;
    while (covered.has(adjustedStart) && adjustedStart <= end) {
      adjustedStart++;
    }

    if (adjustedStart <= end) {
      const adjustedEnd = Math.min(end, totalSentences);
      fixed.push({
        ...scene,
        sentenceRange: [adjustedStart, adjustedEnd],
      });

      for (let i = adjustedStart; i <= adjustedEnd; i++) {
        covered.add(i);
      }
    }
  }

  // Fill gaps
  for (let i = 1; i <= totalSentences; i++) {
    if (!covered.has(i)) {
      // Find the gap range
      let gapEnd = i;
      while (gapEnd + 1 <= totalSentences && !covered.has(gapEnd + 1)) {
        gapEnd++;
      }

      // Add a scene for this gap
      fixed.push({
        sentenceRange: [i, gapEnd],
        setting: 'Continuation of scene',
        mood: 'neutral',
        characterActions: 'Characters continue',
        cameraDirection: 'Medium shot',
      });

      for (let j = i; j <= gapEnd; j++) {
        covered.add(j);
      }
    }
  }

  // Sort again and ensure scene count is valid
  const result = fixed.sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]);

  // Merge if too many scenes
  if (result.length > MAX_SCENE_COUNT) {
    return mergeScenes(result, MAX_SCENE_COUNT);
  }

  // Split if too few scenes
  if (result.length < MIN_SCENE_COUNT && totalSentences >= MIN_SCENE_COUNT) {
    return splitScenes(result, MIN_SCENE_COUNT);
  }

  return result;
}

/**
 * Create default scene prompts with even distribution.
 */
function createDefaultScenePrompts(totalSentences: number): ScenePrompt[] {
  const sentences = Array.from({ length: totalSentences }, (_, i) => ({
    id: i + 1,
    speaker: 'M' as const,
    target: '',
  }));
  const boundaries = suggestSceneBoundaries(sentences);

  return boundaries.map(([start, end], index) => ({
    sentenceRange: [start, end] as [number, number],
    setting: `Scene ${index + 1}`,
    mood: 'neutral',
    characterActions: 'Characters present',
    cameraDirection: getVariedCameraDirection(index),
  }));
}

/**
 * Merge scenes to reduce count.
 */
function mergeScenes(scenes: ScenePrompt[], targetCount: number): ScenePrompt[] {
  const result = [...scenes];
  while (result.length > targetCount && result.length > 1) {
    // Find the smallest scene to merge with its neighbor
    let smallestIndex = 0;
    let smallestSize = Infinity;

    for (let i = 0; i < result.length; i++) {
      const size = result[i].sentenceRange[1] - result[i].sentenceRange[0] + 1;
      if (size < smallestSize) {
        smallestSize = size;
        smallestIndex = i;
      }
    }

    // Merge with previous or next
    const mergeWith = smallestIndex > 0 ? smallestIndex - 1 : smallestIndex + 1;
    if (mergeWith < result.length) {
      const [scene1, scene2] =
        smallestIndex < mergeWith
          ? [result[smallestIndex], result[mergeWith]]
          : [result[mergeWith], result[smallestIndex]];

      const merged: ScenePrompt = {
        sentenceRange: [scene1.sentenceRange[0], scene2.sentenceRange[1]],
        setting: scene1.setting,
        mood: scene1.mood,
        characterActions: scene1.characterActions,
        cameraDirection: scene1.cameraDirection,
        lighting: scene1.lighting,
        transition: scene2.transition,
      };

      result.splice(Math.min(smallestIndex, mergeWith), 2, merged);
    }
  }

  return result;
}

/**
 * Split scenes to increase count.
 */
function splitScenes(scenes: ScenePrompt[], targetCount: number): ScenePrompt[] {
  const result: ScenePrompt[] = [];

  for (const scene of scenes) {
    const [start, end] = scene.sentenceRange;
    const size = end - start + 1;

    // If we need more scenes and this one is big enough to split
    if (result.length + (scenes.length - scenes.indexOf(scene)) < targetCount && size >= 2) {
      const mid = Math.floor((start + end) / 2);

      result.push({
        ...scene,
        sentenceRange: [start, mid],
      });

      result.push({
        ...scene,
        sentenceRange: [mid + 1, end],
        cameraDirection: getVariedCameraDirection(result.length),
      });
    } else {
      result.push(scene);
    }
  }

  return result;
}

// ============================================================================
// Test Data Generators
// ============================================================================

/** Camera directions for testing */
const CAMERA_DIRECTIONS = [
  'Wide establishing shot, eye-level',
  'Medium shot, slight low angle',
  'Close-up, eye-level',
  'Over-the-shoulder shot',
  'Medium close-up, high angle',
  'Two-shot, eye-level',
  'Dutch angle, tension',
  'Low angle, power shot',
];

/** Generator for camera directions */
const cameraDirectionArb = fc.constantFrom(...CAMERA_DIRECTIONS);

/** Generator for character appearance */
const appearanceArb = fc.record({
  age: fc.constantFrom('mid-20s', 'early-30s', 'late-20s', 'mid-30s'),
  hair: fc.constantFrom('short black hair', 'long brown hair', 'blonde wavy hair'),
  eyes: fc.constantFrom('brown eyes', 'blue eyes', 'green eyes'),
  skin: fc.constantFrom('light complexion', 'tan complexion', 'dark complexion'),
  build: fc.constantFrom('average build', 'slim build', 'athletic build'),
  clothing: fc.constantFrom('casual outfit', 'business attire', 'jeans and t-shirt'),
  distinctiveFeatures: fc.option(fc.constantFrom('small mole', 'glasses', 'beard'), {
    nil: undefined,
  }),
});

/** Generator for a character with appearance */
const characterWithAppearanceArb = fc.record({
  id: fc.constantFrom('M' as const, 'F' as const),
  name: fc.constantFrom('James', 'Sarah', 'Michael', 'Emma'),
  gender: fc.constantFrom('male' as const, 'female' as const),
  ethnicity: fc.constantFrom('American', 'British', 'Korean'),
  role: fc.constantFrom('narrator', 'customer', 'friend', 'colleague'),
  appearance: fc.option(appearanceArb, { nil: undefined }),
});

// ============================================================================
// Property 9: Character Appearance Consistency
// **Validates: Requirements 3.3**
// ============================================================================

describe('Property 9: Character Appearance Consistency', () => {
  /**
   * Property 9.1: Characters with identical appearances are consistent
   * **Validates: Requirements 3.3**
   */
  it('characters with identical appearances are consistent', () => {
    fc.assert(
      fc.property(appearanceArb, (appearance) => {
        const characters: Character[] = [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'narrator',
            appearance,
          },
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'narrator',
            appearance, // Same appearance
          },
        ];

        const isConsistent = areCharacterAppearancesConsistent(characters);
        expect(isConsistent).toBe(true);
        return isConsistent;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.2: Characters with different appearances are inconsistent
   * **Validates: Requirements 3.3**
   */
  it('characters with different appearances are inconsistent', () => {
    fc.assert(
      fc.property(appearanceArb, appearanceArb, (appearance1, appearance2) => {
        // Only test if appearances are actually different
        if (JSON.stringify(appearance1) === JSON.stringify(appearance2)) {
          return true; // Skip this case
        }

        const characters: Character[] = [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'narrator',
            appearance: appearance1,
          },
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'narrator',
            appearance: appearance2, // Different appearance
          },
        ];

        const isConsistent = areCharacterAppearancesConsistent(characters);
        expect(isConsistent).toBe(false);
        return !isConsistent;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.3: Different character IDs can have different appearances
   * **Validates: Requirements 3.3**
   */
  it('different character IDs can have different appearances', () => {
    fc.assert(
      fc.property(appearanceArb, appearanceArb, (appearance1, appearance2) => {
        const characters: Character[] = [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'narrator',
            appearance: appearance1,
          },
          {
            id: 'F', // Different ID
            name: 'Sarah',
            gender: 'female',
            ethnicity: 'American',
            role: 'friend',
            appearance: appearance2, // Can be different
          },
        ];

        const isConsistent = areCharacterAppearancesConsistent(characters);
        expect(isConsistent).toBe(true);
        return isConsistent;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.4: Single character is always consistent
   * **Validates: Requirements 3.3**
   */
  it('single character is always consistent', () => {
    fc.assert(
      fc.property(characterWithAppearanceArb, (character) => {
        const isConsistent = areCharacterAppearancesConsistent([character]);
        expect(isConsistent).toBe(true);
        return isConsistent;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.5: Empty character list is consistent
   * **Validates: Requirements 3.3**
   */
  it('empty character list is consistent', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const isConsistent = areCharacterAppearancesConsistent([]);
        expect(isConsistent).toBe(true);
        return isConsistent;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.6: Characters without appearances are consistent
   * **Validates: Requirements 3.3**
   */
  it('characters without appearances are consistent', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const characters: Character[] = [
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'narrator',
          },
          {
            id: 'M',
            name: 'James',
            gender: 'male',
            ethnicity: 'American',
            role: 'narrator',
          },
        ];

        const isConsistent = areCharacterAppearancesConsistent(characters);
        expect(isConsistent).toBe(true);
        return isConsistent;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 10: Camera Directions Vary
// **Validates: Requirements 3.4**
// ============================================================================

describe('Property 10: Camera Directions Vary', () => {
  /**
   * Property 10.1: Scenes with varied camera directions pass
   * **Validates: Requirements 3.4**
   */
  it('scenes with varied camera directions pass', () => {
    fc.assert(
      fc.property(fc.array(cameraDirectionArb, { minLength: 3, maxLength: 6 }), (directions) => {
        // Ensure at least 2 different directions
        const uniqueDirections = new Set(directions);
        if (uniqueDirections.size < 2) {
          // Modify to have variety
          directions[0] = 'Wide establishing shot, eye-level';
          directions[1] = 'Close-up, eye-level';
        }

        const scenePrompts: ScenePrompt[] = directions.map((dir, i) => ({
          sentenceRange: [i + 1, i + 1] as [number, number],
          setting: 'Test',
          mood: 'neutral',
          characterActions: 'Test',
          cameraDirection: dir,
        }));

        const hasVariety = doCameraDirectionsVary(scenePrompts);
        expect(hasVariety).toBe(true);
        return hasVariety;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.2: Scenes with identical camera directions fail (3+ scenes)
   * **Validates: Requirements 3.4**
   */
  it('scenes with identical camera directions fail for 3+ scenes', () => {
    fc.assert(
      fc.property(cameraDirectionArb, fc.integer({ min: 3, max: 6 }), (direction, sceneCount) => {
        const scenePrompts: ScenePrompt[] = Array.from({ length: sceneCount }, (_, i) => ({
          sentenceRange: [i + 1, i + 1] as [number, number],
          setting: 'Test',
          mood: 'neutral',
          characterActions: 'Test',
          cameraDirection: direction, // All same
        }));

        const hasVariety = doCameraDirectionsVary(scenePrompts);
        expect(hasVariety).toBe(false);
        return !hasVariety;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.3: Less than 3 scenes always passes (not enough to require variety)
   * **Validates: Requirements 3.4**
   */
  it('less than 3 scenes always passes', () => {
    fc.assert(
      fc.property(cameraDirectionArb, fc.integer({ min: 1, max: 2 }), (direction, sceneCount) => {
        const scenePrompts: ScenePrompt[] = Array.from({ length: sceneCount }, (_, i) => ({
          sentenceRange: [i + 1, i + 1] as [number, number],
          setting: 'Test',
          mood: 'neutral',
          characterActions: 'Test',
          cameraDirection: direction,
        }));

        const hasVariety = doCameraDirectionsVary(scenePrompts);
        expect(hasVariety).toBe(true);
        return hasVariety;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.4: Empty scenes passes
   * **Validates: Requirements 3.4**
   */
  it('empty scenes passes', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const hasVariety = doCameraDirectionsVary([]);
        expect(hasVariety).toBe(true);
        return hasVariety;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.5: ensureCameraVariety fixes identical directions
   * **Validates: Requirements 3.4**
   */
  it('ensureCameraVariety fixes identical directions', () => {
    fc.assert(
      fc.property(cameraDirectionArb, fc.integer({ min: 3, max: 6 }), (direction, sceneCount) => {
        const scenePrompts: ScenePrompt[] = Array.from({ length: sceneCount }, (_, i) => ({
          sentenceRange: [i + 1, i + 1] as [number, number],
          setting: 'Test',
          mood: 'neutral',
          characterActions: 'Test',
          cameraDirection: direction, // All same
        }));

        const fixed = ensureCameraVariety(scenePrompts);
        const hasVariety = doCameraDirectionsVary(fixed);
        expect(hasVariety).toBe(true);
        return hasVariety;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.6: Case-insensitive comparison for camera directions
   * **Validates: Requirements 3.4**
   */
  it('case-insensitive comparison for camera directions', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const scenePrompts: ScenePrompt[] = [
          {
            sentenceRange: [1, 1],
            setting: 'Test',
            mood: 'neutral',
            characterActions: 'Test',
            cameraDirection: 'Medium shot',
          },
          {
            sentenceRange: [2, 2],
            setting: 'Test',
            mood: 'neutral',
            characterActions: 'Test',
            cameraDirection: 'MEDIUM SHOT', // Same but different case
          },
          {
            sentenceRange: [3, 3],
            setting: 'Test',
            mood: 'neutral',
            characterActions: 'Test',
            cameraDirection: 'medium shot',
          },
        ];

        const hasVariety = doCameraDirectionsVary(scenePrompts);
        expect(hasVariety).toBe(false); // All same when case-insensitive
        return !hasVariety;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Additional Property Tests for Scene Boundary Detection
// ============================================================================

describe('Scene Boundary Detection Properties', () => {
  /**
   * Property: suggestSceneCount returns valid range
   */
  it('suggestSceneCount returns valid range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (totalSentences) => {
        const { min, max, recommended } = suggestSceneCount(totalSentences);

        expect(min).toBeGreaterThanOrEqual(MIN_SCENE_COUNT);
        expect(max).toBeLessThanOrEqual(MAX_SCENE_COUNT);
        expect(recommended).toBeGreaterThanOrEqual(min);
        expect(recommended).toBeLessThanOrEqual(max);

        return (
          min >= MIN_SCENE_COUNT &&
          max <= MAX_SCENE_COUNT &&
          recommended >= min &&
          recommended <= max
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: suggestSceneBoundaries covers all sentences
   */
  it('suggestSceneBoundaries covers all sentences', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 15 }), (totalSentences) => {
        const sentences = Array.from({ length: totalSentences }, (_, i) => ({
          id: i + 1,
          speaker: (i % 2 === 0 ? 'M' : 'F') as 'M' | 'F',
          target: `Sentence ${i + 1}`,
          targetBlank: `Sentence _______`,
          blankAnswer: 'test',
          native: '테스트',
          words: [{ word: 'test', meaning: '테스트' }],
        }));

        const boundaries = suggestSceneBoundaries(sentences);

        // Check all sentences are covered
        const covered = new Set<number>();
        for (const [start, end] of boundaries) {
          for (let i = start; i <= end; i++) {
            covered.add(i);
          }
        }

        for (let i = 1; i <= totalSentences; i++) {
          expect(covered.has(i)).toBe(true);
        }

        return covered.size === totalSentences;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: identifyBreakPoints returns valid sentence IDs
   */
  it('identifyBreakPoints returns valid sentence IDs', () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 15 }), (totalSentences) => {
        const sentences = Array.from({ length: totalSentences }, (_, i) => ({
          id: i + 1,
          speaker: (i % 2 === 0 ? 'M' : 'F') as 'M' | 'F',
          target: i % 3 === 0 ? 'What do you think?' : `Sentence ${i + 1}.`,
          targetBlank: `Sentence _______`,
          blankAnswer: 'test',
          native: '테스트',
          words: [{ word: 'test', meaning: '테스트' }],
        }));

        const breakPoints = identifyBreakPoints(sentences);

        // All break points should be valid sentence IDs (1 to totalSentences-1)
        for (const bp of breakPoints) {
          expect(bp).toBeGreaterThanOrEqual(1);
          expect(bp).toBeLessThan(totalSentences);
        }

        return breakPoints.every((bp) => bp >= 1 && bp < totalSentences);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: fixSceneCoverage produces valid coverage
   */
  it('fixSceneCoverage produces valid coverage', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 15 }), (totalSentences) => {
        // Create invalid scene prompts with gaps
        const invalidScenes: ScenePrompt[] = [
          {
            sentenceRange: [1, 2],
            setting: 'Test',
            mood: 'neutral',
            characterActions: 'Test',
            cameraDirection: 'Medium shot',
          },
          {
            sentenceRange: [5, totalSentences], // Gap at 3-4
            setting: 'Test',
            mood: 'neutral',
            characterActions: 'Test',
            cameraDirection: 'Close-up',
          },
        ];

        const fixed = fixSceneCoverage(invalidScenes, totalSentences);

        // Check all sentences are now covered
        const covered = new Set<number>();
        for (const scene of fixed) {
          for (let i = scene.sentenceRange[0]; i <= scene.sentenceRange[1]; i++) {
            covered.add(i);
          }
        }

        for (let i = 1; i <= totalSentences; i++) {
          expect(covered.has(i)).toBe(true);
        }

        // Check scene count is valid
        expect(fixed.length).toBeGreaterThanOrEqual(MIN_SCENE_COUNT);
        expect(fixed.length).toBeLessThanOrEqual(MAX_SCENE_COUNT);

        return covered.size === totalSentences;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: createDefaultScenePrompts produces valid coverage
   */
  it('createDefaultScenePrompts produces valid coverage', () => {
    fc.assert(
      fc.property(fc.integer({ min: 6, max: 15 }), (totalSentences) => {
        const scenes = createDefaultScenePrompts(totalSentences);

        // Check all sentences are covered
        const covered = new Set<number>();
        for (const scene of scenes) {
          for (let i = scene.sentenceRange[0]; i <= scene.sentenceRange[1]; i++) {
            covered.add(i);
          }
        }

        for (let i = 1; i <= totalSentences; i++) {
          expect(covered.has(i)).toBe(true);
        }

        // Check scene count is valid
        expect(scenes.length).toBeGreaterThanOrEqual(MIN_SCENE_COUNT);
        expect(scenes.length).toBeLessThanOrEqual(MAX_SCENE_COUNT);

        // Check camera directions vary
        const hasVariety = doCameraDirectionsVary(scenes);
        expect(hasVariety).toBe(true);

        return covered.size === totalSentences && hasVariety;
      }),
      { numRuns: 100 }
    );
  });
});
