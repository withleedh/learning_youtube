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
  // 선택지 퀴즈용 오답 문장 리스트 (2개) - deprecated, use wrongWordChoices instead
  wrongAnswers: z.array(z.string()).optional(),
  // 단어 퀴즈용 오답 단어 리스트 (2개) - blankAnswer와 발음이 비슷한 단어
  wrongWordChoices: z.array(z.string()).optional(),
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

// Character appearance schema for consistent image generation
export const appearanceSchema = z.object({
  age: z.string(), // "mid-20s", "early-30s"
  hair: z.string(), // "short black hair, slightly wavy"
  eyes: z.string(), // "warm brown eyes"
  skin: z.string(), // "light tan complexion"
  build: z.string(), // "average height, slim build"
  clothing: z.string(), // "navy blazer, white t-shirt, jeans"
  distinctiveFeatures: z.string().optional(), // "small mole near left eye"
});

// Character schema for image generation
export const characterSchema = z.object({
  id: z.enum(['M', 'F']), // speaker ID와 매칭
  name: z.string().min(1, 'Character name is required'),
  gender: z.enum(['male', 'female']),
  ethnicity: z.string().min(1, 'Ethnicity is required'), // e.g., "Korean", "American", "British"
  role: z.string().min(1, 'Role is required'), // e.g., "customer", "barista", "teacher"
  appearance: appearanceSchema.optional(), // 🆕 상세 외모 정보
});

// Scene prompt schema for multi-image generation with cinematic direction
export const scenePromptSchema = z.object({
  sentenceRange: z.tuple([z.number(), z.number()]), // [1, 4] - 이 장면이 커버하는 문장 범위
  setting: z.string(), // "grocery store checkout counter"
  mood: z.string(), // "warm, friendly, casual"
  characterActions: z.string(), // "cashier scanning items while chatting, customer smiling"
  // 🎬 Cinematic direction fields
  cameraDirection: z.string(), // "Medium close-up, eye-level, slight Dutch angle for tension"
  lighting: z.string().optional(), // "Warm golden hour light from window, soft shadows"
  transition: z.string().optional(), // "Slow fade in", "Quick cut", "Match cut to next scene"
});

// Script metadata schema
export const metadataSchema = z.object({
  imagePrompt: z.string().optional(), // GPT가 생성한 배경 이미지 프롬프트 (레거시, 단일 이미지용)
  topic: z.string().min(1, 'Topic is required'),
  style: z.string().optional().default('casual'),
  title: z.object({
    target: z.string().min(1, 'Target title is required'),
    native: z.string().min(1, 'Native title is required'),
  }),
  characters: z.array(characterSchema).min(1).max(2), // 나레이션은 1명, 대화는 2명
  scenePrompts: z.array(scenePromptSchema).optional(), // 🆕 장면별 이미지 프롬프트 (3-5개)
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
export type Appearance = z.infer<typeof appearanceSchema>;
export type Character = z.infer<typeof characterSchema>;
export type ScenePrompt = z.infer<typeof scenePromptSchema>;
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
