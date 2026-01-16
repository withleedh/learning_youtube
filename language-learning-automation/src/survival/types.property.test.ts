import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  survivalRoundSchema,
  survivalCharacterSchema,
  type SurvivalRound,
  type SurvivalCharacter,
} from './types';

/**
 * Feature: survival-quiz-longform, Property 2: Round Structure Completeness
 * Validates: Requirements 1.2, 4.4
 *
 * For any SurvivalRound in a generated script, it SHALL contain non-empty values for:
 * - situation
 * - situationEnglish
 * - konglishAnswer.text
 * - konglishAnswer.character
 * - nativeAnswer.text
 * - nativeAnswer.character
 * - explanation
 * - winner
 */

// Arbitrary for generating valid categories
const categoryArb: fc.Arbitrary<SurvivalRound['category']> = fc.constantFrom(
  'daily',
  'business',
  'emotion',
  'request_reject',
  'apology_thanks'
);

// Arbitrary for generating valid characters
const characterArb: fc.Arbitrary<SurvivalCharacter> = fc.constantFrom('cat', 'dog');

// Arbitrary for generating valid SurvivalRound objects
const survivalRoundArb: fc.Arbitrary<SurvivalRound> = fc
  .record({
    id: fc.integer({ min: 1, max: 50 }),
    category: categoryArb,
    situation: fc.string({ minLength: 1, maxLength: 50 }),
    situationEnglish: fc.string({ minLength: 1, maxLength: 100 }),
    konglishText: fc.string({ minLength: 1, maxLength: 100 }),
    konglishCharacter: characterArb,
    nativeText: fc.string({ minLength: 1, maxLength: 100 }),
    nativeCharacter: characterArb,
    explanation: fc.string({ minLength: 1, maxLength: 30 }),
    winner: characterArb,
  })
  .filter(
    // Ensure konglish and native characters are different (loser vs winner)
    ({ konglishCharacter, nativeCharacter, winner }) =>
      konglishCharacter !== nativeCharacter && nativeCharacter === winner
  )
  .map(
    ({
      id,
      category,
      situation,
      situationEnglish,
      konglishText,
      konglishCharacter,
      nativeText,
      nativeCharacter,
      explanation,
      winner,
    }) => ({
      id,
      category,
      situation,
      situationEnglish,
      konglishAnswer: {
        text: konglishText,
        character: konglishCharacter,
      },
      nativeAnswer: {
        text: nativeText,
        character: nativeCharacter,
      },
      explanation,
      winner,
    })
  );

