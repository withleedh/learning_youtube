#!/usr/bin/env tsx
/**
 * Generate Comparison Video CLI
 *
 * Usage:
 *   npx tsx scripts/generate-comparison.ts <channelId> [options]
 *
 * Options:
 *   --segments <n>     Number of segments (25-35, default: 30)
 *   --hook <n>         Hook variant (0-4, or 'random')
 *   --timing <profile> Timing profile (fast/normal/suspense, default: normal)
 *   --dry-run          Generate script only (no TTS/rendering)
 *   --render           Enable video rendering after TTS
 *   --help             Show help
 *
 * Example:
 *   npx tsx scripts/generate-comparison.ts korean-vs-native --segments 30 --timing normal --dry-run
 */

import 'dotenv/config';
import {
  runComparisonPipeline,
  type ComparisonPipelineOptions,
} from '../src/comparison/pipeline';
import type { TimingProfileType } from '../src/comparison/timing-profile';
import type { ComparisonCategory } from '../src/comparison/types';

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CLIOptions extends ComparisonPipelineOptions {
  categories: ComparisonCategory[];
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🎬 Generate Comparison Video CLI

Usage:
  npx tsx scripts/generate-comparison.ts <channelId> [options]

Options:
  --segments <n>     Number of segments (25-35, default: 30)
  --hook <n>         Hook variant (0-4, or 'random')
  --timing <profile> Timing profile (fast/normal/suspense, default: normal)
  --dry-run          Generate script only (no TTS/rendering)
  --render           Enable video rendering after TTS
  --help             Show help

Example:
  npx tsx scripts/generate-comparison.ts korean-vs-native --segments 30 --timing normal --dry-run
`);
    process.exit(0);
  }

  const channelId = args[0];

  // Parse options
  let segmentCount = 30;
  let hookVariant: number | 'random' = 'random';
  let timingProfile: TimingProfileType = 'normal';
  let dryRun = false;
  let autoRender = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--segments':
        segmentCount = parseInt(args[++i], 10);
        if (segmentCount < 25 || segmentCount > 35) {
          console.error('❌ Segment count must be between 25 and 35');
          process.exit(1);
        }
        break;

      case '--hook':
        const hookArg = args[++i];
        hookVariant = hookArg === 'random' ? 'random' : parseInt(hookArg, 10);
        if (typeof hookVariant === 'number' && (hookVariant < 0 || hookVariant > 4)) {
          console.error('❌ Hook variant must be between 0 and 4, or "random"');
          process.exit(1);
        }
        break;

      case '--timing':
        const timingArg = args[++i];
        if (!['fast', 'normal', 'suspense'].includes(timingArg)) {
          console.error('❌ Timing profile must be: fast, normal, or suspense');
          process.exit(1);
        }
        timingProfile = timingArg as TimingProfileType;
        break;

      case '--dry-run':
        dryRun = true;
        break;

      case '--render':
        autoRender = true;
        break;
    }
  }

  return {
    channelId,
    segmentCount,
    hookVariant,
    timingProfile,
    dryRun,
    autoRender,
    categories: ['daily', 'business', 'emotion', 'request_reject', 'apology_thanks'],
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const options = parseArgs();

  const result = await runComparisonPipeline(options);

  if (!result.success) {
    console.error('\n❌ Pipeline failed!');
    if (result.errors) {
      console.error('Errors:');
      result.errors.forEach((e) => console.error(`  - ${e}`));
    }
    process.exit(1);
  }
}

// Run
main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

