/**
 * Veo 영상 생성 테스트 스크립트
 * 캐릭터 정의를 동적으로 사용하여 대화 영상 생성 + 연장
 *
 * Usage:
 *   npx tsx scripts/test-veo-generator.ts
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { VeoGenerator } from '../src/veo/generator';
import { buildVeoDialoguePrompt } from '../src/veo/prompts';
import type { CharacterDefinition, CharacterPair } from '../src/character/types';
import type { VeoRequest } from '../src/veo/types';

// 할머니 캐릭터 정의
const grandmaCharacter: CharacterDefinition = {
  id: 'grandma',
  name: 'Mary',
  nameKorean: '매리',
  age: 'senior',
  gender: 'female',
  relationship: 'grandmother',
  appearance: {
    ethnicity: 'Western/Caucasian',
    complexion: 'fair with gentle wrinkles',
    hairColor: 'blonde-gray',
    hairStyle: 'soft bun',
    clothing: 'cream-colored cardigan over a floral blouse',
    distinguishingFeatures: 'warm kind eyes, gentle smile, reading glasses on a chain',
  },
  personality: 'warm, loving, patient',
};

// 손자 캐릭터 정의 (성인 버전 - Veo 필터링 회피)
const grandsonCharacter: CharacterDefinition = {
  id: 'grandson',
  name: 'Theo',
  nameKorean: '태오',
  age: 'child', // 어린이 대신 성인으로 변경 (Veo 정책)
  gender: 'male',
  relationship: 'grandson',
  appearance: {
    ethnicity: 'Korean-American',
    complexion: 'fair, healthy glow',
    hairColor: 'black',
    hairStyle: 'short and neat',
    clothing: 'casual blue sweater and jeans',
    distinguishingFeatures: 'bright expressive eyes, friendly smile',
  },
  personality: 'curious, cheerful, respectful',
};

// 캐릭터 페어 정의
const grandmaGrandsonPair: CharacterPair = {
  channelId: 'english_grandma',
  characters: [grandmaCharacter, grandsonCharacter],
  defaultSceneStyle: 'cozy_kitchen',
};

async function main() {
  console.log('🎬 Veo Video Generator Test (with Character Definitions)\n');

  // 대화 내용 정의
  const dialogue = [
    {
      speaker: 'Grandma',
      text: '난 말주변이 좋아.',
      language: 'Korean',
    },
    {
      speaker: 'Minjun',
      text: 'I have a way with words.',
      language: 'English',
    },
    {
      speaker: 'Grandma',
      text: '난 아기 보는 데 소질이 있어.',
      language: 'Korean',
    },
    {
      speaker: 'Minjun',
      text: 'I have a way with babies.',
      language: 'English',
    },
  ];

  // 캐릭터 정의로 Veo 프롬프트 생성
  const prompt = buildVeoDialoguePrompt({
    characters: grandmaGrandsonPair.characters,
    sceneStyle: 'cozy_kitchen',
    dialogue,
    includeDialogue: true, // 대사 포함
    cameraStyle: 'Cinematic quality, medium shot, warm color grading.',
  });

  console.log('📝 Generated Prompt:');
  console.log('─'.repeat(60));
  console.log(prompt);
  console.log('─'.repeat(60));
  console.log('');

  // Veo 요청 생성
  const request: VeoRequest = {
    prompt,
    config: {
      model: 'veo-3.1-generate-preview',
      aspectRatio: '16:9',
      resolution: '720p',
      durationSeconds: '8',
      personGeneration: 'allow_all',
    },
    negativePrompt:
      'blurry, low quality, distorted faces, unnatural movements, subtitles, captions, text overlay, on-screen text',
  };

  console.log('⚙️ Request configuration:');
  console.log(`   Model: ${request.config?.model}`);
  console.log(`   Aspect Ratio: ${request.config?.aspectRatio}`);
  console.log(`   Duration: ${request.config?.durationSeconds}s`);
  console.log(`   Resolution: ${request.config?.resolution}`);
  console.log('');

  // 출력 경로
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join('output', 'veo-test');
  const outputPath = path.join(outputDir, `dialogue-${timestamp}.mp4`);

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

    console.log('\n✅ Test completed successfully!');
    console.log(`   Output: ${savedPath}`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
