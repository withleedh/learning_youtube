/**
 * Veo 고양이 캐릭터 영상 생성 테스트
 * 고양이 + 마이크 reference images 사용
 *
 * Usage:
 *   npx tsx scripts/test-veo-cat.ts
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { VeoGenerator } from '../src/veo/generator';
import type { VeoRequest } from '../src/veo/types';

async function main() {
  console.log('🐱 Veo Cat Interview Video Test (with Reference Images)\n');

  // Reference 이미지 확인
  const catImagePath = 'assets/cat_interview/characters/cat.png';
  const micImagePath = 'assets/cat_interview/props/microphone.png';

  if (!fs.existsSync(catImagePath)) {
    console.error(`❌ Cat image not found: ${catImagePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(micImagePath)) {
    console.error(`❌ Microphone image not found: ${micImagePath}`);
    process.exit(1);
  }

  console.log('✅ Reference images found:');
  console.log(`   - Cat: ${catImagePath}`);
  console.log(`   - Microphone: ${micImagePath}`);
  console.log('');

  // 프롬프트 생성 - 마이크는 왼쪽 하단, 아기고양이는 정면을 보며 대답
  const prompt = `Interview style video, medium close-up shot.
A tiny baby orange tabby kitten around 6-8 weeks old with large expressive green eyes (matching the reference image) is centered in the frame, facing the camera directly.
A pink cat-themed square microphone with a cat face design is positioned at the bottom left corner of the frame, slightly angled towards the kitten.
The microphone appears to be held from off-screen, no hand visible.

The reporter asks off-screen in korean: "제일 좋아하는 음식이 뭐야?"
The baby kitten looks at the camera, blinks cutely, and responds in an adorable sweet voice: "I love tuna! It's so yummy!"

Blurred indoor background, soft studio lighting.
Stylized realistic baby kitten with detailed fluffy orange fur texture.
No subtitles, no captions, no text overlays, no on-screen text of any kind.`;

  console.log('📝 Prompt:');
  console.log('─'.repeat(60));
  console.log(prompt);
  console.log('─'.repeat(60));
  console.log('');

  // Veo 요청 생성 (reference images 포함)
  const request: VeoRequest = {
    prompt,
    referenceImages: [
      { imagePath: catImagePath, referenceType: 'asset' },
      { imagePath: micImagePath, referenceType: 'asset' },
    ],
    config: {
      model: 'veo-3.1-generate-preview',
      aspectRatio: '16:9', // reference images 사용 시 16:9 필수
      resolution: '720p',
      durationSeconds: '8', // reference images 사용 시 8초 필수
      personGeneration: 'allow_adult',
    },
    negativePrompt:
      'blurry, low quality, distorted, subtitles, captions, text overlay, on-screen text, watermark',
  };

  console.log('⚙️ Request configuration:');
  console.log(`   Model: ${request.config?.model}`);
  console.log(`   Aspect Ratio: ${request.config?.aspectRatio}`);
  console.log(`   Duration: ${request.config?.durationSeconds}s`);
  console.log(`   Reference Images: 2 (cat + microphone)`);
  console.log('');

  // 출력 경로
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join('output', 'veo-test');
  const outputPath = path.join(outputDir, `cat-interview-${timestamp}.mp4`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const generator = new VeoGenerator();

    console.log('🚀 Generating video with reference images...\n');
    const result = await generator.generateVideo(request);

    console.log('\n📊 Generation Result:');
    console.log(`   Operation ID: ${result.operationId}`);
    console.log(`   Video URI: ${result.videoPath}`);
    console.log(`   Duration: ${result.duration}s`);

    console.log('\n📥 Downloading video...');
    const savedPath = await generator.downloadVideo(result.videoPath, outputPath);

    console.log('\n✅ Test completed successfully!');
    console.log(`   Output: ${savedPath}`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
