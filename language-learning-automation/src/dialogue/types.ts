import { z } from 'zod';

/**
 * 대화 한 줄 스키마
 * 각 캐릭터의 대사 한 줄을 정의
 */
export const dialogueLineSchema = z.object({
  speakerId: z.string().min(1), // 캐릭터 ID (e.g., 'grandma', 'grandson')
  speakerName: z.string().min(1), // 표시용 이름 (e.g., 'Grandma Rose')
  speakingLanguage: z.enum(['english', 'korean']), // 이 대사의 언어
  text: z.string().min(1), // 실제 대사 텍스트
  translation: z.string().optional(), // 번역 (영어면 한국어 번역, 한국어면 영어 번역)
  pronunciation: z.string().optional(), // 발음 가이드 (한글 발음 표기)
  isTargetExpression: z.boolean().default(false), // 학습 대상 표현인지
  emotion: z.string().optional(), // 감정/톤 (e.g., 'warm', 'curious', 'excited')
});

/**
 * 장면 컨텍스트 스키마
 * 대화가 일어나는 상황/배경 정의
 */
export const sceneContextSchema = z.object({
  location: z.string().min(1), // e.g., 'cozy kitchen', 'living room'
  timeOfDay: z.string().optional(), // e.g., 'morning', 'afternoon'
  mood: z.string().optional(), // e.g., 'warm, casual', 'playful'
  action: z.string().optional(), // e.g., 'grandma cooking, grandson watching'
  visualDescription: z.string().optional(), // Veo 프롬프트용 상세 설명
});

/**
 * 대화 스크립트 스키마
 * 전체 대화 스크립트 정의
 */
export const dialogueScriptSchema = z.object({
  id: z.string().min(1),
  // 학습 대상 표현
  targetExpression: z.string().min(1), // e.g., "I'm starving"
  targetMeaning: z.string().min(1), // e.g., "배가 너무 고파요"
  targetExplanation: z.string().optional(), // 표현 설명
  // 장면 설정
  sceneContext: sceneContextSchema,
  // 대화 라인 (2-6줄)
  lines: z.array(dialogueLineSchema).min(2).max(6),
  // Veo 영상 생성용
  veoPrompt: z.string().optional(), // Veo API용 프롬프트
  // 메타데이터
  estimatedDuration: z.number().optional(), // 예상 길이 (초)
  tags: z.array(z.string()).optional(), // 태그 (e.g., ['food', 'daily'])
});

/**
 * 대화 생성 설정 스키마
 */
export const dialogueGeneratorConfigSchema = z.object({
  targetExpression: z.string().min(1),
  targetMeaning: z.string().min(1),
  // 캐릭터 설정 - 언어 역전 컨셉
  // foreignCharacter: 외국인 캐릭터 (시청자 모국어로 말함)
  // nativeCharacter: 시청자와 같은 언어권 캐릭터 (학습 대상 언어로 말함)
  foreignCharacterId: z.string().min(1), // e.g., 'grandma' (한국어로 말함)
  nativeCharacterId: z.string().min(1), // e.g., 'grandson' (영어로 말함)
  scenePreference: z.string().optional(), // 선호 장면 설정
  mood: z.string().optional(), // 분위기
  // 언어 설정
  viewerNativeLanguage: z.enum(['korean', 'english']).default('korean'), // 시청자 모국어
  targetLanguage: z.enum(['korean', 'english']).default('english'), // 학습 대상 언어
});

// TypeScript 타입 추출
export type DialogueLine = z.infer<typeof dialogueLineSchema>;
export type SceneContext = z.infer<typeof sceneContextSchema>;
export type DialogueScript = z.infer<typeof dialogueScriptSchema>;
export type DialogueGeneratorConfig = z.infer<typeof dialogueGeneratorConfigSchema>;
