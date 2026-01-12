import { z } from 'zod';

/**
 * Veo 3.1 API 설정 스키마
 */
export const veoConfigSchema = z.object({
  model: z
    .enum(['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview'])
    .default('veo-3.1-generate-preview'),
  aspectRatio: z.enum(['16:9', '9:16']).default('16:9'),
  resolution: z.enum(['720p', '1080p']).default('1080p'),
  durationSeconds: z.enum(['4', '6', '8']).default('8'),
  // Text-to-video: allow_all만 지원
  // Image-to-video, Reference images: allow_adult만 지원
  personGeneration: z.enum(['allow_all', 'allow_adult', 'dont_allow']).default('allow_all'),
});

/**
 * Reference 이미지 스키마
 */
export const referenceImageSchema = z.object({
  imagePath: z.string().min(1), // 로컬 파일 경로
  referenceType: z.enum(['asset', 'style']).default('asset'), // asset: 캐릭터/오브젝트, style: 스타일
});

/**
 * Veo 요청 스키마
 */
export const veoRequestSchema = z.object({
  prompt: z.string().min(1),
  referenceImages: z.array(referenceImageSchema).max(3).optional(),
  negativePrompt: z.string().optional(),
  config: veoConfigSchema.optional(),
});

/**
 * Veo 작업 상태
 */
export const veoOperationStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

/**
 * Veo 결과 스키마
 */
export const veoResultSchema = z.object({
  videoPath: z.string(),
  duration: z.number(),
  hasAudio: z.boolean(),
  operationId: z.string(),
  // 연장용 video 객체 (내부 사용)
  _videoObject: z.unknown().optional(),
});

/**
 * Veo API 응답 타입 (Long Running Operation)
 */
export interface VeoOperationResponse {
  name: string; // Operation ID
  done?: boolean;
  error?: {
    code: number;
    message: string;
    status: string;
  };
  metadata?: {
    '@type': string;
    startTime?: string;
    endTime?: string;
  };
  response?: {
    '@type': string;
    generatedSamples?: Array<{
      video?: {
        uri?: string;
        encoding?: string;
      };
    }>;
  };
}

// TypeScript 타입 추출
export type VeoConfig = z.infer<typeof veoConfigSchema>;
export type ReferenceImage = z.infer<typeof referenceImageSchema>;
export type VeoRequest = z.infer<typeof veoRequestSchema>;
export type VeoOperationStatus = z.infer<typeof veoOperationStatusSchema>;
export type VeoResult = z.infer<typeof veoResultSchema>;
