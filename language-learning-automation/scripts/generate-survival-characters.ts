#!/usr/bin/env npx tsx
console.log('🔧 Script loading...');

/**
 * Survival 퀴즈용 캐릭터 이미지 생성 스크립트
 * 고양이(나비)와 강아지(백구) 캐릭터의 다양한 감정 표현 이미지를 생성합니다.
 */

import 'dotenv/config';
console.log('✅ dotenv loaded');
import { promises as fs } from 'fs';
console.log('✅ fs loaded');
import path from 'path';
console.log('✅ path loaded');
import { GEMINI_API_URLS, getGeminiApiKey, type GeminiImageResponse } from '../src/config/gemini';
console.log('✅ gemini loaded');

const OUTPUT_DIR = path.join(process.cwd(), 'assets', 'survival', 'characters');

const COMMON_STYLE =
  'Cute 2D vector art, thick bold outlines, flat color, sticker style, expressive emotion, mobile game asset, minimalist shading, no text, no watermark';

const CAT_BASE =
  'Cute orange tabby cat with stripes, 2D cartoon style, big round eyes, slight blush on cheeks';

const CAT_EMOTIONS: Record<string, { name: string; prompt: string }> = {
  neutral: {
    name: 'neutral',
    prompt: `${CAT_BASE}. Sitting calmly facing forward. Round eyes, mouth closed. Peaceful expression. Ears perked up. ${COMMON_STYLE}`,
  },
  thinking: {
    name: 'thinking',
    prompt: `${CAT_BASE}. One paw on chin or scratching head. Eyes looking up or to the side. Mouth slightly open. Question mark icon above head. ${COMMON_STYLE}`,
  },
  speaking: {
    name: 'speaking',
    prompt: `${CAT_BASE}. Mouth open as if talking. One paw raised making a gesture. Sparkling confident eyes. ${COMMON_STYLE}`,
  },
  happy: {
    name: 'happy',
    prompt: `${CAT_BASE}. Eyes curved into happy crescents, big smile with open mouth. Both paws raised in joy, tail swishing. Sparkle effects around. ${COMMON_STYLE}`,
  },
  sad: {
    name: 'sad',
    prompt: `${CAT_BASE}. Tears welling up or streaming down. Corners of mouth drooping. Ears folded back. Body hunched or dejected pose. ${COMMON_STYLE}`,
  },
  shocked: {
    name: 'shocked',
    prompt: `${CAT_BASE}. Eyes extremely wide open. Mouth in O shape. Fur standing on end. Body leaning back slightly. ${COMMON_STYLE}`,
  },
  confident: {
    name: 'confident',
    prompt: `${CAT_BASE}. Chest puffed out, standing proudly. One eyebrow raised or winking. One corner of mouth raised in smug smile. ${COMMON_STYLE}`,
  },
  nervous: {
    name: 'nervous',
    prompt: `${CAT_BASE}. Cold sweat drops. Eyes shaking. Biting nails or feet fidgeting. Ears flattened to sides. ${COMMON_STYLE}`,
  },
  celebrating: {
    name: 'celebrating',
    prompt: `${CAT_BASE}. Jumping with joy, both paws raised high. Tears of happiness. Confetti or fireworks effects around. Maybe wearing a crown. ${COMMON_STYLE}`,
  },
  defeated: {
    name: 'defeated',
    prompt: `${CAT_BASE}. Completely devastated, lying face down crying. Or falling through floor hole with only paws visible. Tears and snot everywhere. ${COMMON_STYLE}`,
  },
};

const DOG_BASE =
  'Cute brown and white spotted beagle puppy, 2D cartoon style, big eyes, tongue often sticking out';

