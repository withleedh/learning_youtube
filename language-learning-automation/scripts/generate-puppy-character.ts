/**
 * 강아지 캐릭터 이미지 생성 스크립트
 *
 * Usage:
 *   npx tsx scripts/generate-puppy-character.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateImageWithGemini } from '../src/config/gemini';

// 흰 사모예드/스피츠 스타일 퍼피 - 레퍼런스 이미지 기반
const PUPPY_CHARACTER_PROMPT = `A cute white Samoyed puppy with extremely fluffy snow-white fur, round chubby face, small black button eyes, and black nose.
The puppy has a very round, plump face shape like a cotton ball, with tiny triangular ears barely visible under the fluffy fur.
The puppy is sitting and looking directly at the camera with an innocent curious expression.
Very fluffy and soft appearance, like a living teddy bear or cotton ball.
Stylized realistic style, blend of photorealistic fur with slightly enhanced cute features.
Simple clean background, soft natural lighting.
Extremely fluffy white fur texture, adorable round face proportions.
No text, no watermark, no accessories, no clothing.`;

async function main() {
  const count = 5;
  console.log(`🐶 Generating ${count} Puppy Character Images\n`);

  console.log('📝 Prompt:');
  console.log('─'.repeat(60));
  console.log(PUPPY_CHARACTER_PROMPT);
  console.log('─'.repeat(60));
  console.log('');

  // 출력 디렉토리
  const outputDir = path.join('assets', 'puppy_interview', 'characters');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 1; i <= count; i++) {
    const outputPath = path.join(outputDir, `samoyed_${i}.png`);
    
    try {
      console.log(`🎨 Generating image ${i}/${count}...`);
      const imageBuffer = await generateImageWithGemini(PUPPY_CHARACTER_PROMPT);

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
