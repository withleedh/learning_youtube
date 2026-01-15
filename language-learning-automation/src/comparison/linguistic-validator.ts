/**
 * Linguistic Validator - 원어민 표현 검증 (영어 뉘앙스 QA)
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * - 금칙 패턴 DB (교과서적 표현 필터링)
 * - 표현 자연스러움 검증
 * - 대안 표현 제안
 * - confidence score 반환
 */

import { z } from 'zod';

// Validation result schema
export const validationResultSchema = z.object({
  status: z.enum(['passed', 'failed', 'warning']),
  expression: z.string(),
  confidenceScore: z.number().min(0).max(1),
  matchedPatterns: z.array(z.string()),
  suggestions: z.array(z.string()),
  reason: z.string().optional(),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

// Forbidden pattern definition
export interface ForbiddenPattern {
  pattern: RegExp;
  name: string;
  description: string;
  suggestions: string[];
  severity: 'error' | 'warning';
}

/**
 * Forbidden patterns database - 교과서적/어색한 표현 필터링
 *
 * These patterns detect common Korean-English mistakes that sound
 * unnatural to native speakers.
 */
export const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  // Overly formal apologies
  {
    pattern: /\bI am sorry for bothering you\b/i,
    name: 'overly-formal-apology',
    description: 'Too formal and textbook-like apology',
    suggestions: ['Sorry to bother you', 'Sorry to bug you', "Hope I'm not bothering you"],
    severity: 'error',
  },
  {
    pattern: /\bI am sorry to disturb you\b/i,
    name: 'formal-disturb-apology',
    description: 'Overly formal disturbance apology',
    suggestions: ['Sorry to interrupt', 'Sorry to bother you'],
    severity: 'error',
  },
  {
    pattern: /\b(I|We) apologize for the inconvenience\b/i,
    name: 'corporate-apology',
    description: 'Sounds like corporate/customer service speak',
    suggestions: ['Sorry about that', 'My bad', 'Sorry for the trouble'],
    severity: 'warning',
  },

  // Textbook greetings
  {
    pattern: /\bHow do you do\b/i,
    name: 'archaic-greeting',
    description: 'Archaic greeting rarely used in modern English',
    suggestions: ['Nice to meet you', 'Good to meet you', "How's it going?"],
    severity: 'error',
  },
  {
    pattern: /\bI am fine,? thank you,? and you\b/i,
    name: 'textbook-response',
    description: 'Classic textbook response, sounds robotic',
    suggestions: ["I'm good, thanks!", 'Pretty good, you?', 'Not bad, how about you?'],
    severity: 'error',
  },

  // Overly polite requests
  {
    pattern: /\bWould you mind if I\b/i,
    name: 'overly-polite-request',
    description: 'Can sound overly formal in casual contexts',
    suggestions: ['Can I...?', 'Mind if I...?', 'Is it okay if I...?'],
    severity: 'warning',
  },
  {
    pattern: /\bI would like to\b/i,
    name: 'formal-would-like',
    description: 'Formal; casual speech uses contractions',
    suggestions: ["I'd like to", 'I want to', 'I wanna'],
    severity: 'warning',
  },

  // Direct translations from Korean
  {
    pattern: /\bPlease understand\b/i,
    name: 'korean-direct-translation',
    description: 'Direct translation from Korean 이해해주세요',
    suggestions: ['I hope you understand', 'I appreciate your understanding', 'Bear with me'],
    severity: 'error',
  },
  {
    pattern: /\bI will go to home\b/i,
    name: 'incorrect-home-usage',
    description: 'Incorrect use of "to" before "home"',
    suggestions: ["I'm going home", "I'm heading home", "I'll head home"],
    severity: 'error',
  },
  {
    pattern: /\bgo to home\b/i,
    name: 'incorrect-go-home',
    description: 'Incorrect: "go to home" should be "go home"',
    suggestions: ['go home', 'head home', 'get home'],
    severity: 'error',
  },
  {
    pattern: /\bFighting!?/i,
    name: 'konglish-fighting',
    description: 'Konglish expression not used in English',
    suggestions: ['You got this!', 'Go for it!', 'Good luck!', 'You can do it!'],
    severity: 'error',
  },

  // Awkward time expressions
  {
    pattern: /\bafter \d+ days?\b/i,
    name: 'awkward-time-expression',
    description: 'Awkward time expression',
    suggestions: ['in X days', 'X days later', 'X days from now'],
    severity: 'warning',
  },

  // Overly literal expressions
  {
    pattern: /\bI have a problem\b/i,
    name: 'literal-problem',
    description: 'Can sound dramatic; often better alternatives exist',
    suggestions: ["I'm having trouble with", "I'm stuck on", 'I need help with'],
    severity: 'warning',
  },
  {
    pattern: /\bI cannot\b/i,
    name: 'formal-cannot',
    description: 'Formal; casual speech uses contractions',
    suggestions: ["I can't", "I'm not able to"],
    severity: 'warning',
  },
  {
    pattern: /\bI do not\b/i,
    name: 'formal-do-not',
    description: 'Formal; casual speech uses contractions',
    suggestions: ["I don't"],
    severity: 'warning',
  },

  // Awkward politeness
  {
    pattern: /\bThank you very much for your help\b/i,
    name: 'overly-formal-thanks',
    description: 'Overly formal thanks',
    suggestions: ['Thanks so much!', 'Thanks a lot!', 'Really appreciate it!'],
    severity: 'warning',
  },
  {
    pattern: /\bI am very sorry\b/i,
    name: 'formal-very-sorry',
    description: 'Formal; casual speech uses contractions',
    suggestions: ["I'm so sorry", "I'm really sorry"],
    severity: 'warning',
  },

  // Incorrect articles/prepositions
  {
    pattern: /\bin the morning of\b/i,
    name: 'incorrect-morning-preposition',
    description: 'Incorrect preposition usage',
    suggestions: ['on the morning of'],
    severity: 'error',
  },

  // Konglish expressions
  {
    pattern: /\bskin ?ship\b/i,
    name: 'konglish-skinship',
    description: 'Konglish term not used in English',
    suggestions: ['physical affection', 'physical contact', 'PDA'],
    severity: 'error',
  },
  {
    pattern: /\bhand phone\b/i,
    name: 'konglish-handphone',
    description: 'Konglish term for mobile phone',
    suggestions: ['cell phone', 'mobile phone', 'phone'],
    severity: 'error',
  },
  {
    pattern: /\bmeeting\b.*\bblind date\b|\bblind date\b.*\bmeeting\b/i,
    name: 'konglish-meeting',
    description: 'Korean "미팅" meaning is different from English "meeting"',
    suggestions: ['blind date', 'group date', 'set up'],
    severity: 'warning',
  },

  // Unnatural sentence starters
  {
    pattern: /^I think that\b/i,
    name: 'formal-think-that',
    description: '"that" is often dropped in casual speech',
    suggestions: ['I think...', 'I feel like...', 'I guess...'],
    severity: 'warning',
  },
];

/**
 * LinguisticValidator class - validates English expressions for naturalness
 */
export class LinguisticValidator {
  private patterns: ForbiddenPattern[];
  private customPatterns: ForbiddenPattern[];

  constructor(customPatterns: ForbiddenPattern[] = []) {
    this.patterns = FORBIDDEN_PATTERNS;
    this.customPatterns = customPatterns;
  }

  /**
   * Get all patterns (built-in + custom)
   */
  getAllPatterns(): ForbiddenPattern[] {
    return [...this.patterns, ...this.customPatterns];
  }

  /**
   * Add custom forbidden pattern
   */
  addPattern(pattern: ForbiddenPattern): void {
    this.customPatterns.push(pattern);
  }

  /**
   * Validate a single expression
   * Returns validation result with confidence score and suggestions
   */
  validateExpression(expression: string): ValidationResult {
    const allPatterns = this.getAllPatterns();
    const matchedPatterns: string[] = [];
    const allSuggestions: string[] = [];
    let hasError = false;
    let hasWarning = false;

    // Check against all forbidden patterns
    for (const forbiddenPattern of allPatterns) {
      if (forbiddenPattern.pattern.test(expression)) {
        matchedPatterns.push(forbiddenPattern.name);
        allSuggestions.push(...forbiddenPattern.suggestions);

        if (forbiddenPattern.severity === 'error') {
          hasError = true;
        } else {
          hasWarning = true;
        }
      }
    }

    // Calculate confidence score
    // 1.0 = no issues, 0.0 = many issues
    const confidenceScore = this.calculateConfidenceScore(expression, matchedPatterns, hasError);

    // Determine status
    let status: 'passed' | 'failed' | 'warning';
    if (hasError) {
      status = 'failed';
    } else if (hasWarning) {
      status = 'warning';
    } else {
      status = 'passed';
    }

    // Remove duplicate suggestions
    const uniqueSuggestions = [...new Set(allSuggestions)];

    // Build reason string
    let reason: string | undefined;
    if (matchedPatterns.length > 0) {
      const patternDescriptions = matchedPatterns
        .map((name) => {
          const pattern = allPatterns.find((p) => p.name === name);
          return pattern?.description || name;
        })
        .join('; ');
      reason = patternDescriptions;
    }

    return {
      status,
      expression,
      confidenceScore,
      matchedPatterns,
      suggestions: uniqueSuggestions,
      reason,
    };
  }

  /**
   * Validate multiple expressions
   */
  validateExpressions(expressions: string[]): ValidationResult[] {
    return expressions.map((expr) => this.validateExpression(expr));
  }

  /**
   * Check if expression matches any forbidden pattern
   */
  matchesForbiddenPattern(expression: string): boolean {
    const allPatterns = this.getAllPatterns();
    return allPatterns.some((p) => p.pattern.test(expression));
  }

  /**
   * Get suggestions for an expression
   */
  getSuggestions(expression: string): string[] {
    const result = this.validateExpression(expression);
    return result.suggestions;
  }

  /**
   * Calculate confidence score based on expression analysis
   */
  private calculateConfidenceScore(
    expression: string,
    matchedPatterns: string[],
    _hasError: boolean
  ): number {
    // Base score starts at 1.0
    let score = 1.0;

    // Deduct for each matched pattern
    const errorPatterns = matchedPatterns.filter((name) => {
      const pattern = this.getAllPatterns().find((p) => p.name === name);
      return pattern?.severity === 'error';
    });
    const warningPatterns = matchedPatterns.filter((name) => {
      const pattern = this.getAllPatterns().find((p) => p.name === name);
      return pattern?.severity === 'warning';
    });

    // Error patterns have higher penalty
    score -= errorPatterns.length * 0.3;
    score -= warningPatterns.length * 0.1;

    // Additional penalty for very formal language indicators
    if (/\bI am\b/.test(expression) && !/\bI am not\b/.test(expression)) {
      score -= 0.05; // Slight penalty for uncontracted "I am"
    }

    // Bonus for natural contractions
    if (/\b(I'm|don't|can't|won't|isn't|aren't|wasn't|weren't)\b/.test(expression)) {
      score += 0.05;
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(1, score));
  }
}

/**
 * Create a default validator instance
 */
export function createLinguisticValidator(
  customPatterns: ForbiddenPattern[] = []
): LinguisticValidator {
  return new LinguisticValidator(customPatterns);
}

/**
 * Quick validation function for single expression
 */
export function validateExpression(expression: string): ValidationResult {
  const validator = new LinguisticValidator();
  return validator.validateExpression(expression);
}

/**
 * Check if expression is valid (no errors)
 */
export function isValidExpression(expression: string): boolean {
  const result = validateExpression(expression);
  return result.status !== 'failed';
}
