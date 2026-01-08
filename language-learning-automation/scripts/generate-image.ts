import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import type { Script } from '../src/script/types';
import { generateBackgroundImage } from '../src/image/generator';

async function generateImage() {
  console.log('🎨 Generating background image with Gemini...\n');

  const baseDir = path.join(process.cwd(), 'output/english/2026-01-08');

  // Load script
  const scriptPath = path.join(baseDir, '2026-01-08_conversation.json');
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  console.log(`📝 Topic: ${script.metadata.topic}`);
  console.log(`📝 Title: ${script.metadata.title.target}`);

  try {
    const imagePath = await generateBackgroundImage(
      script.metadata.topic,
      script.metadata.title.target,
      baseDir
    );

    console.log(`\n✅ Background image generated!`);
    console.log(`📁 Path: ${imagePath}`);

    // Get file size
    const stats = await fs.stat(imagePath);
    console.log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generateImage();