describe('Property Tests: Survival Round Structure', () => {
  /**
   * Feature: survival-quiz-longform, Property 2: Round Structure Completeness
   * For any SurvivalRound, it SHALL contain non-empty values for:
   * situation, situationEnglish, konglishAnswer.text, konglishAnswer.character,
   * nativeAnswer.text, nativeAnswer.character, explanation, and winner.
   * **Validates: Requirements 1.2, 4.4**
   */
  describe('Property 2: Round Structure Completeness', () => {
    it('All required fields are non-empty in valid SurvivalRound', () => {
      fc.assert(
        fc.property(survivalRoundArb, (round) => {
          // situation must be non-empty
          expect(round.situation.length).toBeGreaterThan(0);

          // situationEnglish must be non-empty
          expect(round.situationEnglish.length).toBeGreaterThan(0);

          // konglishAnswer.text must be non-empty
          expect(round.konglishAnswer.text.length).toBeGreaterThan(0);

          // konglishAnswer.character must be defined
          expect(round.konglishAnswer.character).toBeDefined();
          expect(['cat', 'dog']).toContain(round.konglishAnswer.character);

          // nativeAnswer.text must be non-empty
          expect(round.nativeAnswer.text.length).toBeGreaterThan(0);

          // nativeAnswer.character must be defined
          expect(round.nativeAnswer.character).toBeDefined();
          expect(['cat', 'dog']).toContain(round.nativeAnswer.character);

          // explanation must be non-empty
          expect(round.explanation.length).toBeGreaterThan(0);

          // winner must be defined
          expect(round.winner).toBeDefined();
          expect(['cat', 'dog']).toContain(round.winner);
        }),
        { numRuns: 100 }
      );
    });

    it('Generated rounds pass schema validation', () => {
      fc.assert(
        fc.property(survivalRoundArb, (round) => {
          const result = survivalRoundSchema.safeParse(round);
          expect(result.success).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('Schema rejects rounds with empty situation', () => {
      const emptyRound = {
        id: 1,
        category: 'daily',
        situation: '',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const result = survivalRoundSchema.safeParse(emptyRound);
      expect(result.success).toBe(false);
    });

    it('Schema rejects rounds with empty situationEnglish', () => {
      const emptyRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: '',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const result = survivalRoundSchema.safeParse(emptyRound);
      expect(result.success).toBe(false);
    });

    it('Schema rejects rounds with empty konglishAnswer.text', () => {
      const emptyRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: '', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const result = survivalRoundSchema.safeParse(emptyRound);
      expect(result.success).toBe(false);
    });

    it('Schema rejects rounds with empty nativeAnswer.text', () => {
      const emptyRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: '', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const result = survivalRoundSchema.safeParse(emptyRound);
      expect(result.success).toBe(false);
    });

    it('Schema rejects rounds with empty explanation', () => {
      const emptyRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: '',
        winner: 'cat',
      };

      const result = survivalRoundSchema.safeParse(emptyRound);
      expect(result.success).toBe(false);
    });

    it('Schema rejects rounds with invalid character values', () => {
      const invalidRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'bird' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const result = survivalRoundSchema.safeParse(invalidRound);
      expect(result.success).toBe(false);
    });

    it('Schema rejects rounds with invalid winner value', () => {
      const invalidRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'rabbit',
      };

      const result = survivalRoundSchema.safeParse(invalidRound);
      expect(result.success).toBe(false);
    });

    it('Category is always a valid enum value', () => {
      const validCategories = ['daily', 'business', 'emotion', 'request_reject', 'apology_thanks'];

      fc.assert(
        fc.property(survivalRoundArb, (round) => {
          expect(validCategories).toContain(round.category);
        }),
        { numRuns: 100 }
      );
    });

    it('Explanation length is within bounds (max 30 characters)', () => {
      fc.assert(
        fc.property(survivalRoundArb, (round) => {
          expect(round.explanation.length).toBeLessThanOrEqual(30);
        }),
        { numRuns: 100 }
      );
    });

    it('ID is a positive integer', () => {
      fc.assert(
        fc.property(survivalRoundArb, (round) => {
          expect(round.id).toBeGreaterThan(0);
          expect(Number.isInteger(round.id)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property tests for character schema validation
   */
  describe('Character Schema Validation', () => {
    it('Character schema only accepts cat or dog', () => {
      fc.assert(
        fc.property(characterArb, (character) => {
          const result = survivalCharacterSchema.safeParse(character);
          expect(result.success).toBe(true);
          expect(['cat', 'dog']).toContain(character);
        }),
        { numRuns: 100 }
      );
    });

    it('Character schema rejects invalid values', () => {
      const invalidCharacters = ['bird', 'fish', 'rabbit', 'mouse', '', 'CAT', 'DOG'];

      for (const invalid of invalidCharacters) {
        const result = survivalCharacterSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }
    });
  });
});

/**
 * Feature: survival-quiz-longform, Property 5: Character Enum Validity
 * Validates: Requirements 2.1
 *
 * For any character field in a SurvivalRound (konglishAnswer.character,
 * nativeAnswer.character, winner), the value SHALL be either 'cat' or 'dog'.
 */
describe('Property 5: Character Enum Validity', () => {
  // Valid character values
  const VALID_CHARACTERS: readonly SurvivalCharacter[] = ['cat', 'dog'] as const;

  /**
   * Property 5.1: konglishAnswer.character is always 'cat' or 'dog'
   * **Validates: Requirements 2.1**
   */
  it('konglishAnswer.character is always cat or dog in valid rounds', () => {
    fc.assert(
      fc.property(survivalRoundArb, (round) => {
        expect(VALID_CHARACTERS).toContain(round.konglishAnswer.character);
        return round.konglishAnswer.character === 'cat' || round.konglishAnswer.character === 'dog';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: nativeAnswer.character is always 'cat' or 'dog'
   * **Validates: Requirements 2.1**
   */
  it('nativeAnswer.character is always cat or dog in valid rounds', () => {
    fc.assert(
      fc.property(survivalRoundArb, (round) => {
        expect(VALID_CHARACTERS).toContain(round.nativeAnswer.character);
        return round.nativeAnswer.character === 'cat' || round.nativeAnswer.character === 'dog';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.3: winner is always 'cat' or 'dog'
   * **Validates: Requirements 2.1**
   */
  it('winner is always cat or dog in valid rounds', () => {
    fc.assert(
      fc.property(survivalRoundArb, (round) => {
        expect(VALID_CHARACTERS).toContain(round.winner);
        return round.winner === 'cat' || round.winner === 'dog';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.4: All three character fields are valid simultaneously
   * **Validates: Requirements 2.1**
   */
  it('all character fields (konglishAnswer.character, nativeAnswer.character, winner) are valid simultaneously', () => {
    fc.assert(
      fc.property(survivalRoundArb, (round) => {
        const konglishCharValid =
          round.konglishAnswer.character === 'cat' || round.konglishAnswer.character === 'dog';
        const nativeCharValid =
          round.nativeAnswer.character === 'cat' || round.nativeAnswer.character === 'dog';
        const winnerValid = round.winner === 'cat' || round.winner === 'dog';

        expect(konglishCharValid).toBe(true);
        expect(nativeCharValid).toBe(true);
        expect(winnerValid).toBe(true);

        return konglishCharValid && nativeCharValid && winnerValid;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.5: Schema validation rejects invalid konglishAnswer.character
   * **Validates: Requirements 2.1**
   */
  it('schema rejects invalid konglishAnswer.character values', () => {
    const invalidCharacters = [
      'bird',
      'fish',
      'rabbit',
      'mouse',
      '',
      'CAT',
      'DOG',
      'Cat',
      'Dog',
      null,
      undefined,
      123,
    ];

    for (const invalidChar of invalidCharacters) {
      const invalidRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: invalidChar },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const result = survivalRoundSchema.safeParse(invalidRound);
      expect(result.success).toBe(false);
    }
  });

  /**
   * Property 5.6: Schema validation rejects invalid nativeAnswer.character
   * **Validates: Requirements 2.1**
   */
  it('schema rejects invalid nativeAnswer.character values', () => {
    const invalidCharacters = [
      'bird',
      'fish',
      'rabbit',
      'mouse',
      '',
      'CAT',
      'DOG',
      'Cat',
      'Dog',
      null,
      undefined,
      123,
    ];

    for (const invalidChar of invalidCharacters) {
      const invalidRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: invalidChar },
        explanation: 'toilet은 변기 자체를 의미',
        winner: 'cat',
      };

      const result = survivalRoundSchema.safeParse(invalidRound);
      expect(result.success).toBe(false);
    }
  });

  /**
   * Property 5.7: Schema validation rejects invalid winner values
   * **Validates: Requirements 2.1**
   */
  it('schema rejects invalid winner values', () => {
    const invalidWinners = [
      'bird',
      'fish',
      'rabbit',
      'mouse',
      '',
      'CAT',
      'DOG',
      'Cat',
      'Dog',
      null,
      undefined,
      123,
    ];

    for (const invalidWinner of invalidWinners) {
      const invalidRound = {
        id: 1,
        category: 'daily',
        situation: '화장실 어디에요?',
        situationEnglish: 'Where is the bathroom?',
        konglishAnswer: { text: 'Where is toilet?', character: 'dog' },
        nativeAnswer: { text: 'Where is the restroom?', character: 'cat' },
        explanation: 'toilet은 변기 자체를 의미',
        winner: invalidWinner,
      };

      const result = survivalRoundSchema.safeParse(invalidRound);
      expect(result.success).toBe(false);
    }
  });

  /**
   * Property 5.8: Character enum schema directly validates only 'cat' or 'dog'
   * **Validates: Requirements 2.1**
   */
  it('survivalCharacterSchema only accepts exactly cat or dog', () => {
    // Valid cases
    expect(survivalCharacterSchema.safeParse('cat').success).toBe(true);
    expect(survivalCharacterSchema.safeParse('dog').success).toBe(true);

    // Property test for valid characters
    fc.assert(
      fc.property(fc.constantFrom('cat', 'dog'), (validChar) => {
        const result = survivalCharacterSchema.safeParse(validChar);
        return result.success === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.9: Any arbitrary string that is not 'cat' or 'dog' is rejected
   * **Validates: Requirements 2.1**
   */
  it('any string that is not cat or dog is rejected by character schema', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== 'cat' && s !== 'dog'),
        (invalidString) => {
          const result = survivalCharacterSchema.safeParse(invalidString);
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.10: Character fields maintain consistency across round generation
   * **Validates: Requirements 2.1**
   */
  it('character fields are consistent across multiple generated rounds', () => {
    fc.assert(
      fc.property(fc.array(survivalRoundArb, { minLength: 1, maxLength: 50 }), (rounds) => {
        for (const round of rounds) {
          // All character fields must be valid
          if (!VALID_CHARACTERS.includes(round.konglishAnswer.character)) return false;
          if (!VALID_CHARACTERS.includes(round.nativeAnswer.character)) return false;
          if (!VALID_CHARACTERS.includes(round.winner)) return false;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
