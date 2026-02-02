import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Script } from '../src/script/types';
import type { ChannelConfig } from '../src/config/types';
import type { AudioFile } from '../src/tts/types';
import { calculateIntroDuration } from '../src/compositions/Intro';
import { calculateStep1Duration } from '../src/compositions/Step1';
import { calculateStep2Duration } from '../src/compositions/Step2';
import { calculateStep3Duration } from '../src/compositions/Step3';
import { calculateStep4Duration } from '../src/compositions/Step4';
import { STEP_TRANSITION_DURATION } from '../src/compositions/StepTransition';
import { GEMINI_MODELS, getGeminiApiKey } from '../src/config/gemini';

/**
 * LLM을 사용해 제목에 어울리는 이모지 3개 생성
 */
async function generateEmojisForTitle(title: string): Promise<string> {
  try {
    const apiKey = getGeminiApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

    const prompt = `다음 제목에 가장 어울리는 이모지 3개를 선택해주세요.
제목의 감정, 상황, 분위기를 잘 표현하는 이모지를 골라주세요.

제목: "${title}"

규칙:
- 이모지만 3개 출력 (공백 없이 붙여서)
- 설명 없이 이모지만 출력
- 예시: 😊💼✨

출력:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // 이모지만 추출 (3개)
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    const emojis = response.match(emojiRegex) || [];

    if (emojis.length >= 3) {
      return emojis.slice(0, 3).join('');
    }

    // 폴백: 기본 이모지
    return '✨💬🎯';
  } catch (error) {
    console.warn('⚠️ Failed to generate emojis with LLM, using fallback');
    return '✨💬🎯';
  }
}

/**
 * 카테고리에 맞는 콘텐츠 타입 라벨 반환
 * 경쟁 채널 "귀가 뚫리는 영어" 스타일 참고
 */
function getContentTypeLabel(category: string): string {
  const labels: Record<string, string> = {
    story: '영어 듣기',
    fairytale: '영어 동화',
    news: '영어 뉴스',
    conversation: '영어 회화',
    travel_business: '여행 영어',
    announcement: '영어 안내',
    lesson: '영어 레슨',
  };
  return labels[category] || '영어 듣기';
}

/**
 * 경쟁 채널 스타일의 제목 생성
 * 형식: [콘텐츠 타입] - [한국어 주제] [이모지 3개]
 * 예: 영어 듣기 - 어릴 때 살던 집에 방문하게 됐어요 🏠💕✨
 */
async function generateCompetitorStyleTitle(
  nativeTitle: string,
  category: string
): Promise<string> {
  const contentType = getContentTypeLabel(category);
  const emojis = await generateEmojisForTitle(nativeTitle);
  return `${contentType} - ${nativeTitle} ${emojis}`;
}

async function generateUploadInfo() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/generate-upload-info.ts <channelId> <outputFolder>');
    console.error('Example: npx tsx scripts/generate-upload-info.ts english 2026-01-08_174127');
    process.exit(1);
  }

  const channelId = args[0];
  const outputFolder = args[1];
  const baseDir = path.join(process.cwd(), 'output', channelId, outputFolder);

  console.log('📝 Generating upload_info.txt for:', baseDir);

  // Check if directory exists
  try {
    await fs.access(baseDir);
  } catch {
    console.error(`❌ Output directory not found: ${baseDir}`);
    process.exit(1);
  }

  // Find script file
  const files = await fs.readdir(baseDir);
  const scriptFile = files.find((f) => f.endsWith('.json') && f !== 'manifest.json');

  if (!scriptFile) {
    console.error(`❌ No script file found in ${baseDir}`);
    process.exit(1);
  }

  // Load script
  const scriptPath = path.join(baseDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: Script = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  // Load audio manifest
  const manifestPath = path.join(baseDir, 'audio/manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const audioFiles: AudioFile[] = JSON.parse(manifestContent);

  console.log(`📝 Script: ${script.metadata.title.target}`);
  console.log(`🎤 Audio files: ${audioFiles.length}`);
  console.log(`📊 Sentences: ${script.sentences.length}`);

  // Calculate durations
  const FPS = 30;
  const framesToSeconds = (frames: number) => frames / FPS;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate durations with actual TTS durations (matching inputProps from render)
  // These should match the values from pipeline/index.ts inputProps
  const viralNarrationDuration = 5.256; // assets/intro-viral.mp3
  const guideNarrationDuration = 3.936; // assets/intro-narration.mp3
  const stepNarrationDurations = [8.52, 8.904, 9.72, 7.464]; // intro-step1~4.mp3
  const closingNarrationDuration = 2.952; // assets/intro-closing.mp3

  const introDuration = calculateIntroDuration(
    viralNarrationDuration,
    guideNarrationDuration,
    stepNarrationDurations,
    closingNarrationDuration
  );
  const step1Duration = calculateStep1Duration(audioFiles);
  const step2Duration = calculateStep2Duration(script.sentences, audioFiles);
  const step3Duration = calculateStep3Duration(
    script.sentences,
    audioFiles,
    config.content.repeatCount
  );
  const step4Duration = calculateStep4Duration(audioFiles);

  // Build timeline
  let currentFrame = 0;
  const timeline: Array<{ time: string; label: string }> = [];

  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: '인트로' });
  currentFrame += introDuration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: 'Step 1. 전체 흐름 파악 (자막 없이 듣기)',
  });
  currentFrame += step1Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: 'Step 2. 자막 보며 듣기',
  });
  currentFrame += step2Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({
    time: formatTime(framesToSeconds(currentFrame)),
    label: 'Step 3. 문장별 3단계 훈련',
  });
  currentFrame += step3Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: 'Step 4. 최종 확인' });
  currentFrame += step4Duration;

  timeline.push({ time: formatTime(framesToSeconds(currentFrame)), label: '마무리' });

  // Write upload_info.txt
  const uploadInfoPath = path.join(baseDir, 'upload_info.txt');
  const timelineText = timeline.map((t) => `${t.time} ${t.label}`).join('\n');

  // 경쟁 채널 스타일 제목 생성
  // 형식: [콘텐츠 타입] - [한국어 주제] [이모지 3개]
  const nativeTitle = script.metadata.title.native;
  console.log('🎨 Generating competitor-style title...');
  const titleWithEmojis = await generateCompetitorStyleTitle(nativeTitle, script.category);
  console.log(`   ✓ Title: ${titleWithEmojis}`);

  const uploadInfo = `제목: ${titleWithEmojis}

타임라인:
${timelineText}

토픽: ${script.metadata.topic}
카테고리: ${script.category}
영어 제목: ${script.metadata.title.target}
`;

  await fs.writeFile(uploadInfoPath, uploadInfo, 'utf-8');
  console.log(`\n✅ Upload info created: ${uploadInfoPath}`);
  console.log('\n타임라인:');
  timeline.forEach((t) => console.log(`  ${t.time} ${t.label}`));
}

generateUploadInfo().catch(console.error);
