#!/usr/bin/env node
/**
 * Quiz Shorts Renderer - 선택지 퀴즈 형식 쇼츠 렌더링
 *
 * Usage:
 *   npx tsx scripts/render-shorts.ts <channelId> <folderName>
 *
 * Example:
 *   npx tsx scripts/render-shorts.ts english 2026-01-12_212252
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { Script } from '../src/script/types';
import type { ChannelConfig } from '../src/config/types';
import type { AudioFile } from '../src/tts/types';
import { generateQuizChoices } from '../src/compositions/ListeningQuizShort';
import { GEMINI_MODELS } from '@/config/gemini';

async function renderShorts() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
📱 Quiz Shorts Renderer - 선택지 퀴즈 형식 쇼츠 렌더링

Usage:
  npx tsx scripts/render-shorts.ts <channelId> <folderName>

Examples:
  npx tsx scripts/render-shorts.ts english 2026-01-12_212252
  npx tsx scripts/render-shorts.ts english_korean 2026-01-09_150452
`);
    process.exit(1);
  }

  const channelId = args[0];
  const folderName = args[1];
  const outputDir = path.join(process.cwd(), 'output', channelId, folderName);
  const channelOutputDir = path.join(process.cwd(), 'output', channelId);

  // Verify directory exists
  try {
    await fs.access(outputDir);
  } catch {
    console.error(`❌ Directory not found: ${outputDir}`);
    process.exit(1);
  }

  // Create shorts output directory
  const shortsDir = path.join(outputDir, 'shorts');
  await fs.mkdir(shortsDir, { recursive: true });

  // Find script file
  const files = await fs.readdir(outputDir);
  const scriptFile = files.find(
    (f) => f.endsWith('.json') && f.match(/^\d{4}-\d{2}-\d{2}_.*\.json$/)
  );

  if (!scriptFile) {
    console.error(`❌ No script file found in ${outputDir}`);
    process.exit(1);
  }

  // Load script
  const scriptPath = path.join(outputDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  let script: Script = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  console.log(`\n📱 Quiz Shorts Renderer`);
  console.log(`   Channel: ${channelId}`);
  console.log(`   Folder: ${folderName}`);
  console.log(`   Script: ${script.metadata.title.target}`);
  console.log(`   Sentences: ${script.sentences.length}`);

  // Check if any sentence is missing wrongWordChoices (단어 기반 오답)
  const needsWrongWords = script.sentences.some(
    (s) => !s.wrongWordChoices || s.wrongWordChoices.length < 2
  );

  if (needsWrongWords) {
    console.log('\n🤖 Generating missing wrongWordChoices with GPT...');
    script = await generateMissingWrongWordChoices(script);
    // Save updated script
    await fs.writeFile(scriptPath, JSON.stringify(script, null, 2));
    console.log('   ✅ Updated script with wrongWordChoices');
  }

  // Load audio manifest
  const manifestPath = path.join(outputDir, 'audio/manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const rawAudioFiles: AudioFile[] = JSON.parse(manifestContent);

  // Convert to staticFile paths
  const audioFiles: AudioFile[] = rawAudioFiles.map((af) => ({
    ...af,
    path: `${folderName}/audio/${path.basename(af.path)}`,
  }));

  // Check for background image
  const backgroundImage = `${folderName}/background.png`;
  console.log(`   Background: ${backgroundImage}`);

  // Setup BGM - copy from channel assets or fallback to english
  let bgmPath: string | undefined;
  const channelBgmPath = path.join(process.cwd(), 'assets', channelId, 'quiz_bgm.mp3');
  const fallbackBgmPath = path.join(process.cwd(), 'assets', 'english', 'quiz_bgm.mp3');
  const targetAssetsDir = path.join(channelOutputDir, 'assets');
  const targetBgmPath = path.join(targetAssetsDir, 'quiz_bgm.mp3');

  // Ensure assets directory exists
  await fs.mkdir(targetAssetsDir, { recursive: true });

  try {
    // Check if channel has its own BGM
    await fs.access(channelBgmPath);
    await fs.copyFile(channelBgmPath, targetBgmPath);
    bgmPath = 'assets/quiz_bgm.mp3';
    console.log(`   BGM: ${channelBgmPath}`);
  } catch {
    // Fallback to english BGM
    try {
      await fs.access(fallbackBgmPath);
      await fs.copyFile(fallbackBgmPath, targetBgmPath);
      bgmPath = 'assets/quiz_bgm.mp3';
      console.log(`   BGM: ${fallbackBgmPath} (fallback)`);
    } catch {
      console.log(`   BGM: Not found, skipping`);
    }
  }

  // Bundle Remotion project
  console.log('\n📦 Bundling Remotion project...');
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/index.ts'),
    webpackOverride: (cfg) => cfg,
    publicDir: channelOutputDir,
  });

  // Render each sentence as a Quiz Short
  const totalSentences = script.sentences.length;
  console.log(`\n🎬 Rendering ${totalSentences} Quiz Shorts...\n`);

  for (let i = 0; i < script.sentences.length; i++) {
    const sentence = script.sentences[i];
    const audioFile = audioFiles.find((af) => af.sentenceId === sentence.id && af.speed === '1.0x');
    const slowAudioFile = audioFiles.find(
      (af) => af.sentenceId === sentence.id && af.speed === '0.8x'
    );

    if (!audioFile) {
      console.warn(`   ⚠️ No audio for sentence ${sentence.id}, skipping`);
      continue;
    }

    // Generate quiz choices from wrongWordChoices (단어 기반)
    const quizSentence = {
      ...sentence,
      choices:
        sentence.wrongWordChoices && sentence.wrongWordChoices.length >= 2
          ? createChoicesFromWrongWords(
              sentence.blankAnswer,
              sentence.wrongWordChoices,
              sentence.id
            )
          : generateQuizChoices(sentence),
    };

    const compositionId = 'ListeningQuizShort';

    const inputProps = {
      sentence: quizSentence,
      audioFile,
      slowAudioFile,
      config,
      backgroundImage,
      sentenceIndex: i + 1,
      episodeTitle: script.metadata.title.native,
      // 동적 타이밍용 duration 전달
      audioDuration: audioFile.duration,
      slowAudioDuration: slowAudioFile?.duration,
      // BGM
      bgmPath,
    };

    console.log(`[${i + 1}/${totalSentences}] "${sentence.target.substring(0, 40)}..."`);

    try {
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
        inputProps,
        timeoutInMilliseconds: 60000,
      });

      console.log(
        `   Duration: ${composition.durationInFrames} frames (${(composition.durationInFrames / 30).toFixed(1)}s)`
      );

      const outputPath = path.join(shortsDir, `quiz_${String(i + 1).padStart(2, '0')}.mp4`);

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
        timeoutInMilliseconds: 120000,
        onProgress: ({ progress }) => {
          process.stdout.write(`\r   Progress: ${(progress * 100).toFixed(1)}%`);
        },
      });

      // Remove metadata (Remotion watermark)
      const { removeVideoMetadata } = await import('../src/video/utils');
      await removeVideoMetadata(outputPath, true);

      const stats = await fs.stat(outputPath);
      console.log(`\r   ✅ Done (${(stats.size / 1024 / 1024).toFixed(2)} MB)                    `);
    } catch (error) {
      console.error(`\n   ❌ Failed: ${error}`);
    }
  }

  console.log(`\n✅ All Quiz Shorts rendered!`);
  console.log(`📁 Output: ${shortsDir}`);
}

/**
 * Create quiz choices from wrongWordChoices array (단어 기반)
 */
