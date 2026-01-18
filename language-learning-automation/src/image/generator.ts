import { promises as fs } from 'fs';
import path from 'path';
import { GEMINI_API_URLS, getGeminiApiKey, type GeminiImageResponse } from '../config/gemini';
import type { Script, Category, Character } from '../script/types';
import { getStyleById, getRandomStyle, type ImageStyle } from './art-styles';

/**
 * Generate an illustration image using Gemini API based on the script topic
 * @param styleId - 스타일 ID (없으면 랜덤 선택)
 */
export async function generateIllustration(
  topic: string,
  title: string,
  sceneDescription: string = '',
  outputPath: string,
  styleId?: string
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // 스타일 선택 (지정된 ID가 있으면 사용, 없으면 랜덤)
  const style: ImageStyle = styleId ? getStyleById(styleId) || getRandomStyle() : getRandomStyle();
  console.log(`🎨 Using style: ${style.name}`);

  // 프롬프트 구조: 헤더(스타일) + 본문(상황) + 푸터(기술 요구사항)
  const styleHeader = style.prompt;

  const sceneBody = sceneDescription
    ? `Scene: ${sceneDescription}`
    : `Scene: A warm, inviting scene that represents "${topic}". 
Characters naturally interacting in the environment.
Expressive body language and facial expressions that convey emotion.`;

  const technicalFooter = `Technical requirements:
- 16:9 aspect ratio (widescreen cinematic composition)
- 8K resolution quality, masterpiece level detail
- Warm, natural lighting with soft shadows
- Shallow depth of field for cinematic feel
- No text, words, or letters in the image
- Clean composition suitable for video background`;

  const prompt = `${styleHeader}

${sceneBody}

Topic: ${topic}
Title: ${title}

${technicalFooter}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['image', 'text'],
      responseMimeType: 'text/plain',
    },
  };

  const response = await fetch(`${GEMINI_API_URLS.image}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GeminiImageResponse;

  // Find the image part in the response
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        // Decode base64 image and save
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');

        // Ensure output directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Save the image
        await fs.writeFile(outputPath, imageBuffer);

        console.log(`✅ Image saved to: ${outputPath}`);
        return outputPath;
      }
    }
  }

  throw new Error('No image generated in Gemini response');
}

/**
 * Generate background image for language learning video
 * @param topic - 스크립트 주제
 * @param title - 스크립트 제목
 * @param outputDir - 출력 디렉토리
 * @param imagePrompt - LLM이 생성한 구체적 장면 설명 (있으면 이걸 사용)
 * @param styleId - 스타일 ID (없으면 랜덤 선택)
 */
export async function generateBackgroundImage(
  topic: string,
  title: string,
  outputDir: string,
  imagePrompt?: string,
  styleId?: string
): Promise<string> {
  const filename = 'background.png';
  const outputPath = path.join(outputDir, filename);

  // imagePrompt가 있으면 구체적 장면 설명으로 사용
  const sceneDescription = imagePrompt || '';

  return generateIllustration(topic, title, sceneDescription, outputPath, styleId);
}

/**
 * 썸네일 생성 옵션
 */
export interface ThumbnailOptions {
  /** 채널명 (썸네일 하단에 표시) */
  channelName: string;
  /** 에피소드 제목 (선택) */
  episodeTitle?: string;
  /** 캐릭터 스타일 (기본: 동물 캐릭터) */
  characterStyle?: 'animals' | 'humans' | 'custom';
  /** 커스텀 캐릭터 설명 */
  customCharacters?: string;
  /** 배경색 (기본: dark blue) */
  backgroundColor?: string;
  /** 학습 언어 (예: English, Japanese, Spanish) */
  targetLanguage?: string;
  /** 시청자 모국어 (예: Korean, Japanese, Chinese) */
  nativeLanguage?: string;
  /** 출력 경로 */
  outputPath: string;
}

/**
 * YouTube 채널 썸네일 이미지 생성
 * Gemini 3 Pro Image Preview 사용 (고품질, 4K 지원)
 */
