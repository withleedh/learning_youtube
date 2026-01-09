import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { generateAllSpeedsWithGoogle } from '../src/tts/google';

async function testGoogleTTS() {
  console.log('🎙️ Testing Google Cloud TTS with Studio voices...\n');

  const outputDir = path.join(process.cwd(), 'output', 'tts-test');
  await fs.mkdir(outputDir, { recursive: true });

  const testSentences = [
    { id: 1, speaker: 'M' as const, text: '안녕하세요! 커피 한 잔 주시겠어요?' },
    { id: 2, speaker: 'F' as const, text: '네, 아메리카노로 주세요.' },
  ];

  const voices = {
    M: { name: 'ko-KR-Neural2-C', gender: 'MALE' as const },
    F: { name: 'ko-KR-Neural2-A', gender: 'FEMALE' as const },
  };

  for (const sentence of testSentences) {
    const voice = voices[sentence.speaker];
    console.log(`📝 Generating: "${sentence.text}"`);
    console.log(`   Voice: ${voice.name} (${voice.gender})`);

    const results = await generateAllSpeedsWithGoogle(
      sentence.text,
      'ko-KR',
      voice.name,
      voice.gender,
      outputDir,
      sentence.id,
      sentence.speaker
    );

    for (const result of results) {
      if (result.success && result.audioFile) {
        console.log(`   ✅ ${result.audioFile.speed}: ${path.basename(result.audioFile.path)}`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    }
    console.log();
  }

  console.log(`\n📁 Output directory: ${outputDir}`);
  console.log('🎧 Listen to the generated files to compare quality!');
}

testGoogleTTS().catch(console.error);
