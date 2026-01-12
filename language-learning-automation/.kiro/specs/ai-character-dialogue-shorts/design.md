# Design Document: AI Character Dialogue Shorts

## Overview

AI로 생성한 고정 캐릭터(할아버지-손녀 등)가 일상 상황에서 짧은 영어 표현을 대화하는 YouTube Shorts를 자동 생성하는 시스템. Google Veo 3.1의 reference images 기능을 활용하여 캐릭터 일관성을 유지하고, 대화와 오디오가 포함된 8초 영상을 생성한 후 Remotion으로 자막과 학습 요소를 합성한다.

### 핵심 기술 스택

- **Veo 3.1**: 캐릭터 reference images + 대화 프롬프트로 영상 생성 (8초, 9:16, 오디오 포함)
- **Imagen 3 / Gemini 2.5 Flash Image**: 캐릭터 reference image 생성
- **Remotion**: 생성된 영상에 자막, 발음, 번역 오버레이 합성
- **Gemini**: 대화 스크립트 생성

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Pipeline Orchestrator                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Character   │         │     Script      │         │      Veo        │
│   Manager     │         │   Generator     │         │   Generator     │
└───────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Imagen 3 /   │         │     Gemini      │         │   Veo 3.1 API   │
│  Gemini Image │         │      API        │         │  (with audio)   │
└───────────────┘         └─────────────────┘         └─────────────────┘
                                                                │
                                                                ▼
                                                      ┌─────────────────┐
                                                      │    Remotion     │
                                                      │    Composer     │
                                                      └─────────────────┘
                                                                │
                                                                ▼
                                                      ┌─────────────────┐
                                                      │   Final MP4     │
                                                      │   (< 60 sec)    │
                                                      └─────────────────┘
```

### 데이터 흐름

1. **캐릭터 로드**: Channel config에서 캐릭터 정의 및 reference images 로드
2. **스크립트 생성**: 타겟 표현 + 캐릭터 정보로 대화 스크립트 생성
3. **영상 생성**: Reference images + 대화 프롬프트로 Veo 3.1 영상 생성
4. **합성**: Remotion으로 자막/발음/번역 오버레이
5. **출력**: 최종 MP4 + 업로드 메타데이터

## Components and Interfaces

### 1. Character Manager

캐릭터 정의 및 reference image 관리를 담당한다.

```typescript
// src/character/types.ts
import { z } from 'zod';

export const characterDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameKorean: z.string().min(1),
  age: z.enum(['child', 'teen', 'adult', 'senior']),
  gender: z.enum(['male', 'female']),
  relationship: z.string().optional(), // e.g., "grandfather", "granddaughter"
  appearance: z.object({
    ethnicity: z.string(),
    hairColor: z.string(),
    hairStyle: z.string(),
    clothing: z.string(),
    distinguishingFeatures: z.string().optional(),
  }),
  personality: z.string().optional(), // 대화 스타일에 영향
  referenceImagePath: z.string().optional(), // 생성된 reference image 경로
});

export const characterPairSchema = z.object({
  channelId: z.string(),
  characters: z.array(characterDefinitionSchema).min(1).max(3),
  defaultSceneStyle: z.string().optional(), // e.g., "warm home interior"
});

export type CharacterDefinition = z.infer<typeof characterDefinitionSchema>;
export type CharacterPair = z.infer<typeof characterPairSchema>;
```

```typescript
// src/character/manager.ts
export interface CharacterManager {
  // 캐릭터 정의 로드
  loadCharacters(channelId: string): Promise<CharacterPair>;

  // Reference image 생성 (Imagen 3 또는 Gemini Image)
  generateReferenceImage(character: CharacterDefinition): Promise<string>;

  // Reference image 경로 반환
  getReferenceImagePath(characterId: string): string | undefined;

  // 캐릭터 정의 저장
  saveCharacters(pair: CharacterPair): Promise<void>;
}
```

### 2. Dialogue Script Generator

짧은 영어 표현을 중심으로 대화 스크립트를 생성한다.

```typescript
// src/dialogue/types.ts
import { z } from 'zod';

export const dialogueLineSchema = z.object({
  speakerId: z.string(), // character id
  speakerName: z.string(),
  english: z.string(),
  korean: z.string(),
  pronunciation: z.string(), // 한글 발음 표기
  isTargetExpression: z.boolean().default(false), // 학습 대상 표현인지
});

