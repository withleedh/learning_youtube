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

// 채널 정보 (나중에 config로 분리 가능)
const CHANNEL_INFO = {
  name: '하루 영어 습관',
  hashtags: '#영어듣기 #영어공부 #영어리스닝 #생활영어 #영어회화',
  notionUrl: 'https://your-notion-url.notion.site/...',
};

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
 */
async function generateCompetitorStyleTitle(
  nativeTitle: string,
  category: string
): Promise<string> {
  const contentType = getContentTypeLabel(category);
  const emojis = await generateEmojisForTitle(nativeTitle);
  return `${contentType} - ${nativeTitle} ${emojis}`;
}

/**
 * 요일별 학습 주제 설명 생성
 */
function getWeeklySchedule(): string {
  return `📅 요일별 콘텐츠
월 📖 일상 이야기
화 🗨️ 생활 회화  
수 📰 뉴스 영어
목 📢 안내·광고
금 💼 여행·비즈니스
토 ✏️ 영어 수업
일 🐭 영어 동화`;
}

/**
 * 학습 단계 설명 생성
 */
function getLearningStepsDescription(repeatCount: number): string {
  return `🎧 4단계 듣기 훈련
1️⃣ 자막 없이 듣기 → 전체 흐름 파악
2️⃣ 자막과 함께 듣기 → 문장 구조 확인
3️⃣ 문장별 ${repeatCount}회 반복 → 귀에 익히기
4️⃣ 다시 자막 없이 → 실력 확인`;
}

/**
 * 채널 소개 문구 생성
 */
function getChannelIntro(): string {
  return `영어, 듣기만 해도 늘 수 있어요 👂✨

매일 다양한 상황의 영어를 듣고, 자연스럽게 귀를 열어보세요.
4단계 반복 학습으로 누구나 쉽게 따라할 수 있습니다.`;
}

/**
 * 면책 조항 생성
 */
function getDisclaimer(): string {
  return `📌 안내
• 이 영상은 학습용으로 제작된 가상의 내용입니다.
• 무단 복제 및 상업적 이용을 금합니다.`;
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

  // 전체 업로드 정보 생성 (간결 버전)
  const uploadInfo = `${CHANNEL_INFO.hashtags}

${getChannelIntro()}

📌 안내
• 이 영상은 학습용으로 제작된 가상의 내용입니다.
• 무단 복제 및 상업적 이용을 금합니다.

⏱️ 타임라인
${timelineText}

━━━━━━━━━━━━
📋 제목
${titleWithEmojis}
`;

  // 제목 파일 별도 생성 삭제 - upload_info.txt에 포함됨

  await fs.writeFile(uploadInfoPath, uploadInfo, 'utf-8');
  console.log(`\n✅ Upload info created: ${uploadInfoPath}`);
  console.log(`\n📋 YouTube 제목:`);
  console.log(`   ${titleWithEmojis}`);
  console.log('\n🕒 타임라인:');
  timeline.forEach((t) => console.log(`  ${t.time} ${t.label}`));
}

generateUploadInfo().catch(console.error);
