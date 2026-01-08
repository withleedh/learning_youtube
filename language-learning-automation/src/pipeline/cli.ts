#!/usr/bin/env node

import { runPipeline, runAllPipelines } from './index';
import type { Category } from '../script/types';

const VALID_CATEGORIES: Category[] = [
  'story',
  'conversation',
  'news',
  'announcement',
  'travel_business',
  'lesson',
  'fairytale',
];

function printUsage() {
  console.log(`
Language Learning Video Automation Pipeline

Usage:
  npx ts-node src/pipeline/cli.ts --channel <channelId> [options]
  npx ts-node src/pipeline/cli.ts --all [options]

Options:
  --channel <id>     Run pipeline for a specific channel
  --all              Run pipeline for all available channels
  --category <cat>   Specify content category (default: based on day of week)
                     Valid: ${VALID_CATEGORIES.join(', ')}
  --topic <topic>    Specify a topic for script generation
  --mock-tts         Use mock TTS (no API calls)
  --sample-script    Use sample script (no Gemini API call)
  --output <dir>     Custom output directory
  --help             Show this help message

Examples:
  npx ts-node src/pipeline/cli.ts --channel english
  npx ts-node src/pipeline/cli.ts --channel english --category conversation
  npx ts-node src/pipeline/cli.ts --channel english --mock-tts --sample-script
  npx ts-node src/pipeline/cli.ts --all --mock-tts
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  // Parse arguments
  let channelId: string | undefined;
  let runAll = false;
  let category: Category | undefined;
  let topic: string | undefined;
  let useMockTTS = false;
  let useSampleScript = false;
  let outputDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--channel':
        channelId = args[++i];
        break;
      case '--all':
        runAll = true;
        break;
      case '--category': {
        const cat = args[++i] as Category;
        if (!VALID_CATEGORIES.includes(cat)) {
          console.error(`Invalid category: ${cat}`);
          console.error(`Valid categories: ${VALID_CATEGORIES.join(', ')}`);
          process.exit(1);
        }
        category = cat;
        break;
      }
      case '--topic':
        topic = args[++i];
        break;
      case '--mock-tts':
        useMockTTS = true;
        break;
      case '--sample-script':
        useSampleScript = true;
        break;
      case '--output':
        outputDir = args[++i];
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          printUsage();
          process.exit(1);
        }
    }
  }

  // Validate arguments
  if (!runAll && !channelId) {
    console.error('Error: Must specify either --channel <id> or --all');
    printUsage();
    process.exit(1);
  }

  try {
    if (runAll) {
      const results = await runAllPipelines({
        category,
        topic,
        useMockTTS,
        useSampleScript,
        outputDir,
      });

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        process.exit(1);
      }
    } else if (channelId) {
      const result = await runPipeline({
        channelId,
        category,
        topic,
        useMockTTS,
        useSampleScript,
        outputDir,
      });

      if (!result.success) {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Pipeline error:', error);
    process.exit(1);
  }
}

main();