export async function generateThumbnail(options: ThumbnailOptions): Promise<string> {
  const apiKey = getGeminiApiKey();

  const {
    channelName,
    episodeTitle,
    characterStyle,
    customCharacters,
    backgroundColor,
    targetLanguage,
    nativeLanguage,
    outputPath,
  } = options;

  // 캐릭터 설명 결정
  let characterDescription: string;
  switch (characterStyle) {
    case 'animals':
      characterDescription =
        'two cute, original anthropomorphic animal characters (e.g., a fox and a bear) standing side by side';
      break;
    case 'humans':
      characterDescription =
        'two cheerful young adults from different countries standing side by side';
      break;
    case 'custom':
      characterDescription = customCharacters || 'two friendly characters standing side by side';
      break;
    default:
      characterDescription =
        'two cute, original anthropomorphic animal characters (e.g., a fox and a bear) standing side by side';
  }

  // 학습 언어에 따른 말풍선 내용 생성
  const foreignSpeechBubble = generateForeignPhrase(targetLanguage || '');
  const nativeSpeechBubble = generateUnderstandingPhrase(
    targetLanguage || '',
    nativeLanguage || ''
  );

  // 에피소드 제목이 있으면 추가 (5도 기울임)
  const titleText = episodeTitle
    ? `At the top, the episode title '${episodeTitle}' is displayed in a playful style, tilted approximately 5 degrees clockwise, with a fun hand-written font feel.`
    : '';

  // 채널명을 두 줄로 분리 (예: "들려요! English!" -> "들려요!" + "English!")
  const channelNameLines = channelName.includes('!')
    ? channelName.split(/(?<=!)\s*/).filter(Boolean)
    : [channelName];
  const isMultiLine = channelNameLines.length > 1;

  const channelNameText = isMultiLine
    ? `displayed in TWO LINES for emphasis, tilted approximately 5 degrees clockwise for a dynamic look:
  - First line: '${channelNameLines[0]}' (${nativeLanguage} text, medium size, white with blue shadow)
  - Second line: '${channelNameLines[1]}' (${targetLanguage} text, LARGER and more prominent, white with yellow shadow)
  Both lines are centered and stacked vertically`
    : `'${channelName}' in a single line, tilted approximately 5 degrees clockwise`;

  const prompt = `3D clay animation style illustration for a YouTube language learning channel thumbnail.

Style (CRITICAL):
- 3D clay animation style, stop motion aesthetic
- Plastiline clay texture, handmade feel
- Soft studio lighting, playful atmosphere
- Cute and friendly character proportions
- High quality, 4K render

Composition:
- At the bottom center, large, bold, 3D blocky channel name text ${channelNameText}
- The text must look like it is made of clay or plastic blocks
- Text should be the most prominent element, eye-catching with white outline

${titleText}

- Above the text, ${characterDescription}
- Characters have surprised and joyful expressions (happy that they can understand the language)
- Characters are cute and trendy 3D claymation style illustration
- Soft, rounded, friendly, high-quality 3D render like a Pixar movie character.

Speech Bubbles (IMPORTANT - exactly TWO bubbles only):
- The left character (male) has ONE speech bubble saying "${foreignSpeechBubble}" in ${targetLanguage}
- The right character (female) has ONE speech bubble saying "${nativeSpeechBubble}" expressing joy of understanding
- Bubbles should look like cut-out paper or clean plastic shapes
- NO other speech bubbles, musical notes, or decorative elements

Background:
- Clean solid pastel ${backgroundColor} background (e.g., mint, cream, or soft blue)
- Simple and uncluttered to make characters pop

Technical requirements:
- 16:9 aspect ratio (1280x720)
- High contrast for YouTube thumbnail visibility
- Text must be clearly readable
- Vibrant colors`;

  console.log(`🎨 Generating thumbnail for "${channelName}" using Gemini 3 Pro Image...`);

  // Gemini 3 Pro Image Preview API 사용
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['image', 'text'],
      responseMimeType: 'text/plain',
    },
  };

  const response = await fetch(`${GEMINI_API_URLS.image}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    // Gemini 3 Pro Image 실패시 Gemini Flash로 폴백
    console.log(
      `⚠️ Gemini 3 Pro Image failed (${response.status}), falling back to Gemini Flash...`
    );
    return generateThumbnailWithGemini(options);
  }

  const data = (await response.json()) as GeminiImageResponse;

  // 이미지 추출 및 저장
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, imageBuffer);
        console.log(`✅ Thumbnail saved to: ${outputPath}`);
        return outputPath;
      }
    }
  }

  throw new Error('No thumbnail image generated in Gemini 3 Pro Image response');
}

/**
 * 학습 언어에 따른 외국어 말풍선 문구 생성
 */
function generateForeignPhrase(targetLanguage: string): string {
  const phrases: Record<string, string> = {
    English: 'Blah blah~',
    Japanese: 'ペラペラ~',
    Chinese: '叽里呱啦~',
    Spanish: 'Bla bla~',
    French: 'Blabla~',
    German: 'Bla bla~',
    Korean: '어쩌구저쩌구~',
  };
  return phrases[targetLanguage] || 'Blah blah~';
}

/**
 * 시청자 모국어에 따른 이해 표현 문구 생성
 */
function generateUnderstandingPhrase(targetLanguage: string, nativeLanguage: string): string {
  const phrases: Record<string, Record<string, string>> = {
    Korean: {
      English: '영어가 들려요!',
      Japanese: '일본어가 들려요!',
      Chinese: '중국어가 들려요!',
      Spanish: '스페인어가 들려요!',
      French: '프랑스어가 들려요!',
      German: '독일어가 들려요!',
      default: '외국어가 들려요!',
    },
    Japanese: {
      English: '英語が聞こえる!',
      Korean: '韓国語が聞こえる!',
      Chinese: '中国語が聞こえる!',
      default: '外国語が聞こえる!',
    },
    Chinese: {
      English: '听懂英语了!',
      Japanese: '听懂日语了!',
      Korean: '听懂韩语了!',
      default: '听懂外语了!',
    },
    English: {
      Korean: 'I understand Korean!',
      Japanese: 'I understand Japanese!',
      Chinese: 'I understand Chinese!',
      default: 'I understand!',
    },
  };

  const nativePhrases = phrases[nativeLanguage];
  if (nativePhrases) {
    return nativePhrases[targetLanguage] || nativePhrases['default'] || 'I understand!';
  }
  return 'I understand!';
}

/**
 * Gemini Flash를 사용한 썸네일 생성 (폴백용)
 */
async function generateThumbnailWithGemini(options: ThumbnailOptions): Promise<string> {
  const apiKey = getGeminiApiKey();

  const {
    channelName,
    episodeTitle,
    characterStyle = 'animals',
    customCharacters,
    backgroundColor = 'dark blue',
    targetLanguage = 'English',
    nativeLanguage = 'Korean',
    outputPath,
  } = options;

  let characterDescription: string;
  switch (characterStyle) {
    case 'animals':
      characterDescription =
        'two cute, original anthropomorphic animal characters (e.g., a fox and a bear) standing side by side';
      break;
    case 'humans':
      characterDescription =
        'two cheerful young adults from different countries standing side by side';
      break;
    case 'custom':
      characterDescription =
        customCharacters ||
        'An American man character with blonde hair and a denim jacket, and a Korean woman character with dark hair and a modern pastel hanbok standing side by side';
      break;
  }

  // 학습 언어에 따른 말풍선 내용 생성
  const foreignSpeechBubble = generateForeignPhrase(targetLanguage);
  const nativeSpeechBubble = generateUnderstandingPhrase(targetLanguage, nativeLanguage);

  const titleText = episodeTitle
    ? `At the top, the episode title '${episodeTitle}' is displayed in a playful style, tilted approximately 5 degrees clockwise, with a fun hand-written font feel.`
    : '';

  // 채널명을 두 줄로 분리
  const channelNameLines = channelName.includes('!')
    ? channelName.split(/(?<=!)\s*/).filter(Boolean)
    : [channelName];
  const isMultiLine = channelNameLines.length > 1;

  const channelNameText = isMultiLine
    ? `displayed in TWO LINES for emphasis, tilted approximately 5 degrees clockwise for a dynamic look:
  - First line: '${channelNameLines[0]}' (${nativeLanguage} text, medium size, white with blue shadow)
  - Second line: '${channelNameLines[1]}' (${targetLanguage} text, LARGER and more prominent, white with yellow shadow)
  Both lines are centered and stacked vertically`
    : `'${channelName}' in a single line, tilted approximately 5 degrees clockwise`;

  const prompt = `3D clay animation style illustration for a YouTube language learning channel thumbnail.

Style (CRITICAL):
- 3D clay animation style, stop motion aesthetic
- Plastiline clay texture, handmade feel
- Soft studio lighting, playful atmosphere
- Cute and friendly character proportions
- High quality, 4K render

Composition:
- At the bottom center, large, bold, 3D blocky channel name text ${channelNameText}
- The text must look like it is made of clay or plastic blocks
- Text should be the most prominent element, eye-catching with white outline

${titleText}

- Above the text, ${characterDescription}
- Characters have surprised and joyful expressions (happy that they can understand the language)
- Characters look like handmade clay dolls

Speech Bubbles (IMPORTANT - exactly TWO bubbles only):
- The left character (male) has ONE speech bubble saying "${foreignSpeechBubble}" in ${targetLanguage}
- The right character (female) has ONE speech bubble saying "${nativeSpeechBubble}" expressing joy of understanding
- Bubbles should look like cut-out paper or clean plastic shapes
- NO other speech bubbles, musical notes, or decorative elements

Background:
- Clean solid pastel ${backgroundColor} background (e.g., mint, cream, or soft blue)
- Simple and uncluttered to make characters pop

Technical requirements:
- 16:9 aspect ratio (1280x720)
- High contrast for YouTube thumbnail visibility
- Text must be clearly readable
- Vibrant colors`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['image', 'text'],
      responseMimeType: 'text/plain',
    },
  };

  const response = await fetch(`${GEMINI_API_URLS.image}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GeminiImageResponse;

  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, imageBuffer);
        console.log(`✅ Thumbnail saved to: ${outputPath}`);
        return outputPath;
      }
    }
  }

  throw new Error('No thumbnail image generated');
}

