/**
 * Intro Asset Generator
 * Gemini API를 사용해 채널별 인트로 에셋을 생성
 * TTS 나레이션도 자동 생성
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { IntroAssetConfig, IntroAssets, IntroGeneratorOptions, IntroStyle } from './types';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

interface GeminiImageResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
}

// 언어별 바이럴 문구
const VIRAL_MESSAGES: Record<string, { line1: string; line2: string }> = {
  English: {
    line1: '영어 문장을 반복해서 듣고',
    line2: '영어가 들리는 순간을 느껴보세요.',
  },
  Japanese: {
    line1: '일본어 문장을 반복해서 듣고',
    line2: '일본어가 들리는 순간을 느껴보세요.',
  },
  Chinese: {
    line1: '중국어 문장을 반복해서 듣고',
    line2: '중국어가 들리는 순간을 느껴보세요.',
  },
  Spanish: {
    line1: '스페인어 문장을 반복해서 듣고',
    line2: '스페인어가 들리는 순간을 느껴보세요.',
  },
  French: {
    line1: '프랑스어 문장을 반복해서 듣고',
    line2: '프랑스어가 들리는 순간을 느껴보세요.',
  },
  German: {
    line1: '독일어 문장을 반복해서 듣고',
    line2: '독일어가 들리는 순간을 느껴보세요.',
  },
};

// 언어별 가이드 문구
const GUIDE_MESSAGE = '이 영상은 다음 네 단계로 진행됩니다.';

// 시청자 언어별 TTS 음성
const TTS_VOICES: Record<string, string> = {
  Korean: 'ko-KR-SunHiNeural', // 밝은 여성 아나운서
  Japanese: 'ja-JP-NanamiNeural',
  Chinese: 'zh-CN-XiaoxiaoNeural',
  English: 'en-US-JennyNeural',
};

const INTRO_PROMPTS: Record<IntroStyle, string> = {
  modern: `Create a modern, clean intro background for a language learning YouTube channel.
Style: Minimalist with subtle geometric patterns, soft gradients.
Mood: Professional, trustworthy, educational.
No text, no logos - just the background design.`,

  neon: `Create a vibrant neon-style intro background for a language learning YouTube channel.
Style: Neon glow effects, cyberpunk-inspired, glowing lines and shapes on dark background.
Mood: Energetic, modern, exciting.
No text, no logos - just the background design.`,

  gradient: `Create a beautiful gradient intro background for a language learning YouTube channel.
Style: Smooth flowing gradients, abstract waves or aurora-like effects.
Mood: Calm, focused, inspiring.
No text, no logos - just the background design.`,

  minimal: `Create an ultra-minimal intro background for a language learning YouTube channel.
Style: Very simple, mostly solid dark color (#0a0a0a) with subtle texture or single accent element.
Mood: Zen, focused, distraction-free.
No text, no logos - just the background design.`,

  cinematic: `Create a cinematic intro background for a language learning YouTube channel.
Style: Movie-like atmosphere, dramatic lighting, depth and dimension, rich dark tones.
Mood: Premium, immersive, theatrical.
No text, no logos - just the background design.`,
};

export class IntroGenerator {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 채널용 인트로 에셋 생성 (이미지 + TTS)
   */
  async generateIntroAssets(
    config: IntroAssetConfig,
    options: IntroGeneratorOptions
  ): Promise<IntroAssets> {
    const { outputDir, force = false } = options;
    const assetsDir = path.join(outputDir, 'intro');
    const manifestPath = path.join(assetsDir, 'manifest.json');

    // 이미 생성된 에셋이 있으면 재사용
    if (!force) {
      try {
        const existing = await fs.readFile(manifestPath, 'utf-8');
        const assets: IntroAssets = JSON.parse(existing);
        console.log(`✅ Using existing intro assets for ${config.channelId}`);
        return assets;
      } catch {
        // 파일이 없으면 새로 생성
      }
    }

    console.log(`🎨 Generating intro assets for ${config.channelId}...`);
    await fs.mkdir(assetsDir, { recursive: true });

    // 배경 이미지 생성
    const backgroundImage = await this.generateBackgroundImage(config, assetsDir);

    // TTS 나레이션 생성
    const { viralTtsPath, guideTtsPath } = await this.generateIntroTTS(config, assetsDir);

    const assets: IntroAssets = {
      backgroundImage,
      logoImage: '',
      stepIcons: [],
      viralTtsPath,
      guideTtsPath,
      generatedAt: new Date().toISOString(),
      style: config.style,
    };

    // 매니페스트 저장
    await fs.writeFile(manifestPath, JSON.stringify(assets, null, 2));
    console.log(`✅ Intro assets saved to ${assetsDir}`);

    return assets;
  }

  /**
   * 인트로 TTS 나레이션 생성
   */
  private async generateIntroTTS(
    config: IntroAssetConfig,
    outputDir: string
  ): Promise<{ viralTtsPath: string; guideTtsPath: string }> {
    console.log(`  🎙️ Generating intro TTS narrations...`);

    const { EdgeTTS } = await import('@andresaya/edge-tts');
    const voice = TTS_VOICES[config.nativeLanguage] || TTS_VOICES['Korean'];

    // 바이럴 문구 TTS
    const viralMsg = VIRAL_MESSAGES[config.targetLanguage] || VIRAL_MESSAGES['English'];
    const viralText = `${viralMsg.line1}, ${viralMsg.line2}`;
    const viralPath = path.join(outputDir, 'viral.mp3');

    const tts1 = new EdgeTTS();
    await tts1.synthesize(viralText, voice, { rate: '+0%' });
    await fs.writeFile(viralPath, await tts1.toBuffer());
    console.log(`  ✅ Viral TTS saved`);

    // 가이드 문구 TTS
    const guidePath = path.join(outputDir, 'guide.mp3');
    const tts2 = new EdgeTTS();
    await tts2.synthesize(GUIDE_MESSAGE, voice, { rate: '+0%' });
    await fs.writeFile(guidePath, await tts2.toBuffer());
    console.log(`  ✅ Guide TTS saved`);

    return {
      viralTtsPath: 'intro/viral.mp3',
      guideTtsPath: 'intro/guide.mp3',
    };
  }

  /**
   * 배경 이미지 생성
   */
  private async generateBackgroundImage(
    config: IntroAssetConfig,
    outputDir: string
  ): Promise<string> {
    const prompt = this.buildBackgroundPrompt(config);

    console.log(`  📸 Generating background image (${config.style} style)...`);

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['image', 'text'],
        responseMimeType: 'text/plain',
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as GeminiImageResponse;
    const imagePath = path.join(outputDir, 'background.png');

    // 이미지 추출 및 저장
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.data) {
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          await fs.writeFile(imagePath, imageBuffer);
          console.log(`  ✅ Background image saved`);
          return `intro/background.png`;
        }
      }
    }

    throw new Error('Failed to generate background image');
  }

  /**
   * 배경 이미지 프롬프트 생성
   */
  private buildBackgroundPrompt(config: IntroAssetConfig): string {
    const basePrompt = INTRO_PROMPTS[config.style];

    return `${basePrompt}

Channel Info:
- Name: ${config.channelName}
- Teaching: ${config.targetLanguage} to ${config.nativeLanguage} speakers
- Primary Color: ${config.primaryColor}
- Secondary Color: ${config.secondaryColor}

Requirements:
- Use the primary and secondary colors as accent colors
- 16:9 aspect ratio (1920x1080)
- High quality, professional look
- Suitable for a YouTube video intro
- The image should feel welcoming and educational`;
  }
}

/**
 * CLI에서 사용할 수 있는 헬퍼 함수
 */
export async function generateIntroForChannel(
  channelId: string,
  style: IntroStyle = 'modern'
): Promise<IntroAssets> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const channelConfig = JSON.parse(configContent);

  const introConfig: IntroAssetConfig = {
    channelId,
    channelName: channelConfig.meta.name,
    targetLanguage: channelConfig.meta.targetLanguage,
    nativeLanguage: channelConfig.meta.nativeLanguage,
    primaryColor: channelConfig.theme.primaryColor,
    secondaryColor: channelConfig.theme.secondaryColor,
    style,
  };

  const generator = new IntroGenerator(apiKey);
  const outputDir = path.join(process.cwd(), 'assets', channelId);

  return generator.generateIntroAssets(introConfig, { outputDir });
}
