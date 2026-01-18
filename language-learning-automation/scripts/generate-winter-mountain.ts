/**
 * Korean Winter Mountain Snow Scene Video Generator
 * 태백산/소백산 스타일의 상고대(눈꽃) 영상 생성
 *
 * Usage:
 *   npx tsx scripts/generate-winter-mountain.ts
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { VeoGenerator } from '../src/veo/generator';
import type { VeoRequest } from '../src/veo/types';

// 한국 명산 상고대 풍경 프롬프트
const WINTER_MOUNTAIN_PROMPT = `
Breathtaking cinematic view of a Korean winter mountain landscape at dawn.

Scene description:
- Majestic snow-covered mountain peaks reminiscent of Taebaeksan and Sobaeksan mountains
- Beautiful hoarfrost (상고대/rime ice) covering every tree branch, creating delicate white crystal formations
- Ancient pine trees and bare deciduous trees completely coated in intricate frost crystals
- Pristine untouched snow blanketing the mountainside in soft curves
- Gentle morning mist flowing through the valleys between snow-covered ridges

Atmosphere:
- Serene, peaceful, and meditative
- Majestic yet humble beauty of nature
- The kind of scene that makes viewers say "아, 아름답다" (Ah, how beautiful)
- A sense of purity and mental clarity

Camera movement: Slow, contemplative pan across the frost-covered forest, then a gradual reveal of the distant mountain peaks emerging from morning mist.

Lighting: Pre-dawn blue hour transitioning to early golden sunrise, soft pink and orange hues touching the snow-covered peaks.

Style: Documentary quality, high detail, muted color palette with emphasis on whites, soft blues, and subtle warm highlights. Evokes a sense of calm and wonder.

Details:
- Frost crystals sparkling in the early morning light
- Steam from breath visible in the cold air
- Occasional gentle snow falling from branches
- Complete silence and stillness of the winter mountain
`.trim();

async function main() {
  console.log('🏔️❄️ Korean Winter Mountain Video Generator\n');
  console.log('━'.repeat(60));
  
  // 프롬프트 출력
  console.log('\n📝 Prompt (한국 명산 상고대):');
  console.log('─'.repeat(60));
  console.log(WINTER_MOUNTAIN_PROMPT);
  console.log('─'.repeat(60));
  console.log('');

  // Veo 요청 생성
  const request: VeoRequest = {
    prompt: WINTER_MOUNTAIN_PROMPT,
    config: {
      model: 'veo-3.1-generate-preview',
      aspectRatio: '16:9',
      resolution: '720p',
      durationSeconds: '8',
      personGeneration: 'allow_all',
    },
    negativePrompt:
      'people, humans, hikers, buildings, cars, roads, urban, text, watermark, logo, blurry, low quality, distorted, artificial structures, crowds',
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
  const outputPath = path.join(outputDir, `winter-mountain-${timestamp}.mp4`);

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
    console.log('✅ 상고대 영상 생성 완료!');
    console.log(`   📁 Output: ${savedPath}`);
    console.log('━'.repeat(60));
  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

main();