const DOG_EMOTIONS: Record<string, { name: string; prompt: string }> = {
  neutral: {
    name: 'neutral',
    prompt: `${DOG_BASE}. Sitting obediently facing forward. Bright sparkling eyes, tongue slightly out. Floppy ears hanging down. ${COMMON_STYLE}`,
  },
  thinking: {
    name: 'thinking',
    prompt: `${DOG_BASE}. Head tilted to side. One ear slightly raised. Eyes squinting, struggling expression. Question mark or bone thought bubble above head. ${COMMON_STYLE}`,
  },
  speaking: {
    name: 'speaking',
    prompt: `${DOG_BASE}. Mouth open as if barking. One front paw raised pointing. Tail wagging, enthusiastic expression. ${COMMON_STYLE}`,
  },
  happy: {
    name: 'happy',
    prompt: `${DOG_BASE}. Tongue hanging out long, panting happily. Eyes narrowed with joy. Tail wagging like propeller. Jumping or rolling showing belly. ${COMMON_STYLE}`,
  },
  sad: {
    name: 'sad',
    prompt: `${DOG_BASE}. Eyes glistening with tears. Ears drooping down covering face. Tail tucked between legs. Chin on floor, sighing pose. ${COMMON_STYLE}`,
  },
  shocked: {
    name: 'shocked',
    prompt: `${DOG_BASE}. Eyes bulging out huge. Mouth cannot close, tongue dropped. Ears perked straight up. Stepping backwards pose. ${COMMON_STYLE}`,
  },
  confident: {
    name: 'confident',
    prompt: `${DOG_BASE}. Chest pushed forward, standing gallantly. Front paw stomping ground. Eyes burning with determination. One corner of mouth raised in grin. ${COMMON_STYLE}`,
  },
  nervous: {
    name: 'nervous',
    prompt: `${DOG_BASE}. Body trembling. Looking around nervously with side glances. Ears completely folded back, hunched pose. Tail tucked low. ${COMMON_STYLE}`,
  },
  celebrating: {
    name: 'celebrating',
    prompt: `${DOG_BASE}. Standing on hind legs with arms raised in victory. Crying tears of joy while laughing. Trophy or big bone in mouth. Glowing effects around. ${COMMON_STYLE}`,
  },
  defeated: {
    name: 'defeated',
    prompt: `${DOG_BASE}. Lying flat on ground with world-weary expression. Or being sucked into floor hole with shocked face. Dark rain cloud above head. ${COMMON_STYLE}`,
  },
};

type CharacterType = 'cat' | 'dog';
type EmotionType = keyof typeof CAT_EMOTIONS;

const CHARACTERS = {
  cat: { name: '나비', emotions: CAT_EMOTIONS },
  dog: { name: '백구', emotions: DOG_EMOTIONS },
};

function addVariation(basePrompt: string, variation: number): string {
  const angles = ['front view', 'slight 3/4 angle view', 'dynamic angle view'];
  const backgrounds = [
    'simple white background',
    'soft gradient background',
    'clean pastel background',
  ];
  return `${basePrompt} ${angles[variation]}, ${backgrounds[variation]}`;
}

// 레퍼런스 이미지 경로
// 기존 이미지 (neutral 생성용)
const ORIGINAL_REFERENCE_IMAGES = {
  cat: path.join(OUTPUT_DIR, 'cat', 'cat_neutral_1.png'), // 고양이는 이미 생성된 neutral 사용
  dog: path.join(process.cwd(), 'public', 'characters', 'dog.png'), // 개는 기존 remotion 이미지
};

// 생성된 neutral 이미지 (다른 감정 생성용)
const NEUTRAL_REFERENCE_IMAGES = {
  cat: path.join(OUTPUT_DIR, 'cat', 'cat_neutral_1.png'),
  dog: path.join(OUTPUT_DIR, 'dog', 'dog_neutral_1.png'),
};

async function generateImage(
  prompt: string,
  outputPath: string,
  referenceImagePath?: string
): Promise<void> {
  const apiKey = getGeminiApiKey();

  // 요청 파츠 구성
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // 레퍼런스 이미지가 있으면 먼저 추가
  if (referenceImagePath) {
    try {
      const imageBuffer = await fs.readFile(referenceImagePath);
      const base64Image = imageBuffer.toString('base64');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Image,
        },
      });
      parts.push({
        text: `Using the character in the reference image above, generate a new image with the same character but different emotion/pose. Keep the exact same character design, colors, and art style. ${prompt}`,
      });
    } catch {
      // 레퍼런스 이미지가 없으면 텍스트만 사용
      console.log('  ⚠️ Reference image not found, generating without reference');
      parts.push({ text: prompt });
    }
  } else {
    parts.push({ text: prompt });
  }

  const requestBody = {
    contents: [{ parts }],
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
        return;
      }
    }
  }

  throw new Error('No image generated');
}

