#!/usr/bin/env npx ts-node
/**
 * Generate TTS for intro narration
 * Uses Edge TTS with bright female Korean voice
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  const { EdgeTTS } = await import('@andresaya/edge-tts');

  // 밝은 여자 아나운서 목소리 - ko-KR-SunHiNeural (밝고 친근한 여성 목소리)
  const voice = 'ko-KR-SunHiNeural';

  const outputDir = path.join(process.cwd(), 'public', 'assets', 'english');
  await fs.mkdir(outputDir, { recursive: true });

  // 바이럴 문구 TTS
  const viralText = '영어 문장을 반복해서 듣고, 영어가 들리는 순간을 느껴보세요.';
  const viralPath = path.join(outputDir, 'intro-viral.mp3');

  console.log(`🎙️ Generating viral TTS...`);
  console.log(`Text: "${viralText}"`);

  const tts1 = new EdgeTTS();
  await tts1.synthesize(viralText, voice, { rate: '+0%' });
  await fs.writeFile(viralPath, await tts1.toBuffer());
  console.log(`✅ Viral TTS saved to: ${viralPath}`);

  // 가이드 문구 TTS
  const guideText = '이 영상은 다음 네 단계로 진행됩니다.';
  const guidePath = path.join(outputDir, 'intro-narration.mp3');

  console.log(`🎙️ Generating guide TTS...`);
  console.log(`Text: "${guideText}"`);

  const tts2 = new EdgeTTS();
  await tts2.synthesize(guideText, voice, { rate: '+0%' });
  await fs.writeFile(guidePath, await tts2.toBuffer());
  console.log(`✅ Guide TTS saved to: ${guidePath}`);
}

main().catch(console.error);
