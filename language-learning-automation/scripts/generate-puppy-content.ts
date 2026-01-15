/**
 * 강아지 인터뷰 콘텐츠 생성 스크립트
 *
 * Usage:
 *   npx tsx scripts/generate-puppy-content.ts
 *   npx tsx scripts/generate-puppy-content.ts --theme "food"
 *   npx tsx scripts/generate-puppy-content.ts --skip-video
 */

import 'dotenv/config';
import { runInterviewPipeline } from '../src/veo/interview-pipeline';

async function main() {
  const args = process.argv.slice(2);

  // 옵션 파싱
  let theme: string | undefined;
  let skipVideo = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--theme' && args[i + 1]) {
      theme = args[i + 1];
      i++;
    }
    if (args[i] === '--skip-video') {
      skipVideo = true;
    }
  }

  console.log('🐶 Puppy Interview Content Generator\n');

  if (theme) {
    console.log(`📌 Theme hint: ${theme}\n`);
  }

  try {
    const result = await runInterviewPipeline('puppy_interview', {
      theme,
      skipVideoGeneration: skipVideo,
    });

    console.log('\n📊 Result Summary:');
    console.log(`   Theme: ${result.content.theme}`);
    console.log(`   Output: ${result.outputDir}`);
    if (result.videoPath) {
      console.log(`   Video: ${result.videoPath}`);
    }
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
}

main();
