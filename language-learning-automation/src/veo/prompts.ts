import type { CharacterDefinition, CharacterPair } from '../character/types';
import { buildAppearanceDescription } from '../character/prompts';

/**
 * Veo 영상 생성용 씬 스타일
 */
export const VEO_SCENE_STYLES = {
  cozy_kitchen: {
    setting: 'A warm, cozy kitchen with natural lighting',
    atmosphere: 'warm color tones, homey atmosphere, morning sunlight through windows',
  },
  living_room: {
    setting: 'A comfortable living room with soft afternoon light',
    atmosphere: 'cozy furniture, family photos on walls, warm ambient lighting',
  },
  garden: {
    setting: 'A beautiful backyard garden on a sunny day',
    atmosphere: 'green plants, flowers blooming, gentle breeze, golden hour lighting',
  },
  study_room: {
    setting: 'A quiet study room with bookshelves',
    atmosphere: 'warm lamp light, books and papers, intellectual atmosphere',
  },
} as const;

export type VeoSceneStyle = keyof typeof VEO_SCENE_STYLES;

/**
 * 나이 enum을 Veo 프롬프트용 설명으로 변환
 */
const AGE_TO_VEO_DESCRIPTION: Record<string, string> = {
  child: 'young child around 2 years old',
  teen: 'teenager around 15 years old',
  adult: 'adult in their 30s',
  senior: 'elderly person in their 60s-70s',
};

/**
 * 캐릭터를 Veo 프롬프트용 설명으로 변환
 */
export function buildVeoCharacterDescription(character: CharacterDefinition): string {
  const { name, age, gender, relationship, personality } = character;
  const appearanceText = buildAppearanceDescription(character);
  const ageDescription = AGE_TO_VEO_DESCRIPTION[age] || age;
  const genderText = gender === 'male' ? 'man' : 'woman';

  let description = `${name} is a ${ageDescription} ${genderText}`;

  if (relationship) {
    description += ` (the ${relationship})`;
  }

  description += ` with ${appearanceText}`;

  if (personality) {
    description += `. ${name} has a ${personality} demeanor`;
  }

  return description;
}

/**
 * 대화 씬 프롬프트 생성
 */
export interface DialogueSceneConfig {
  characters: CharacterDefinition[];
  sceneStyle: VeoSceneStyle;
  dialogue?: {
    speaker: string; // character name
    text: string;
    language: string; // e.g., "Korean", "English"
  }[];
  cameraStyle?: string;
  includeDialogue?: boolean; // 대사 포함 여부 (기본: false)
}

/**
 * Veo 대화 씬 프롬프트 빌드
 * 대사는 기본적으로 포함하지 않음 (오디오는 별도 TTS로 처리)
 */
export function buildVeoDialoguePrompt(config: DialogueSceneConfig): string {
  const { characters, sceneStyle, dialogue, cameraStyle, includeDialogue = false } = config;
  const scene = VEO_SCENE_STYLES[sceneStyle];

  const parts: string[] = [];

  // 씬 설정
  parts.push(`${scene.setting}.`);

  // 캐릭터 설명
  characters.forEach((char) => {
    parts.push(buildVeoCharacterDescription(char) + '.');
  });

  // 캐릭터 배치 및 행동
  if (characters.length === 2) {
    parts.push(
      `${characters[0].name} and ${characters[1].name} are sitting together, having a warm conversation. They take turns speaking and listening to each other with genuine interest.`
    );
  } else if (characters.length === 1) {
    parts.push(`${characters[0].name} is in the scene, speaking warmly.`);
  }

  // 대사 포함 옵션 (기본: 포함 안함)
  if (includeDialogue && dialogue && dialogue.length > 0) {
    dialogue.forEach((line) => {
      parts.push(`${line.speaker} speaks in ${line.language} with a warm tone: "${line.text}"`);
    });
  }

  // 분위기 및 카메라
  parts.push(scene.atmosphere + '.');
  parts.push(cameraStyle || 'Cinematic quality, shallow depth of field.');

  // 자막/텍스트 제외 명시
  parts.push('No subtitles, no captions, no text overlays, no on-screen text of any kind.');

  return parts.join(' ');
}

/**
 * 간단한 캐릭터 소개 영상 프롬프트
 */
export function buildVeoIntroPrompt(
  character: CharacterDefinition,
  sceneStyle: VeoSceneStyle = 'living_room'
): string {
  const scene = VEO_SCENE_STYLES[sceneStyle];
  const charDesc = buildVeoCharacterDescription(character);

  return `${scene.setting}. ${charDesc}. ${character.name} looks at the camera with a warm smile and waves gently. ${scene.atmosphere}. Cinematic quality, medium close-up shot.`;
}

/**
 * CharacterPair에서 Veo 프롬프트 생성
 */
export function buildVeoPromptFromPair(
  pair: CharacterPair,
  dialogue: { speaker: string; text: string; language: string }[],
  sceneStyle?: VeoSceneStyle
): string {
  const style = (sceneStyle || pair.defaultSceneStyle || 'cozy_kitchen') as VeoSceneStyle;

  return buildVeoDialoguePrompt({
    characters: pair.characters,
    sceneStyle: style,
    dialogue,
  });
}
