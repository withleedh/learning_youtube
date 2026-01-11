#!/usr/bin/env node
import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { Script } from '../src/script/types';
import type { ChannelConfig } from '../src/config/types';
import type { AudioFile } from '../src/tts/types';
import { parseFile } from 'music-metadata';

// Listen text by native language
const LISTEN_TEXT: Record<string, string> = {
  Korean: '이 영어가 들리세요?',
  Japanese: '聞こえますか？',
  Chinese: '你听得懂吗？',
  English: 'Can you hear this?',
  Spanish: '¿Puedes oír esto?',
  French: 'Pouvez-vous entendre?',
  German: 'Können Sie das hören?',
};

// TTS voice by native language
const TTS_VOICES: Record<string, string> = {
  Korean: 'ko-KR-SunHiNeural',
  Japanese: 'ja-JP-NanamiNeural',
  Chinese: 'zh-CN-XiaoxiaoNeural',
  English: 'en-US-JennyNeural',
  Spanish: 'es-ES-ElviraNeural',
  French: 'fr-FR-DeniseNeural',
  German: 'de-DE-KatjaNeural',
};

/**
 * Generate shortIntro.mp3 TTS file
 */
async function generateShortIntroTTS(
  nativeLanguage: string,
  outputPath: string
): Promise<{ path: string; duration: number }> {
  const text = LISTEN_TEXT[nativeLanguage] || LISTEN_TEXT['English'];
  const voice = TTS_VOICES[nativeLanguage] || TTS_VOICES['English'];

  console.log(`🎙️ Generating shortIntro.mp3: "${text}"`);

  const { EdgeTTS } = await import('@andresaya/edge-tts');
  const tts = new EdgeTTS();
  await tts.synthesize(text, voice, { rate: '+0%' });
  await fs.writeFile(outputPath, await tts.toBuffer());

  // Get duration
  const metadata = await parseFile(outputPath);
  const duration = metadata.format.duration || 1.5;

  console.log(`   ✅ Created shortIntro.mp3 (${duration.toFixed(2)}s)`);
  return { path: outputPath, duration };
}

async function renderShorts() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
📱 Shorts Renderer - 기존 output 폴더에서 쇼츠 렌더링

Usage:
  npx tsx scripts/render-shorts.ts <channelId> <folderName>

