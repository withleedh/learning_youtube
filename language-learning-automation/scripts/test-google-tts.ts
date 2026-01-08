import 'dotenv/config';
import { synthesizeWithGoogle, GOOGLE_VOICES } from '../src/tts/google';
import { promises as fs } from 'fs';
import path from 'path';

async function testGoogleTTS() {
  console.log('🔊 Testing Google Cloud TTS API...\n');

  const testText = 'Good morning! Would you like some coffee?';
  const outputDir = path.join(process.cwd(), 'output', 'test-tts');

  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`Text: "${testText}"`);
    console.log(`Voice: ${GOOGLE_VOICES.male}`);
    console.log('Calling Google TTS API...\n');

    const audioBuffer = await synthesizeWithGoogle(
      testText,
      'en-US',
      GOOGLE_VOICES.male,
      'MALE',
      1.0
    );

    const outputPath = path.join(outputDir, 'test-google-tts.mp3');
    await fs.writeFile(outputPath, audioBuffer);

    console.log(`✅ Success! Audio saved to: ${outputPath}`);
    console.log(`   File size: ${audioBuffer.length} bytes`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testGoogleTTS();
