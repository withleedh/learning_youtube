#!/usr/bin/env node
/**
 * 선택지 퀴즈 형식 Shorts 렌더링 스크립트
 *
 * Usage:
 *   npx tsx scripts/render-quiz-shorts.ts <channelId> <folderName>
 *
 * Example:
 *   npx tsx scripts/render-quiz-shorts.ts english 2026-01-12_212252
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

async function renderQuizShorts() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
📱 Quiz Shorts Renderer - 선택지 퀴즈 형식 쇼츠 렌더링

Usage:
  npx tsx scripts/render-quiz-shorts.ts <channelId> <folderName>

Examples:
  npx tsx scripts/render-quiz-shorts.ts english 2026-01-12_212252
  npx tsx scripts/render-quiz-shorts.ts english_korean 2026-01-09_150452
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
  const shortsDir = path.join(outputDir, 'quiz-shorts');
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
  const script: Script = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  // Load audio manifest
  const manifestPath = path.join(outputDir, 'audio/manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const rawAudioFiles: AudioFile[] = JSON.parse(manifestContent);

  // Convert to staticFile paths
  const audioFiles: AudioFile[] = rawAudioFiles.map((af) => ({
    ...af,
    path: `${folderName}/audio/${path.basename(af.path)}`,
  }));

  console.log(`\n📱 Quiz Shorts Renderer`);
  console.log(`   Channel: ${channelId}`);
  console.log(`   Folder: ${folderName}`);
  console.log(`   Script: ${script.metadata.title.target}`);
  console.log(`   Sentences: ${script.sentences.length}`);

  // Build scene image mapping from scenePrompts
  const scenePrompts = script.metadata.scenePrompts || [];
  const sceneImages: string[] = [];

  // Check which scene images exist
  for (let i = 1; i <= 10; i++) {
    const scenePath = path.join(outputDir, `scene_${i}.png`);
    try {
      await fs.access(scenePath);
      sceneImages.push(`${folderName}/scene_${i}.png`);
    } catch {
      break; // No more scene images
    }
  }

  console.log(`   🖼️ Found ${sceneImages.length} scene images`);

  // Helper function to get background image for a sentence
  const getBackgroundForSentence = (sentenceId: number): string => {
    // If we have scenePrompts and scene images, find the matching scene
    if (scenePrompts.length > 0 && sceneImages.length > 0) {
      for (let i = 0; i < scenePrompts.length; i++) {
        const [start, end] = scenePrompts[i].sentenceRange;
        if (sentenceId >= start && sentenceId <= end) {
          // Return corresponding scene image (1-indexed)
          if (i < sceneImages.length) {
            return sceneImages[i];
          }
        }
      }
    }

    // Fallback: use scene_1 or legacy background
    if (sceneImages.length > 0) {
      return sceneImages[0];
    }
    return `${folderName}/background.png`;
  };

  // Copy common assets (ensure directory exists)
  const commonAssetsDest = path.join(channelOutputDir, 'assets', 'common');
  await fs.mkdir(commonAssetsDest, { recursive: true });

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

    // Get the appropriate background image for this sentence
    const backgroundImage = getBackgroundForSentence(sentence.id);

    // Generate quiz choices
    const quizSentence = {
      ...sentence,
      choices: generateQuizChoices(sentence),
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

    // Extract scene number from background path for logging
    const sceneMatch = backgroundImage.match(/scene_(\d+)/);
    const sceneInfo = sceneMatch ? ` [Scene ${sceneMatch[1]}]` : '';
    console.log(
      `[${i + 1}/${totalSentences}]${sceneInfo} "${sentence.target.substring(0, 35)}..."`
    );
    console.log(
      `   Choices: ${quizSentence.choices.map((c) => (c.isCorrect ? `✓${c.text}` : c.text)).join(' | ')}`
    );

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

      const stats = await fs.stat(outputPath);
      console.log(`\r   ✅ Done (${(stats.size / 1024 / 1024).toFixed(2)} MB)                    `);
    } catch (error) {
      console.error(`\n   ❌ Failed: ${error}`);
    }
  }

  console.log(`\n✅ All Quiz Shorts rendered!`);
  console.log(`📁 Output: ${shortsDir}`);

  // Generate upload info
  await generateQuizShortsUploadInfo(script, config, shortsDir);
}

/**
 * Generate upload info for Quiz Shorts
 */
async function generateQuizShortsUploadInfo(
  script: Script,
  config: ChannelConfig,
  shortsDir: string
): Promise<void> {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

  const baseHashtags = [
    '영어듣기',
    '영어퀴즈',
    '영어공부',
    'EnglishQuiz',
    'LearnEnglish',
    'ListeningQuiz',
  ];

  let content = `=== QUIZ SHORTS UPLOAD INFO ===
Generated: ${timestamp}
Script: ${script.metadata.title.target} (${script.metadata.title.native})
Category: ${script.category}
Total Shorts: ${script.sentences.length}

=== COMMON DESCRIPTION TEMPLATE ===

🎧 뭐라고 했을까요?
영어 문장을 듣고 A, B, C 중 정답을 맞춰보세요!

✨ 3초 안에 맞추면 당신은 영어 고수!
👇 더 많은 퀴즈는 프로필에서!

#${baseHashtags.join(' #')}

=== INDIVIDUAL SHORTS ===

`;

  for (let i = 0; i < script.sentences.length; i++) {
    const sentence = script.sentences[i];
    const shortNum = String(i + 1).padStart(2, '0');
    const choices = generateQuizChoices(sentence);
    const correctLabel = ['A', 'B', 'C'][choices.findIndex((c) => c.isCorrect)];

    const title = `영어 퀴즈 #${i + 1} | 🎧 뭐라고 했을까? (정답: ${correctLabel})`;

    content += `[QUIZ ${shortNum}] - quiz_${shortNum}.mp4
Title: ${title}
Sentence: ${sentence.target}
Correct Answer: ${correctLabel}
Choices:
  A. ${choices[0].text} ${choices[0].isCorrect ? '✓' : ''}
  B. ${choices[1].text} ${choices[1].isCorrect ? '✓' : ''}
  C. ${choices[2].text} ${choices[2].isCorrect ? '✓' : ''}

---

`;
  }

  const uploadInfoPath = path.join(shortsDir, 'quiz_upload_info.txt');
  await fs.writeFile(uploadInfoPath, content, 'utf-8');
  console.log(`\n📝 Upload info created: ${uploadInfoPath}`);
}

renderQuizShorts().catch(console.error);
