#!/usr/bin/env npx ts-node
/**
 * Generate TTS for step transitions
 * Uses Edge TTS with male Korean voice
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';

// 스텝 전환 TTS 텍스트 (남자 목소리)
const STEP_TRANSITION_TEXTS = [
  { id: 1, text: '스텝 원' },
  { id: 2, text: '스텝 투' },
  { id: 3, text: '스텝 쓰리' },
  { id: 4, text: '스텝 포' },
];

async function main() {
  const { EdgeTTS } = await import('@andresaya/edge-tts');

  // 남자 목소리 (한국어)
  const voice = 'ko-KR-InJoonNeural';

  const outputDir = path.join(process.cwd(), 'public', 'assets', 'english');
  await fs.mkdir(outputDir, { recursive: true });

  console.log('🎙️ Generating step transition TTS (male voice)...\n');

  for (const step of STEP_TRANSITION_TEXTS) {
    const filename = `step-transition-${step.id}.mp3`;
    const filePath = path.join(outputDir, filename);

    console.log(`Step ${step.id}: "${step.text}"`);

    const tts = new EdgeTTS();
    await tts.synthesize(step.text, voice, { rate: '-10%' }); // 약간 느리게
    await fs.writeFile(filePath, tts.toBuffer());
    console.log(`  ✅ Saved: ${filename}\n`);
  }

  console.log('✅ All step transition TTS files generated!');
  console.log('\n📢 Note: You also need a bell sound effect (bell.mp3).');
  console.log('   Place it at: public/assets/english/bell.mp3');
}

main().catch(console.error);