Examples:
  npx tsx scripts/render-shorts.ts english_korean 2026-01-09_150452
  npx tsx scripts/render-shorts.ts english 2026-01-09_114349
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

  // Find script file (yyyy-mm-dd_*.json format)
  const files = await fs.readdir(outputDir);
  console.log(`   Available files: ${files.filter((f) => f.endsWith('.json')).join(', ')}`);

  const scriptFile = files.find(
    (f) => f.endsWith('.json') && f.match(/^\d{4}-\d{2}-\d{2}_.*\.json$/)
  );

  console.log(`   Found script file: ${scriptFile || 'NONE'}`);

  if (!scriptFile) {
    console.error(`❌ No script file found in ${outputDir}`);
    console.error(`   Looking for pattern: yyyy-mm-dd_*.json`);
    console.error(
      `   Available JSON files: ${files.filter((f) => f.endsWith('.json')).join(', ')}`
    );
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

  console.log(`\n📱 Shorts Renderer`);
  console.log(`   Channel: ${channelId}`);
  console.log(`   Folder: ${folderName}`);
  console.log(`   Script: ${script.metadata.title.target}`);
  console.log(`   Sentences: ${script.sentences.length}`);

  // Check for shorts background image (9:16), fallback to regular background (16:9)
  const shortsBackgroundPath = path.join(outputDir, 'episode-shorts-background.png');

  let backgroundImage: string;
  try {
    await fs.access(shortsBackgroundPath);
    backgroundImage = `${folderName}/episode-shorts-background.png`;
    console.log(`   Background: episode-shorts-background.png (9:16)`);
  } catch {
    backgroundImage = `${folderName}/background.png`;
    console.log(`   Background: background.png (16:9 fallback)`);
    console.log(
      `   💡 Tip: Run 'npx tsx scripts/generate-shorts-background.ts ${channelId} ${folderName}' for optimized 9:16 background`
    );
  }

  // Generate shortIntro.mp3 TTS
  const shortIntroPath = path.join(outputDir, 'shortIntro.mp3');
  const introTTS = await generateShortIntroTTS(config.meta.nativeLanguage, shortIntroPath);

  // Create intro audio file object
  const introAudioFile: AudioFile = {
    sentenceId: 0,
    speaker: 'F',
    speed: '1.0x',
    path: `${folderName}/shortIntro.mp3`,
    duration: introTTS.duration,
  };

  // Bundle Remotion project
  console.log('\n📦 Bundling Remotion project...');

  // Copy assets/common to channelOutputDir for bundling
  const commonAssetsSource = path.join(process.cwd(), 'assets', 'common');
  const commonAssetsDest = path.join(channelOutputDir, 'assets', 'common');

  console.log(`   Source: ${commonAssetsSource}`);
  console.log(`   Dest: ${commonAssetsDest}`);

  // Ensure destination directory exists
  await fs.mkdir(commonAssetsDest, { recursive: true });

  // Copy ding-dong.mp3 specifically
  const dingDongSrc = path.join(commonAssetsSource, 'ding-dong.mp3');
  const dingDongDest = path.join(commonAssetsDest, 'ding-dong.mp3');

  try {
    await fs.copyFile(dingDongSrc, dingDongDest);
    console.log(`   ✅ Copied ding-dong.mp3 to ${dingDongDest}`);
  } catch (error) {
    console.log(`   ❌ Failed to copy ding-dong.mp3: ${error}`);
  }

  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/index.ts'),
    webpackOverride: (cfg) => cfg,
    publicDir: channelOutputDir,
  });

  // Render each sentence as a Short
  const totalSentences = script.sentences.length;
  console.log(`\n🎬 Rendering ${totalSentences} Shorts...\n`);

  for (let i = 0; i < script.sentences.length; i++) {
    const sentence = script.sentences[i];
    const audioFile = audioFiles.find((af) => af.sentenceId === sentence.id && af.speed === '1.0x');

    if (!audioFile) {
      console.warn(`   ⚠️ No audio for sentence ${sentence.id}, skipping`);
      continue;
    }

    // Use fixed composition ID - props determine which sentence to render
    const compositionId = 'SingleSentenceShort';

    const inputProps = {
      sentence,
      audioFile,
      introAudioFile,
      config,
      backgroundImage,
      sentenceIndex: i + 1,
      totalSentences,
      episodeTitle: script.metadata.title.native,
      channelName: config.meta.name,
    };

    console.log(`[${i + 1}/${totalSentences}] "${sentence.target.substring(0, 40)}..."`);

    try {
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
        inputProps,
      });

      const outputPath = path.join(shortsDir, `short_${String(i + 1).padStart(2, '0')}.mp4`);

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps,
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

  console.log(`\n✅ All Shorts rendered!`);
  console.log(`📁 Output: ${shortsDir}`);

  // Generate upload info
  console.log('\n📝 Generating shorts upload info...');
  await generateShortsUploadInfo(script, config, shortsDir, totalSentences);

  // Copy shortIntro.mp3 to public folder for Remotion Studio testing
  console.log('\n📁 Copying shortIntro.mp3 to public folder...');
  const publicDir = path.join(process.cwd(), 'public');
  await fs.mkdir(publicDir, { recursive: true });

  const publicIntroPath = path.join(publicDir, 'shortIntro.mp3');
  await fs.copyFile(shortIntroPath, publicIntroPath);
  console.log(`   ✅ Copied to public/shortIntro.mp3`);
  console.log(`   💡 Now you can test Shorts in Remotion Studio with: npm run start`);
}

renderShorts().catch(console.error);
/**
 * Generate upload info for YouTube Shorts
 */
