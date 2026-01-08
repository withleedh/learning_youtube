import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { generateAllSpeedsWithGoogle } from '../src/tts/google';

async function testGoogleTTS() {
  console.log('🎙️ Testing Google Cloud TTS with Studio voices...\n');

  const outputDir = path.join(process.cwd(), 'output', 'tts-test');
  await fs.mkdir(outputDir, { recursive: true });

  const testSentences = [
    { id: 1, speaker: 'M' as const, text: 'Good morning! Would you like some coffee?' },
    { id: 2, speaker: 'F' as const, text: 'Yes, please. I need my morning caffeine.' },
  ];

  const voices = {
    M: { name: 'en-US-Studio-M', gender: 'MALE' as const },
    F: { name: 'en-US-Studio-O', gender: 'FEMALE' as const },
  };

  for (const sentence of testSentences) {
    const voice = voices[sentence.speaker];
    console.log(`📝 Generating: "${sentence.text}"`);
    console.log(`   Voice: ${voice.name} (${voice.gender})`);

    const results = await generateAllSpeedsWithGoogle(
      sentence.text,
      'en-US',
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
