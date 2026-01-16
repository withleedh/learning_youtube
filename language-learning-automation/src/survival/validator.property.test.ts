import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateExpression,
  validateSurvivalRound,
  FORBIDDEN_PATTERNS,
  createLinguisticValidator,
  ValidationResult,
  validationResultSchema,
} from './validator';
import { SurvivalRound, SurvivalCharacter } from './types';

/**
 * Feature: survival-quiz-longform, Property 21: Forbidden Pattern Detection
 * **Validates: Requirements 13.1, 13.2**
 *
 * For any expression matching forbidden patterns (overly textbook-like),
 * the Linguistic_Validator SHALL return a failed validation status.
 */
describe('Property 21: Forbidden Pattern Detection', () => {
  /**
   * Helper: Generate an expression that matches a specific forbidden pattern
   */
  function generateMatchingExpression(pattern: (typeof FORBIDDEN_PATTERNS)[number]): string {
    // Extract a sample expression from the pattern's regex
    // We'll use known expressions that match each pattern
    const patternExamples: Record<string, string> = {
      'overly-formal-apology': 'I am sorry for bothering you with this request',
      'formal-disturb-apology': 'I am sorry to disturb you during your meeting',
      'corporate-apology': 'We apologize for the inconvenience caused',
      'archaic-greeting': 'How do you do, my friend?',
      'textbook-response': 'I am fine, thank you, and you?',
      'overly-polite-request': 'Would you mind if I borrow your pen?',
      'formal-would-like': 'I would like to order a coffee',
      'korean-direct-translation': 'Please understand my situation',
      'incorrect-home-usage': 'I will go to home now',
      'incorrect-go-home': 'Let me go to home first',
      'konglish-fighting': 'Fighting! You can do it!',
      'awkward-time-expression': 'I will finish after 3 days',
      'literal-problem': 'I have a problem with my computer',
      'formal-cannot': 'I cannot attend the meeting',
      'formal-do-not': 'I do not understand this',
      'overly-formal-thanks': 'Thank you very much for your help today',
      'formal-very-sorry': 'I am very sorry about that',
      'incorrect-morning-preposition': 'In the morning of Monday, we met',
      'konglish-skinship': 'They have a lot of skinship',
      'konglish-handphone': 'Where is my hand phone?',
      'konglish-meeting': 'We had a meeting blind date yesterday',
      'formal-think-that': 'I think that this is correct',
    };

    return patternExamples[pattern.name] || `Expression matching ${pattern.name}`;
  }

  /**
   * Property 21.1: Expressions matching error-severity forbidden patterns return 'failed' status
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any expression that matches a forbidden pattern with severity 'error',
   * the validator SHALL return status='failed'.
   */
  it('expressions matching error-severity forbidden patterns return failed status', () => {
    // Get all error-severity patterns
    const errorPatterns = FORBIDDEN_PATTERNS.filter((p) => p.severity === 'error');

    fc.assert(
      fc.property(fc.constantFrom(...errorPatterns), (pattern) => {
        const expression = generateMatchingExpression(pattern);
        const result = validateExpression(expression);

        // Must return 'failed' status for error-severity patterns
        expect(result.status).toBe('failed');
        expect(result.matchedPatterns).toContain(pattern.name);

        return result.status === 'failed' && result.matchedPatterns.includes(pattern.name);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.2: Expressions matching warning-severity patterns return 'warning' or 'failed' status
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any expression that matches a forbidden pattern with severity 'warning',
   * the validator SHALL return status='warning' (or 'failed' if also matching error patterns).
   */
  it('expressions matching warning-severity patterns return warning or failed status', () => {
    // Get all warning-severity patterns
    const warningPatterns = FORBIDDEN_PATTERNS.filter((p) => p.severity === 'warning');

    fc.assert(
      fc.property(fc.constantFrom(...warningPatterns), (pattern) => {
        const expression = generateMatchingExpression(pattern);
        const result = validateExpression(expression);

        // Must return 'warning' or 'failed' status (not 'passed')
        expect(result.status).not.toBe('passed');
        expect(result.matchedPatterns).toContain(pattern.name);

        return result.status !== 'passed' && result.matchedPatterns.includes(pattern.name);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.3: matchedPatterns array contains the correct pattern name
   * **Validates: Requirements 13.1**
   *
   * For any expression matching a forbidden pattern, the matchedPatterns array
   * SHALL contain the name of the matched pattern.
   */
  it('matchedPatterns array contains the correct pattern name for matched expressions', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FORBIDDEN_PATTERNS), (pattern) => {
        const expression = generateMatchingExpression(pattern);
        const result = validateExpression(expression);

        // matchedPatterns must include the pattern name
        expect(result.matchedPatterns).toContain(pattern.name);
        expect(result.matchedPatterns.length).toBeGreaterThanOrEqual(1);

        return result.matchedPatterns.includes(pattern.name);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.4: Expressions without forbidden patterns pass validation
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any expression that does NOT match any forbidden pattern,
   * the validator SHALL return status='passed'.
   */
  it('expressions without forbidden patterns pass validation', () => {
    // Generate natural expressions that don't match forbidden patterns
    const naturalExpressions = [
      "I'm heading home now",
      'Sorry to bother you',
      'Nice to meet you!',
      "I'm good, thanks!",
      'Can I borrow your pen?',
      "I'd like a coffee, please",
      'I hope you understand',
      'You got this!',
      "I'll finish in 3 days",
      "I'm having trouble with my computer",
      "I can't make it to the meeting",
      "I don't get it",
      'Thanks so much!',
      "I'm so sorry about that",
      'On the morning of Monday',
      "Where's my phone?",
      'I think this is correct',
      'Let me head home',
      'Good to meet you',
      'Pretty good, how about you?',
    ];

    fc.assert(
      fc.property(fc.constantFrom(...naturalExpressions), (expression) => {
        const result = validateExpression(expression);

        // Natural expressions should pass validation
        expect(result.status).toBe('passed');
        expect(result.matchedPatterns).toHaveLength(0);

        return result.status === 'passed' && result.matchedPatterns.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.5: All FORBIDDEN_PATTERNS have required fields
   * **Validates: Requirements 13.1**
   *
   * Each forbidden pattern SHALL have: pattern (RegExp), name (string),
   * description (string), suggestions (array), and severity ('error' | 'warning').
   */
  it('all FORBIDDEN_PATTERNS have required fields', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FORBIDDEN_PATTERNS), (pattern) => {
        // Pattern must have all required fields
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.name).toBe('string');
        expect(pattern.name.length).toBeGreaterThan(0);
        expect(typeof pattern.description).toBe('string');
        expect(pattern.description.length).toBeGreaterThan(0);
        expect(Array.isArray(pattern.suggestions)).toBe(true);
        expect(pattern.suggestions.length).toBeGreaterThan(0);
        expect(['error', 'warning']).toContain(pattern.severity);

        return (
          pattern.pattern instanceof RegExp &&
          typeof pattern.name === 'string' &&
          pattern.name.length > 0 &&
          typeof pattern.description === 'string' &&
          pattern.description.length > 0 &&
          Array.isArray(pattern.suggestions) &&
          pattern.suggestions.length > 0 &&
          (pattern.severity === 'error' || pattern.severity === 'warning')
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.6: Suggestions are provided for matched patterns
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any expression matching a forbidden pattern, the validation result
   * SHALL include suggestions from the matched pattern.
   */
  it('suggestions are provided for matched patterns', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FORBIDDEN_PATTERNS), (pattern) => {
        const expression = generateMatchingExpression(pattern);
        const result = validateExpression(expression);

        // Suggestions must be provided
        expect(result.suggestions.length).toBeGreaterThan(0);

        // At least one suggestion from the pattern should be included
        const hasPatternSuggestion = pattern.suggestions.some((s) =>
          result.suggestions.includes(s)
        );
        expect(hasPatternSuggestion).toBe(true);

        return result.suggestions.length > 0 && hasPatternSuggestion;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.7: validateSurvivalRound detects forbidden patterns in round expressions
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any SurvivalRound where the native expression matches a forbidden pattern,
   * validateSurvivalRound SHALL return isValid=false.
   */
  it('validateSurvivalRound detects forbidden patterns in native expressions', () => {
    // Get error-severity patterns for testing
    const errorPatterns = FORBIDDEN_PATTERNS.filter((p) => p.severity === 'error');

    fc.assert(
      fc.property(
        fc.constantFrom(...errorPatterns),
        fc.integer({ min: 1, max: 50 }),
        fc.constantFrom<SurvivalCharacter>('cat', 'dog'),
        (pattern, roundId, winner) => {
          const forbiddenExpression = generateMatchingExpression(pattern);
          const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';

          // Create a round with forbidden pattern in native answer
          const round: SurvivalRound = {
            id: roundId,
            category: 'daily',
            situation: '테스트 상황',
            situationEnglish: 'Test situation',
            konglishAnswer: {
              text: 'Some konglish expression',
              character: loser,
            },
            nativeAnswer: {
              text: forbiddenExpression, // This should fail validation
              character: winner,
            },
            explanation: '테스트 설명',
            winner: winner,
          };

          const result = validateSurvivalRound(round);

          // Round should be invalid because native expression has forbidden pattern
          expect(result.isValid).toBe(false);
          expect(result.nativeValidation.status).toBe('failed');
          expect(result.nativeValidation.matchedPatterns).toContain(pattern.name);

          return (
            result.isValid === false &&
            result.nativeValidation.status === 'failed' &&
            result.nativeValidation.matchedPatterns.includes(pattern.name)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.8: validateSurvivalRound passes for rounds with natural expressions
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any SurvivalRound where the native expression does NOT match forbidden patterns,
   * validateSurvivalRound SHALL return isValid=true.
   */
  it('validateSurvivalRound passes for rounds with natural native expressions', () => {
    const naturalExpressions = [
      "I'm heading home now",
      'Sorry to bother you',
      'Nice to meet you!',
      "I'm good, thanks!",
      'Can I borrow your pen?',
      "I'd like a coffee, please",
      'Thanks so much!',
      "I'm so sorry about that",
      "Where's my phone?",
      'I think this is correct',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...naturalExpressions),
        fc.integer({ min: 1, max: 50 }),
        fc.constantFrom<SurvivalCharacter>('cat', 'dog'),
        (nativeExpression, roundId, winner) => {
          const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';

          const round: SurvivalRound = {
            id: roundId,
            category: 'daily',
            situation: '테스트 상황',
            situationEnglish: 'Test situation',
            konglishAnswer: {
              text: 'Some konglish expression',
              character: loser,
            },
            nativeAnswer: {
              text: nativeExpression,
              character: winner,
            },
            explanation: '테스트 설명',
            winner: winner,
          };

          const result = validateSurvivalRound(round);

          // Round should be valid because native expression is natural
          expect(result.isValid).toBe(true);
          expect(result.nativeValidation.status).toBe('passed');
          expect(result.nativeValidation.matchedPatterns).toHaveLength(0);

          return (
            result.isValid === true &&
            result.nativeValidation.status === 'passed' &&
            result.nativeValidation.matchedPatterns.length === 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.9: Multiple forbidden patterns in one expression are all detected
   * **Validates: Requirements 13.1**
   *
   * For any expression matching multiple forbidden patterns, all matched patterns
   * SHALL be included in the matchedPatterns array.
   */
  it('multiple forbidden patterns in one expression are all detected', () => {
    // Create expressions that match multiple patterns
    const multiPatternExpressions = [
      {
        expression: 'I am sorry for bothering you, I cannot help you',
        expectedPatterns: ['overly-formal-apology', 'formal-cannot'],
      },
      {
        expression: 'I am fine, thank you, and you? I would like to go to home',
        expectedPatterns: ['textbook-response', 'formal-would-like', 'incorrect-go-home'],
      },
      {
        expression: 'I do not understand, I have a problem',
        expectedPatterns: ['formal-do-not', 'literal-problem'],
      },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...multiPatternExpressions),
        ({ expression, expectedPatterns }) => {
          const result = validateExpression(expression);

          // All expected patterns should be detected
          for (const patternName of expectedPatterns) {
            expect(result.matchedPatterns).toContain(patternName);
          }

          // Status should be 'failed' if any error pattern is matched
          const hasErrorPattern = expectedPatterns.some((name) => {
            const pattern = FORBIDDEN_PATTERNS.find((p) => p.name === name);
            return pattern?.severity === 'error';
          });

          if (hasErrorPattern) {
            expect(result.status).toBe('failed');
          }

          return expectedPatterns.every((p) => result.matchedPatterns.includes(p));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.10: Case-insensitive pattern matching works correctly
   * **Validates: Requirements 13.1**
   *
   * Forbidden patterns SHALL match expressions regardless of case
   * (as patterns use /i flag).
   */
  it('case-insensitive pattern matching works correctly', () => {
    // Test expressions with different cases
    const caseVariations = [
      { expression: 'I AM SORRY FOR BOTHERING YOU', pattern: 'overly-formal-apology' },
      { expression: 'how do you do', pattern: 'archaic-greeting' },
      { expression: 'FIGHTING!', pattern: 'konglish-fighting' },
      { expression: 'Please Understand', pattern: 'korean-direct-translation' },
      { expression: 'i am fine, thank you, and you', pattern: 'textbook-response' },
    ];

    fc.assert(
      fc.property(fc.constantFrom(...caseVariations), ({ expression, pattern }) => {
        const result = validateExpression(expression);

        // Pattern should be matched regardless of case
        expect(result.matchedPatterns).toContain(pattern);

        return result.matchedPatterns.includes(pattern);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.11: Custom patterns can be added to validator
   * **Validates: Requirements 13.1**
   *
   * Custom forbidden patterns added to the validator SHALL be detected
   * in addition to built-in patterns.
   */
  it('custom patterns can be added to validator and are detected', () => {
    const customPattern = {
      pattern: /\bcustom test pattern\b/i,
      name: 'custom-test-pattern',
      description: 'A custom test pattern for testing',
      suggestions: ['alternative expression'],
      severity: 'error' as const,
    };

    fc.assert(
      fc.property(fc.constant(null), () => {
        const validator = createLinguisticValidator([customPattern]);
        const result = validator.validateExpression('This has a custom test pattern in it');

        // Custom pattern should be detected
        expect(result.status).toBe('failed');
        expect(result.matchedPatterns).toContain('custom-test-pattern');

        return result.status === 'failed' && result.matchedPatterns.includes('custom-test-pattern');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.12: Reason field contains pattern descriptions for failed validations
   * **Validates: Requirements 13.1, 13.2**
   *
   * For any expression matching forbidden patterns, the reason field SHALL
   * contain the description(s) of the matched pattern(s).
   */
  it('reason field contains pattern descriptions for failed validations', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FORBIDDEN_PATTERNS), (pattern) => {
        const expression = generateMatchingExpression(pattern);
        const result = validateExpression(expression);

        // Reason should be defined and contain the pattern description
        expect(result.reason).toBeDefined();
        expect(result.reason).toContain(pattern.description);

        return result.reason !== undefined && result.reason.includes(pattern.description);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.13: Empty expressions pass validation (no forbidden patterns)
   * **Validates: Requirements 13.1**
   *
   * An empty expression SHALL pass validation as it doesn't match any forbidden pattern.
   */
  it('empty expressions pass validation', () => {
    fc.assert(
      fc.property(fc.constant(''), (expression) => {
        const result = validateExpression(expression);

        // Empty expression should pass (no patterns to match)
        expect(result.status).toBe('passed');
        expect(result.matchedPatterns).toHaveLength(0);

        return result.status === 'passed' && result.matchedPatterns.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.14: Partial pattern matches do not trigger false positives
   * **Validates: Requirements 13.1, 13.2**
   *
   * Expressions that partially match forbidden patterns (but not fully)
   * SHALL NOT be flagged as matching those patterns.
   */
  it('partial pattern matches do not trigger false positives', () => {
    // Expressions that might partially match but shouldn't trigger patterns
    const partialMatches = [
      'I am sorry', // Not "I am sorry for bothering you"
      'How do', // Not "How do you do"
      'I am', // Not "I am fine, thank you, and you"
      'go home', // Not "go to home"
      'I would', // Not "I would like to"
      'Thank you', // Not "Thank you very much for your help"
    ];

    fc.assert(
      fc.property(fc.constantFrom(...partialMatches), (expression) => {
        const result = validateExpression(expression);

        // These partial matches should pass or only trigger warning patterns
        // They should NOT trigger the specific error patterns they partially match
        const errorPatternNames = [
          'overly-formal-apology',
          'archaic-greeting',
          'textbook-response',
          'incorrect-go-home',
          'overly-formal-thanks',
        ];

        const matchedErrorPatterns = result.matchedPatterns.filter((p) =>
          errorPatternNames.includes(p)
        );

        // Should not match the specific error patterns
        expect(matchedErrorPatterns).toHaveLength(0);

        return matchedErrorPatterns.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21.15: Validator is deterministic - same input always produces same output
   * **Validates: Requirements 13.1**
   *
   * For any expression, calling validateExpression multiple times SHALL
   * always produce the same result.
   */
  it('validator is deterministic - same input always produces same output', () => {
    const testExpressions = [
      'I am sorry for bothering you',
      "I'm heading home now",
      'How do you do',
      'Nice to meet you!',
      'Fighting!',
      'Thanks so much!',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...testExpressions),
        fc.integer({ min: 2, max: 10 }),
        (expression, iterations) => {
          const results: ValidationResult[] = [];

          for (let i = 0; i < iterations; i++) {
            results.push(validateExpression(expression));
          }

          // All results should be identical
          const firstResult = results[0];
          for (const result of results) {
            expect(result.status).toBe(firstResult.status);
            expect(result.matchedPatterns).toEqual(firstResult.matchedPatterns);
            expect(result.suggestions).toEqual(firstResult.suggestions);
          }

          return results.every(
            (r) =>
              r.status === firstResult.status &&
              JSON.stringify(r.matchedPatterns) === JSON.stringify(firstResult.matchedPatterns)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: survival-quiz-longform, Property 22: Confidence Score Presence
 * **Validates: Requirements 13.4**
 *
 * For any expression validated by Linguistic_Validator, the result SHALL
 * include a confidence score between 0 and 1.
 */
describe('Property 22: Confidence Score Presence', () => {
  /**
   * Property 22.1: All validation results include a confidence score
   * **Validates: Requirements 13.4**
   *
   * For any expression (valid or invalid), the validation result SHALL
   * include a confidenceScore field.
   */
  it('all validation results include a confidence score', () => {
    const testExpressions = [
      // Natural expressions
      "I'm heading home now",
      'Sorry to bother you',
      'Nice to meet you!',
      "I'm good, thanks!",
      'Can I borrow your pen?',
      "I'd like a coffee, please",
      'Thanks so much!',
      // Forbidden pattern expressions
      'I am sorry for bothering you',
      'How do you do',
      'I am fine, thank you, and you',
      'Fighting!',
      'I will go to home',
      // Edge cases
      '',
      'Hello',
      'A',
      'This is a very long expression that contains many words and should still have a confidence score',
    ];

    fc.assert(
      fc.property(fc.constantFrom(...testExpressions), (expression) => {
        const result = validateExpression(expression);

        // confidenceScore must be defined
        expect(result.confidenceScore).toBeDefined();
        expect(typeof result.confidenceScore).toBe('number');

        return result.confidenceScore !== undefined && typeof result.confidenceScore === 'number';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.2: Confidence score is between 0 and 1 (inclusive)
   * **Validates: Requirements 13.4**
   *
   * For any expression, the confidence score SHALL be >= 0 and <= 1.
   */
  it('confidence score is between 0 and 1 inclusive', () => {
    const testExpressions = [
      // Natural expressions (should have high scores)
      "I'm heading home now",
      'Sorry to bother you',
      'Nice to meet you!',
      "I'm good, thanks!",
      'Can I borrow your pen?',
      // Forbidden pattern expressions (should have lower scores)
      'I am sorry for bothering you',
      'How do you do',
      'I am fine, thank you, and you',
      'Fighting!',
      'I will go to home',
      // Multiple patterns (should have even lower scores)
      'I am sorry for bothering you, I cannot help you',
      'I am fine, thank you, and you? I would like to go to home',
      // Edge cases
      '',
      'Hello',
    ];

    fc.assert(
      fc.property(fc.constantFrom(...testExpressions), (expression) => {
        const result = validateExpression(expression);

        // Confidence score must be within [0, 1]
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(1);

        return result.confidenceScore >= 0 && result.confidenceScore <= 1;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.3: Confidence score is a valid number (not NaN or Infinity)
   * **Validates: Requirements 13.4**
   *
   * For any expression, the confidence score SHALL be a finite number.
   */
  it('confidence score is a valid finite number', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (expression) => {
        const result = validateExpression(expression);

        // Confidence score must be a finite number
        expect(Number.isFinite(result.confidenceScore)).toBe(true);
        expect(Number.isNaN(result.confidenceScore)).toBe(false);

        return Number.isFinite(result.confidenceScore) && !Number.isNaN(result.confidenceScore);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.4: Passed validations have higher confidence scores than failed ones
   * **Validates: Requirements 13.4**
   *
   * For expressions that pass validation, the confidence score SHALL generally
   * be higher than for expressions that fail validation.
   */
  it('passed validations have higher confidence scores than failed ones', () => {
    const passedExpressions = [
      "I'm heading home now",
      'Sorry to bother you',
      'Nice to meet you!',
      "I'm good, thanks!",
      'Can I borrow your pen?',
      "I'd like a coffee, please",
      'Thanks so much!',
      "I'm so sorry about that",
      "Where's my phone?",
      'I think this is correct',
    ];

    const failedExpressions = [
      'I am sorry for bothering you',
      'How do you do',
      'I am fine, thank you, and you',
      'Fighting!',
      'I will go to home',
      'Please understand',
      'Where is my hand phone?',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...passedExpressions),
        fc.constantFrom(...failedExpressions),
        (passedExpr, failedExpr) => {
          const passedResult = validateExpression(passedExpr);
          const failedResult = validateExpression(failedExpr);

          // Passed expressions should have higher confidence than failed ones
          expect(passedResult.status).toBe('passed');
          expect(failedResult.status).toBe('failed');
          expect(passedResult.confidenceScore).toBeGreaterThan(failedResult.confidenceScore);

          return (
            passedResult.status === 'passed' &&
            failedResult.status === 'failed' &&
            passedResult.confidenceScore > failedResult.confidenceScore
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.5: More pattern matches result in lower confidence scores
   * **Validates: Requirements 13.4**
   *
   * For expressions matching multiple forbidden patterns, the confidence score
   * SHALL be lower than for expressions matching fewer patterns.
   */
  it('more pattern matches result in lower confidence scores', () => {
    // Single pattern match
    const singlePatternExpressions = [
      { expression: 'I am sorry for bothering you', expectedPatternCount: 1 },
      { expression: 'How do you do', expectedPatternCount: 1 },
      { expression: 'Fighting!', expectedPatternCount: 1 },
    ];

    // Multiple pattern matches
    const multiPatternExpressions = [
      {
        expression: 'I am sorry for bothering you, I cannot help you',
        expectedMinPatternCount: 2,
      },
      {
        expression: 'I am fine, thank you, and you? I would like to go to home',
        expectedMinPatternCount: 3,
      },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...singlePatternExpressions),
        fc.constantFrom(...multiPatternExpressions),
        (singlePattern, multiPattern) => {
          const singleResult = validateExpression(singlePattern.expression);
          const multiResult = validateExpression(multiPattern.expression);

          // Verify pattern counts
          expect(singleResult.matchedPatterns.length).toBe(singlePattern.expectedPatternCount);
          expect(multiResult.matchedPatterns.length).toBeGreaterThanOrEqual(
            multiPattern.expectedMinPatternCount
          );

          // More patterns should result in lower confidence
          expect(multiResult.confidenceScore).toBeLessThan(singleResult.confidenceScore);

          return multiResult.confidenceScore < singleResult.confidenceScore;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.6: validateSurvivalRound includes confidence scores for both expressions
   * **Validates: Requirements 13.4**
   *
   * For any SurvivalRound validation, both konglishValidation and nativeValidation
   * SHALL include confidence scores between 0 and 1.
   */
  it('validateSurvivalRound includes confidence scores for both expressions', () => {
    const naturalExpressions = [
      "I'm heading home now",
      'Sorry to bother you',
      'Nice to meet you!',
      "I'm good, thanks!",
      'Can I borrow your pen?',
    ];

    const konglishExpressions = [
      'Where is toilet?',
      'I go to home',
      'Please understand my situation',
      'Fighting!',
      'Where is hand phone?',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...naturalExpressions),
        fc.constantFrom(...konglishExpressions),
        fc.integer({ min: 1, max: 50 }),
        fc.constantFrom<SurvivalCharacter>('cat', 'dog'),
        (nativeExpr, konglishExpr, roundId, winner) => {
          const loser: SurvivalCharacter = winner === 'cat' ? 'dog' : 'cat';

          const round: SurvivalRound = {
            id: roundId,
            category: 'daily',
            situation: '테스트 상황',
            situationEnglish: 'Test situation',
            konglishAnswer: {
              text: konglishExpr,
              character: loser,
            },
            nativeAnswer: {
              text: nativeExpr,
              character: winner,
            },
            explanation: '테스트 설명',
            winner: winner,
          };

          const result = validateSurvivalRound(round);

          // Both validations must have confidence scores
          expect(result.konglishValidation.confidenceScore).toBeDefined();
          expect(result.nativeValidation.confidenceScore).toBeDefined();

          // Both scores must be between 0 and 1
          expect(result.konglishValidation.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.konglishValidation.confidenceScore).toBeLessThanOrEqual(1);
          expect(result.nativeValidation.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.nativeValidation.confidenceScore).toBeLessThanOrEqual(1);

          return (
            result.konglishValidation.confidenceScore >= 0 &&
            result.konglishValidation.confidenceScore <= 1 &&
            result.nativeValidation.confidenceScore >= 0 &&
            result.nativeValidation.confidenceScore <= 1
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.7: Confidence score is deterministic for same input
   * **Validates: Requirements 13.4**
   *
   * For any expression, calling validateExpression multiple times SHALL
   * always produce the same confidence score.
   */
  it('confidence score is deterministic for same input', () => {
    const testExpressions = [
      "I'm heading home now",
      'I am sorry for bothering you',
      'How do you do',
      'Nice to meet you!',
      'Fighting!',
      'Thanks so much!',
      '',
      'Hello world',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...testExpressions),
        fc.integer({ min: 2, max: 10 }),
        (expression, iterations) => {
          const scores: number[] = [];

          for (let i = 0; i < iterations; i++) {
            const result = validateExpression(expression);
            scores.push(result.confidenceScore);
          }

          // All scores should be identical
          const firstScore = scores[0];
          for (const score of scores) {
            expect(score).toBe(firstScore);
          }

          return scores.every((s) => s === firstScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.8: Confidence score conforms to Zod schema
   * **Validates: Requirements 13.4**
   *
   * For any validation result, the confidenceScore SHALL pass the
   * validationResultSchema Zod validation (number between 0 and 1).
   */
  it('confidence score conforms to Zod schema', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (expression) => {
        const result = validateExpression(expression);

        // Validate against Zod schema
        const parseResult = validationResultSchema.safeParse(result);

        expect(parseResult.success).toBe(true);
        if (parseResult.success) {
          expect(parseResult.data.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(parseResult.data.confidenceScore).toBeLessThanOrEqual(1);
        }

        return parseResult.success;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.9: Natural contractions boost confidence score
   * **Validates: Requirements 13.4**
   *
   * Expressions with natural contractions (I'm, don't, can't, etc.) SHALL
   * have equal or higher confidence scores than equivalent formal expressions.
   */
  it('natural contractions maintain or boost confidence score', () => {
    const contractionPairs = [
      { contracted: "I'm going home", formal: 'I am going home' },
      { contracted: "I don't know", formal: 'I do not know' },
      { contracted: "I can't help", formal: 'I cannot help' },
      { contracted: "It isn't working", formal: 'It is not working' },
    ];

    fc.assert(
      fc.property(fc.constantFrom(...contractionPairs), ({ contracted, formal }) => {
        const contractedResult = validateExpression(contracted);
        const formalResult = validateExpression(formal);

        // Contracted form should have equal or higher confidence
        // (formal forms may trigger warning patterns)
        expect(contractedResult.confidenceScore).toBeGreaterThanOrEqual(
          formalResult.confidenceScore
        );

        return contractedResult.confidenceScore >= formalResult.confidenceScore;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.10: Empty expressions have valid confidence scores
   * **Validates: Requirements 13.4**
   *
   * Even empty expressions SHALL have a valid confidence score between 0 and 1.
   */
  it('empty expressions have valid confidence scores', () => {
    fc.assert(
      fc.property(fc.constant(''), (expression) => {
        const result = validateExpression(expression);

        // Empty expression should still have valid confidence score
        expect(result.confidenceScore).toBeDefined();
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(1);
        expect(Number.isFinite(result.confidenceScore)).toBe(true);

        return (
          result.confidenceScore >= 0 &&
          result.confidenceScore <= 1 &&
          Number.isFinite(result.confidenceScore)
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.11: LinguisticValidator class produces same confidence scores as standalone function
   * **Validates: Requirements 13.4**
   *
   * The LinguisticValidator class and the standalone validateExpression function
   * SHALL produce identical confidence scores for the same input.
   */
  it('LinguisticValidator class produces same confidence scores as standalone function', () => {
    const testExpressions = [
      "I'm heading home now",
      'I am sorry for bothering you',
      'How do you do',
      'Nice to meet you!',
      'Fighting!',
      '',
    ];

    fc.assert(
      fc.property(fc.constantFrom(...testExpressions), (expression) => {
        const validator = createLinguisticValidator();
        const classResult = validator.validateExpression(expression);
        const functionResult = validateExpression(expression);

        // Both should produce identical confidence scores
        expect(classResult.confidenceScore).toBe(functionResult.confidenceScore);

        return classResult.confidenceScore === functionResult.confidenceScore;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22.12: Error patterns reduce confidence more than warning patterns
   * **Validates: Requirements 13.4**
   *
   * Expressions matching error-severity patterns SHALL have lower confidence
   * scores than expressions matching only warning-severity patterns.
   */
  it('error patterns reduce confidence more than warning patterns', () => {
    // Error-severity pattern expressions
    const errorExpressions = [
      'I am sorry for bothering you', // overly-formal-apology (error)
      'How do you do', // archaic-greeting (error)
      'Fighting!', // konglish-fighting (error)
    ];

    // Warning-severity pattern expressions (no error patterns)
    const warningExpressions = [
      'I would like to order', // formal-would-like (warning)
      'I cannot attend', // formal-cannot (warning)
      'I do not understand', // formal-do-not (warning)
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...errorExpressions),
        fc.constantFrom(...warningExpressions),
        (errorExpr, warningExpr) => {
          const errorResult = validateExpression(errorExpr);
          const warningResult = validateExpression(warningExpr);

          // Error expressions should have lower confidence than warning expressions
          expect(errorResult.status).toBe('failed');
          expect(warningResult.status).toBe('warning');
          expect(errorResult.confidenceScore).toBeLessThan(warningResult.confidenceScore);

          return errorResult.confidenceScore < warningResult.confidenceScore;
        }
      ),
      { numRuns: 100 }
    );
  });
});