export const dialogueScriptSchema = z.object({
  id: z.string(),
  targetExpression: z.string(), // e.g., "Ring up"
  targetMeaning: z.string(), // e.g., "계산하다"
  sceneContext: z.object({
    location: z.string(), // e.g., "cozy kitchen"
    timeOfDay: z.string(), // e.g., "morning"
    mood: z.string(), // e.g., "warm, casual"
    action: z.string(), // e.g., "grandfather teaching granddaughter"
  }),
  lines: z.array(dialogueLineSchema).min(2).max(4),
  veoPrompt: z.string(), // Veo API용 프롬프트
});

export type DialogueLine = z.infer<typeof dialogueLineSchema>;
export type DialogueScript = z.infer<typeof dialogueScriptSchema>;
```

```typescript
// src/dialogue/generator.ts
export interface DialogueGeneratorConfig {
  targetExpression: string;
  targetMeaning: string;
  characters: CharacterDefinition[];
  scenePreference?: string;
}

export interface DialogueGenerator {
  generate(config: DialogueGeneratorConfig): Promise<DialogueScript>;

  // Veo 프롬프트 생성 (캐릭터 외모 + 장면 + 대화)
  buildVeoPrompt(script: DialogueScript, characters: CharacterDefinition[]): string;
}
```

### 3. Veo Generator

Veo 3.1 API를 사용하여 캐릭터 대화 영상을 생성한다.

```typescript
// src/veo/types.ts
import { z } from 'zod';

export const veoConfigSchema = z.object({
  model: z
    .enum(['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview'])
    .default('veo-3.1-generate-preview'),
  aspectRatio: z.enum(['16:9', '9:16']).default('9:16'),
  resolution: z.enum(['720p', '1080p']).default('1080p'),
  durationSeconds: z.enum(['4', '6', '8']).default('8'),
});

export const veoRequestSchema = z.object({
  prompt: z.string(),
  referenceImages: z
    .array(
      z.object({
        imagePath: z.string(),
        referenceType: z.enum(['asset', 'style']).default('asset'),
      })
    )
    .max(3)
    .optional(),
  negativePrompt: z.string().optional(),
  config: veoConfigSchema,
});

export const veoResultSchema = z.object({
  videoPath: z.string(),
  duration: z.number(),
  hasAudio: z.boolean(),
  operationId: z.string(),
});

export type VeoConfig = z.infer<typeof veoConfigSchema>;
export type VeoRequest = z.infer<typeof veoRequestSchema>;
export type VeoResult = z.infer<typeof veoResultSchema>;
```

```typescript
// src/veo/generator.ts
export interface VeoGenerator {
  // 영상 생성 (비동기, 폴링)
  generateVideo(request: VeoRequest): Promise<VeoResult>;

  // 작업 상태 확인
  checkOperationStatus(operationId: string): Promise<'pending' | 'completed' | 'failed'>;

  // 영상 다운로드
  downloadVideo(operationId: string, outputPath: string): Promise<string>;
}
```

### 4. Shorts Composer

생성된 영상에 자막과 학습 요소를 합성한다.

```typescript
// src/shorts/types.ts
import { z } from 'zod';

export const shortsCompositionSchema = z.object({
  veoVideoPath: z.string(),
  dialogueScript: dialogueScriptSchema,
  channelConfig: z.any(), // ChannelConfig
  outputPath: z.string(),
});

export const shortsOutputSchema = z.object({
  videoPath: z.string(),
  thumbnailPath: z.string().optional(),
  duration: z.number(),
  uploadInfo: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
  }),
});

export type ShortsComposition = z.infer<typeof shortsCompositionSchema>;
export type ShortsOutput = z.infer<typeof shortsOutputSchema>;
```

```typescript
// src/shorts/composer.ts
export interface ShortsComposer {
  // Remotion으로 최종 영상 합성
  compose(composition: ShortsComposition): Promise<ShortsOutput>;

  // 업로드 메타데이터 생성
  generateUploadInfo(script: DialogueScript, channelConfig: ChannelConfig): UploadInfo;
}
```

### 5. Pipeline Orchestrator

전체 프로세스를 조율한다.

```typescript
// src/pipeline/dialogue-shorts.ts
export interface DialogueShortsConfig {
  channelId: string;
  expressions: Array<{
    expression: string;
    meaning: string;
  }>;
  outputDir: string;
}

