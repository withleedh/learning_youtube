import { z } from 'zod';

// Category enum for comparison segments
export const comparisonCategorySchema = z.enum([
  'daily', // 일상
  'business', // 비즈니스
  'emotion', // 감정표현
  'request_reject', // 요청/거절
  'apology_thanks', // 사과/감사
]);

// Difficulty level for expressions
export const difficultySchema = z.enum(['A2', 'B1', 'B2', 'C1']);

// Korean expression schema (❌ 표시)
export const koreanExpressionSchema = z.object({
  text: z.string().min(1, 'Korean expression text is required'),
  literal: z.string().optional(), // 직역 (선택)
});

// Native expression schema (⭕ 표시)
export const nativeExpressionSchema = z.object({
  text: z.string().min(1, 'Native expression text is required'),
  note: z.string().optional(), // 뉘앙스 설명 (선택)
});

// Comparison segment schema - 단일 비교 콘텐츠 단위
export const comparisonSegmentSchema = z.object({
  id: z.number().int().positive(),
  category: comparisonCategorySchema,
  situation: z.string().min(1, 'Situation description is required'), // 상황 설명 (한국어)
  koreanExpression: koreanExpressionSchema,
  nativeExpression: nativeExpressionSchema,
  explanation: z.string().min(1, 'Explanation is required'), // 왜 다른지 간단 설명
  difficulty: difficultySchema.optional(), // 난이도 메타데이터
});

// Hook schema for intro
export const hookSchema = z.object({
  text: z.string().min(1, 'Hook text is required'), // "90%가 틀리는 영어"
  subtext: z.string().optional(), // "당신도 이렇게 말하고 있을지도..."
});

// CTA schema for ending
export const ctaSchema = z.object({
  question: z.string().min(1, 'CTA question is required'), // "몇 개나 알고 계셨나요?"
  reminder: z.string().min(1, 'CTA reminder is required'), // "구독과 좋아요 부탁드려요"
});

// Title schema
export const titleSchema = z.object({
  korean: z.string().min(1, 'Korean title is required'), // "한국인 vs 원어민 일상편 #1"
  english: z.string().min(1, 'English title is required'), // "Korean vs Native - Daily #1"
});

// Comparison script schema - 전체 비교 콘텐츠 스크립트
export const comparisonScriptSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  title: titleSchema,
  hook: hookSchema,
  hookVariants: z.array(hookSchema).min(3).max(5).optional(), // Hook A/B 테스트용 변형
  segments: z.array(comparisonSegmentSchema).min(25).max(35),
  cta: ctaSchema,
});

// TypeScript types inferred from Zod schemas
export type ComparisonCategory = z.infer<typeof comparisonCategorySchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type KoreanExpression = z.infer<typeof koreanExpressionSchema>;
export type NativeExpression = z.infer<typeof nativeExpressionSchema>;
export type ComparisonSegment = z.infer<typeof comparisonSegmentSchema>;
export type Hook = z.infer<typeof hookSchema>;
export type CTA = z.infer<typeof ctaSchema>;
export type Title = z.infer<typeof titleSchema>;
export type ComparisonScript = z.infer<typeof comparisonScriptSchema>;

// Category display names (Korean)
export const CATEGORY_NAMES: Record<ComparisonCategory, string> = {
  daily: '일상',
  business: '비즈니스',
  emotion: '감정표현',
  request_reject: '요청/거절',
  apology_thanks: '사과/감사',
};

// Difficulty display names
export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  A2: '초급',
  B1: '중급',
  B2: '중상급',
  C1: '고급',
};
