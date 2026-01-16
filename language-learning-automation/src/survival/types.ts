import { z } from 'zod';

// Character enum
export const survivalCharacterSchema = z.enum(['cat', 'dog']);
export type SurvivalCharacter = z.infer<typeof survivalCharacterSchema>;

// Character display info
export const CHARACTER_INFO: Record<
  SurvivalCharacter,
  {
    emoji: string;
    name: string;
    nameKorean: string;
    color: string;
  }
> = {
  cat: { emoji: '🐱', name: 'Cat', nameKorean: '고양이', color: '#FF9500' },
  dog: { emoji: '🐶', name: 'Dog', nameKorean: '강아지', color: '#5856D6' },
};

// Audio duration info for dynamic timing
export const audioDurationsSchema = z.object({
  situation: z.number().min(0).optional(),
  dogAnswer: z.number().min(0).optional(),
  catAnswer: z.number().min(0).optional(),
  explanation: z.number().min(0).optional(),
});

export type AudioDurations = z.infer<typeof audioDurationsSchema>;

// Single quiz round
export const survivalRoundSchema = z.object({
  id: z.number().int().positive(),
  category: z.enum(['daily', 'business', 'emotion', 'request_reject', 'apology_thanks']),
  situation: z.string().min(1), // 상황 설명 (한국어)
  situationEnglish: z.string().min(1), // 상황 설명 (영어, 예: "Where is the bathroom?")
  konglishAnswer: z.object({
    text: z.string().min(1), // 한국인이 흔히 쓰는 표현
    character: survivalCharacterSchema, // 이 답변을 하는 캐릭터 (loser)
  }),
  nativeAnswer: z.object({
    text: z.string().min(1), // 원어민 표현
    character: survivalCharacterSchema, // 이 답변을 하는 캐릭터 (winner)
  }),
  explanation: z.string().min(1).max(30), // 간단 설명 (20자 이내 권장)
  winner: survivalCharacterSchema, // 이 라운드 승자
  /** Audio durations in seconds (populated after TTS generation) */
  audioDurations: audioDurationsSchema.optional(),
});

// HP state for a character
export const hpStateSchema = z.object({
  character: survivalCharacterSchema,
  currentHP: z.number().min(0).max(100),
  roundsLost: z.number().int().min(0),
});

// Complete survival script
export const survivalScriptSchema = z.object({
  channelId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.object({
    korean: z.string(), // "고양이 vs 강아지 50라운드 서바이벌"
    english: z.string(), // "Cat vs Dog 50-Round Survival"
  }),
  intro: z.object({
    title: z.string(), // "Cat vs Dog 서바이벌!"
    subtitle: z.string(), // "틀리면 바닥이 열립니다!"
  }),
  rounds: z.array(survivalRoundSchema).min(1).max(100),
  ending: z.object({
    winner: survivalCharacterSchema,
    catFinalHP: z.number().min(0).max(100),
    dogFinalHP: z.number().min(0).max(100),
    catWins: z.number().int().min(0).max(100),
    dogWins: z.number().int().min(0).max(100),
    ctaQuestion: z.string(), // "다음 대결에서는 누가 이길까요?"
  }),
});

export type SurvivalRound = z.infer<typeof survivalRoundSchema>;
export type HPState = z.infer<typeof hpStateSchema>;
export type SurvivalScript = z.infer<typeof survivalScriptSchema>;
