/**
 * Property Tests for Creative Generator
 *
 * Tests Property 1 (Screenplay Format Output) and Property 2 (Dialogue Contains Natural Patterns)
 *
 * Note: These tests focus on the pure validation functions that don't require
 * Node.js APIs or external services. The actual generateCreativeScript function
 * requires API calls and is tested separately in integration tests.
 *
 * @module creative-generator.property.test
 * **Validates: Requirements 1.1, 1.3, 1.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseScreenplay, hasSpeakerLabels, extractDialogueLinesQuick } from './screenplay-parser';

// ============================================================================
// Pure Validation Functions (copied from creative-generator to avoid Node.js deps)
// ============================================================================

/**
 * Check if the output is in valid screenplay format (not JSON)
 */
function isScreenplayFormat(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return false;
    } catch {
      // Not valid JSON, continue checking
    }
  }

  const hasTitle = /TITLE:/i.test(text);
  const hasSpeakerLabelsInText = /\b(M|F|NARRATOR):/i.test(text);
  const hasSceneMarkers = /SCENE\s*\d+/i.test(text) || /---/.test(text);

  return hasSpeakerLabelsInText && (hasTitle || hasSceneMarkers);
}

/**
 * Check if dialogue contains natural patterns (contractions, reactions)
 */
function hasNaturalDialoguePatterns(text: string): boolean {
  const contractions = [
    "I'm",
    "don't",
    "can't",
    "it's",
    "we're",
    "they're",
    "isn't",
    "aren't",
    "won't",
    "wouldn't",
    "couldn't",
    "shouldn't",
    "I've",
    "you've",
    "we've",
    "they've",
    "I'll",
    "you'll",
    "we'll",
    "they'll",
    "that's",
    "what's",
    "there's",
    "here's",
    "let's",
    "didn't",
    "wasn't",
    "weren't",
    "haven't",
    "hasn't",
    "hadn't",
  ];

  const reactions = [
    'Oh!',
    'Really?',
    'Wow!',
    "That's great!",
    'I see.',
    'Amazing!',
    'Incredible!',
    'Oh no!',
    'Oh my!',
    'Hmm',
    'Well...',
    'Actually,',
    'Um...',
    'Uh...',
  ];

  const lowerText = text.toLowerCase();
  const hasContraction = contractions.some((c) => lowerText.includes(c.toLowerCase()));
  const hasReaction = reactions.some((r) => {
    const reactionWord = r.replace(/[!?,.]+$/, '').toLowerCase();
    return lowerText.includes(reactionWord);
  });

  return hasContraction || hasReaction;
}

// ============================================================================
// Test Data Generators
// ============================================================================

/** Valid screenplay format examples */
const VALID_SCREENPLAY_EXAMPLES = [
  `TITLE: A Simple Story

CHARACTERS:
- M (James): A young man
- F (Sarah): A young woman

---

SCENE 1: COFFEE SHOP - DAY

M: I'm really excited about this.
   (enthusiastic)

F: That's great! I can't wait to see it.

---

SCENE 2: PARK - AFTERNOON

M: Don't you think it's beautiful here?

F: Oh, absolutely! It's wonderful.`,

  `TITLE: The Morning Routine

CHARACTERS:
- M (David): Office worker

---

SCENE 1: APARTMENT - MORNING

M: I wake up every morning at 6 AM.
   (tired)
M: It's not easy, but I've gotten used to it.
M: First, I make myself a cup of coffee.

---

SCENE 2: KITCHEN - MORNING

M: The smell of fresh coffee is amazing.
M: I can't start my day without it.`,

  `TITLE: News Update

CHARACTERS:
- F (Reporter): News anchor

---

SCENE 1: NEWS STUDIO - EVENING

F: Good evening, everyone.
F: Today's top story is quite surprising.
F: Scientists have discovered something incredible.
F: They've found a new species in the ocean.`,
];

/** Invalid screenplay (JSON format) examples */
const JSON_EXAMPLES = [
  '{"title": "Test", "sentences": []}',
  '[{"id": 1, "text": "Hello"}]',
  '{\n  "metadata": {\n    "topic": "test"\n  }\n}',
];

/** Screenplay text with natural dialogue patterns */
const NATURAL_DIALOGUE_EXAMPLES = [
  "M: I'm so happy to see you!",
  "F: Don't worry, it'll be fine.",
  "M: Oh! That's amazing!",
  "F: Really? I can't believe it.",
  'M: Well... I think we should go.',
  "F: Actually, I've been meaning to tell you something.",
  "M: Wow! That's incredible!",
  'F: Um... let me think about it.',
];

