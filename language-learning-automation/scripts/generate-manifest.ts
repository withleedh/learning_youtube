import 'dotenv/config';
import path from 'path';
import { promises as fs } from 'fs';
import { parseBuffer } from 'music-metadata';

/**
 * Generate manifest.json from existing audio files
 */
async function generateManifest() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: npx tsx scripts/generate-manifest.ts <audioDir>

Example:
  npx tsx scripts/generate-manifest.ts output/english_korean/2026-01-13_100101/audio_elevenlabs
`);
    process.exit(0);
  }

  const audioDir = path.isAbsolute(args[0]) ? args[0] : path.join(process.cwd(), args[0]);

  console.log('📄 Generating manifest.json\n');
  console.log(`📁 Audio dir: ${audioDir}`);

  // Read all mp3 files
  const files = await fs.readdir(audioDir);
  const mp3Files = files.filter((f) => f.endsWith('.mp3')).sort();

  console.log(`🔊 Found ${mp3Files.length} audio files\n`);

  const audioFiles: Array<{
    sentenceId: number;
    speaker: 'M' | 'F';
    speed: string;
    path: string;
    duration: number;
  }> = [];

  for (const file of mp3Files) {
    // Parse filename: sentence_01_M_08x.mp3
    const match = file.match(/sentence_(\d+)_([MF])_(\d+)x\.mp3/);
    if (!match) {
      console.log(`   ⚠️ Skipping: ${file} (invalid format)`);
      continue;
    }

    const sentenceId = parseInt(match[1]);
    const speaker = match[2] as 'M' | 'F';
    const speedNum = match[3];
    const speed = `${speedNum.charAt(0)}.${speedNum.charAt(1)}x` as '0.8x' | '1.0x' | '1.2x';

    // Get duration
    const filePath = path.join(audioDir, file);
    let duration = 3.0;
    try {
      const buffer = await fs.readFile(filePath);
      const metadata = await parseBuffer(buffer, { mimeType: 'audio/mpeg' });
      duration = metadata.format.duration || 3.0;
    } catch {
      console.log(`   ⚠️ Could not read duration for: ${file}`);
    }

    audioFiles.push({
      sentenceId,
      speaker,
      speed,
      path: filePath,
      duration,
    });

    console.log(`   ✅ ${file} (${duration.toFixed(2)}s)`);
  }

  // Save manifest
  const manifestPath = path.join(audioDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(audioFiles, null, 2));

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Manifest created: ${manifestPath}`);
  console.log(`📊 Total files: ${audioFiles.length}`);
}

generateManifest().catch(console.error);
