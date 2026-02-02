/**
 * Wrong Choice Generator Module
 *
 * Generates phonetically similar wrong choices for fill-in-the-blank quizzes.
 * Ensures all choices are single words (no phrases) and different from the answer.
 *
 * @module wrong-choice-generator
 * **Validates: Requirements 2.4, 6.3**
 */

// ============================================================================
// Phonetic Similarity Database
// ============================================================================

/**
 * Common phonetic patterns and their similar-sounding alternatives.
 * Used to generate wrong choices that sound similar to the correct answer.
 */
const PHONETIC_PATTERNS: Array<{
  pattern: RegExp;
  alternatives: string[];
}> = [
  // -ing endings
  { pattern: /^(.+)ing$/, alternatives: ['eating', 'beating', 'meeting', 'seating', 'heating'] },
  // -tion endings
  {
    pattern: /^(.+)tion$/,
    alternatives: ['station', 'nation', 'action', 'section', 'mention'],
  },
  // -ful endings
  {
    pattern: /^(.+)ful$/,
    alternatives: ['beautiful', 'wonderful', 'careful', 'helpful', 'powerful'],
  },
  // -ly endings
  { pattern: /^(.+)ly$/, alternatives: ['really', 'finally', 'usually', 'actually', 'totally'] },
  // -er endings
  { pattern: /^(.+)er$/, alternatives: ['better', 'letter', 'matter', 'water', 'after'] },
  // -ed endings
  { pattern: /^(.+)ed$/, alternatives: ['started', 'wanted', 'needed', 'waited', 'created'] },
];

/**
 * Word pairs that sound similar (minimal pairs and near-homophones).
 */
const SIMILAR_SOUNDING_PAIRS: Record<string, string[]> = {
  // Common minimal pairs
  walk: ['work', 'talk', 'woke'],
  work: ['walk', 'word', 'worth'],
  play: ['pay', 'pray', 'place'],
  right: ['light', 'write', 'night'],
  hear: ['here', 'hair', 'hare'],
  their: ['there', 'they', 'dare'],
  meet: ['meat', 'met', 'beat'],
  coffee: ['copy', 'coughing', 'toffee'],
  morning: ['mourning', 'warning', 'forming'],
  familiar: ['similar', 'family', 'familiar'],
  remember: ['remember', 'member', 'december'],
  beautiful: ['dutiful', 'bountiful', 'plentiful'],
  delicious: ['suspicious', 'malicious', 'ambitious'],
  adventure: ['venture', 'denture', 'culture'],
  restaurant: ['resistant', 'distant', 'instant'],
  experience: ['experiment', 'expensive', 'existence'],
  excited: ['existed', 'expected', 'excepted'],
  surprised: ['supposed', 'supplied', 'survived'],
  wonderful: ['wanderful', 'powerful', 'colorful'],
  amazing: ['amusing', 'blazing', 'grazing'],
  incredible: ['edible', 'credible', 'terrible'],
  fantastic: ['plastic', 'drastic', 'elastic'],
  journey: ['journey', 'tourney', 'attorney'],
  discover: ['recover', 'uncover', 'deliver'],
  explore: ['implore', 'restore', 'adore'],
  imagine: ['imagine', 'engine', 'margin'],
  create: ['great', 'crate', 'grate'],
  travel: ['gravel', 'ravel', 'gavel'],
  arrive: ['alive', 'derive', 'revive'],
  enjoy: ['employ', 'annoy', 'destroy'],
  // Common verbs
  looking: ['cooking', 'booking', 'hooking'],
  coming: ['coming', 'humming', 'running'],
  going: ['growing', 'showing', 'knowing'],
  making: ['taking', 'baking', 'waking'],
  getting: ['setting', 'betting', 'letting'],
  thinking: ['drinking', 'sinking', 'linking'],
  feeling: ['dealing', 'healing', 'sealing'],
  // Common nouns
  house: ['mouse', 'horse', 'hours'],
  friend: ['trend', 'blend', 'spend'],
  family: ['finally', 'formally', 'famously'],
  money: ['honey', 'funny', 'sunny'],
  story: ['sorry', 'glory', 'worry'],
  // Common adjectives
  happy: ['snappy', 'nappy', 'sappy'],
  sorry: ['worry', 'hurry', 'curry'],
  ready: ['steady', 'already', 'heavy'],
  busy: ['dizzy', 'fuzzy', 'easy'],
};

/**
 * Rhyming word database for generating similar-sounding alternatives.
 */