/** Screenplay text without natural patterns (formal/stiff) */
const FORMAL_DIALOGUE_EXAMPLES = [
  'M: I am very pleased to meet you.',
  'F: That is a wonderful idea.',
  'M: We should proceed with the plan.',
  'F: The situation is quite serious.',
];

/** Generator for valid screenplay text */
const validScreenplayArb = fc.constantFrom(...VALID_SCREENPLAY_EXAMPLES);

/** Generator for JSON text */
const jsonTextArb = fc.constantFrom(...JSON_EXAMPLES);

/** Generator for natural dialogue */
const naturalDialogueArb = fc.constantFrom(...NATURAL_DIALOGUE_EXAMPLES);

/** Generator for formal dialogue */
const formalDialogueArb = fc.constantFrom(...FORMAL_DIALOGUE_EXAMPLES);

/** Generator for speaker labels */
const speakerLabelArb = fc.constantFrom('M:', 'F:', 'NARRATOR:');

/** Generator for contractions */
const contractionArb = fc.constantFrom(
  "I'm",
  "don't",
  "can't",
  "it's",
  "we're",
  "they're",
  "isn't",
  "aren't",
  "won't",
  "wouldn't",
  "couldn't",
  "I've",
  "you've",
  "I'll",
  "you'll",
  "that's",
  "what's",
  "there's",
  "let's",
  "didn't"
);

/** Generator for reaction words */
const reactionArb = fc.constantFrom(
  'Oh!',
  'Really?',
  'Wow!',
  "That's great!",
  'Amazing!',
  'Incredible!',
  'Oh no!',
  'Hmm',
  'Well...',
  'Actually,',
  'Um...'
);

// ============================================================================
// Property 1: Screenplay Format Output
// **Validates: Requirements 1.1, 1.5**
// ============================================================================

