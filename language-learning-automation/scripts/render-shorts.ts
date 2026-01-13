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

  // Check if any sentence is missing wrongAnswers
  const needsWrongAnswers = script.sentences.some(
    (s) => !s.wrongAnswers || s.wrongAnswers.length < 2
  );

  if (needsWrongAnswers) {
    console.log('\n🤖 Generating missing wrongAnswers with GPT...');
    script = await generateMissingWrongAnswers(script);
    // Save updated script
    await fs.writeFile(scriptPath, JSON.stringify(script, null, 2));
    console.log('   ✅ Updated script with wrongAnswers');
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

    // Generate quiz choices
    const quizSentence = {
      ...sentence,
      choices:
        sentence.wrongAnswers && sentence.wrongAnswers.length >= 2
          ? createChoicesFromWrongAnswers(sentence.target, sentence.wrongAnswers, sentence.id)
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
 * Create quiz choices from wrongAnswers array
 */
function createChoicesFromWrongAnswers(
  correctAnswer: string,
  wrongAnswers: string[],
  sentenceId: number
): Array<{ text: string; isCorrect: boolean }> {
  const correctIndex = sentenceId % 3;
  const choices: Array<{ text: string; isCorrect: boolean }> = [];
  let wrongIdx = 0;

  for (let i = 0; i < 3; i++) {
    if (i === correctIndex) {
      choices.push({ text: correctAnswer, isCorrect: true });
    } else {
      choices.push({ text: wrongAnswers[wrongIdx++] || correctAnswer, isCorrect: false });
    }
  }

  return choices;
}

/**
 * Generate missing wrongAnswers using GPT
 */
async function generateMissingWrongAnswers(script: Script): Promise<Script> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️ GEMINI_API_KEY not set, using fallback wrongAnswers');
    return script;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const sentencesNeedingWrongAnswers = script.sentences.filter(
    (s) => !s.wrongAnswers || s.wrongAnswers.length < 2
  );

  if (sentencesNeedingWrongAnswers.length === 0) {
    return script;
  }

  // Detect language from script metadata or first sentence
  const targetLanguage = script.metadata?.targetLanguage || 'English';

  console.log(
    `   Processing ${sentencesNeedingWrongAnswers.length} sentences (${targetLanguage})...`
  );

  const prompt = `Role: You are an Expert Language Assessment Specialist. Your goal is to create high-quality "distractors" (wrong answers) for a listening comprehension test.

Task:
Input language: ${targetLanguage}
For each correct sentence provided below, generate 2 incorrect sentences that act as plausible distractors.

Core Principles for Distractors:
1. **Phonetic Interference**: The wrong answer should sound very similar to the correct one (e.g., rhyme, minimal pairs, similar linking sounds).
2. **Contextual Plausibility**: The wrong answer must be grammatically correct and meaningful on its own, not nonsense.
3. **Length Preservation**: Keep the syllable count and rhythm similar to the original sentence.

Language-Specific Guidelines:
${
  targetLanguage === 'Korean'
    ? `[Korean Guidelines]
- Particle Confusion: Swap subtle particles that change nuance (e.g., 은/는 vs 이/가, 에 vs 에서).
- Tense/Honorifics: Change only the verb ending or tense (e.g., 갔습니다 -> 갑니다, 하세요 -> 했어요).
- Sound Similarity: Use words that share phonemes (e.g., 감기(cold) vs 경기(game), 사람(person) vs 사랑(love)).
- Negation: subtle changes in positive/negative forms (e.g., 안 갔다 -> 못 갔다).`
    : targetLanguage === 'English'
      ? `[English Guidelines]
- Minimal Pairs: Change one phoneme (e.g., "walk" vs "work", "play" vs "pay").
- Weak Forms & Contractions: Exploit ambiguous sounds (e.g., "I'd go" -> "I go", "can" vs "can't").
- Homophones/Near-Homophones: Use words that sound alike (e.g., "flower" vs "flour", "right" vs "light").
- Tense Shift: "He is running" -> "He was running".`
      : `[General Guidelines]
- Focus on changing key verbs or nouns to words that sound phonetically similar in the target language.
- Modify verb conjugations or grammatical particles slightly.`
}

Sentences to process:
${sentencesNeedingWrongAnswers.map((s) => `ID ${s.id}: "${s.target}"`).join('\n')}

Output Format:
- Return ONLY a valid JSON object.
- Do NOT use markdown code blocks.
- Do NOT include explanations.

Example Output Structure:
{
  "wrongAnswers": {
    "1": ["Phonetically similar wrong sentence 1", "Grammatically confusing wrong sentence 2"],
    "2": ["...", "..."]
  }
}`;

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
    const wrongAnswersMap = parsed.wrongAnswers || {};

    // Update sentences with generated wrongAnswers
    const updatedSentences = script.sentences.map((sentence) => {
      if (!sentence.wrongAnswers || sentence.wrongAnswers.length < 2) {
        const generated = wrongAnswersMap[String(sentence.id)];
        if (generated && Array.isArray(generated) && generated.length >= 2) {
          console.log(`   ✓ ID ${sentence.id}: Generated wrongAnswers`);
          return { ...sentence, wrongAnswers: generated.slice(0, 2) };
        }
      }
      return sentence;
    });

    return { ...script, sentences: updatedSentences };
  } catch (error) {
    console.warn(`   ⚠️ GPT wrongAnswers generation failed: ${error}`);
    return script;
  }
}

renderShorts().catch(console.error);
