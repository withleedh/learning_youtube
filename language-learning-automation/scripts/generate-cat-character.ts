/**
 * 고양이 캐릭터 이미지 생성 스크립트
 *
 * Usage:
 *   npx tsx scripts/generate-cat-character.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateImageWithGemini } from '../src/config/gemini';

// 6-8주 된 아기 주황색 고양이 (현실과 픽사 사이 - 하이브리드 스타일)
const CAT_CHARACTER_PROMPT = `A tiny baby orange tabby kitten around 6-8 weeks old with large expressive green eyes, small pink nose, and soft fluffy orange fur with subtle stripes.
The kitten has a round chubby face with baby proportions - big head, small body, fluffy cheeks.
The kitten is sitting and looking directly at the camera with an innocent curious expression.
Stylized realistic style, blend of photorealistic fur with slightly enhanced cute features.
Simple clean background, soft natural lighting.
Detailed fluffy fur texture, adorable baby kitten proportions.
No text, no watermark, no accessories.`;

async function main() {
  console.log('🐱 Generating Cat Character Image\n');

  console.log('📝 Prompt:');
  console.log('─'.repeat(60));
  console.log(CAT_CHARACTER_PROMPT);
  console.log('─'.repeat(60));
  console.log('');

  // 출력 디렉토리
  const outputDir = path.join('assets', 'cat_interview', 'characters');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'cat.png');

  try {
    console.log('🎨 Generating image...');
    const imageBuffer = await generateImageWithGemini(CAT_CHARACTER_PROMPT);

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