describe('Property 1: Screenplay Format Output', () => {
  /**
   * Property 1.1: Valid screenplay format is recognized
   * **Validates: Requirements 1.1, 1.5**
   */
  it('valid screenplay format is recognized', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const result = isScreenplayFormat(screenplay);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: JSON format is rejected as screenplay
   * **Validates: Requirements 1.1, 1.5**
   */
  it('JSON format is rejected as screenplay', () => {
    fc.assert(
      fc.property(jsonTextArb, (json) => {
        const result = isScreenplayFormat(json);
        expect(result).toBe(false);
        return result === false;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.3: Screenplay must have speaker labels
   * **Validates: Requirements 1.5**
   */
  it('screenplay must have speaker labels', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const hasLabels = hasSpeakerLabels(screenplay);
        expect(hasLabels).toBe(true);
        return hasLabels === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.4: Text with speaker labels is recognized as screenplay
   * **Validates: Requirements 1.5**
   */
  it('text with speaker labels is recognized as screenplay', () => {
    fc.assert(
      fc.property(speakerLabelArb, fc.string({ minLength: 5, maxLength: 50 }), (label, text) => {
        const screenplay = `TITLE: Test\n\n${label} ${text}`;
        const result = isScreenplayFormat(screenplay);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.5: Valid screenplay can be parsed
   * **Validates: Requirements 1.5**
   */
  it('valid screenplay can be parsed', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const result = parseScreenplay(screenplay);
        expect(result.success).toBe(true);
        expect(result.screenplay).toBeDefined();
        expect(result.screenplay?.scenes.length).toBeGreaterThan(0);
        return result.success;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.6: Parsed screenplay has dialogue lines
   * **Validates: Requirements 1.5**
   */
  it('parsed screenplay has dialogue lines', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const result = parseScreenplay(screenplay);
        if (!result.success || !result.screenplay) return true;

        const totalLines = result.screenplay.scenes.reduce(
          (sum, scene) => sum + scene.dialogue.length,
          0
        );
        expect(totalLines).toBeGreaterThan(0);
        return totalLines > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.7: Quick extraction finds dialogue lines
   * **Validates: Requirements 1.5**
   */
  it('quick extraction finds dialogue lines', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const lines = extractDialogueLinesQuick(screenplay);
        expect(lines.length).toBeGreaterThan(0);
        return lines.length > 0;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 2: Dialogue Contains Natural Patterns
// **Validates: Requirements 1.3**
// ============================================================================

describe('Property 2: Dialogue Contains Natural Patterns', () => {
  /**
   * Property 2.1: Text with contractions has natural patterns
   * **Validates: Requirements 1.3**
   */
  it('text with contractions has natural patterns', () => {
    fc.assert(
      fc.property(contractionArb, (contraction) => {
        const text = `M: ${contraction} going to the store.`;
        const result = hasNaturalDialoguePatterns(text);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.2: Text with reactions has natural patterns
   * **Validates: Requirements 1.3**
   */
  it('text with reactions has natural patterns', () => {
    fc.assert(
      fc.property(reactionArb, (reaction) => {
        const text = `F: ${reaction} That is interesting.`;
        const result = hasNaturalDialoguePatterns(text);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.3: Natural dialogue examples pass validation
   * **Validates: Requirements 1.3**
   */
  it('natural dialogue examples pass validation', () => {
    fc.assert(
      fc.property(naturalDialogueArb, (dialogue) => {
        const result = hasNaturalDialoguePatterns(dialogue);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.4: Valid screenplays contain natural patterns
   * **Validates: Requirements 1.3**
   */
  it('valid screenplays contain natural patterns', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const result = hasNaturalDialoguePatterns(screenplay);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.5: Combining contractions and reactions creates natural text
   * **Validates: Requirements 1.3**
   */
  it('combining contractions and reactions creates natural text', () => {
    fc.assert(
      fc.property(contractionArb, reactionArb, (contraction, reaction) => {
        const text = `M: ${reaction} ${contraction} so happy about this!`;
        const result = hasNaturalDialoguePatterns(text);
        expect(result).toBe(true);
        return result === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.6: Case insensitivity for contractions
   * **Validates: Requirements 1.3**
   */
  it('case insensitivity for contractions', () => {
    fc.assert(
      fc.property(
        contractionArb,
        fc.constantFrom('lower', 'upper', 'mixed'),
        (contraction, caseType) => {
          let testContraction: string;
          switch (caseType) {
            case 'upper':
              testContraction = contraction.toUpperCase();
              break;
            case 'lower':
              testContraction = contraction.toLowerCase();
              break;
            case 'mixed':
              testContraction =
                contraction.charAt(0).toUpperCase() + contraction.slice(1).toLowerCase();
              break;
            default:
              testContraction = contraction;
          }
          const text = `M: ${testContraction} going to the store.`;
          const result = hasNaturalDialoguePatterns(text);
          expect(result).toBe(true);
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.7: Multiple dialogue lines increase chance of natural patterns
   * **Validates: Requirements 1.3**
   */
  it('multiple dialogue lines with at least one natural pattern', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(naturalDialogueArb, formalDialogueArb), {
          minLength: 2,
          maxLength: 5,
        }),
        (dialogueLines) => {
          // Ensure at least one natural line
          const hasNatural = dialogueLines.some((line) => NATURAL_DIALOGUE_EXAMPLES.includes(line));
          if (!hasNatural) return true; // Skip if no natural lines

          const combinedText = dialogueLines.join('\n');
          const result = hasNaturalDialoguePatterns(combinedText);
          expect(result).toBe(true);
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Additional Parser Tests
// ============================================================================

describe('Screenplay Parser Properties', () => {
  /**
   * Parser extracts title correctly
   */
  it('parser extracts title from screenplay', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const result = parseScreenplay(screenplay);
        if (!result.success || !result.screenplay) return true;

        expect(result.screenplay.title).toBeDefined();
        expect(result.screenplay.title.length).toBeGreaterThan(0);
        return result.screenplay.title.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Parser extracts characters correctly
   */
  it('parser extracts characters from screenplay', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const result = parseScreenplay(screenplay);
        if (!result.success || !result.screenplay) return true;

        expect(result.screenplay.characters.length).toBeGreaterThan(0);
        result.screenplay.characters.forEach((char) => {
          expect(['M', 'F']).toContain(char.id);
          expect(char.name.length).toBeGreaterThan(0);
        });
        return result.screenplay.characters.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Parser preserves raw text
   */
  it('parser preserves raw text', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const result = parseScreenplay(screenplay);
        if (!result.success || !result.screenplay) return true;

        expect(result.screenplay.rawText).toBe(screenplay);
        return result.screenplay.rawText === screenplay;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Parser rejects JSON input
   */
  it('parser rejects JSON input', () => {
    fc.assert(
      fc.property(jsonTextArb, (json) => {
        const result = parseScreenplay(json);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        return !result.success;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Dialogue lines have valid speakers
   */
  it('dialogue lines have valid speakers', () => {
    fc.assert(
      fc.property(validScreenplayArb, (screenplay) => {
        const result = parseScreenplay(screenplay);
        if (!result.success || !result.screenplay) return true;

        for (const scene of result.screenplay.scenes) {
          for (const line of scene.dialogue) {
            expect(['M', 'F', 'NARRATOR']).toContain(line.speaker);
          }
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
