import type { CharacterDefinition } from '../character/types';
import type { DialogueGeneratorConfig } from './types';

/**
 * 대화 스크립트 생성용 시스템 프롬프트
 *
 * 핵심 컨셉: 언어 역전
 * - 외국인 캐릭터 (할머니): 시청자 모국어(한국어)로 말함
 * - 시청자와 같은 언어권 캐릭터 (손자): 학습 대상 언어(영어)로 말함
 *
 * 이렇게 하면:
 * 1. "백인 할머니가 한국어를?" 놀람 효과
 * 2. 손자의 영어 표현을 자연스럽게 학습
 */
export const DIALOGUE_SYSTEM_PROMPT = `You are a dialogue script writer for a language learning YouTube Shorts channel.

CRITICAL CONCEPT - Language Reversal:
- The FOREIGN character (e.g., Western grandma) speaks in the VIEWER'S NATIVE language (Korean)
- The NATIVE character (e.g., Korean grandson) speaks in the TARGET language (English)
- This creates a "surprise" effect: "Wow, the Western grandma speaks Korean!"
- The viewer naturally learns the target language expressions from the native character

Your task is to create short, engaging dialogue scripts that:
1. Feature a specific English expression naturally in the conversation
2. Feel warm, authentic, and relatable
3. Are suitable for 15-30 second video clips
4. Create emotional connection between characters

Output format: JSON with the exact structure specified.`;

/**
 * 대화 생성 프롬프트 빌드
 */
export function buildDialoguePrompt(
  config: DialogueGeneratorConfig,
  foreignCharacter: CharacterDefinition,
  nativeCharacter: CharacterDefinition
): string {
  const {
    targetExpression,
    targetMeaning,
    scenePreference,
    mood,
    viewerNativeLanguage,
    targetLanguage,
  } = config;

  // 언어 이름 매핑
  const languageNames = {
    korean: 'Korean',
    english: 'English',
  };

  const viewerLang = languageNames[viewerNativeLanguage];
  const targetLang = languageNames[targetLanguage];

  return `Create a dialogue script for a language learning short video.

TARGET EXPRESSION:
- Expression: "${targetExpression}"
- Meaning: "${targetMeaning}"
- This expression MUST appear naturally in the dialogue, spoken by ${nativeCharacter.name}

CHARACTERS:
1. ${foreignCharacter.name} (${foreignCharacter.nameKorean})
   - Role: ${foreignCharacter.relationship || 'main character'}
   - Personality: ${foreignCharacter.personality || 'warm and kind'}
   - SPEAKS IN: ${viewerLang} (viewer's native language)
   - This creates the "surprise" effect - a Western person speaking Korean fluently!

2. ${nativeCharacter.name} (${nativeCharacter.nameKorean})
   - Role: ${nativeCharacter.relationship || 'main character'}
   - Personality: ${nativeCharacter.personality || 'curious and playful'}
   - SPEAKS IN: ${targetLang} (the language viewers want to learn)
   - Uses the target expression naturally

SCENE:
- Location: ${scenePreference || 'cozy home interior'}
- Mood: ${mood || 'warm, loving, casual'}

DIALOGUE RULES:
1. ${foreignCharacter.name} speaks ONLY in ${viewerLang}
2. ${nativeCharacter.name} speaks ONLY in ${targetLang}
3. The target expression "${targetExpression}" must appear naturally
4. Keep it short: 3-4 exchanges total (6-8 lines max)
5. Make it emotionally engaging and relatable
6. Include natural reactions and emotions

OUTPUT FORMAT (JSON):
{
  "id": "unique-id-based-on-expression",
  "targetExpression": "${targetExpression}",
  "targetMeaning": "${targetMeaning}",
  "sceneContext": {
    "location": "specific location",
    "timeOfDay": "morning/afternoon/evening",
    "mood": "emotional tone",
    "action": "what characters are doing",
    "visualDescription": "detailed visual description for video generation"
  },
  "lines": [
    {
      "speakerId": "${foreignCharacter.id}",
      "speakerName": "${foreignCharacter.name}",
      "speakingLanguage": "${viewerNativeLanguage}",
      "text": "대사 (in ${viewerLang})",
      "translation": "Translation in ${targetLang}",
      "emotion": "emotion/tone"
    },
    {
      "speakerId": "${nativeCharacter.id}",
      "speakerName": "${nativeCharacter.name}",
      "speakingLanguage": "${targetLanguage}",
      "text": "Dialogue (in ${targetLang})",
      "translation": "번역 (in ${viewerLang})",
      "pronunciation": "발음 가이드 (Korean phonetic)",
      "isTargetExpression": true/false,
      "emotion": "emotion/tone"
    }
  ],
  "estimatedDuration": 15-25,
  "tags": ["relevant", "tags"]
}

Generate the dialogue now:`;
}

/**
 * Veo 프롬프트 빌드
 * 캐릭터 외모 + 장면 + 대화 내용을 Veo API용 프롬프트로 변환
 */
export function buildVeoPromptFromScript(
  script: {
    sceneContext: {
      location: string;
      timeOfDay?: string;
      mood?: string;
      action?: string;
      visualDescription?: string;
    };
    lines: Array<{
      speakerName: string;
      text: string;
      emotion?: string;
    }>;
  },
  characters: CharacterDefinition[]
): string {
  const { sceneContext, lines } = script;

  // 캐릭터 외모 설명 빌드
  const characterDescriptions = characters
    .map((char) => {
      const { appearance } = char;
      return `${char.name}: ${appearance.ethnicity}, ${appearance.hairColor} ${appearance.hairStyle} hair, wearing ${appearance.clothing}${appearance.distinguishingFeatures ? `, ${appearance.distinguishingFeatures}` : ''}`;
    })
    .join('\n');

  // 대화 내용 요약
  const dialogueSummary = lines
    .map((line) => `${line.speakerName} (${line.emotion || 'neutral'}): "${line.text}"`)
    .join('\n');

  // 장면 설명
  const sceneDescription =
    sceneContext.visualDescription ||
    `${sceneContext.location}, ${sceneContext.timeOfDay || 'daytime'}, ${sceneContext.mood || 'warm'} atmosphere`;

  return `A heartwarming scene of a grandmother and grandson having a conversation.

SETTING:
${sceneDescription}
${sceneContext.action ? `Action: ${sceneContext.action}` : ''}

CHARACTERS:
${characterDescriptions}

DIALOGUE:
${dialogueSummary}

STYLE:
- Warm, natural lighting
- Intimate, close framing
- Authentic emotions and expressions
- Cozy, inviting atmosphere
- 16:9 vertical format for YouTube Shorts`;
}
