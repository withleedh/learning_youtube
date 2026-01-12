import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { characterPairSchema, characterDefinitionSchema, type CharacterDefinition } from './types';

/**
 * Feature: ai-character-dialogue-shorts, Property 1: Character Data Round-Trip
 * Validates: Requirements 1.1, 1.5
 *
 * For any valid CharacterDefinition, saving it to the channel configuration
 * and then loading it back SHALL produce an equivalent CharacterDefinition
 * with all fields preserved.
 */

/**
 * Feature: ai-character-dialogue-shorts, Property 2: Character Count Constraint
 * Validates: Requirements 1.3
 *
 * For any CharacterPair configuration, the system SHALL accept configurations
 * with 1-3 characters and reject configurations with 0 or more than 3 characters.
 */

// Arbitrary for generating valid character appearance
const characterAppearanceArb = fc.record({
  ethnicity: fc.string({ minLength: 1, maxLength: 30 }),
  hairColor: fc.string({ minLength: 1, maxLength: 20 }),
  hairStyle: fc.string({ minLength: 1, maxLength: 30 }),
  clothing: fc.string({ minLength: 1, maxLength: 50 }),
  distinguishingFeatures: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

// Arbitrary for generating valid character IDs
const characterIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')),
  { minLength: 1, maxLength: 20 }
);

// Arbitrary for generating valid CharacterDefinition objects
const characterDefinitionArb: fc.Arbitrary<CharacterDefinition> = fc.record({
  id: characterIdArb,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  nameKorean: fc.string({ minLength: 1, maxLength: 30 }),
  age: fc.constantFrom('child', 'teen', 'adult', 'senior') as fc.Arbitrary<
    'child' | 'teen' | 'adult' | 'senior'
  >,
  gender: fc.constantFrom('male', 'female') as fc.Arbitrary<'male' | 'female'>,
  relationship: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  appearance: characterAppearanceArb,
  personality: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  referenceImagePath: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});

// Arbitrary for generating valid channel IDs
const channelIdArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz_'.split('')), {
    minLength: 1,
    maxLength: 20,
  })
  .filter((s) => !s.startsWith('_') && !s.endsWith('_') && !s.includes('__'));