/**
 * 채널용 기본 썸네일 생성 (채널 설정 기반)
 */
export async function generateChannelThumbnail(
  channelId: string,
  episodeTitle?: string
): Promise<string> {
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  const outputDir = path.join(process.cwd(), 'output', channelId);
  const outputPath = path.join(outputDir, 'thumbnail.png');

  const thumbnailConfig = config.thumbnail || {};

  return generateThumbnail({
    channelName: thumbnailConfig.channelName || config.meta.name,
    episodeTitle,
    characterStyle: thumbnailConfig.characterStyle || 'animals',
    customCharacters: thumbnailConfig.customCharacters,
    backgroundColor: thumbnailConfig.backgroundColor || 'dark blue',
    targetLanguage: config.meta.targetLanguage,
    nativeLanguage: config.meta.nativeLanguage,
    outputPath,
  });
}

// =============================================================================
// Shorts Background Image Generation
// =============================================================================

/**
 * 카테고리별 스타일 힌트
 */
const CATEGORY_STYLE_HINTS: Record<Category, string> = {
  travel_business: 'professional setting, modern interior, service interaction',
  conversation: 'casual everyday setting, cozy atmosphere, friendly interaction',
  story: 'emotional cinematic mood, dramatic lighting, personal moment',
  news: 'broadcast studio feel, formal tone, informative setting',
  announcement: 'public space, clear signage visible, official atmosphere',
  lesson: 'classroom or study environment, educational setting',
  fairytale: 'whimsical storybook aesthetic, magical elements, fantasy setting',
};

