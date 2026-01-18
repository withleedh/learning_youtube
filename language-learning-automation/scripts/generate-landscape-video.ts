/**
 * Mountain Flower Landscape Video Generator
 * Veo 3.1을 사용하여 아름다운 산 꽃 풍경 영상 생성
 *
 * Usage:
 *   npx tsx scripts/generate-landscape-video.ts
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { VeoGenerator } from '../src/veo/generator';
import type { VeoRequest } from '../src/veo/types';

// 아름다운 산 꽃 풍경 프롬프트
const LANDSCAPE_PROMPT = `
Breathtaking cinematic aerial shot of a vast alpine meadow blanketed with vibrant wildflowers.

The scene opens with a sweeping drone view revealing:
- Rolling mountains with snow-capped peaks in the golden morning light
- A lush meadow filled with purple lavender, yellow buttercups, pink cosmos, and white daisies swaying gently in the breeze
- Soft morning mist rising from the valleys between mountain ridges
- Crystal clear streams meandering through the flower fields, reflecting the pastel sky

Camera movement: Slow, graceful dolly forward through the flower field at low altitude, with flowers brushing past the lens, then gradually rising to reveal the panoramic mountain vista.

Lighting: Golden hour sunrise with warm amber tones, god rays piercing through scattered clouds, creating dappled light patterns on the meadow.

Style: Hyper-realistic nature documentary quality, 8K detail, cinematic color grading with enhanced saturation. Peaceful, meditative atmosphere.

Additional details:
- Butterflies and bees dancing among the flowers
- Dewdrops glistening on flower petals
- Distant waterfall visible on the mountainside
- Eagles soaring in the thermal currents above the peaks
`.trim();

async function main() {
  console.log('🏔️ Mountain Flower Landscape Video Generator\n');
  console.log('━'.repeat(60));
  
  // 프롬프트 출력
  console.log('\n📝 Prompt:');
  console.log('─'.repeat(60));
  console.log(LANDSCAPE_PROMPT);
  console.log('─'.repeat(60));
  console.log('');

  // Veo 요청 생성
  const request: VeoRequest = {
    prompt: LANDSCAPE_PROMPT,
    config: {
      model: 'veo-3.1-generate-preview',
      aspectRatio: '16:9',
      resolution: '720p',
      durationSeconds: '8',
      personGeneration: 'allow_all',
    },
    negativePrompt:
      'people, humans, buildings, cars, roads, urban, text, watermark, logo, blurry, low quality, distorted, artificial structures',
  };

  console.log('⚙️ Request Configuration:');
  console.log(`   Model: ${request.config?.model}`);
  console.log(`   Aspect Ratio: ${request.config?.aspectRatio}`);
  console.log(`   Duration: ${request.config?.durationSeconds}s`);
  console.log(`   Resolution: ${request.config?.resolution}`);
  console.log('');

  // 출력 경로
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join('output', 'veo-landscape');
  const outputPath = path.join(outputDir, `mountain-flowers-${timestamp}.mp4`);

  // 출력 디렉토리 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const generator = new VeoGenerator();

    console.log('🚀 Submitting video generation request...\n');
    const result = await generator.generateVideo(request);

    console.log('\n📊 Generation Result:');
    console.log(`   Operation ID: ${result.operationId}`);
    console.log(`   Video URI: ${result.videoPath}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Has Audio: ${result.hasAudio}`);

    // 비디오 다운로드
    console.log('\n📥 Downloading video...');
    const savedPath = await generator.downloadVideo(result.videoPath, outputPath);

    console.log('\n' + '━'.repeat(60));
    console.log('✅ Video generation completed!');
    console.log(`   📁 Output: ${savedPath}`);
    console.log('━'.repeat(60));
  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

main();