export interface DialogueShortsPipeline {
  // 전체 파이프라인 실행
  run(config: DialogueShortsConfig): Promise<PipelineResult>;

  // 단일 표현 처리
  processExpression(expression: string, meaning: string): Promise<ShortsOutput>;

  // 진행 상태 콜백
  onProgress?: (status: PipelineStatus) => void;
}

export interface PipelineResult {
  successful: ShortsOutput[];
  failed: Array<{ expression: string; error: string }>;
  totalDuration: number;
}
```

## Data Models

### Channel Config 확장

```typescript
// channels/{channelId}.json 확장
{
  "channelId": "english_grandpa",

  // 기존 설정...

  "dialogueShorts": {
    "enabled": true,
    "characters": [
      {
        "id": "grandpa",
        "name": "Grandpa Tom",
        "nameKorean": "톰 할아버지",
        "age": "senior",
        "gender": "male",
        "relationship": "grandfather",
        "appearance": {
          "ethnicity": "Caucasian",
          "hairColor": "gray",
          "hairStyle": "short, slightly balding",
          "clothing": "warm cardigan sweater",
          "distinguishingFeatures": "kind eyes, gentle smile, reading glasses"
        },
        "personality": "warm, patient, loves teaching",
        "referenceImagePath": "assets/english_grandpa/characters/grandpa.png"
      },
      {
        "id": "granddaughter",
        "name": "Lily",
        "nameKorean": "릴리",
        "age": "child",
        "gender": "female",
        "relationship": "granddaughter",
        "appearance": {
          "ethnicity": "Korean-American",
          "hairColor": "black",
          "hairStyle": "long, with pigtails",
          "clothing": "cute casual dress",
          "distinguishingFeatures": "bright curious eyes, cheerful expression"
        },
        "personality": "curious, eager to learn",
        "referenceImagePath": "assets/english_grandpa/characters/granddaughter.png"
      }
    ],
    "veoConfig": {
      "model": "veo-3.1-generate-preview",
      "aspectRatio": "9:16",
      "resolution": "1080p",
      "durationSeconds": "8"
    },
    "scenePreferences": {
      "defaultLocation": "cozy home interior",
      "lightingStyle": "warm, natural light",
      "colorTone": "warm, inviting"
    }
  }
}
```

### 출력 디렉토리 구조

```
output/{channelId}/dialogue-shorts/{date}/
├── scripts/
│   ├── ring-up.json
│   ├── couldnt-be-better.json
│   └── ...
├── veo-videos/
│   ├── ring-up.mp4
│   ├── couldnt-be-better.mp4
│   └── ...
├── final/
│   ├── ring-up-final.mp4
│   ├── couldnt-be-better-final.mp4
│   └── ...
├── thumbnails/
│   ├── ring-up.png
│   └── ...
└── upload_info.json
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Character Data Round-Trip

_For any_ valid CharacterDefinition, saving it to the channel configuration and then loading it back SHALL produce an equivalent CharacterDefinition with all fields preserved.

**Validates: Requirements 1.1, 1.5**

### Property 2: Character Count Constraint

_For any_ CharacterPair configuration, the system SHALL accept configurations with 1-3 characters and reject configurations with 0 or more than 3 characters.

**Validates: Requirements 1.3**

### Property 3: Character Loading Completeness

_For any_ stored character with a reference image, loading that character SHALL return both the complete metadata AND the reference image path.

**Validates: Requirements 1.4**

### Property 4: Script Contains Target Expression

_For any_ target expression provided to the Script_Generator, the generated DialogueScript SHALL contain at least one DialogueLine where the english field includes the target expression (case-insensitive).

**Validates: Requirements 2.1, 2.3**

### Property 5: Script Schema Validation

_For any_ DialogueScript generated by the Script_Generator, it SHALL pass validation against dialogueScriptSchema, including: sceneContext with all required fields, lines array with 2-4 elements, and a non-empty veoPrompt.

**Validates: Requirements 2.2, 2.5**

### Property 6: Script Includes Translations

_For any_ DialogueLine in a generated DialogueScript, both the korean field and pronunciation field SHALL be non-empty strings.

**Validates: Requirements 2.4**

### Property 7: Veo Prompt Includes Character Descriptions

_For any_ VeoRequest constructed with CharacterDefinitions, the prompt SHALL include appearance details (ethnicity, hairColor, clothing) from each character's appearance object.