async function generateShortsUploadInfo(
  script: Script,
  config: ChannelConfig,
  shortsDir: string,
  totalSentences: number
): Promise<void> {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

  // Category-based hashtags
  const categoryHashtags: Record<string, string[]> = {
    conversation: ['영어회화', '일상영어', 'EnglishConversation', 'DailyEnglish'],
    announcement: ['영어공지', '안내영어', 'EnglishAnnouncement', 'PublicEnglish'],
    travel_business: ['여행영어', '비즈니스영어', 'TravelEnglish', 'BusinessEnglish'],
    news: ['영어뉴스', 'EnglishNews', 'NewsEnglish'],
    story: ['영어이야기', 'EnglishStory', 'StoryTelling'],
    lesson: ['영어수업', 'EnglishLesson', 'EnglishClass'],
    fairytale: ['영어동화', 'EnglishFairytale', 'FairyTale'],
  };

  const baseHashtags = ['영어듣기', '영어공부', '영어퀴즈', 'EnglishListening', 'LearnEnglish'];
  const categoryTags = categoryHashtags[script.category] || [];
  const allHashtags = [...baseHashtags, ...categoryTags];

  let content = `=== SHORTS UPLOAD INFO ===
Generated: ${timestamp}
Script: ${script.metadata.title.target} (${script.metadata.title.native})
Category: ${script.category}
Total Shorts: ${totalSentences}

=== BATCH UPLOAD TEMPLATE ===
Channel: ${config.meta.name}
Target Language: ${config.meta.targetLanguage}
Native Language: ${config.meta.nativeLanguage}

Common Description Template:
✨ 3단계로 영어가 들리는 순간을 경험하세요
🎧 1단계: 자막 없이 듣기  
🤔 2단계: 빈칸 퀴즈
🎉 3단계: 정답 공개

#${allHashtags.join(' #')}

=== INDIVIDUAL SHORTS ===

`;

  // Generate info for each short
  for (let i = 0; i < script.sentences.length; i++) {
    const sentence = script.sentences[i];
    const shortNum = String(i + 1).padStart(2, '0');

    // Extract key word for title
    const keyWord = sentence.blankAnswer;
    const keyWordMeaning =
      sentence.words.find((w) => w.word.toLowerCase() === keyWord.toLowerCase())?.meaning || '';

    // Generate contextual emoji
    const contextEmojis: Record<string, string> = {
      coffee: '☕',
      morning: '🌅',
      please: '🙏',
      take: '🤲',
      enjoy: '😊',
      agree: '👍',
      tastes: '👅',
      better: '⭐',
      good: '👍',
      need: '💪',
      caffeine: '⚡',
      black: '⚫',
      sugar: '🍯',
      best: '🏆',
      way: '🛤️',
    };

    const emoji = contextEmojis[keyWord.toLowerCase()] || '🎧';

    // Create title
    const title = `영어 퀴즈 #${i + 1} | "${sentence.target}" 들리세요? ${emoji}`;

    // Create description with context
    const description = `${keyWordMeaning ? `"${keyWord}" = ${keyWordMeaning}` : sentence.target}
이 영어 문장이 들리시나요? 

✨ 반복 훈련으로 영어 귀를 뚫어보세요
🎧 느리게 → 🧩 빈칸 → ⚡ 빠르게

#${allHashtags.slice(0, 5).join(' #')}`;

    content += `[SHORT ${shortNum}] - short_${shortNum}.mp4
Title: ${title}
Description: 
${description}
Tags: ${allHashtags.join(',')}
Duration: ~15초
Key Word: ${keyWord} (${keyWordMeaning})

---

`;
  }

  // Add bulk upload tips
  content += `
=== UPLOAD TIPS ===

1. 파일명 순서대로 업로드 (short_01.mp4 → short_02.mp4 ...)
2. 제목은 각각 다르게, 설명은 템플릿 활용
3. 태그는 공통 + 문장별 키워드 조합
4. 썸네일: 자동 생성된 것 사용 (네온사인 + 문장)
5. 업로드 시간: 저녁 7-9시 권장

=== ANALYTICS TRACKING ===
Script Date: ${script.date}
Topic: ${script.metadata.topic}
Difficulty: ${config.content.difficulty}
Sentence Count: ${script.sentences.length}
`;

  const uploadInfoPath = path.join(shortsDir, 'shorts_upload_info.txt');
  await fs.writeFile(uploadInfoPath, content, 'utf-8');
  console.log(`   ✅ Upload info created: ${uploadInfoPath}`);
}
