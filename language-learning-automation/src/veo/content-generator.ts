/**
 * Veo 콘텐츠 생성기
 * 채널 설정을 기반으로 매일 새로운 콘텐츠 생성
 */

import * as fs from 'fs';
import * as path from 'path';
import { getGeminiApiKey, GEMINI_API_URLS } from '../config/gemini';

// 채널 설정 타입
export interface ChannelConfig {
  channelId: string;
  channelName: string;
  contentType: 'interview' | 'dialogue';
  character: {
    id: string;
    name: string;
    nameEnglish: string;
    type: 'animal' | 'human';
    imagePath?: string;
    style: string;
    voiceStyle: string;
    personality: string;
    age: string;
  };
  props?: {
    microphone?: string;
  };
  veoConfig: {
    useReferenceImages: boolean;
    aspectRatio: string;
    durationSeconds: number;
    personGeneration: string;
  };
  interviewConfig?: {
    reporterLanguage: string;
    characterLanguage: string;
    reporterVisible: boolean;
  };
}

// 일일 콘텐츠 타입
export interface DailyContent {
  date: string;
  theme: string;
  dialogues: {
    question: string;
    answer: string;
    gesture?: string;
  }[];
  background: string;
  outfit: string | null;
  veoPrompt: string;
}

/**
 * 채널 설정 로드
 */
export function loadChannelConfig(channelId: string): ChannelConfig {
  const configPath = path.join('channels', `${channelId}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Channel config not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

/**
 * AI로 일일 콘텐츠 생성
 */
export async function generateDailyContent(
  channelId: string,
  options?: { theme?: string }
): Promise<DailyContent> {
  const config = loadChannelConfig(channelId);
  const today = new Date().toISOString().split('T')[0];

  console.log(`🎬 Generating daily content for ${config.channelName}`);
  console.log(`   Date: ${today}`);

  // AI에게 콘텐츠 생성 요청
  const contentPlan = await generateContentPlan(config, options?.theme);

  // Veo 프롬프트 빌드
  const veoPrompt = buildVeoPrompt(config, contentPlan);

  return {
    date: today,
    ...contentPlan,
    veoPrompt,
  };
}

/**
 * Gemini로 콘텐츠 플랜 생성
 */
async function generateContentPlan(
  config: ChannelConfig,
  suggestedTheme?: string
): Promise<Omit<DailyContent, 'date' | 'veoPrompt'>> {
  const apiKey = getGeminiApiKey();

  const prompt = buildContentPlanPrompt(config, suggestedTheme);

  const response = await fetch(`${GEMINI_API_URLS.text}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  return JSON.parse(text);
}

/**
 * 콘텐츠 플랜 생성 프롬프트
 */
function buildContentPlanPrompt(config: ChannelConfig, suggestedTheme?: string): string {
  const themeHint = suggestedTheme ? `Today's theme should be related to: ${suggestedTheme}` : '';

  if (config.contentType === 'interview') {
    return `You are a content planner for a cute animal English learning YouTube channel.

Character: ${config.character.name} (${config.character.nameEnglish})
- Type: ${config.character.age} ${config.character.type}
- Personality: ${config.character.personality}
- Voice style: ${config.character.voiceStyle}

${themeHint}

This is an English learning interview format:
- Reporter asks in Korean: "OOO"는? (asking how to say something in English)
- Character answers with the English translation

Generate 2 question-answer pairs for today's content.

IMPORTANT RULES:
1. Questions are Korean phrases the reporter asks to translate, format: "한국어표현"는?
2. Answers are the English translations (2-4 words, natural spoken English)
3. For each answer, include a matching gesture/action the kitten should do
4. The outfit MUST be high-quality, realistic human clothing with specific brand-style details:
   - Include material texture (e.g., "thick wool", "quilted down", "soft fleece")
   - Include specific colors and patterns
   - Include realistic accessories (buttons, zippers, fur trim, etc.)
   - Example: "luxurious gray quilted down puffer jacket with faux fur hood trim and silver zipper"

Return JSON with this exact structure:
{
  "theme": "today's theme (e.g., weather, food, emotions, daily life)",
  "dialogues": [
    {
      "question": "눈이 와요"는?",
      "answer": "It's snowing!",
      "gesture": "looks up at the sky with wonder, paws reaching up"
    },
    {
      "question": "손이 시려워요"는?",
      "answer": "My hands are freezing!",
      "gesture": "shivers and rubs paws together, looking cold"
    }
  ],
  "background": "detailed scene background description matching the theme",
  "outfit": "high-quality realistic human clothing with material, color, and accessory details"
}

Additional requirements:
- Background should be photorealistic with cinematic bokeh blur effect
- Outfit must look like real high-end fashion brand quality
- Gestures should match the meaning of the English answer (e.g., shivering for "freezing", pointing up for "snowing")

Make the Korean phrases practical and commonly used. Keep English answers short and natural.`;
  }

  // dialogue type (할머니-손자 등)
  return `Generate dialogue content for ${config.channelName}. Return JSON.`;
}

/**
 * Veo 프롬프트 빌드
 */
function buildVeoPrompt(
  config: ChannelConfig,
  content: Omit<DailyContent, 'date' | 'veoPrompt'>
): string {
  if (config.contentType === 'interview') {
    return buildInterviewVeoPrompt(config, content);
  }
  return buildDialogueVeoPrompt(config, content);
}

/**
 * 인터뷰 형식 Veo 프롬프트
 */
function buildInterviewVeoPrompt(
  config: ChannelConfig,
  content: Omit<DailyContent, 'date' | 'veoPrompt'>
): string {
  const { character } = config;
  const { dialogues, background, outfit } = content;

  const outfitDesc = outfit ? `The kitten is wearing ${outfit}, dressed like a human.` : '';

  // 대화 시퀀스 생성 (제스처 포함)
  const dialogueSequence = dialogues
    .map((d, i) => {
      const gesture = (d as { gesture?: string }).gesture || 'gestures cutely';
      return `${i + 1}. Reporter asks: "${d.question}" - Kitten ${gesture} and responds: "${d.answer}"`;
    })
    .join('\n');

  return `Interview style video, medium close-up shot.
An anthropomorphic ${character.style} (matching the reference image) is centered in the frame, facing the camera directly.
The kitten has visible paws/hands and uses them expressively while talking, gesturing like a human.
${outfitDesc}
A pink cat-themed square microphone with a cat face design is positioned at the bottom left corner of the frame.
The microphone appears to be held from off-screen, no hand visible.

This is an English learning interview. The reporter asks Korean phrases and the kitten translates to English:
${dialogueSequence}

The kitten gestures cutely with its paws while answering in ${character.voiceStyle}.

${background}, photorealistic with cinematic bokeh blur, soft natural lighting.
No subtitles, no captions, no text overlays, no on-screen text of any kind.`;
}

/**
 * 대화 형식 Veo 프롬프트 (할머니-손자 등)
 */
function buildDialogueVeoPrompt(
  config: ChannelConfig,
  content: Omit<DailyContent, 'date' | 'veoPrompt'>
): string {
  // TODO: 대화 형식 구현
  return `Dialogue scene. ${content.background}`;
}

/**
 * 콘텐츠 저장
 */
export function saveDailyContent(channelId: string, content: DailyContent): string {
  const outputDir = path.join('output', channelId, content.date);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'content.json');
  fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));

  console.log(`💾 Content saved: ${outputPath}`);
  return outputPath;
}