**Validates: Requirements 3.2**

### Property 8: Veo Retry Logic

_For any_ sequence of API failures (up to 3), the Veo_Generator SHALL retry with exponential backoff delays (e.g., 1s, 2s, 4s) before returning a failure result.

**Validates: Requirements 3.4**

### Property 9: Veo Request Configuration

_For any_ VeoRequest for YouTube Shorts, the aspectRatio SHALL be "9:16" and resolution SHALL be "720p" or "1080p".

**Validates: Requirements 3.5**

### Property 10: Veo Prompt Includes Scene Context

_For any_ DialogueScript with sceneContext, the constructed Veo prompt SHALL include the location, timeOfDay, and mood from the sceneContext.

**Validates: Requirements 3.6**

### Property 11: Composition Includes Translations with Timing

_For any_ ShortsComposition, the output SHALL include Korean translations and pronunciation guides synchronized with the corresponding dialogue timing.

**Validates: Requirements 4.2**

### Property 12: Composition Includes Branding

_For any_ ShortsComposition with a ChannelConfig, the output SHALL include the channel's logo/watermark as specified in the config.

**Validates: Requirements 4.4**

### Property 13: Composition Duration Constraint

_For any_ composed short video, the total duration SHALL be less than 60 seconds.

**Validates: Requirements 4.6**

### Property 14: Pipeline Expression Count

_For any_ list of N target expressions provided to the Pipeline, exactly N ShortsOutput attempts SHALL be made (successful or failed).

**Validates: Requirements 5.2**

### Property 15: Pipeline Error Resilience

_For any_ pipeline run where expression K fails, expressions K+1 through N SHALL still be processed.

**Validates: Requirements 5.3**

### Property 16: Pipeline Output Structure

_For any_ successful pipeline run, the output directory SHALL contain subdirectories: scripts/, veo-videos/, final/, and thumbnails/.

**Validates: Requirements 5.5**

### Property 17: Pipeline Upload Metadata

_For any_ successfully generated short, the pipeline SHALL produce upload metadata containing title, description, and tags.

**Validates: Requirements 5.6**

### Property 18: Channel Config Validation

_For any_ channel configuration with dialogueShorts.enabled=true, the config SHALL pass validation including: characters array with valid CharacterDefinitions, veoConfig with valid VeoConfig, and optional scenePreferences.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

## Error Handling

### API Errors

| Error Type                   | Handling Strategy                             |
| ---------------------------- | --------------------------------------------- |
| Veo API rate limit           | Exponential backoff, max 3 retries            |
| Veo API timeout              | Retry with longer polling interval            |
| Veo content policy violation | Log error, skip expression, continue pipeline |
| Imagen API failure           | Use fallback placeholder image or retry       |
| Gemini API failure           | Retry with simplified prompt                  |

### Validation Errors

| Error Type                   | Handling Strategy                       |
| ---------------------------- | --------------------------------------- |
| Invalid character definition | Reject with detailed error message      |
| Invalid dialogue script      | Regenerate with adjusted parameters     |
| Missing reference image      | Generate new reference image            |
| Invalid channel config       | Fail fast with schema validation errors |

### Pipeline Errors

| Error Type                    | Handling Strategy                        |
| ----------------------------- | ---------------------------------------- |
| Single expression failure     | Log error, continue with next expression |
| Output directory not writable | Fail pipeline with clear error           |
| Insufficient disk space       | Fail pipeline with warning               |

## Testing Strategy

### Unit Tests

- Character schema validation
- Dialogue script schema validation
- Veo request construction
- Prompt building logic
- Directory structure creation

### Property-Based Tests

Property-based testing library: **fast-check** (TypeScript)

Each property test will:

- Run minimum 100 iterations
- Use generators for random valid inputs
- Tag with format: **Feature: ai-character-dialogue-shorts, Property N: {property_text}**

Key property tests:

1. Character round-trip (Property 1)
2. Script contains expression (Property 4)
3. Script schema validation (Property 5)
4. Veo prompt construction (Properties 7, 10)
5. Duration constraint (Property 13)
6. Pipeline expression count (Property 14)
7. Channel config validation (Property 18)

### Integration Tests

- End-to-end pipeline with mock APIs
- Veo API integration (with real API, limited runs)
- Remotion composition rendering

### Manual Testing

- Visual quality review of generated videos
- Character consistency across multiple videos
- Audio-visual synchronization
