import { promises as fs } from 'fs';
import path from 'path';
import { GEMINI_API_URLS, getGeminiApiKey, type GeminiImageResponse } from '../config/gemini';
import type { Script, Category, Character } from '../script/types';

/**
 * Generate an illustration image using Gemini API based on the script topic
 */
export async function generateIllustration(
  topic: string,
  title: string,
  sceneDescription: string = '',
  outputPath: string
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // 프롬프트 구조: 헤더(스타일) + 본문(상황) + 푸터(기술 요구사항)
  const styleHeader = `High-quality 3D animation style, reminiscent of Pixar or Disney movies. Octane render
Photorealistic rendering with stylized characters.
Cute but mature characters with highly expressive facial features and large, detailed eyes.
Cinematic lighting with volumetric lighting effects, subsurface scattering for realistic skin glow.
Rich, vibrant textures with attention to material details.`;

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
 */
export async function generateBackgroundImage(
  topic: string,
  title: string,
  outputDir: string,
  imagePrompt?: string
): Promise<string> {
  const filename = 'background.png';
  const outputPath = path.join(outputDir, filename);

  // imagePrompt가 있으면 구체적 장면 설명으로 사용
  const sceneDescription = imagePrompt || '';

  return generateIllustration(topic, title, sceneDescription, outputPath);
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
const SHORTS_COMMON_STYLE = `comic book illustration style, clean bold line art, soft pastel color palette, bright friendly atmosphere, digital art, single continuous scene filling entire vertical 9:16 frame, NO panels NO borders NO dividing lines, background extends to all edges of image, characters positioned in lower half of frame, upper half shows extended background environment like ceiling walls or sky, warm natural lighting, slight depth blur on distant background`;

/**
 * LLM을 사용해 상황별 프롬프트 생성
 */
async function generateSituationalPrompt(script: Script): Promise<string> {
  const apiKey = getGeminiApiKey();

  const charactersDesc = script.metadata.characters
    .map((c: Character) => `${c.name} (${c.gender} ${c.role})`)
    .join(', ');

  const sampleDialogue = script.sentences
    .slice(0, 3)
    .map((s) => `${s.speaker}: "${s.target}"`)
    .join('\n');

  const prompt = `You are an expert at creating image generation prompts for educational language learning shorts (9:16 vertical).

**INPUT:**
- Episode title: ${script.metadata.title.native}
- Topic: ${script.metadata.topic}
- Characters: ${charactersDesc}
- Sample dialogue:
${sampleDialogue}

**OUTPUT:** 
A single situational prompt describing the scene.

**CRITICAL COMPOSITION RULES:**
- ONE CONTINUOUS SCENE filling the entire 9:16 vertical frame
- NO comic panels, NO borders, NO dividing lines
- Background must extend to ALL EDGES of the image (top, bottom, left, right)
- Characters positioned in the LOWER 50% of the frame
- Upper 50% shows the environment (ceiling, walls, sky, trees, etc.)
- Wide/medium shot perspective showing full upper body of characters

**RULES:**
- NO style keywords (handled separately)
- Focus ONLY on the scene content
- Keep it under 80 words
- Describe setting details that fill the upper portion (ceiling lights, shelves, sky, etc.)

**EXAMPLE:**
Output:
"Office interior with high ceiling and fluorescent lights visible above, bookshelves and windows in upper background, young man in sweater holding planner standing in lower portion of frame, female colleague with papers facing him, friendly conversation moment, potted plants on desks, warm afternoon lighting through windows"

Now create a situational prompt. Output ONLY the prompt text.`;

  try {
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    };

    const response = await fetch(`${GEMINI_API_URLS.text}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ⚠️ Gemini text API error: ${response.status} - ${errorText}`);
      // 폴백: 스크립트의 imagePrompt 사용
      if (script.metadata.imagePrompt) {
        console.log(`   📝 Using script's imagePrompt as fallback`);
        return script.metadata.imagePrompt;
      }
      return `${script.metadata.topic} scene with ${charactersDesc}`;
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText || generatedText.trim().length < 20) {
      console.error(`   ⚠️ Empty or too short response from Gemini`);
      // 폴백: 스크립트의 imagePrompt 사용
      if (script.metadata.imagePrompt) {
        console.log(`   📝 Using script's imagePrompt as fallback`);
        return script.metadata.imagePrompt;
      }
      return `${script.metadata.topic} scene with ${charactersDesc}`;
    }

    return generatedText.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error(`   ⚠️ Error generating situational prompt:`, error);
    // 폴백: 스크립트의 imagePrompt 사용
    if (script.metadata.imagePrompt) {
      console.log(`   📝 Using script's imagePrompt as fallback`);
      return script.metadata.imagePrompt;
    }
    return `${script.metadata.topic} scene with ${charactersDesc}`;
  }
}

/**
 * 쇼츠용 배경 이미지 생성
 */
export async function generateShortsBackground(script: Script, outputDir: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  const outputPath = path.join(outputDir, 'episode-shorts-background.png');

  console.log(`🎨 Generating shorts background for "${script.metadata.title.native}"...`);

  // 1. LLM으로 상황별 프롬프트 생성
  console.log(`   📝 Generating situational prompt...`);
  const situationalPrompt = await generateSituationalPrompt(script);
  console.log(`   ✅ Situational: "${situationalPrompt.substring(0, 80)}..."`);

  // 2. 카테고리별 스타일 힌트
  const categoryHint = CATEGORY_STYLE_HINTS[script.category] || '';

  // 3. 최종 프롬프트 조합 (상황 먼저 → 스타일 뒤에)
  const finalPrompt = `${situationalPrompt}, ${categoryHint}, ${SHORTS_COMMON_STYLE}, no text or words in image --ar 9:16`;

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
