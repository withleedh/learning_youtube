#!/usr/bin/env npx ts-node
/**
 * Generate TTS for step descriptions
 * Uses Edge TTS with bright female Korean voice
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';

// 스텝별 TTS 텍스트 (Intro.tsx의 DEFAULT_STEP_DESCRIPTIONS와 동기화)
// 한국어 TTS가 영어를 이상하게 발음하므로 한글로 표기
const STEP_NARRATIONS = [
  {
    id: 1,
    title: '스텝원. 전체 흐름 파악',
    description: '자막 없이 소리에만 집중하며, 상황을 상상해보세요.',
  },
  {
    id: 2,
    title: '스텝투. 자막으로 내용 이해 하기',
    description: '자막과 함께 들으며, 안 들렸던 부분을 확인하세요.',
  },
  {
    id: 3,
    title: '스텝쓰리. 3단계 반복 듣기',
    description: '느리게, 빈칸, 빠르게 반복으로 영어가 들리기 시작해요.',
  },
  {
    id: 4,
    title: '스텝포. 기적의 순간',
    description: '놀랍게 선명해진 영어를 직접 확인해보세요!',
  },
];

const CLOSING_TEXT = '자, 이제 시작해볼까요?';

async function main() {
  const { EdgeTTS } = await import('@andresaya/edge-tts');

  // 밝은 여자 아나운서 목소리
  const voice = 'ko-KR-SunHiNeural';

  const outputDir = path.join(process.cwd(), 'public', 'assets', 'english');
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🎙️ Generating step TTS narrations...\n');

  // 각 스텝별 TTS 생성
  for (const step of STEP_NARRATIONS) {
    const text = `${step.title}. ${step.description}`;
    const filename = `intro-step${step.id}.mp3`;
    const filePath = path.join(outputDir, filename);

    console.log(`Step ${step.id}: "${text}"`);

    const tts = new EdgeTTS();
    await tts.synthesize(text, voice, { rate: '+0%' });
    await fs.writeFile(filePath, tts.toBuffer());
    console.log(`  ✅ Saved: ${filename}\n`);
  }

  // 마무리 TTS 생성
  console.log(`Closing: "${CLOSING_TEXT}"`);
  const closingPath = path.join(outputDir, 'intro-closing.mp3');
  const tts = new EdgeTTS();
  await tts.synthesize(CLOSING_TEXT, voice, { rate: '+0%' });
  await fs.writeFile(closingPath, tts.toBuffer());
  console.log(`  ✅ Saved: intro-closing.mp3\n`);

  console.log('✅ All step TTS files generated!');
}

main().catch(console.error);
