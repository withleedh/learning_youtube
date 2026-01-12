/**
 * 고양이 마이크 이미지 생성 스크립트
 *
 * Usage:
 *   npx tsx scripts/generate-cat-mic.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateImageWithGemini } from '../src/config/gemini';

const CAT_MIC_PROMPT = `A cute kawaii handheld microphone toy.
The microphone has a square/cube-shaped body in light pink color.
On the front of the square body, there is a cute white cat face with small pink nose, round eyes, and a gentle smile.
On the side of the square body, there is a pink cat paw print decoration.
The microphone windscreen/foam top is fluffy pink, sitting on top of the square body.
The handle is black.
Product photography style, clean white background, soft studio lighting.
3D rendered style, smooth plastic texture, toy-like appearance, similar to the dog microphone toy style.
No text, no watermark.`;

async function main() {
  console.log('🎤 Generating Cat Microphone Image\n');

  console.log('📝 Prompt:');
  console.log('─'.repeat(60));
  console.log(CAT_MIC_PROMPT);
  console.log('─'.repeat(60));
  console.log('');

  // 출력 디렉토리
  const outputDir = path.join('assets', 'cat_interview', 'props');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'microphone.png');

  try {
    console.log('🎨 Generating image...');
    const imageBuffer = await generateImageWithGemini(CAT_MIC_PROMPT);

    if (!imageBuffer) {
      throw new Error('No image generated');
    }

    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`\n✅ Image saved: ${outputPath}`);
    console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
}

main();
