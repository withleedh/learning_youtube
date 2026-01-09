import { z } from 'zod';

// Word with meaning schema
export const wordSchema = z.object({
  word: z.string().min(1, 'Word is required'),
  meaning: z.string().min(1, 'Meaning is required'),
});

// Sentence schema
export const sentenceSchema = z.object({
  id: z.number().int().positive(),
  speaker: z.enum(['M', 'F']),
  target: z.string().min(1, 'Target sentence is required'),
  targetPronunciation: z.string().optional(), // 발음 표기 (native 언어 문자로)
  targetBlank: z.string().min(1, 'Target blank sentence is required'),
  blankAnswer: z.string().min(1, 'Blank answer is required'),
  native: z.string().min(1, 'Native translation is required'),
  words: z.array(wordSchema).min(1, 'At least one word is required'),
});

// Category enum
export const categorySchema = z.enum([
  'story', // 월요일 - 영어 이야기
  'conversation', // 화요일 - 영어 회화
  'news', // 수요일 - 영어 뉴스
  'announcement', // 목요일 - 광고 & 안내
  'travel_business', // 금요일 - 여행 & 비즈니스
  'lesson', // 토요일 - 영어 수업
  'fairytale', // 일요일 - 영어 동화
]);

// Character schema for image generation
export const characterSchema = z.object({
  id: z.enum(['M', 'F']), // speaker ID와 매칭
  name: z.string().min(1, 'Character name is required'),
  gender: z.enum(['male', 'female']),
  ethnicity: z.string().min(1, 'Ethnicity is required'), // e.g., "Korean", "American", "British"
  role: z.string().min(1, 'Role is required'), // e.g., "customer", "barista", "teacher"
});

// Script metadata schema
export const metadataSchema = z.object({
  imagePrompt: z.string().optional(), // GPT가 생성한 배경 이미지 프롬프트
  topic: z.string().min(1, 'Topic is required'),
  style: z.string().optional().default('casual'),
  title: z.object({
    target: z.string().min(1, 'Target title is required'),
    native: z.string().min(1, 'Native title is required'),
  }),
  characters: z.array(characterSchema).length(2), // 항상 M, F 두 명
});

// Full Script schema
export const scriptSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  category: categorySchema,
  metadata: metadataSchema,
  sentences: z.array(sentenceSchema).min(1, 'At least one sentence is required'),
});

// TypeScript types inferred from Zod schemas
export type Word = z.infer<typeof wordSchema>;
export type Sentence = z.infer<typeof sentenceSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Character = z.infer<typeof characterSchema>;
export type Metadata = z.infer<typeof metadataSchema>;
export type Script = z.infer<typeof scriptSchema>;

// Category to day mapping
export const categoryDayMap: Record<number, Category> = {
  1: 'story', // Monday
  2: 'conversation', // Tuesday
  3: 'news', // Wednesday
  4: 'announcement', // Thursday
  5: 'travel_business', // Friday
  6: 'lesson', // Saturday
  0: 'fairytale', // Sunday
};

// Category display names (Korean)
export const categoryDisplayNames: Record<Category, string> = {
  story: '영어 이야기',
  conversation: '영어 회화',
  news: '영어 뉴스',
  announcement: '광고 & 안내',
  travel_business: '여행 & 비즈니스 영어',
  lesson: '영어 수업',
  fairytale: '영어 동화',
};
