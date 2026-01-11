#!/usr/bin/env node
/**
 * Setup Preview Script
 * 
 * Copies generated output files to public/ folder for Remotion preview.
 * 
 * Usage:
 *   npx tsx scripts/setup-preview.ts <channelId> <outputFolder>
 *   npx tsx scripts/setup-preview.ts english_korean 2026-01-09_150452
 */

import { promises as fs } from 'fs';
import path from 'path';

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('📦 Setup Preview - Remotion Studio Preview 설정\n');
    console.log('Usage: npx tsx scripts/setup-preview.ts <channelId> <outputFolder>\n');
    console.log('Example:');
    console.log('  npx tsx scripts/setup-preview.ts english_korean 2026-01-09_150452\n');
    
    // List available output folders
    const outputDir = path.join(process.cwd(), 'output');
    try {
      const channels = await fs.readdir(outputDir, { withFileTypes: true });
      console.log('Available channels:');
      for (const channel of channels.filter(c => c.isDirectory())) {
        const channelDir = path.join(outputDir, channel.name);
        const folders = await fs.readdir(channelDir, { withFileTypes: true });
        const dateFolders = folders.filter(f => f.isDirectory() && f.name.match(/^\d{4}-\d{2}-\d{2}/));
        if (dateFolders.length > 0) {
          console.log(`  ${channel.name}/`);
          for (const folder of dateFolders.slice(-3)) {
            console.log(`    └─ ${folder.name}`);
          }
        }
      }
    } catch {
      console.log('  (No output folders found)');
    }
    process.exit(0);
  }

  const [channelId, outputFolder] = args;
  const baseDir = path.join(process.cwd(), 'output', channelId, outputFolder);
  const assetsDir = path.join(process.cwd(), 'output', channelId, 'assets');
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const publicDir = path.join(process.cwd(), 'public');

  console.log(`\n🔧 Setting up preview for: ${channelId}/${outputFolder}\n`);

  // Check if output directory exists
  try {
    await fs.access(baseDir);
  } catch {
    console.error(`❌ Output directory not found: ${baseDir}`);
    process.exit(1);
  }

  // Clear public folder
  console.log('📁 Clearing public folder...');
  try {
    await fs.rm(publicDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  await fs.mkdir(publicDir, { recursive: true });

  // Copy output folder contents
  console.log(`📦 Copying ${outputFolder}/ → public/`);
  await copyDir(baseDir, publicDir);

  // Copy shared assets directly to public/assets/
  try {
    await fs.access(assetsDir);
    console.log(`📦 Copying assets/ → public/assets/`);
    await copyDir(assetsDir, path.join(publicDir, 'assets'));
  } catch {
    console.log('⚠️  No shared assets folder found');
  }

  // Find and copy script.json
  const files = await fs.readdir(baseDir);
  const scriptFile = files.find(f => f.endsWith('.json') && !f.includes('manifest'));
  
  if (scriptFile) {
    console.log(`📝 Copying ${scriptFile} → public/script.json`);
    await fs.copyFile(
      path.join(baseDir, scriptFile),
      path.join(publicDir, 'script.json')
    );
  }

  // Copy channel config
  try {
    console.log(`⚙️  Copying ${channelId}.json → public/config.json`);
    await fs.copyFile(configPath, path.join(publicDir, 'config.json'));
  } catch {
    console.log(`⚠️  Channel config not found: ${configPath}`);
  }

  console.log('\n✅ Preview setup complete!');
  console.log('\nRun "npm run start" to open Remotion Studio');
  console.log(`Preview will load data from: ${channelId}/${outputFolder}`);
}

main().catch(console.error);