const RHYME_PATTERNS: Record<string, string[]> = {
  // -ake words
  ake: ['make', 'take', 'wake', 'bake', 'cake', 'lake', 'fake', 'shake'],
  // -ate words
  ate: ['late', 'gate', 'date', 'rate', 'hate', 'fate', 'mate', 'state'],
  // -ight words
  ight: ['light', 'night', 'right', 'sight', 'fight', 'might', 'tight', 'bright'],
  // -ound words
  ound: ['found', 'sound', 'round', 'ground', 'bound', 'pound', 'wound'],
  // -ong words
  ong: ['long', 'song', 'wrong', 'strong', 'along', 'belong'],
  // -ack words
  ack: ['back', 'pack', 'black', 'track', 'stack', 'crack', 'snack'],
  // -all words
  all: ['call', 'fall', 'ball', 'tall', 'wall', 'small', 'hall'],
  // -ell words
  ell: ['tell', 'well', 'sell', 'bell', 'fell', 'spell', 'smell'],
  // -ill words
  ill: ['will', 'fill', 'still', 'bill', 'kill', 'skill', 'spill'],
  // -ock words
  ock: ['rock', 'lock', 'clock', 'block', 'knock', 'stock', 'shock'],
  // -uck words
  uck: ['luck', 'duck', 'truck', 'stuck', 'chuck'],
  // -eep words
  eep: ['keep', 'deep', 'sleep', 'sheep', 'steep', 'sweep'],
  // -oom words
  oom: ['room', 'boom', 'zoom', 'bloom', 'broom', 'gloom'],
  // -ool words
  ool: ['cool', 'pool', 'tool', 'fool', 'school'],
  // -ear words
  ear: ['hear', 'near', 'dear', 'fear', 'year', 'clear'],
  // -ore words
  ore: ['more', 'store', 'before', 'explore', 'ignore', 'restore'],
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate wrong choices for a blank answer.
 *
 * Creates 2 phonetically similar single words that are different
 * from the correct answer.
 *
 * @param blankAnswer - The correct answer word
 * @param count - Number of wrong choices to generate (default: 2)
 * @returns Array of wrong choice words
 *
 * **Validates: Requirements 2.4, 6.3**
 */
export function generateWrongChoices(blankAnswer: string, count: number = 2): string[] {
  const normalized = blankAnswer.toLowerCase().trim();
  const choices: string[] = [];

  // Strategy 1: Check if we have pre-defined similar words
  if (SIMILAR_SOUNDING_PAIRS[normalized]) {
    const similar = SIMILAR_SOUNDING_PAIRS[normalized].filter(
      (w) => w.toLowerCase() !== normalized
    );
    choices.push(...similar.slice(0, count));
  }

  // Strategy 2: Find rhyming words
  if (choices.length < count) {
    const rhymes = findRhymingWords(normalized);
    for (const rhyme of rhymes) {
      if (choices.length >= count) break;
      if (!choices.includes(rhyme) && rhyme.toLowerCase() !== normalized) {
        choices.push(rhyme);
      }
    }
  }

  // Strategy 3: Generate based on phonetic patterns
  if (choices.length < count) {
    const patternBased = generateFromPatterns(normalized);
    for (const word of patternBased) {
      if (choices.length >= count) break;
      if (!choices.includes(word) && word.toLowerCase() !== normalized) {
        choices.push(word);
      }
    }
  }

  // Strategy 4: Simple letter substitution fallback
  if (choices.length < count) {
    const substituted = generateBySubstitution(normalized);
    for (const word of substituted) {
      if (choices.length >= count) break;
      if (!choices.includes(word) && word.toLowerCase() !== normalized) {
        choices.push(word);
      }
    }
  }

  // Ensure we have exactly the requested count
  while (choices.length < count) {
    // Fallback: use generic similar-sounding words
    const fallbacks = ['something', 'nothing', 'anything', 'everything'];
    for (const fb of fallbacks) {
      if (!choices.includes(fb) && fb !== normalized) {
        choices.push(fb);
        break;
      }
    }
  }

  return choices.slice(0, count);
}

/**
 * Check if a wrong choice is valid.
 *
 * A valid wrong choice:
 * - Is a single word (no spaces)
 * - Is different from the blank answer
 * - Is not empty
 *
 * @param wrongChoice - The wrong choice to validate
 * @param blankAnswer - The correct answer to compare against
 * @returns true if valid, false otherwise
 *
 * **Validates: Requirements 2.4, 6.3**
 */
export function isValidWrongChoice(wrongChoice: string, blankAnswer: string): boolean {
  // Must not be empty
  if (!wrongChoice || wrongChoice.trim().length === 0) {
    return false;
  }

  // Must be a single word (no spaces)
  if (wrongChoice.includes(' ')) {
    return false;
  }

  // Must be different from blank answer
  if (wrongChoice.toLowerCase().trim() === blankAnswer.toLowerCase().trim()) {
    return false;
  }

  return true;
}

/**
 * Validate all wrong choices for a sentence.
 *
 * @param wrongChoices - Array of wrong choices
 * @param blankAnswer - The correct answer
 * @returns true if all choices are valid, false otherwise
 */
export function areAllWrongChoicesValid(
  wrongChoices: string[] | undefined,
  blankAnswer: string
): boolean {
  if (!wrongChoices || wrongChoices.length === 0) {
    return true; // Empty is valid (optional field)
  }

  return wrongChoices.every((choice) => isValidWrongChoice(choice, blankAnswer));
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find rhyming words for a given word.
 */
function findRhymingWords(word: string): string[] {
  const results: string[] = [];

  // Check each rhyme pattern
  for (const [ending, rhymes] of Object.entries(RHYME_PATTERNS)) {
    if (word.endsWith(ending)) {
      const filtered = rhymes.filter((r) => r.toLowerCase() !== word.toLowerCase());
      results.push(...filtered);
    }
  }

  return results;
}

/**
 * Generate similar words based on phonetic patterns.
 */
function generateFromPatterns(word: string): string[] {
  const results: string[] = [];

  for (const { pattern, alternatives } of PHONETIC_PATTERNS) {
    if (pattern.test(word)) {
      const filtered = alternatives.filter((a) => a.toLowerCase() !== word.toLowerCase());
      results.push(...filtered);
    }
  }

  return results;
}

/**
 * Generate similar words by letter substitution.
 *
 * Creates words that look/sound similar by changing one letter.
 */
function generateBySubstitution(word: string): string[] {
  const results: string[] = [];

  // Common letter substitutions that create similar sounds
  const substitutions: Record<string, string[]> = {
    a: ['e', 'o'],
    e: ['a', 'i'],
    i: ['e', 'y'],
    o: ['a', 'u'],
    u: ['o', 'a'],
    b: ['p', 'd'],
    d: ['t', 'b'],
    f: ['v', 'ph'],
    g: ['k', 'j'],
    k: ['c', 'g'],
    l: ['r', 'n'],
    m: ['n', 'w'],
    n: ['m', 'ng'],
    p: ['b', 't'],
    r: ['l', 'w'],
    s: ['z', 'c'],
    t: ['d', 'p'],
    v: ['f', 'w'],
    w: ['v', 'r'],
    z: ['s', 'x'],
  };

  // Try substituting each letter
  for (let i = 0; i < word.length; i++) {
    const char = word[i].toLowerCase();
    if (substitutions[char]) {
      for (const sub of substitutions[char]) {
        const newWord = word.slice(0, i) + sub + word.slice(i + 1);
        if (newWord !== word && isLikelyRealWord(newWord)) {
          results.push(newWord);
        }
      }
    }
  }

  return results;
}

/**
 * Simple heuristic to check if a word is likely real.
 *
 * This is a basic check - in production, you'd use a dictionary.
 */
function isLikelyRealWord(word: string): boolean {
  // Must have at least one vowel
  if (!/[aeiou]/i.test(word)) {
    return false;
  }

  // Must not have more than 2 consecutive consonants at start
  if (/^[^aeiou]{3,}/i.test(word)) {
    return false;
  }

  // Must not have more than 3 consecutive consonants anywhere
  if (/[^aeiou]{4,}/i.test(word)) {
    return false;
  }

  return true;
}

/**
 * Get phonetic similarity score between two words.
 *
 * Higher score = more similar sounding.
 *
 * @param word1 - First word
 * @param word2 - Second word
 * @returns Similarity score from 0-100
 */
export function getPhoneticSimilarity(word1: string, word2: string): number {
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();

  let score = 0;

  // Same length bonus
  if (w1.length === w2.length) {
    score += 20;
  } else if (Math.abs(w1.length - w2.length) === 1) {
    score += 10;
  }

  // Same starting letter
  if (w1[0] === w2[0]) {
    score += 15;
  }

  // Same ending
  const minLen = Math.min(w1.length, w2.length);
  for (let i = 1; i <= Math.min(3, minLen); i++) {
    if (w1.slice(-i) === w2.slice(-i)) {
      score += i * 10;
    }
  }

  // Shared letters
  const letters1 = new Set(w1.split(''));
  const letters2 = new Set(w2.split(''));
  const shared = [...letters1].filter((l) => letters2.has(l)).length;
  score += (shared / Math.max(letters1.size, letters2.size)) * 30;

  return Math.min(100, score);
}
