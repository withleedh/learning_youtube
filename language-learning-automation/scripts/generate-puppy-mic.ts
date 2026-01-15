/**
 * 강아지 마이크 이미지 생성 스크립트
 *
 * Usage:
 *   npx tsx scripts/generate-puppy-mic.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateImageWithGemini } from '../src/config/gemini';

const PUPPY_MIC_PROMPT = `A cute kawaii handheld microphone toy.
The microphone has a square/cube-shaped body in light brown/tan color.
On the front of the square body, there is a cute white puppy/dog face with black button nose, round dark eyes, floppy ears, and a happy smile with tongue slightly out.
On the side of the square body, there is a puppy paw print decoration.
The microphone windscreen/foam top is fluffy brown, sitting on top of the square body.
The handle is black.
Product photography style, clean white background, soft studio lighting.
3D rendered style, smooth plastic texture, toy-like appearance.
No text, no watermark.`;

async function main() {
  const count = 3;
  console.log(`🎤 Generating ${count} Puppy Microphone Images\n`);

  console.log('📝 Prompt:');
  console.log('─'.repeat(60));
  console.log(PUPPY_MIC_PROMPT);
  console.log('─'.repeat(60));
  console.log('');

  // 출력 디렉토리
  const outputDir = path.join('assets', 'puppy_interview', 'props');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 1; i <= count; i++) {
    const outputPath = path.join(outputDir, `microphone_${i}.png`);
    
    try {
      console.log(`🎨 Generating image ${i}/${count}...`);
      const imageBuffer = await generateImageWithGemini(PUPPY_MIC_PROMPT);

      if (!imageBuffer) {
        throw new Error('No image generated');
      }

      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`   ✅ Saved: ${outputPath} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error}`);
    }
  }

  console.log(`\n✅ Done! Check: ${outputDir}`);
}

main();