async function generateEmotionSet(
  character: CharacterType,
  emotion: EmotionType
): Promise<string[]> {
  const results: string[] = [];
  const charData = CHARACTERS[character];
  const emotionData = charData.emotions[emotion];

  // neutral 생성 시: 원본 레퍼런스 사용 (개는 dog.png, 고양이는 기존 neutral)
  // 다른 감정 생성 시: 생성된 neutral 이미지 사용
  let referenceImage: string | undefined;
  if (emotion === 'neutral') {
    // neutral은 원본 이미지를 레퍼런스로 사용
    referenceImage = ORIGINAL_REFERENCE_IMAGES[character];
  } else {
    // 다른 감정은 생성된 neutral을 레퍼런스로 사용
    referenceImage = NEUTRAL_REFERENCE_IMAGES[character];
  }

  console.log(`\n🎨 Generating ${character} - ${emotion}...`);
  if (referenceImage) {
    console.log(`  📎 Using reference: ${path.basename(referenceImage)}`);
  }

  for (let i = 0; i < 3; i++) {
    const prompt = addVariation(emotionData.prompt, i);
    const filename = `${character}_${emotion}_${i + 1}.png`;
    const outputPath = path.join(OUTPUT_DIR, character, filename);

    try {
      console.log(`  📸 Variation ${i + 1}/3...`);
      await generateImage(prompt, outputPath, referenceImage);
      results.push(outputPath);
      console.log(`  ✅ Saved: ${filename}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  ❌ Failed: ${filename}`, error);
    }
  }

  return results;
}

async function generateAllCharacterImages(): Promise<void> {
  console.log('🚀 Starting Survival Character Image Generation');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);

  const characters: CharacterType[] = ['cat', 'dog'];
  const emotions: EmotionType[] = Object.keys(CAT_EMOTIONS) as EmotionType[];

  let totalGenerated = 0;
  let totalFailed = 0;

  for (const character of characters) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🐾 Character: ${CHARACTERS[character].name} (${character})`);
    console.log(`${'='.repeat(50)}`);

    for (const emotion of emotions) {
      const results = await generateEmotionSet(character, emotion);
      totalGenerated += results.length;
      totalFailed += 3 - results.length;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Generation Complete!`);
  console.log(`   Generated: ${totalGenerated} images`);
  console.log(`   Failed: ${totalFailed} images`);
  console.log(`${'='.repeat(50)}`);
}

async function generateSingle(character: CharacterType, emotion: EmotionType): Promise<void> {
  console.log(`🎨 Generating single: ${character} - ${emotion}`);
  await generateEmotionSet(character, emotion);
}

// CLI
const args = process.argv.slice(2);

console.log('🎬 Survival Character Generator');
console.log(`   Args: ${args.join(', ') || '(none)'}`);

if (args.length === 0) {
  generateAllCharacterImages().catch(console.error);
} else if (args.length === 2) {
  const [character, emotion] = args;
  const validCharacters = Object.keys(CHARACTERS);
  const validEmotions = Object.keys(CAT_EMOTIONS);

  if (validCharacters.includes(character) && validEmotions.includes(emotion)) {
    generateSingle(character as CharacterType, emotion as EmotionType).catch(console.error);
  } else {
    console.error('❌ Invalid character or emotion');
    console.log('Characters:', validCharacters.join(', '));
    console.log('Emotions:', validEmotions.join(', '));
  }
} else {
  console.log('Usage:');
  console.log('  npx tsx scripts/generate-survival-characters.ts           # Generate all');
  console.log('  npx tsx scripts/generate-survival-characters.ts cat happy # Generate specific');
}
