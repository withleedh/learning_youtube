/**
 * Test LLM-based engagement score calculation on existing scripts
 */

import 'dotenv/config';
import { calculateEngagementScore, MIN_ENGAGEMENT_SCORE } from '../src/script/pipeline/validators';
import type { ScreenplayOutput } from '../src/script/pipeline/types';
import * as fs from 'fs';
import * as path from 'path';

// Convert existing JSON script to ScreenplayOutput format for testing
function convertJsonToScreenplay(jsonScript: any): ScreenplayOutput {
  const dialogue = jsonScript.sentences.map((s: any) => ({
    speaker: s.speaker as 'M' | 'F',
    line: s.target,
  }));

  return {
    title: jsonScript.metadata?.title?.target || 'Test Script',
    characters: [
      { id: 'M', name: 'Male', description: 'Male speaker' },
      { id: 'F', name: 'Female', description: 'Female speaker' },
    ],
    scenes: [
      {
        sceneNumber: 1,
        setting: 'Test',
        dialogue,
      },
    ],
    rawText: dialogue.map((d: any) => `${d.speaker}: ${d.line}`).join('\n'),
  };
}

async function main() {
  // Test with the provided script
  const scriptPath = path.join(process.cwd(), 'public/2026-02-02_conversation.json');

  if (!fs.existsSync(scriptPath)) {
    console.log('Script file not found:', scriptPath);
    return;
  }

  const jsonScript = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const screenplay = convertJsonToScreenplay(jsonScript);

  console.log('='.repeat(60));
  console.log('Testing LLM-Based Engagement Score');
  console.log('Title:', jsonScript.metadata?.title?.target);
  console.log('Topic:', jsonScript.metadata?.topic);
  console.log('='.repeat(60));
  console.log();

  // Print all dialogue lines
  console.log('Dialogue:');
  screenplay.scenes[0].dialogue.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.speaker}: ${d.line}`);
  });
  console.log();

  // Calculate score (now async - uses LLM)
  console.log('Evaluating with LLM...');
  const score = await calculateEngagementScore(screenplay, 'English');

  console.log();
  console.log('='.repeat(60));
  console.log('ENGAGEMENT SCORE:', score.total, '/ 100');
  console.log('Minimum required:', MIN_ENGAGEMENT_SCORE);
  console.log('Status:', score.total >= MIN_ENGAGEMENT_SCORE ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(60));
  console.log();

  console.log('Breakdown:');
  console.log(`  - Emotional Arc:  ${score.breakdown.emotionalArc}/25`);
  console.log(`  - Natural Flow:   ${score.breakdown.naturalFlow}/25`);
  console.log(`  - Engagement:     ${score.breakdown.engagement}/25`);
  console.log(`  - Memorability:   ${score.breakdown.memorability}/25`);
  console.log();

  if (score.strengths.length > 0) {
    console.log('Strengths:');
    score.strengths.forEach((s) => console.log(`  ✅ ${s}`));
    console.log();
  }

  if (score.issues.length > 0) {
    console.log('Issues:');
    score.issues.forEach((issue) => console.log(`  ⚠️  ${issue}`));
  } else {
    console.log('No issues detected! 🎉');
  }
}

main().catch(console.error);
