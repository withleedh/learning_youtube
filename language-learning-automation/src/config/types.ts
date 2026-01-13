import { z } from 'zod';

// Color hex pattern validation
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');

// Meta section schema
export const metaSchema = z.object({
  name: z.string().min(1, 'Channel name is required'),
  targetLanguage: z.string().min(1, 'Target language is required'),
  nativeLanguage: z.string().min(1, 'Native language is required'),
  youtubeChannelId: z.string().optional(),
});

// Theme section schema
export const themeSchema = z.object({
  logo: z.string().optional().default(''), // 로고 이미지 경로 (없으면 텍스트 폴백)
  introSound: z.string().optional().default(''), // 인트로 사운드 경로 (없으면 무음)
  introBackground: z.string().optional(), // 인트로 배경 이미지 경로
  backgroundStyle: z.string().optional().default('illustration'),
  primaryColor: hexColorSchema.optional().default('#87CEEB'),
  secondaryColor: hexColorSchema.optional().default('#FF69B4'),
});

// Colors section schema
export const colorsSchema = z.object({
  maleText: hexColorSchema,
  femaleText: hexColorSchema,
  nativeText: hexColorSchema,
  wordMeaning: hexColorSchema.optional().default('#888888'),
  background: hexColorSchema.optional().default('#000000'),
});

// Layout section schema
export const layoutSchema = z.object({
  step3ImageRatio: z.number().min(0).max(1).optional().default(0.4),
  subtitlePosition: z.enum(['center', 'bottom']).optional().default('center'),
  speakerIndicator: z.enum(['left', 'none']).optional().default('left'),
});

// TTS section schema
export const ttsSchema = z.object({
  provider: z.enum(['openai', 'google', 'edge']),
  maleVoice: z.string().min(1, 'Male voice is required'),
  femaleVoice: z.string().min(1, 'Female voice is required'),
  targetLanguageCode: z.string().min(1, 'Target language code is required'),
  speed: z.number().min(0.5).max(2.0).optional().default(1.0),
});

// Content section schema
export const contentSchema = z.object({
  sentenceCount: z.number().int().min(1).max(20),
  repeatCount: z.number().int().min(1).max(20),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
});

// UI Labels section schema (for multi-language support)
export const uiLabelsSchema = z.object({
  // Intro labels
  introTitle: z.string().optional().default('오늘의 학습'),
  // Step titles (used in intro and step indicators)
  step1Title: z.string().optional().default('전체 흐름 파악 (자막 없이 듣기)'),
  step2Title: z.string().optional().default('자막으로 내용 이해 하기'),
  step3Title: z.string().optional().default('3단계 반복 듣기'),
  step4Title: z.string().optional().default('기적의 순간 (다시 자막 없이 듣기)'),
  // Step descriptions (for intro)
  step1Desc: z.string().optional().default('자막 없이 소리에만 집중하며, 상황을 상상해보세요.'),
  step2Desc: z.string().optional().default('자막과 함께 들으며, 안 들렸던 부분을 확인하세요.'),
  step3Desc: z.string().optional().default('[느리게-빈칸-빠르게] 반복으로 영어가 들리기 시작해요.'),
  step4Desc: z.string().optional().default('놀랍게 선명해진 영어를 직접 확인해보세요!'),
  // Step3 phase labels
  step3PhaseTitle: z.string().optional().default('STEP 3 · 반복 훈련'),
  phaseIntro: z.string().optional().default('🎧 천천히 듣기'),
  phaseTraining: z.string().optional().default('🧩 빈칸 퀴즈'),
  phaseChallenge: z.string().optional().default('⚡ 빠르게 듣기'),
  phaseReview: z.string().optional().default('✨ 마무리'),
  // Shorts quiz labels
  quizHook: z.string().optional().default('맞추면 영어괴물!'),
});

// Thumbnail section schema
export const thumbnailSchema = z.object({
  /** 썸네일에 표시할 채널명 (meta.name과 다를 수 있음) */
  channelName: z.string().optional(),
  /** 캐릭터 스타일: animals, humans, custom */
  characterStyle: z.enum(['animals', 'humans', 'custom']).optional().default('animals'),
  /** 커스텀 캐릭터 설명 */
  customCharacters: z.string().optional(),
  /** 배경색 */
  backgroundColor: z.string().optional().default('dark blue'),
});

// Shorts Theme section schema
export const shortsThemeSchema = z.object({
  /** Quiz hook text color */
  quizHookColor: hexColorSchema.optional().default('#FF9500'),
  /** CTA question text (e.g., "맞추셨나요? 🎉") */
  ctaQuestion: z.string().optional(),
  /** CTA action text (e.g., "💬 맞추셨다면 댓글 남겨주세요!") */
  ctaText: z.string().optional(),
});

// Full ChannelConfig schema
export const channelConfigSchema = z.object({
  channelId: z.string().regex(/^[a-z_]+$/, 'Channel ID must be lowercase with underscores only'),
  meta: metaSchema,
  theme: themeSchema,
  colors: colorsSchema,
  layout: layoutSchema.optional().default({}),
  tts: ttsSchema,
  content: contentSchema,
  uiLabels: uiLabelsSchema.optional().default({}),
  shortsTheme: shortsThemeSchema.optional().default({}),
  thumbnail: thumbnailSchema.optional().default({}),
});

// TypeScript types inferred from Zod schemas
export type Meta = z.infer<typeof metaSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Colors = z.infer<typeof colorsSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type TTS = z.infer<typeof ttsSchema>;
export type Content = z.infer<typeof contentSchema>;
export type UILabels = z.infer<typeof uiLabelsSchema>;
export type ShortsTheme = z.infer<typeof shortsThemeSchema>;
export type Thumbnail = z.infer<typeof thumbnailSchema>;
export type ChannelConfig = z.infer<typeof channelConfigSchema>;
