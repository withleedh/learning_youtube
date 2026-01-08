import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import type { Script } from '../src/script/types';
import type { ChannelConfig } from '../src/config/types';
import { generateAllAudio } from '../src/tts/generator';

async function generateTTS() {
  console.log('🔊 Generating TTS audio with Edge TTS...\n');

  // Load script
  const scriptPath = path.join(
    process.cwd(),
    'output/english/2026-01-08/2026-01-08_conversation.json'
  );
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels/english.json');
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  // Output directory for audio
  const outputDir = path.join(process.cwd(), 'output/english/2026-01-08/audio');

  console.log(`📝 Script: ${script.metadata.title.target}`);
  console.log(`📁 Output: ${outputDir}`);
  console.log(`🎤 Voices: Male=${config.tts.maleVoice}, Female=${config.tts.femaleVoice}`);
  console.log(`📊 Sentences: ${script.sentences.length}\n`);

  // Generate audio
  const audioFiles = await generateAllAudio(script, config, outputDir, (current, total) => {
    console.log(`  [${current}/${total}] Generating audio for sentence ${current}...`);
  });

  console.log(`\n✅ Generated ${audioFiles.length} audio files`);

  // Save audio manifest
  const manifestPath = path.join(outputDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(audioFiles, null, 2));
  console.log(`📄 Manifest saved to: ${manifestPath}`);
}

generateTTS().catch(console.error);
