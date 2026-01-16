/**
 * SEO Generator for Survival Quiz
 *
 * Generates SEO metadata for YouTube videos:
 * - Title variations
 * - Description with timestamps
 * - Tags
 * - Pinned comment suggestions
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { SurvivalScript, CHARACTER_INFO } from './types';
import { generateTimestampsText, TimestampConfig } from './timestamps';

// =============================================================================
// Types
// =============================================================================

export interface SEOMetadata {
  /** Primary title */
  title: string;
  /** Alternative title variations */
  titleVariations: string[];
  /** Video description */
  description: string;
  /** Tags for the video */
  tags: string[];
  /** Suggested pinned comment */
  pinnedComment: string;
}

export interface SEOGeneratorConfig {
  /** Channel name */
  channelName?: string;
  /** Include timestamps in description */
  includeTimestamps?: boolean;
  /** Timestamp configuration */
  timestampConfig?: Partial<TimestampConfig>;
  /** Additional tags */
  additionalTags?: string[];
  /** Language for SEO (ko/en) */
  language?: 'ko' | 'en';
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: Required<SEOGeneratorConfig> = {
  channelName: '',
  includeTimestamps: true,
  timestampConfig: {},
  additionalTags: [],
  language: 'ko',
};

// Base tags for survival quiz content
const BASE_TAGS_KO = [
  '영어공부',
  '영어회화',
  '영어퀴즈',
  '콩글리시',
  '원어민영어',
  '영어표현',
  '생활영어',
  '영어학습',
  '영어교육',
  '영어듣기',
  '서바이벌퀴즈',
  '고양이vs강아지',
  '영어게임',
  '영어챌린지',
];

const BASE_TAGS_EN = [
  'English learning',
  'English quiz',
  'Konglish',
  'Native English',
  'English expressions',
  'Daily English',
  'English study',
  'Survival quiz',
  'Cat vs Dog',
  'English game',
  'English challenge',
  'Learn English',
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate title variations for A/B testing
 */
function generateTitleVariations(script: SurvivalScript, language: 'ko' | 'en'): string[] {
  const catEmoji = CHARACTER_INFO.cat.emoji;
  const dogEmoji = CHARACTER_INFO.dog.emoji;
  const catName = language === 'ko' ? CHARACTER_INFO.cat.nameKorean : CHARACTER_INFO.cat.name;
  const dogName = language === 'ko' ? CHARACTER_INFO.dog.nameKorean : CHARACTER_INFO.dog.name;

  if (language === 'ko') {
    return [
      `${catEmoji} vs ${dogEmoji} 50라운드 영어 서바이벌! 틀리면 바닥이 열립니다`,
      `${catName} vs ${dogName} 영어 대결! 50문제 서바이벌 퀴즈`,
      `콩글리시 vs 원어민 영어! ${catEmoji}${dogEmoji} 50라운드 서바이벌`,
      `영어 틀리면 탈락! ${catEmoji} vs ${dogEmoji} 서바이벌 퀴즈 50문제`,
      `${catEmoji}${dogEmoji} 영어 서바이벌! 누가 끝까지 살아남을까?`,
    ];
  } else {
    return [
      `${catEmoji} vs ${dogEmoji} 50-Round English Survival! Wrong = Floor Drop`,
      `${catName} vs ${dogName} English Battle! 50 Questions Survival Quiz`,
      `Konglish vs Native English! ${catEmoji}${dogEmoji} 50-Round Survival`,
      `Wrong English = Elimination! ${catEmoji} vs ${dogEmoji} Survival Quiz`,
      `${catEmoji}${dogEmoji} English Survival! Who Will Survive?`,
    ];
  }
}

/**
 * Generate video description
 */
function generateDescription(script: SurvivalScript, config: Required<SEOGeneratorConfig>): string {
  const { channelName, includeTimestamps, timestampConfig, language } = config;
  const catEmoji = CHARACTER_INFO.cat.emoji;
  const dogEmoji = CHARACTER_INFO.dog.emoji;

  const lines: string[] = [];

  // Intro paragraph
  if (language === 'ko') {
    lines.push(`${catEmoji} 고양이 vs ${dogEmoji} 강아지 50라운드 영어 서바이벌!`);
    lines.push('');
    lines.push('한국인이 자주 틀리는 콩글리시 vs 원어민 표현!');
    lines.push('틀리면 바닥이 열리고 HP가 깎입니다 💔');
    lines.push('과연 누가 끝까지 살아남을까요?');
  } else {
    lines.push(`${catEmoji} Cat vs ${dogEmoji} Dog 50-Round English Survival!`);
    lines.push('');
    lines.push('Konglish vs Native English expressions!');
    lines.push('Wrong answer = Floor drops and HP decreases 💔');
    lines.push('Who will survive until the end?');
  }

  lines.push('');

  // Timestamps
  if (includeTimestamps) {
    if (language === 'ko') {
      lines.push('📍 타임스탬프');
    } else {
      lines.push('📍 Timestamps');
    }
    lines.push(generateTimestampsText(timestampConfig));
    lines.push('');
  }

  // Results teaser
  if (language === 'ko') {
    lines.push(`🏆 결과: ${script.ending.winner === 'cat' ? '고양이' : '강아지'} 승리!`);
    lines.push(
      `   ${catEmoji} ${script.ending.catWins}승 vs ${dogEmoji} ${script.ending.dogWins}승`
    );
  } else {
    lines.push(`🏆 Result: ${script.ending.winner === 'cat' ? 'Cat' : 'Dog'} wins!`);
    lines.push(
      `   ${catEmoji} ${script.ending.catWins} wins vs ${dogEmoji} ${script.ending.dogWins} wins`
    );
  }

  lines.push('');

  // CTA
  if (language === 'ko') {
    lines.push('💬 다음 대결에서는 누가 이길까요? 댓글로 예측해주세요!');
    lines.push('');
    lines.push('🔔 구독과 좋아요는 큰 힘이 됩니다!');
  } else {
    lines.push('💬 Who will win next time? Leave your prediction in the comments!');
    lines.push('');
    lines.push('🔔 Subscribe and like for more content!');
  }

  // Channel name
  if (channelName) {
    lines.push('');
    lines.push(`📺 ${channelName}`);
  }

  // Tags in description
  lines.push('');
  if (language === 'ko') {
    lines.push('#영어공부 #영어퀴즈 #콩글리시 #원어민영어 #서바이벌퀴즈 #고양이vs강아지');
  } else {
    lines.push('#EnglishLearning #EnglishQuiz #Konglish #NativeEnglish #SurvivalQuiz #CatVsDog');
  }

  return lines.join('\n');
}

/**
 * Generate tags for the video
 */
function generateTags(config: Required<SEOGeneratorConfig>): string[] {
  const { additionalTags, language } = config;

  const baseTags = language === 'ko' ? BASE_TAGS_KO : BASE_TAGS_EN;

  return [...baseTags, ...additionalTags];
}

/**
 * Generate pinned comment suggestion
 */
function generatePinnedComment(script: SurvivalScript, language: 'ko' | 'en'): string {
  const catEmoji = CHARACTER_INFO.cat.emoji;
  const dogEmoji = CHARACTER_INFO.dog.emoji;

  if (language === 'ko') {
    return `📢 오늘의 결과: ${script.ending.winner === 'cat' ? '고양이' : '강아지'} 승리! (${script.ending.catWins} vs ${script.ending.dogWins})

${script.ending.ctaQuestion}

${catEmoji} 고양이 → 좋아요
${dogEmoji} 강아지 → 댓글

여러분의 예측을 남겨주세요! 🎯`;
  } else {
    return `📢 Today's Result: ${script.ending.winner === 'cat' ? 'Cat' : 'Dog'} wins! (${script.ending.catWins} vs ${script.ending.dogWins})

Who do you think will win next time?

${catEmoji} Cat → Like
${dogEmoji} Dog → Comment

Leave your prediction! 🎯`;
  }
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Generate complete SEO metadata for a survival quiz video
 */
export function generateSEOMetadata(
  script: SurvivalScript,
  config: Partial<SEOGeneratorConfig> = {}
): SEOMetadata {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const titleVariations = generateTitleVariations(script, fullConfig.language);
  const title = titleVariations[0]; // Primary title
  const description = generateDescription(script, fullConfig);
  const tags = generateTags(fullConfig);
  const pinnedComment = generatePinnedComment(script, fullConfig.language);

  return {
    title,
    titleVariations,
    description,
    tags,
    pinnedComment,
  };
}

/**
 * Generate SEO metadata as formatted text for easy copying
 */
export function generateSEOText(
  script: SurvivalScript,
  config: Partial<SEOGeneratorConfig> = {}
): string {
  const metadata = generateSEOMetadata(script, config);

  const lines: string[] = [];

  lines.push('=== TITLE ===');
  lines.push(metadata.title);
  lines.push('');

  lines.push('=== TITLE VARIATIONS ===');
  metadata.titleVariations.forEach((title, i) => {
    lines.push(`${i + 1}. ${title}`);
  });
  lines.push('');

  lines.push('=== DESCRIPTION ===');
  lines.push(metadata.description);
  lines.push('');

  lines.push('=== TAGS ===');
  lines.push(metadata.tags.join(', '));
  lines.push('');

  lines.push('=== PINNED COMMENT ===');
  lines.push(metadata.pinnedComment);

  return lines.join('\n');
}

/**
 * Export SEO metadata to JSON
 */
export function exportSEOToJSON(
  script: SurvivalScript,
  config: Partial<SEOGeneratorConfig> = {}
): string {
  const metadata = generateSEOMetadata(script, config);
  return JSON.stringify(metadata, null, 2);
}
