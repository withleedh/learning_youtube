import type { CharacterDefinition } from './types';

/**
 * 캐릭터 이미지 생성용 프롬프트 템플릿
 */
export const CHARACTER_IMAGE_PROMPTS = {
  // 기본 스타일: 캔디드 필름 사진
  candid_film: {
    prefix: 'A candid film photograph of',
    scene:
      'The scene is a cozy indoor setting filled with warm, natural light and a soft film grain texture.',
    style: 'Shallow depth of field, natural colors, analog photo style.',
  },

  // 스튜디오 포트레이트
  studio_portrait: {
    prefix: 'A professional studio portrait photograph of',
    scene: 'Clean neutral background with soft studio lighting.',
    style: 'Sharp focus, professional quality, magazine cover style.',
  },

  // 야외 자연광
  outdoor_natural: {
    prefix: 'A natural outdoor photograph of',
    scene: 'Beautiful outdoor setting with golden hour sunlight filtering through.',
    style: 'Warm tones, bokeh background, lifestyle photography style.',
  },

  // Veo Image-to-Video용 레퍼런스 이미지 (추천)
  veo_reference: {
    prefix: 'A clean, high-resolution photograph of',
    scene: 'Simple solid color background, even soft lighting from front, no shadows on face.',
    style:
      'Sharp focus, neutral expression, front-facing or slight 3/4 angle, no motion blur, no grain, 8K quality, suitable for video generation reference.',
  },
} as const;

export type PromptStyle = keyof typeof CHARACTER_IMAGE_PROMPTS;

/**
 * 나이 enum을 설명 텍스트로 변환
 */
const AGE_DESCRIPTIONS: Record<string, string> = {
  child: 'young child (around 2 years old)',
  teen: 'teenager (around 14-16 years old)',
  adult: 'adult (around 30-40 years old)',
  senior: 'elderly person (around 65-75 years old)',
};

/**
 * 캐릭터 외모 설명 생성
 */
export function buildAppearanceDescription(character: CharacterDefinition): string {
  const { appearance } = character;

  const parts = [`${appearance.ethnicity} ethnicity`];

  if (appearance.complexion) {
    parts.push(`${appearance.complexion} complexion`);
  }

  parts.push(
    `${appearance.hairColor} ${appearance.hairStyle} hair`,
    `wearing ${appearance.clothing}`
  );

  if (appearance.distinguishingFeatures) {
    parts.push(appearance.distinguishingFeatures);
  }

  return parts.join(', ');
}

/**
 * 캐릭터 기본 정보 설명 생성
 */
export function buildCharacterDescription(character: CharacterDefinition): string {
  const { age, gender, relationship, personality } = character;

  const ageDescription = AGE_DESCRIPTIONS[age] || age;
  const genderText = gender === 'male' ? 'male' : 'female';
  const appearanceText = buildAppearanceDescription(character);

  let description = `a ${genderText} ${ageDescription}, ${appearanceText}`;

  if (relationship) {
    description += `. This character is a ${relationship}`;
  }

  if (personality) {
    description += `. Expression reflects their personality: ${personality}`;
  }

  return description;
}

/**
 * 캐릭터 이미지 생성 프롬프트 빌드
 */
export function buildCharacterPrompt(
  character: CharacterDefinition,
  style: PromptStyle = 'candid_film'
): string {
  const template = CHARACTER_IMAGE_PROMPTS[style];
  const characterDescription = buildCharacterDescription(character);

  return `${template.prefix} ${characterDescription}. ${template.scene} ${template.style}`;
}

/**
 * 커스텀 프롬프트 템플릿으로 빌드
 */
export function buildCustomPrompt(
  character: CharacterDefinition,
  template: {
    prefix: string;
    scene: string;
    style: string;
  }
): string {
  const characterDescription = buildCharacterDescription(character);
  return `${template.prefix} ${characterDescription}. ${template.scene} ${template.style}`;
}