describe('Feature: ai-character-dialogue-shorts, Property 1: Character Data Round-Trip', () => {
  it('should preserve all fields when serializing to JSON and parsing back', () => {
    fc.assert(
      fc.property(characterDefinitionArb, (character) => {
        // Simulate saving to JSON (as would happen in channel config)
        const serialized = JSON.stringify(character);

        // Simulate loading from JSON
        const parsed = JSON.parse(serialized);

        // Validate against schema (as CharacterManager would do on load)
        const result = characterDefinitionSchema.safeParse(parsed);

        expect(result.success).toBe(true);
        if (result.success) {
          // All fields should be preserved exactly
          expect(result.data.id).toBe(character.id);
          expect(result.data.name).toBe(character.name);
          expect(result.data.nameKorean).toBe(character.nameKorean);
          expect(result.data.age).toBe(character.age);
          expect(result.data.gender).toBe(character.gender);
          expect(result.data.relationship).toBe(character.relationship);
          expect(result.data.personality).toBe(character.personality);
          expect(result.data.referenceImagePath).toBe(character.referenceImagePath);

          // Appearance object should be fully preserved
          expect(result.data.appearance.ethnicity).toBe(character.appearance.ethnicity);
          expect(result.data.appearance.hairColor).toBe(character.appearance.hairColor);
          expect(result.data.appearance.hairStyle).toBe(character.appearance.hairStyle);
          expect(result.data.appearance.clothing).toBe(character.appearance.clothing);
          expect(result.data.appearance.distinguishingFeatures).toBe(
            character.appearance.distinguishingFeatures
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should produce deeply equal objects after round-trip', () => {
    fc.assert(
      fc.property(characterDefinitionArb, (character) => {
        // Round-trip: serialize -> parse -> validate
        const serialized = JSON.stringify(character);
        const parsed = JSON.parse(serialized);
        const result = characterDefinitionSchema.safeParse(parsed);

        expect(result.success).toBe(true);
        if (result.success) {
          // Deep equality check
          expect(result.data).toEqual(character);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve CharacterPair with all characters after round-trip', () => {
    fc.assert(
      fc.property(
        channelIdArb,
        fc.array(characterDefinitionArb, { minLength: 1, maxLength: 3 }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        (channelId, characters, defaultSceneStyle) => {
          const pair = {
            channelId,
            characters,
            defaultSceneStyle,
          };

          // Round-trip: serialize -> parse -> validate
          const serialized = JSON.stringify(pair);
          const parsed = JSON.parse(serialized);
          const result = characterPairSchema.safeParse(parsed);

          expect(result.success).toBe(true);
          if (result.success) {
            // All fields preserved
            expect(result.data.channelId).toBe(pair.channelId);
            expect(result.data.defaultSceneStyle).toBe(pair.defaultSceneStyle);
            expect(result.data.characters.length).toBe(pair.characters.length);

            // Each character preserved
            for (let i = 0; i < pair.characters.length; i++) {
              expect(result.data.characters[i]).toEqual(pair.characters[i]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: ai-character-dialogue-shorts, Property 3: Character Loading Completeness
 * Validates: Requirements 1.4
 *
 * For any stored character with a reference image, loading that character
 * SHALL return both the complete metadata AND the reference image path.
 */

// Arbitrary for generating valid reference image paths
const referenceImagePathArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-/'.split('')), {
    minLength: 5,
    maxLength: 80,
  })
  .map((s) => `assets/${s}.png`);

// Arbitrary for generating CharacterDefinition with a reference image path (always present)
const characterWithReferenceImageArb: fc.Arbitrary<CharacterDefinition> = fc.record({
  id: characterIdArb,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  nameKorean: fc.string({ minLength: 1, maxLength: 30 }),
  age: fc.constantFrom('child', 'teen', 'adult', 'senior') as fc.Arbitrary<
    'child' | 'teen' | 'adult' | 'senior'
  >,
  gender: fc.constantFrom('male', 'female') as fc.Arbitrary<'male' | 'female'>,
  relationship: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  appearance: characterAppearanceArb,
  personality: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  referenceImagePath: referenceImagePathArb, // Always present for this test
});

describe('Feature: ai-character-dialogue-shorts, Property 3: Character Loading Completeness', () => {
  it('should return complete metadata including reference image path when loading a stored character', () => {
    fc.assert(
      fc.property(characterWithReferenceImageArb, (character) => {
        // Simulate storing character in channel config (JSON serialization)
        const stored = JSON.stringify(character);

        // Simulate loading character from channel config (JSON parsing + validation)
        const loaded = JSON.parse(stored);
        const result = characterDefinitionSchema.safeParse(loaded);

        // Loading should succeed
        expect(result.success).toBe(true);

        if (result.success) {
          // Complete metadata should be returned
          expect(result.data.id).toBe(character.id);
          expect(result.data.name).toBe(character.name);
          expect(result.data.nameKorean).toBe(character.nameKorean);
          expect(result.data.age).toBe(character.age);
          expect(result.data.gender).toBe(character.gender);
          expect(result.data.relationship).toBe(character.relationship);
          expect(result.data.personality).toBe(character.personality);

          // Appearance metadata should be complete
          expect(result.data.appearance).toBeDefined();
          expect(result.data.appearance.ethnicity).toBe(character.appearance.ethnicity);
          expect(result.data.appearance.hairColor).toBe(character.appearance.hairColor);
          expect(result.data.appearance.hairStyle).toBe(character.appearance.hairStyle);
          expect(result.data.appearance.clothing).toBe(character.appearance.clothing);

          // Reference image path MUST be returned
          expect(result.data.referenceImagePath).toBeDefined();
          expect(result.data.referenceImagePath).toBe(character.referenceImagePath);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve reference image path through CharacterPair round-trip', () => {
    fc.assert(
      fc.property(
        channelIdArb,
        fc.array(characterWithReferenceImageArb, { minLength: 1, maxLength: 3 }),
        (channelId, characters) => {
          const pair = {
            channelId,
            characters,
          };

          // Simulate storing and loading CharacterPair
          const stored = JSON.stringify(pair);
          const loaded = JSON.parse(stored);
          const result = characterPairSchema.safeParse(loaded);

          expect(result.success).toBe(true);

          if (result.success) {
            // Each character should have complete metadata and reference image path
            for (let i = 0; i < characters.length; i++) {
              const originalChar = characters[i];
              const loadedChar = result.data.characters[i];

              // Metadata completeness
              expect(loadedChar.id).toBe(originalChar.id);
              expect(loadedChar.name).toBe(originalChar.name);
              expect(loadedChar.nameKorean).toBe(originalChar.nameKorean);
              expect(loadedChar.age).toBe(originalChar.age);
              expect(loadedChar.gender).toBe(originalChar.gender);
              expect(loadedChar.appearance).toEqual(originalChar.appearance);

              // Reference image path MUST be preserved
              expect(loadedChar.referenceImagePath).toBeDefined();
              expect(loadedChar.referenceImagePath).toBe(originalChar.referenceImagePath);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all required fields for character with reference image', () => {
    fc.assert(
      fc.property(characterWithReferenceImageArb, (character) => {
        // Simulate loading from storage
        const stored = JSON.stringify(character);
        const loaded = JSON.parse(stored);
        const result = characterDefinitionSchema.safeParse(loaded);

        expect(result.success).toBe(true);

        if (result.success) {
          // Verify all required fields are present and non-empty
          expect(result.data.id.length).toBeGreaterThan(0);
          expect(result.data.name.length).toBeGreaterThan(0);
          expect(result.data.nameKorean.length).toBeGreaterThan(0);
          expect(['child', 'teen', 'adult', 'senior']).toContain(result.data.age);
          expect(['male', 'female']).toContain(result.data.gender);

          // Appearance fields should be present
          expect(result.data.appearance.ethnicity.length).toBeGreaterThan(0);
          expect(result.data.appearance.hairColor.length).toBeGreaterThan(0);
          expect(result.data.appearance.hairStyle.length).toBeGreaterThan(0);
          expect(result.data.appearance.clothing.length).toBeGreaterThan(0);

          // Reference image path should be present and valid
          expect(result.data.referenceImagePath).toBeDefined();
          expect(typeof result.data.referenceImagePath).toBe('string');
          expect(result.data.referenceImagePath!.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: ai-character-dialogue-shorts, Property 2: Character Count Constraint', () => {
  it('should accept CharacterPair with exactly 1 character', () => {
    fc.assert(
      fc.property(channelIdArb, characterDefinitionArb, (channelId, character) => {
        const pair = {
          channelId,
          characters: [character],
        };

        const result = characterPairSchema.safeParse(pair);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should accept CharacterPair with exactly 2 characters', () => {
    fc.assert(
      fc.property(
        channelIdArb,
        characterDefinitionArb,
        characterDefinitionArb,
        (channelId, char1, char2) => {
          const pair = {
            channelId,
            characters: [char1, char2],
          };

          const result = characterPairSchema.safeParse(pair);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept CharacterPair with exactly 3 characters', () => {
    fc.assert(
      fc.property(
        channelIdArb,
        characterDefinitionArb,
        characterDefinitionArb,
        characterDefinitionArb,
        (channelId, char1, char2, char3) => {
          const pair = {
            channelId,
            characters: [char1, char2, char3],
          };

          const result = characterPairSchema.safeParse(pair);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject CharacterPair with 0 characters', () => {
    fc.assert(
      fc.property(channelIdArb, (channelId) => {
        const pair = {
          channelId,
          characters: [],
        };

        const result = characterPairSchema.safeParse(pair);
        expect(result.success).toBe(false);

        if (!result.success) {
          // Error should indicate minimum character requirement
          const hasMinError = result.error.issues.some(
            (issue) =>
              issue.code === 'too_small' ||
              issue.message.toLowerCase().includes('at least') ||
              issue.message.toLowerCase().includes('minimum')
          );
          expect(hasMinError).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should reject CharacterPair with more than 3 characters', () => {
    fc.assert(
      fc.property(
        channelIdArb,
        fc.array(characterDefinitionArb, { minLength: 4, maxLength: 10 }),
        (channelId, characters) => {
          const pair = {
            channelId,
            characters,
          };

          const result = characterPairSchema.safeParse(pair);
          expect(result.success).toBe(false);

          if (!result.success) {
            // Error should indicate maximum character limit
            const hasMaxError = result.error.issues.some(
              (issue) =>
                issue.code === 'too_big' ||
                issue.message.toLowerCase().includes('maximum') ||
                issue.message.toLowerCase().includes('at most')
            );
            expect(hasMaxError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept any valid character count between 1 and 3 (inclusive)', () => {
    fc.assert(
      fc.property(
        channelIdArb,
        fc.integer({ min: 1, max: 3 }),
        fc.array(characterDefinitionArb, { minLength: 3, maxLength: 3 }),
        (channelId, count, allCharacters) => {
          const characters = allCharacters.slice(0, count);
          const pair = {
            channelId,
            characters,
          };

          const result = characterPairSchema.safeParse(pair);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any character count outside 1-3 range', () => {
    fc.assert(
      fc.property(
        channelIdArb,
        fc.oneof(fc.constant(0), fc.integer({ min: 4, max: 10 })),
        fc.array(characterDefinitionArb, { minLength: 10, maxLength: 10 }),
        (channelId, count, allCharacters) => {
          const characters = allCharacters.slice(0, count);
          const pair = {
            channelId,
            characters,
          };

          const result = characterPairSchema.safeParse(pair);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
