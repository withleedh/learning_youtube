# Design Document

## Overview

다채널 언어 학습 영상 자동화 시스템은 TypeScript/Node.js 기반으로 구축되며, Remotion을 사용하여 React 컴포넌트로 영상을 렌더링합니다. 시스템은 크게 4개의 핵심 모듈로 구성됩니다:

1. **Config Loader**: 채널별 JSON 설정 파일 로드 및 검증
2. **Script Generator**: Gemini API를 활용한 AI 대본 생성
3. **TTS Generator**: OpenAI/Google TTS를 활용한 음성 생성
4. **Remotion Renderer**: React 기반 영상 컴포지션 및 렌더링

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Pipeline CLI                             │
│                    (npm run pipeline --channel)                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌───────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│   Config Loader   │ │ Script Generator│ │   TTS Generator     │
│   (channels/*.json)│ │   (Gemini API)  │ │ (OpenAI/Google TTS) │
└───────────────────┘ └─────────────────┘ └─────────────────────┘
                │               │               │
                └───────────────┼───────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Remotion Renderer                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Intro   │ │ Step1   │ │ Step2   │ │ Step3   │ │ Step4   │   │
│  │Component│ │Component│ │Component│ │Component│ │Component│   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Output: output/{channelId}/                   │
│                    - video.mp4                                   │
│                    - script.json                                 │
│                    - audio/*.mp3                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Config Loader

```typescript
// core/src/config/types.ts
interface ChannelConfig {
  channelId: string;

  meta: {
    name: string;
    targetLanguage: string;
    nativeLanguage: string;
    youtubeChannelId?: string;
  };

  theme: {
    logo: string;
    introSound: string;
    backgroundStyle: string;
    primaryColor: string;
    secondaryColor: string;
  };

  colors: {
    maleText: string; // 남성 화자 텍스트 색상 (파란색)
    femaleText: string; // 여성 화자 텍스트 색상 (핑크색)
    nativeText: string; // 모국어 텍스트 색상
    wordMeaning: string; // 단어별 뜻 색상
    background: string; // 배경색
  };

  layout: {
    step3ImageRatio: number; // Step3에서 이미지 영역 비율
    subtitlePosition: "center" | "bottom";
    speakerIndicator: "left" | "none";
  };

  tts: {
    provider: "openai" | "google";
    maleVoice: string;
    femaleVoice: string;
    targetLanguageCode: string;
    speed: number;
  };

  content: {
    sentenceCount: number;
    repeatCount: number;
    difficulty: "beginner" | "intermediate" | "advanced";
  };
}

// core/src/config/loader.ts
interface ConfigLoader {
  load(channelId: string): Promise<ChannelConfig>;
  validate(config: unknown): config is ChannelConfig;
  listChannels(): Promise<string[]>;
}
```

### 2. Script Generator

```typescript
// core/src/script/types.ts
interface Sentence {
  id: number;
  speaker: "M" | "F";
  target: string; // 학습 언어 문장 (전체)
  targetBlank: string; // 빈칸 버전 (예: "I'm here for the _______")
  blankAnswer: string; // 빈칸 정답 (예: "sunrise")
  native: string; // 모국어 해석
  words: Array<{
    word: string; // 학습 언어 단어
    meaning: string; // 모국어 뜻
  }>;
}

interface Script {
  channelId: string;
  date: string;
  category: string; // 요일별 카테고리

  metadata: {
    topic: string;
    style: string;
    title: {
      target: string;
      native: string;
    };
  };

  sentences: Sentence[];
}

// core/src/script/generator.ts
interface ScriptGenerator {
  generate(config: ChannelConfig, category: string): Promise<Script>;
  save(script: Script, outputPath: string): Promise<void>;
  load(scriptPath: string): Promise<Script>;
}
```

### 3. TTS Generator

```typescript
// core/src/tts/types.ts
interface TTSOptions {
  text: string;
  voice: string;
  speed: number;
  provider: "openai" | "google";
  languageCode: string;
}

interface AudioFile {
  sentenceId: number;
  speaker: "M" | "F";
  speed: "0.8x" | "1.0x" | "1.2x";
  path: string;
  duration: number;
}

// core/src/tts/generator.ts
interface TTSGenerator {
  generate(sentence: Sentence, config: ChannelConfig): Promise<AudioFile[]>;
  generateAll(script: Script, config: ChannelConfig): Promise<AudioFile[]>;
}
```

### 4. Remotion Compositions

```typescript
// core/src/compositions/types.ts
interface VideoProps {
  config: ChannelConfig;
  script: Script;
  audioFiles: AudioFile[];
}

interface IntroProps {
  logo: string;
  introSound: string;
  steps: string[]; // 4개의 학습 단계 설명
}

interface Step1Props {
  backgroundImage: string;
  audioFiles: AudioFile[]; // 전체 대화 오디오
}

interface Step2Props {
  backgroundImage: string;
  sentences: Sentence[];
  audioFiles: AudioFile[];
  dimOpacity: number; // 이미지 어둡게 처리 정도
}

interface Step3Props {
  backgroundImage: string;
  sentences: Sentence[];
  audioFiles: AudioFile[];
  colors: ChannelConfig["colors"];
  repeatCount: number;
  imageRatio: number;
}

interface Step4Props extends Step1Props {}
```

## Data Models

### Channel Config JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["channelId", "meta", "theme", "colors", "tts", "content"],
  "properties": {
    "channelId": { "type": "string", "pattern": "^[a-z_]+$" },
    "meta": {
      "type": "object",
      "required": ["name", "targetLanguage", "nativeLanguage"],
      "properties": {
        "name": { "type": "string" },
        "targetLanguage": { "type": "string" },
        "nativeLanguage": { "type": "string" },
        "youtubeChannelId": { "type": "string" }
      }
    },
    "theme": {
      "type": "object",
      "required": ["logo", "introSound"],
      "properties": {
        "logo": { "type": "string" },
        "introSound": { "type": "string" },
        "backgroundStyle": { "type": "string" },
        "primaryColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "secondaryColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" }
      }
    },
    "colors": {
      "type": "object",
      "required": ["maleText", "femaleText", "nativeText", "background"],
      "properties": {
        "maleText": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "femaleText": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "nativeText": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "wordMeaning": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "background": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" }
      }
    },
    "tts": {
      "type": "object",
      "required": [
        "provider",
        "maleVoice",
        "femaleVoice",
        "targetLanguageCode"
      ],
      "properties": {
        "provider": { "enum": ["openai", "google"] },
        "maleVoice": { "type": "string" },
        "femaleVoice": { "type": "string" },
        "targetLanguageCode": { "type": "string" },
        "speed": { "type": "number", "minimum": 0.5, "maximum": 2.0 }
      }
    },
    "content": {
      "type": "object",
      "required": ["sentenceCount", "repeatCount"],
      "properties": {
        "sentenceCount": { "type": "integer", "minimum": 1, "maximum": 20 },
        "repeatCount": { "type": "integer", "minimum": 1, "maximum": 20 },
        "difficulty": { "enum": ["beginner", "intermediate", "advanced"] }
      }
    }
  }
}
```

### Script JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["channelId", "date", "category", "metadata", "sentences"],
  "properties": {
    "channelId": { "type": "string" },
    "date": { "type": "string", "format": "date" },
    "category": {
      "enum": ["conversation", "travel_business"]
    },
    "metadata": {
      "type": "object",
      "required": ["topic", "title"],
      "properties": {
        "topic": { "type": "string" },
        "style": { "type": "string" },
        "title": {
          "type": "object",
          "required": ["target", "native"],
          "properties": {
            "target": { "type": "string" },
            "native": { "type": "string" }
          }
        }
      }
    },
    "sentences": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "speaker",
          "target",
          "targetBlank",
          "blankAnswer",
          "native",
          "words"
        ],
        "properties": {
          "id": { "type": "integer" },
          "speaker": { "enum": ["M", "F"] },
          "target": { "type": "string" },
          "targetBlank": { "type": "string" },
          "blankAnswer": { "type": "string" },
          "native": { "type": "string" },
          "words": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["word", "meaning"],
              "properties": {
                "word": { "type": "string" },
                "meaning": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

## Folder Structure

```
language-learning-automation/
├── core/
│   ├── src/
│   │   ├── config/
│   │   │   ├── types.ts
│   │   │   ├── loader.ts
│   │   │   └── validator.ts
│   │   ├── script/
│   │   │   ├── types.ts
│   │   │   ├── generator.ts
│   │   │   └── prompts.ts
│   │   ├── tts/
│   │   │   ├── types.ts
│   │   │   ├── generator.ts
│   │   │   ├── openai.ts
│   │   │   └── google.ts
│   │   ├── compositions/
│   │   │   ├── Main.tsx
│   │   │   ├── Intro.tsx
│   │   │   ├── Step1.tsx
│   │   │   ├── Step2.tsx
│   │   │   ├── Step3.tsx
│   │   │   ├── Step4.tsx
│   │   │   └── Outro.tsx
│   │   ├── components/
│   │   │   ├── Subtitle.tsx
│   │   │   ├── WordMeaning.tsx
│   │   │   ├── Logo.tsx
│   │   │   └── StepIndicator.tsx
│   │   └── pipeline/
│   │       ├── index.ts
│   │       └── cli.ts
│   ├── package.json
│   └── tsconfig.json
│
├── channels/
│   ├── english.json
│   ├── japanese.json
│   └── chinese.json
│
├── assets/
│   ├── english/
│   │   ├── logo.png
│   │   ├── intro.mp3
│   │   └── images/
│   ├── japanese/
│   └── chinese/
│
├── output/
│   ├── english/
│   │   ├── 2026-01-08/
│   │   │   ├── video.mp4
│   │   │   ├── script.json
│   │   │   └── audio/
│   ├── japanese/
│   └── chinese/
│
└── scripts/
    ├── generate-script.ts
    ├── generate-tts.ts
    └── render-video.ts
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Config JSON Round-Trip Consistency

_For any_ valid ChannelConfig object, serializing it to JSON and then parsing it back should produce an equivalent object.

**Validates: Requirements 1.1, 2.5**

### Property 2: Config Validation Rejects Invalid Configs

_For any_ ChannelConfig JSON with one or more required fields removed, the validator should return an error indicating the missing field(s).

**Validates: Requirements 1.3, 1.4**

### Property 3: Script Structure Integrity

_For any_ generated Script:

- The number of sentences equals the configured sentenceCount
- Each sentence has a non-empty words array
- Speaker alternates between 'M' and 'F'
- Each sentence has a valid targetBlank containing "**\_\_\_**" and blankAnswer exists in target
- Category is one of the valid enum values

**Validates: Requirements 2.2, 2.3, 2.4, 2.6, 2.7**

### Property 4: TTS Provider Selection

_For any_ TTS generation request with a given ChannelConfig, the selected provider should match config.tts.provider, and the voice should be maleVoice when speaker is 'M' and femaleVoice when speaker is 'F'.

**Validates: Requirements 3.1, 3.2**

### Property 5: Audio File Generation Completeness

_For any_ Script with N sentences, TTS generation should produce exactly N × 3 audio files (one for each speed: 0.8x, 1.0x, 1.2x per sentence).

**Validates: Requirements 3.3, 3.5**

### Property 6: Interval Training Sequence

_For any_ Step3 rendering with a sentence, the audio playback sequence should follow the order: 0.8x → 1.0x → 1.2x, and this sequence should repeat exactly repeatCount times.

**Validates: Requirements 5.1, 5.5**

## Error Handling

### Config Loading Errors

| Error Type        | Condition                         | Response                                  |
| ----------------- | --------------------------------- | ----------------------------------------- |
| FileNotFoundError | Channel config file doesn't exist | Return error with available channels list |
| ValidationError   | Required fields missing           | Return error listing missing fields       |
| ParseError        | Invalid JSON syntax               | Return error with line/column info        |

### Script Generation Errors

| Error Type           | Condition                        | Response                                     |
| -------------------- | -------------------------------- | -------------------------------------------- |
| APIError             | Gemini API failure               | Retry up to 3 times with exponential backoff |
| InvalidResponseError | AI response doesn't match schema | Log error and retry with adjusted prompt     |
| QuotaExceededError   | API quota exceeded               | Log error and halt pipeline                  |

### TTS Generation Errors

| Error Type           | Condition              | Response                                |
| -------------------- | ---------------------- | --------------------------------------- |
| ProviderError        | TTS API failure        | Retry up to 3 times, then skip sentence |
| InvalidVoiceError    | Voice ID not found     | Fall back to default voice              |
| AudioProcessingError | Speed adjustment fails | Use original speed audio                |

### Rendering Errors

| Error Type         | Condition                      | Response                        |
| ------------------ | ------------------------------ | ------------------------------- |
| AssetNotFoundError | Logo/sound file missing        | Use default assets with warning |
| MemoryError        | Insufficient memory for render | Reduce quality and retry        |
| OutputError        | Cannot write to output path    | Return error with path info     |

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

1. **Config Loader Tests**

   - Load valid config file
   - Handle missing required fields
   - Handle invalid JSON syntax
   - Validate color format (hex)

2. **Script Generator Tests**

   - Generate script with correct sentence count
   - Validate speaker alternation pattern
   - Validate blank word extraction
   - Handle edge cases (empty topic, special characters)

3. **TTS Generator Tests**
   - Select correct provider based on config
   - Select correct voice based on speaker
   - Generate files at all three speeds
   - Handle API errors gracefully

### Property-Based Tests

Property-based tests verify universal properties across many generated inputs using **fast-check** library:

1. **Config Round-Trip Test** (Property 1)

   - Generate random valid ChannelConfig objects
   - Serialize to JSON and parse back
   - Assert equality
   - Minimum 100 iterations

2. **Config Validation Test** (Property 2)

   - Generate random ChannelConfig objects
   - Remove random required fields
   - Assert validation fails with appropriate error
   - Minimum 100 iterations

3. **Script Structure Test** (Property 3)

   - Generate random Script objects
   - Validate all structural invariants
   - Minimum 100 iterations

4. **TTS Selection Test** (Property 4)

   - Generate random ChannelConfig and speaker combinations
   - Assert correct provider and voice selection
   - Minimum 100 iterations

5. **Audio Generation Test** (Property 5)

   - Generate random Scripts with varying sentence counts
   - Assert correct number of audio files generated
   - Minimum 100 iterations

6. **Interval Sequence Test** (Property 6)
   - Generate random repeatCount values
   - Assert correct playback sequence
   - Minimum 100 iterations

### Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.property.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

### Test File Naming Convention

- Unit tests: `*.test.ts`
- Property tests: `*.property.test.ts`
- Integration tests: `*.integration.test.ts`
