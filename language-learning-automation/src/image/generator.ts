import { promises as fs } from 'fs';
import path from 'path';
import { GEMINI_API_URLS, getGeminiApiKey, type GeminiImageResponse } from '../config/gemini';

/**
 * Generate an illustration image using Gemini API based on the script topic
 */
export async function generateIllustration(
  topic: string,
  title: string,
  style: string = 'warm illustration',
  outputPath: string
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // Create a prompt for image generation
  const prompt = `Generate a warm, friendly illustration image for a language learning video.

Topic: ${topic}
Title: ${title}

Style requirements:
- ${style} style, similar to children's book illustrations
- Warm, inviting colors
- Simple but expressive characters
- Clear scene that represents the topic
- No text or words in the image
- 16:9 aspect ratio suitable for YouTube
- Soft lighting, cozy atmosphere

The image should visually represent the conversation topic in a way that helps language learners understand the context.`;

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
 * @param imagePrompt - GPT가 생성한 커스텀 이미지 프롬프트 (있으면 이걸 사용)
 */
export async function generateBackgroundImage(
  topic: string,
  title: string,
  outputDir: string,
  imagePrompt?: string
): Promise<string> {
  const filename = 'background.png';
  const outputPath = path.join(outputDir, filename);

  // imagePrompt가 있으면 해당 프롬프트를 스타일로 사용
  const style = imagePrompt || 'warm cozy illustration with soft colors';

  return generateIllustration(topic, title, style, outputPath);
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
    characterStyle = 'animals',
    customCharacters,
    backgroundColor = 'dark blue',
    targetLanguage = 'English',
    nativeLanguage = 'Korean',
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
  }

  // 학습 언어에 따른 말풍선 내용 생성
  const foreignSpeechBubble = generateForeignPhrase(targetLanguage);
  const nativeSpeechBubble = generateUnderstandingPhrase(targetLanguage, nativeLanguage);

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

  const prompt = `A warm, hand-drawn 2D cartoon illustration for a YouTube language learning channel thumbnail.

Style:
- Hand-drawn, warm and friendly 2D cartoon illustration
- Clear, bold outlines
- Soft, rich colors
- Textured solid color background

Composition:
- At the bottom center, large, bold, three-dimensional channel name text ${channelNameText}
- The text should be the most prominent element, eye-catching and readable with white outline and colorful shadows
${titleText}
- Above the text, ${characterDescription}
- Characters have surprised and joyful expressions (happy that they can understand the language)

Speech Bubbles (IMPORTANT - exactly TWO bubbles only):
- The left character (male) has ONE speech bubble saying "${foreignSpeechBubble}" in ${targetLanguage}
- The right character (female) has ONE speech bubble saying "${nativeSpeechBubble}" expressing joy of understanding
- NO other speech bubbles, musical notes, or decorative elements around the characters
- Keep it clean and simple with just these two speech bubbles

Background:
- Solid, textured ${backgroundColor} background
- Clean and uncluttered

Technical requirements:
- 16:9 aspect ratio (1280x720 or similar)
- High contrast for YouTube thumbnail visibility
- Text must be clearly readable even at small sizes
- Vibrant colors that stand out in YouTube search results`;

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
      characterDescription = customCharacters || 'two friendly characters standing side by side';
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

  const prompt = `A warm, hand-drawn 2D cartoon illustration for a YouTube language learning channel thumbnail.

Style:
- Hand-drawn, warm and friendly 2D cartoon illustration
- Clear, bold outlines
- Soft, rich colors
- Textured solid color background

Composition:
- At the bottom center, large, bold, three-dimensional channel name text ${channelNameText}
- The text should be the most prominent element, eye-catching and readable with white outline and colorful shadows
${titleText}
- Above the text, ${characterDescription}
- Characters have surprised and joyful expressions (happy that they can understand the language)

Speech Bubbles (IMPORTANT - exactly TWO bubbles only):
- The left character (male) has ONE speech bubble saying "${foreignSpeechBubble}" in ${targetLanguage}
- The right character (female) has ONE speech bubble saying "${nativeSpeechBubble}" expressing joy of understanding
- NO other speech bubbles, musical notes, or decorative elements around the characters
- Keep it clean and simple with just these two speech bubbles

Background:
- Solid, textured ${backgroundColor} background
- Clean and uncluttered

Technical requirements:
- 16:9 aspect ratio (1280x720 or similar)
- High contrast for YouTube thumbnail visibility
- Text must be clearly readable even at small sizes
- Vibrant colors that stand out in YouTube search results`;

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

  return generateThumbnail({
    channelName: config.meta.name,
    episodeTitle,
    characterStyle: 'animals',
    backgroundColor: 'dark blue',
    outputPath,
  });
}