/**
 * 공통 쇼츠 스타일 프롬프트
 */
const SHORTS_COMMON_STYLE = `comic book illustration style, clean bold line art, soft pastel color palette, bright friendly atmosphere, digital art, single continuous scene filling entire 16:9 frame, NO panels NO borders NO dividing lines, natural character positioning, warm natural lighting, slight depth blur on distant background`;

/**
 * 쇼츠용 배경 이미지 생성
 * 스크립트의 imagePrompt를 재사용하고 스타일만 변경
 */
export async function generateShortsBackground(script: Script, outputDir: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  const outputPath = path.join(outputDir, 'episode-shorts-background.png');

  console.log(`🎨 Generating shorts background for "${script.metadata.title.native}"...`);

  // 1. 스크립트의 imagePrompt에서 Pixar/3D 관련 키워드 제거
  let scenePrompt = script.metadata.imagePrompt || '';

  // Pixar/Disney/3D 관련 키워드 제거
  scenePrompt = scenePrompt
    .replace(/Pixar[- ]?style\s*/gi, '')
    .replace(/Disney[- ]?style\s*/gi, '')
    .replace(/3D animation\s*/gi, '')
    .replace(/with detailed textures\.?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // imagePrompt가 없으면 기본 장면 생성
  if (!scenePrompt) {
    const charactersDesc = script.metadata.characters
      .map((c: Character) => `${c.name} (${c.gender} ${c.role})`)
      .join(', ');
    scenePrompt = `${script.metadata.topic} scene with ${charactersDesc}`;
  }

  console.log(`   📝 Scene: "${scenePrompt.substring(0, 60)}..."`);

  // 2. 카테고리별 스타일 힌트
  const categoryHint = CATEGORY_STYLE_HINTS[script.category] || '';

  // 3. 최종 프롬프트 조합
  const finalPrompt = `${scenePrompt}, ${categoryHint}, ${SHORTS_COMMON_STYLE}, no text or words in image --ar 16:9`;

  console.log(`   🖼️ Generating image...`);

  const requestBody = {
    contents: [{ parts: [{ text: finalPrompt }] }],
    generationConfig: {
      responseModalities: ['image', 'text'],
      responseMimeType: 'text/plain',
    },
  };

  const response = await fetch(`${GEMINI_API_URLS.image}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GeminiImageResponse;

  // 이미지 추출 및 저장
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, imageBuffer);
        console.log(`   ✅ Shorts background saved to: ${outputPath}`);
        return outputPath;
      }
    }
  }

  throw new Error('No shorts background image generated');
}

// =============================================================================
// Multi-Scene Image Generation with Character Consistency
// =============================================================================

/**
 * 🎬 Mood를 구체적인 조명/시각 용어로 변환
 */
const MOOD_TO_LIGHTING: Record<string, string> = {
  // Positive moods
  happy: 'bright high-key lighting, warm golden tones, soft fill light',
  joyful: 'vibrant warm lighting, sun flares, cheerful color palette',
  cheerful: 'bright natural daylight, soft shadows, warm color temperature',
  excited: 'dynamic lighting with highlights, energetic warm tones',
  hopeful: 'soft golden hour light, gentle lens flare, optimistic atmosphere',
  romantic: 'soft pink and golden hues, dreamy bokeh, warm backlight',
  peaceful: 'soft diffused light, pastel tones, gentle ambient glow',
  cozy: 'warm interior lighting, soft shadows, amber tones from practical lights',
  friendly: 'bright even lighting, warm skin tones, inviting atmosphere',
  welcoming: 'warm entrance lighting, soft highlights, comfortable ambiance',

  // Neutral moods
  calm: 'soft natural light, muted tones, balanced exposure',
  quiet: 'soft moonlight, cool blue tones, gentle volumetric fog',
  contemplative: 'soft side lighting, thoughtful shadows, muted palette',
  curious: 'bright key light with soft fill, clear visibility, neutral tones',
  focused: 'sharp directional light, clear contrast, professional lighting',
  neutral: 'balanced three-point lighting, natural color temperature',

  // Tense/Dramatic moods
  tense: 'harsh shadows, high contrast, cool desaturated tones',
  anxious: 'flickering light effect, unstable shadows, slightly desaturated',
  mysterious: 'low-key lighting, deep shadows, rim light silhouettes',
  dramatic: 'chiaroscuro lighting, strong contrast, theatrical shadows',
  suspenseful: 'underlit faces, long shadows, cool color grading',
  intense: 'hard directional light, stark shadows, saturated colors',

  // Sad/Melancholic moods
  sad: 'overcast diffused light, desaturated cool tones, soft shadows',
  melancholic: 'blue hour lighting, muted colors, gentle rain atmosphere',
  lonely: 'single isolated light source, vast dark negative space',
  nostalgic: 'warm sepia tones, soft focus edges, vintage color grading',
  bittersweet: 'golden hour fading to blue, mixed warm and cool tones',

  // Magical/Fantasy moods
  magical: 'ethereal glow, sparkle particles, iridescent highlights',
  whimsical: 'soft fairy-tale lighting, pastel colors, magical dust particles',
  dreamy: 'soft focus, hazy atmosphere, gentle bloom effect',
  enchanted: 'bioluminescent glow, mystical fog, fantasy color palette',
  wonder: 'dramatic god rays, awe-inspiring scale lighting',

  // Default fallback
  default: 'cinematic three-point lighting, natural color temperature, soft shadows',
};

/**
 * Mood 문자열에서 조명 설명 추출
 */
function moodToLighting(mood: string): string {
  const moodLower = mood.toLowerCase();

  // 직접 매칭 시도
  for (const [key, value] of Object.entries(MOOD_TO_LIGHTING)) {
    if (moodLower.includes(key)) {
      return value;
    }
  }

  // 매칭 실패시 기본값
  return MOOD_TO_LIGHTING.default;
}

/**
 * 캐릭터 외모를 이미지 프롬프트용 문자열로 변환 (전체 버전)
 */
function buildCharacterDescriptionFull(character: Character): string {
  const { name, gender, ethnicity, role, appearance } = character;

  if (!appearance) {
    return `${name}, a ${ethnicity} ${gender} (${role})`;
  }

  const parts = [
    `${name}`,
    `a ${appearance.age} ${ethnicity} ${gender}`,
    `${appearance.hair}`,
    `${appearance.eyes}`,
    `${appearance.skin}`,
    `${appearance.build}`,
    `wearing ${appearance.clothing}`,
  ];

  if (appearance.distinctiveFeatures) {
    parts.push(appearance.distinctiveFeatures);
  }

  return parts.join(', ');
}

/**
 * 캐릭터 외모를 경량화된 프롬프트로 변환 (후속 씬용)
 * 핵심 식별 특징만 포함하여 AI가 스타일을 무시하지 않도록 함
 */
function buildCharacterDescriptionLight(character: Character): string {
  const { name, gender, appearance } = character;

  if (!appearance) {
    return `${name} (${gender})`;
  }

  // 핵심 식별 특징만: 이름, 성별, 머리, 옷
  const parts = [
    name,
    gender,
    appearance.hair.split(',')[0],
    `wearing ${appearance.clothing.split(',')[0]}`,
  ];

  if (appearance.distinctiveFeatures) {
    parts.push(appearance.distinctiveFeatures);
  }

  return parts.join(', ');
}

/**
 * 스크립트의 모든 캐릭터를 하나의 프롬프트 문자열로 조합
 * @param isFirstScene - 첫 번째 씬이면 전체 설명, 아니면 경량화
 */
function buildAllCharactersDescription(
  characters: Character[],
  isFirstScene: boolean = true
): string {
  const visibleCharacters = characters.filter((c) => c.role !== 'narrator');

  if (visibleCharacters.length === 0) {
    return '';
  }

  const buildFn = isFirstScene ? buildCharacterDescriptionFull : buildCharacterDescriptionLight;
  return visibleCharacters.map(buildFn).join('. ');
}

/**
 * 🎬 시네마틱 프롬프트 생성 (구조화된 순서)
 * [Quality] + [Camera] + [Subject] + [Setting] + [Lighting] + [Style] + [Negative]
 */
function buildCinematicPrompt(
  scene: {
    setting: string;
    mood: string;
    characterActions: string;
    cameraDirection?: string;
    lighting?: string;
  },
  charactersDescription: string,
  isFirstScene: boolean
): string {
  // 1. Quality tags (가장 먼저 - 가중치 높음)
  const qualityTags = '(Masterpiece:1.2), (Best Quality:1.2), (High Detail:1.1)';

  // 2. Camera & Composition
  const cameraDirection = scene.cameraDirection || 'Medium shot, eye-level';
  const camera = `${cameraDirection}, cinematic composition, depth of field, 8K resolution`;

  // 3. Subject (캐릭터 액션)
  const subject = scene.characterActions;

  // 4. Setting (배경/환경)
  const setting = scene.setting;

  // 5. Lighting (mood에서 변환하거나 직접 지정된 값 사용)
  const lightingFromMood = moodToLighting(scene.mood);
  const lighting = scene.lighting || lightingFromMood;
  const atmosphericLighting = `${lighting}, atmospheric perspective, volumetric lighting`;

  // 6. Style
  const style = 'Pixar-style 3D animation, Unreal Engine 5 render quality, hyper-detailed textures';

  // 7. Negative prompt hints (Gemini는 직접 negative prompt를 지원하지 않으므로 긍정적으로 표현)
  const avoidance = 'clean composition, no text, no watermarks, no artifacts, sharp focus';

  // 프롬프트 조합 (순서 중요!)
  if (charactersDescription) {
    // 첫 번째 씬은 캐릭터 설명 전체, 이후는 경량화
    const charSection = isFirstScene
      ? `Characters (maintain exact appearance): ${charactersDescription}`
      : `Same characters as reference: ${charactersDescription}`;

    return `${qualityTags},
[Camera] ${camera},
[Subject] ${subject},
[Setting] ${setting},
[Characters] ${charSection},
[Lighting] ${atmosphericLighting},
[Style] ${style},
[Quality] ${avoidance}`;
  } else {
    // 캐릭터 없는 씬 (narrator만 있는 경우)
    return `${qualityTags},
[Camera] ${camera},
[Subject] ${subject},
[Setting] ${setting},
[Lighting] ${atmosphericLighting},
[Style] ${style},
[Quality] ${avoidance}`;
  }
}

/**
 * 다중 장면 이미지 생성 (캐릭터 일관성 유지)
 * 개선된 시네마틱 프롬프트 구조 사용
 */
export async function generateSceneImages(script: Script, outputDir: string): Promise<string[]> {
  const apiKey = getGeminiApiKey();
  const scenePrompts = script.metadata.scenePrompts;

  // scenePrompts가 없으면 레거시 방식으로 단일 이미지 생성
  if (!scenePrompts || scenePrompts.length === 0) {
    console.log('⚠️ No scenePrompts found, falling back to single image generation');
    const singleImage = await generateBackgroundImage(
      script.metadata.topic,
      script.metadata.title.target,
      outputDir,
      script.metadata.imagePrompt
    );
    return [singleImage];
  }

  console.log(`🎨 Generating ${scenePrompts.length} cinematic scene images...`);

  const generatedImages: string[] = [];
  let referenceImageBase64: string | null = null;

  for (let i = 0; i < scenePrompts.length; i++) {
    const scene = scenePrompts[i];
    const outputPath = path.join(outputDir, `scene_${i + 1}.png`);
    const isFirstScene = i === 0;

    console.log(
      `   🖼️ Scene ${i + 1}/${scenePrompts.length}: sentences ${scene.sentenceRange[0]}-${scene.sentenceRange[1]}`
    );

    // 캐릭터 설명 빌드 (첫 씬은 전체, 이후는 경량화)
    const charactersDescription = buildAllCharactersDescription(
      script.metadata.characters,
      isFirstScene
    );

    // 🎬 시네마틱 프롬프트 생성
    const scenePrompt = buildCinematicPrompt(scene, charactersDescription, isFirstScene);

    if (isFirstScene) {
      console.log(`   📝 Prompt preview: ${scenePrompt.substring(0, 150)}...`);
    }

    // API 요청 구성
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // 첫 번째 이미지 이후에는 reference image 추가
    if (referenceImageBase64 && !isFirstScene) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: referenceImageBase64,
        },
      });

      const referenceInstruction = charactersDescription
        ? `REFERENCE IMAGE ABOVE - Maintain IDENTICAL character appearance (face, hair, clothing, body type).

`
        : `REFERENCE IMAGE ABOVE - Maintain consistent art style and color palette.

`;

      parts.push({
        text: `${referenceInstruction}${scenePrompt}`,
      });
    } else {
      parts.push({ text: scenePrompt });
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['image', 'text'],
        responseMimeType: 'text/plain',
      },
    };

    try {
      const response = await fetch(`${GEMINI_API_URLS.image}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`   ⚠️ Scene ${i + 1} failed: ${response.status} - ${errorText}`);
        continue;
      }

      const data = (await response.json()) as GeminiImageResponse;

      // 이미지 추출 및 저장
      for (const candidate of data.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, imageBuffer);

            // 첫 번째 이미지를 reference로 저장
            if (isFirstScene) {
              referenceImageBase64 = part.inlineData.data;
            }

            generatedImages.push(outputPath);
            console.log(`   ✅ Scene ${i + 1} saved: ${outputPath}`);
            break;
          }
        }
      }
    } catch (error) {
      console.warn(`   ⚠️ Scene ${i + 1} error: ${error}`);
    }

    // API 레이트 리밋 방지를 위한 딜레이
    if (i < scenePrompts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (generatedImages.length === 0) {
    throw new Error('Failed to generate any scene images');
  }

  console.log(`   ✅ Generated ${generatedImages.length}/${scenePrompts.length} scene images`);
  return generatedImages;
}

/**
 * 장면 이미지 경로 목록 반환 (이미 생성된 경우)
 */
export function getSceneImagePaths(outputDir: string, sceneCount: number): string[] {
  return Array.from({ length: sceneCount }, (_, i) => path.join(outputDir, `scene_${i + 1}.png`));
}