function createChoicesFromWrongWords(
  blankAnswer: string,
  wrongWordChoices: string[],
  sentenceId: number
): Array<{ text: string; isCorrect: boolean }> {
  const correctIndex = sentenceId % 3;
  const choices: Array<{ text: string; isCorrect: boolean }> = [];
  let wrongIdx = 0;

  for (let i = 0; i < 3; i++) {
    if (i === correctIndex) {
      choices.push({ text: blankAnswer, isCorrect: true });
    } else {
      choices.push({ text: wrongWordChoices[wrongIdx++] || blankAnswer, isCorrect: false });
    }
  }

  return choices;
}

/**
 * Generate missing wrongWordChoices using GPT (단어 기반 오답)
 */
async function generateMissingWrongWordChoices(script: Script): Promise<Script> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️ GEMINI_API_KEY not set, using fallback wrongWordChoices');
    return script;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const sentencesNeedingWrongWords = script.sentences.filter(
    (s) => !s.wrongWordChoices || s.wrongWordChoices.length < 2
  );

  if (sentencesNeedingWrongWords.length === 0) {
    return script;
  }

  console.log(`   Processing ${sentencesNeedingWrongWords.length} sentences...`);

  const prompt = `Role: You are an Expert Language Assessment Specialist creating word-based quiz distractors.

Task:
For each blankAnswer word provided below, generate 2 phonetically similar WRONG WORDS.
These will be used in A/B/C word-choice quizzes in 5-second YouTube Shorts.

CRITICAL: Output must be SINGLE WORDS only, not sentences or phrases!

Techniques for creating confusing wrong word choices:
1. **Minimal pairs:** "walk" vs "work", "play" vs "pay", "right" vs "light"
2. **Similar sounds:** "hear" vs "here", "their" vs "there", "some" vs "same"
3. **Tense confusion:** "meet" vs "met", "like" vs "liked"
4. **Rhyming words:** "meeting" vs "eating" vs "beating"
5. **Similar spelling:** "familiar" vs "similar", "coffee" vs "copy"

Words to process:
${sentencesNeedingWrongWords.map((s) => `ID ${s.id}: blankAnswer="${s.blankAnswer}" (sentence: "${s.target}")`).join('\n')}

Output Format:
- Return ONLY a valid JSON object.
- Do NOT use markdown code blocks.
- Each value must be an array of exactly 2 SINGLE WORDS.

Example Output:
{
  "wrongWordChoices": {
    "1": ["eating", "beating"],
    "2": ["similar", "family"],
    "3": ["copy", "coughing"]
  }
}

Generate ONLY the JSON output.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('   ⚠️ Could not parse GPT response, using fallback');
      return script;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const wrongWordChoicesMap = parsed.wrongWordChoices || {};

    // Update sentences with generated wrongWordChoices
    const updatedSentences = script.sentences.map((sentence) => {
      if (!sentence.wrongWordChoices || sentence.wrongWordChoices.length < 2) {
        const generated = wrongWordChoicesMap[String(sentence.id)];
        if (generated && Array.isArray(generated) && generated.length >= 2) {
          console.log(
            `   ✓ ID ${sentence.id}: "${sentence.blankAnswer}" → [${generated.slice(0, 2).join(', ')}]`
          );
          return { ...sentence, wrongWordChoices: generated.slice(0, 2) };
        }
      }
      return sentence;
    });

    return { ...script, sentences: updatedSentences };
  } catch (error) {
    console.warn(`   ⚠️ GPT wrongWordChoices generation failed: ${error}`);
    return script;
  }
}

renderShorts().catch(console.error);
