import 'dotenv/config';
import path from 'path';
import { promises as fs } from 'fs';
import {
  generateAllSpeedsWithElevenLabs,
  ELEVENLABS_VOICES,
  ELEVENLABS_MODELS,
} from '../src/tts/elevenlabs';
import type { Script } from '../src/script/types';

/**
 * Find the latest output folder for a channel
 * Only considers folders matching date pattern (YYYY-MM-DD or YYYY-MM-DD_HHMMSS)
 */
async function findLatestOutput(channelId: string): Promise<string | null> {
  const channelDir = path.join(process.cwd(), 'output', channelId);

  try {
    const folders = await fs.readdir(channelDir);
    // Filter only date-formatted folders (e.g., 2026-01-13 or 2026-01-13_100101)
    const datePattern = /^\d{4}-\d{2}-\d{2}/;
    const sortedFolders = folders
      .filter((f) => !f.startsWith('.') && datePattern.test(f))
      .sort()
      .reverse();

    if (sortedFolders.length === 0) return null;
    return sortedFolders[0];
  } catch {
    return null;
  }
}

/**
 * Find script JSON file in output folder
 */
async function findScriptFile(outputDir: string): Promise<string | null> {
  const files = await fs.readdir(outputDir);
  const scriptFile = files.find((f) => f.endsWith('.json') && !f.includes('manifest'));
  return scriptFile || null;
}

async function generateElevenLabsTTS() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: npx tsx scripts/test-elevenlabs.ts <channelId> [options]

Options:
  --male-voice <name>    ElevenLabs male voice (default: adam)
  --female-voice <name>  ElevenLabs female voice (default: rachel)
  --model <name>         Model: v2, turbo, v3 (default: v3)
  --limit <n>            Limit to first N sentences

Available voices: ${Object.keys(ELEVENLABS_VOICES).join(', ')}
Available models: v2 (multilingual_v2), turbo (turbo_v2_5), v3 (eleven_v3)

Example:
  npx tsx scripts/test-elevenlabs.ts english_korean --model v3
  npx tsx scripts/test-elevenlabs.ts english_korean --limit 3
  npx tsx scripts/test-elevenlabs.ts english --male-voice josh --female-voice emily
`);
    process.exit(0);
  }

  const channelId = args[0];

  // Parse options
  let maleVoiceName = 'adam';
  let femaleVoiceName = 'rachel';
  let modelName = 'v3';
  let limit: number | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--male-voice') maleVoiceName = args[++i];
    if (args[i] === '--female-voice') femaleVoiceName = args[++i];
    if (args[i] === '--model') modelName = args[++i];
    if (args[i] === '--limit') limit = parseInt(args[++i]);
  }

  // Get model ID
  const modelMap: Record<string, string> = {
    v2: ELEVENLABS_MODELS.multilingual_v2,
    turbo: ELEVENLABS_MODELS.turbo_v2_5,
    v3: ELEVENLABS_MODELS.v3_alpha,
  };
  const modelId = modelMap[modelName] || ELEVENLABS_MODELS.v3_alpha;

  // Get voice IDs
  const maleVoice = ELEVENLABS_VOICES[maleVoiceName as keyof typeof ELEVENLABS_VOICES];
  const femaleVoice = ELEVENLABS_VOICES[femaleVoiceName as keyof typeof ELEVENLABS_VOICES];

  if (!maleVoice) {
    console.error(`❌ Unknown male voice: ${maleVoiceName}`);
    process.exit(1);
  }
  if (!femaleVoice) {
    console.error(`❌ Unknown female voice: ${femaleVoiceName}`);
    process.exit(1);
  }

  console.log('🎤 ElevenLabs TTS Generator\n');

  // Find latest output
  const latestFolder = await findLatestOutput(channelId);
  if (!latestFolder) {
    console.error(`❌ No output found for channel: ${channelId}`);
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'output', channelId, latestFolder);
  console.log(`📁 Using output: ${channelId}/${latestFolder}`);

  // Find and load script
  const scriptFile = await findScriptFile(outputDir);
  if (!scriptFile) {
    console.error(`❌ No script file found in ${outputDir}`);
    process.exit(1);
  }

  const scriptPath = path.join(outputDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  console.log(`📝 Script: ${script.metadata.title.target}`);
  console.log(`🎙️ Male voice: ${maleVoiceName} (${maleVoice})`);
  console.log(`🎙️ Female voice: ${femaleVoiceName} (${femaleVoice})`);
  console.log(`🤖 Model: ${modelName} (${modelId})`);

  // Create ElevenLabs output directory
  const elevenLabsDir = path.join(outputDir, 'audio_elevenlabs');
  await fs.mkdir(elevenLabsDir, { recursive: true });
  console.log(`📂 Output: ${elevenLabsDir}\n`);

  // Get sentences to process
  const sentences = limit ? script.sentences.slice(0, limit) : script.sentences;
  console.log(`🔊 Processing ${sentences.length} sentences...\n`);

  const results: Array<{ id: number; success: boolean; error?: string }> = [];
  const audioFiles: Array<{
    sentenceId: number;
    speaker: 'M' | 'F';
    speed: string;
    path: string;
    duration: number;
  }> = [];

  for (const sentence of sentences) {
    console.log(`[${sentence.id}/${sentences.length}] "${sentence.target.substring(0, 40)}..."`);

    const voiceId = sentence.speaker === 'M' ? maleVoice : femaleVoice;

    try {
      const audioResults = await generateAllSpeedsWithElevenLabs(
        sentence.target,
        voiceId,
        elevenLabsDir,
        sentence.id,
        sentence.speaker,
        modelId
      );

      const allSuccess = audioResults.every((r) => r.success);
      if (allSuccess) {
        console.log(`   ✅ Generated all speeds`);
        results.push({ id: sentence.id, success: true });

        // Collect audio files for manifest
        for (const result of audioResults) {
          if (result.audioFile) {
            audioFiles.push(result.audioFile);
          }
        }
      } else {
        const errors = audioResults.filter((r) => !r.success).map((r) => r.error);
        console.log(`   ⚠️ Some failed: ${errors.join(', ')}`);
        results.push({ id: sentence.id, success: false, error: errors.join(', ') });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
      results.push({ id: sentence.id, success: false, error: String(error) });
    }
  }

  // Save manifest.json
  if (audioFiles.length > 0) {
    const manifestPath = path.join(elevenLabsDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(audioFiles, null, 2));
    console.log(`\n📄 Manifest saved: ${manifestPath}`);
  }

  // Summary
  const successCount = results.filter((r) => r.success).length;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Success: ${successCount}/${sentences.length}`);
  console.log(`📁 Output: ${elevenLabsDir}`);

  if (successCount > 0) {
    console.log(`\n💡 Compare with Google TTS:`);
    console.log(`   Google: ${path.join(outputDir, 'audio')}`);
    console.log(`   ElevenLabs: ${elevenLabsDir}`);
  }
}

generateElevenLabsTTS().catch(console.error);
