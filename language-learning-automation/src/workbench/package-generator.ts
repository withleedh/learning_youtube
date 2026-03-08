import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ChannelConfig } from '../config/types';
import { getGeminiApiKey, GEMINI_MODELS } from '../config/gemini';
import { calculateIntroDuration } from '../compositions/Intro';
import { calculateStep1Duration } from '../compositions/Step1';
import { calculateStep2Duration } from '../compositions/Step2';
import { calculateStep3Duration } from '../compositions/Step3';
import { calculateStep4Duration } from '../compositions/Step4';
import { STEP_TRANSITION_DURATION } from '../compositions/StepTransition';
import type { Script } from '../script/types';
import type { AudioFile } from '../tts/types';
import type {
  ImageStageManifest,
  PackageManifest,
  RenderStageManifest,
  ShortsStageManifest,
  TtsStageManifest,
} from './types';

function nowIso(): string {
  return new Date().toISOString();
}

function generateThumbnailSubtitle(_targetLanguage: string, nativeLanguage: string): string {
  if (nativeLanguage === 'Korean') {
    return 'Hear it clearly in 10 minutes';
  }

  if (nativeLanguage === 'Japanese') {
    return '10 minute daily listening';
  }

  return '10 minute daily listening';
}

function getContentTypeLabel(category: string, nativeLanguage: string = 'Korean'): string {
  const labels: Record<string, Record<string, string>> = {
    Korean: {
      story: '영어 듣기',
      fairytale: '영어 동화',
      news: '영어 뉴스',
      conversation: '영어 회화',
      travel_business: '여행 영어',
      announcement: '영어 안내',
      lesson: '영어 레슨',
    },
    Japanese: {
      story: '英語リスニング',
      fairytale: '英語童話',
      news: '英語ニュース',
      conversation: '英語会話',
      travel_business: '旅行英語',
      announcement: '英語アナウンス',
      lesson: '英語レッスン',
    },
    English: {
      story: 'English Listening',
      fairytale: 'English Fairytale',
      news: 'English News',
      conversation: 'English Conversation',
      travel_business: 'Travel English',
      announcement: 'English Announcement',
      lesson: 'English Lesson',
    },
  };

  const languageLabels = labels[nativeLanguage] ?? labels.Korean;
  return languageLabels[category] ?? languageLabels.story;
}

async function generateEmojisForTitle(title: string): Promise<string> {
  try {
    const apiKey = getGeminiApiKey();
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });
    const result = await model.generateContent(
      `Select exactly 3 fitting emoji for this YouTube title.\nTitle: "${title}"\nOutput emoji only.`
    );
    const response = result.response.text().trim();
    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    const emojis = response.match(emojiRegex) || [];
    return emojis.length >= 3 ? emojis.slice(0, 3).join('') : '✨💬🎯';
  } catch {
    return '✨💬🎯';
  }
}

async function generateCompetitorStyleTitle(
  nativeTitle: string,
  category: string,
  nativeLanguage: string
): Promise<string> {
  const contentType = getContentTypeLabel(category, nativeLanguage);
  const emojis = await generateEmojisForTitle(nativeTitle);
  return `${contentType} - ${nativeTitle} ${emojis}`;
}

export function getTimelineLabels(nativeLanguage: string = 'Korean') {
  const labels: Record<
    string,
    {
      timelineHeader: string;
      intro: string;
      step1: string;
      step2: string;
      step3: string;
      step4: string;
      ending: string;
      titleLabel: string;
    }
  > = {
    Korean: {
      timelineHeader: '타임라인',
      intro: '인트로',
      step1: 'Step 1. 전체 흐름 파악 (자막 없이 듣기)',
      step2: 'Step 2. 자막 보며 듣기',
      step3: 'Step 3. 문장별 3단계 훈련',
      step4: 'Step 4. 최종 확인',
      ending: '마무리',
      titleLabel: '제목',
    },
    Japanese: {
      timelineHeader: 'タイムライン',
      intro: 'イントロ',
      step1: 'Step 1. 字幕なしで聞く',
      step2: 'Step 2. 字幕を見ながら聞く',
      step3: 'Step 3. 文ごとの反復トレーニング',
      step4: 'Step 4. 最終確認',
      ending: 'エンディング',
      titleLabel: 'タイトル',
    },
    English: {
      timelineHeader: 'Timeline',
      intro: 'Intro',
      step1: 'Step 1. Listen Without Subtitles',
      step2: 'Step 2. Listen With Subtitles',
      step3: 'Step 3. Repetition Training',
      step4: 'Step 4. Final Review',
      ending: 'Ending',
      titleLabel: 'Title',
    },
  };

  return labels[nativeLanguage] ?? labels.Korean;
}

function getUploadInfoContent(
  nativeLanguage: string,
  timelineLabels: ReturnType<typeof getTimelineLabels>,
  timelineText: string,
  titleWithEmojis: string
): string {
  if (nativeLanguage === 'Japanese') {
    return `#英語リスニング #英語学習 #英語勉強 #日常英語 #英会話

英語、聞くだけで上達できます。

毎日さまざまな状況の英語を聞きながら、自然に耳を育てましょう。
4段階反復トレーニングで着実に定着させます。

⏱️ ${timelineLabels.timelineHeader}
${timelineText}

━━━━━━━━━━━━
📋 ${timelineLabels.titleLabel}
${titleWithEmojis}
`;
  }

  return `#영어듣기 #영어공부 #영어리스닝 #생활영어 #영어회화

영어, 듣기만 해도 늘 수 있어요.

매일 다양한 상황의 영어를 듣고 자연스럽게 귀를 여는 루틴을 만드세요.
4단계 반복 학습으로 흐름 이해부터 문장 체화까지 한 번에 가져갑니다.

⏱️ ${timelineLabels.timelineHeader}
${timelineText}

━━━━━━━━━━━━
📋 ${timelineLabels.titleLabel}
${titleWithEmojis}
`;
}

async function generateVideoThumbnail(
  backgroundPath: string,
  titleText: string,
  subtitleText: string,
  outputPath: string
): Promise<void> {
  const { createCanvas, loadImage } = await import('canvas');
  const width = 1280;
  const height = 720;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  try {
    const bgImage = await loadImage(backgroundPath);
    const scale = Math.max(width / bgImage.width, height / bgImage.height);
    const scaledWidth = bgImage.width * scale;
    const scaledHeight = bgImage.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    ctx.drawImage(bgImage, x, y, scaledWidth, scaledHeight);
  } catch {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#17303a');
    gradient.addColorStop(1, '#0f1720');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const overlay = ctx.createLinearGradient(0, height * 0.5, 0, height);
  overlay.addColorStop(0, 'rgba(0, 0, 0, 0)');
  overlay.addColorStop(0.6, 'rgba(0, 0, 0, 0.48)');
  overlay.addColorStop(1, 'rgba(0, 0, 0, 0.86)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  let titleFontSize = 86;
  if (titleText.length > 22) titleFontSize = 74;
  if (titleText.length > 34) titleFontSize = 62;

  let subtitleFontSize = 118;
  if (subtitleText.length > 18) subtitleFontSize = 96;
  if (subtitleText.length > 30) subtitleFontSize = 82;

  const subtitleY = height - 36;
  const titleY = subtitleY - subtitleFontSize - 24;

  ctx.font = `800 ${titleFontSize}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.strokeText(titleText, width / 2, titleY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(titleText, width / 2, titleY);

  ctx.font = `900 ${subtitleFontSize}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
  ctx.strokeText(subtitleText, width / 2, subtitleY);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(subtitleText, width / 2, subtitleY);

  await fs.writeFile(outputPath, canvas.toBuffer('image/png'));
}

function formatTimelineTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function buildTimeline(
  script: Script,
  audioFiles: AudioFile[],
  config: ChannelConfig,
  nativeLanguage: string
): Array<{ time: string; label: string }> {
  const fps = 30;
  const framesToSeconds = (frames: number) => frames / fps;
  const introDuration = calculateIntroDuration(5.256, 3.936, [8.52, 8.904, 9.72, 7.464], 2.952);
  const step1Duration = calculateStep1Duration(audioFiles);
  const step2Duration = calculateStep2Duration(script.sentences, audioFiles);
  const step3Duration = calculateStep3Duration(script.sentences, audioFiles, config.content.repeatCount);
  const step4Duration = calculateStep4Duration(audioFiles);
  const labels = getTimelineLabels(nativeLanguage);

  let currentFrame = 0;
  const timeline: Array<{ time: string; label: string }> = [];
  timeline.push({ time: formatTimelineTime(framesToSeconds(currentFrame)), label: labels.intro });
  currentFrame += introDuration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({ time: formatTimelineTime(framesToSeconds(currentFrame)), label: labels.step1 });
  currentFrame += step1Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({ time: formatTimelineTime(framesToSeconds(currentFrame)), label: labels.step2 });
  currentFrame += step2Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({ time: formatTimelineTime(framesToSeconds(currentFrame)), label: labels.step3 });
  currentFrame += step3Duration;

  currentFrame += STEP_TRANSITION_DURATION;
  timeline.push({ time: formatTimelineTime(framesToSeconds(currentFrame)), label: labels.step4 });
  currentFrame += step4Duration;

  timeline.push({ time: formatTimelineTime(framesToSeconds(currentFrame)), label: labels.ending });
  return timeline;
}

function buildPinnedComment(script: Script, selectedTitle: string): string {
  return `Today's lesson: ${selectedTitle}\nWhat line was hardest to catch?\nFavorite sentence: "${script.sentences[0]?.target ?? script.metadata.title.target}"`;
}

export interface PackageGenerationInput {
  channelId: string;
  outputDir: string;
  config: ChannelConfig;
  script: Script;
  imageManifest: ImageStageManifest;
  ttsManifest: TtsStageManifest;
  renderManifest: RenderStageManifest;
  shortsManifest?: ShortsStageManifest | null;
}

export async function generatePackageManifest(input: PackageGenerationInput): Promise<PackageManifest> {
  await fs.mkdir(input.outputDir, { recursive: true });

  const nativeTitle = input.script.metadata.title.native;
  const targetTitle = input.script.metadata.title.target;
  const competitorTitle = await generateCompetitorStyleTitle(
    nativeTitle,
    input.script.category,
    input.config.meta.nativeLanguage
  );

  const titleCandidates: PackageManifest['titleCandidates'] = [
    { id: 'title-native', value: nativeTitle, source: 'native' },
    { id: 'title-target', value: targetTitle, source: 'target' },
    { id: 'title-competitor', value: competitorTitle, source: 'competitor_style' },
  ];
  const selectedTitle = competitorTitle;

  const thumbnailSource =
    input.imageManifest.sceneImagePaths[0] ??
    input.imageManifest.backgroundImagePath ??
    input.renderManifest.videoPath;
  const subtitle = generateThumbnailSubtitle(
    input.config.meta.targetLanguage,
    input.config.meta.nativeLanguage
  );

  const thumbnailPrimaryPath = path.join(input.outputDir, 'thumbnail_primary.png');
  await generateVideoThumbnail(thumbnailSource, nativeTitle, subtitle, thumbnailPrimaryPath);
  const thumbnailAltPath = path.join(input.outputDir, 'thumbnail_alt.png');
  await generateVideoThumbnail(thumbnailSource, targetTitle, subtitle, thumbnailAltPath);

  const thumbnailCandidates: PackageManifest['thumbnailCandidates'] = [
    {
      id: 'thumb-primary',
      path: thumbnailPrimaryPath,
      label: 'Primary title overlay',
      source: 'scene',
    },
    {
      id: 'thumb-alt',
      path: thumbnailAltPath,
      label: 'Target title overlay',
      source: 'scene',
    },
  ];

  const timelineLabels = getTimelineLabels(input.config.meta.nativeLanguage);
  const timeline = buildTimeline(
    input.script,
    input.ttsManifest.audioFiles,
    input.config,
    input.config.meta.nativeLanguage
  );
  const timelineText = timeline.map((item) => `${item.time} ${item.label}`).join('\n');
  const uploadInfoText = getUploadInfoContent(
    input.config.meta.nativeLanguage,
    timelineLabels,
    timelineText,
    selectedTitle
  );
  const uploadInfoPath = path.join(input.outputDir, 'upload_info.txt');
  await fs.writeFile(uploadInfoPath, uploadInfoText, 'utf-8');

  const description = `${uploadInfoText}\n\nOriginal topic: ${input.script.metadata.topic}`;
  const pinnedComment = buildPinnedComment(input.script, selectedTitle);

  return {
    generatedAt: nowIso(),
    titleCandidates,
    selectedTitle,
    description,
    pinnedComment,
    thumbnailCandidates,
    selectedThumbnailPath: thumbnailPrimaryPath,
    uploadInfoPath,
    uploadInfoText,
    exportItems: [
      {
        id: 'video',
        label: 'Rendered video',
        path: input.renderManifest.videoPath,
      },
      {
        id: 'thumbnail',
        label: 'Selected thumbnail',
        path: thumbnailPrimaryPath,
      },
      {
        id: 'upload-info',
        label: 'Upload info',
        path: uploadInfoPath,
      },
      ...(input.shortsManifest
        ? [
            {
              id: 'shorts',
              label: 'Shorts directory',
              path: input.shortsManifest.outputDir,
            },
          ]
        : []),
    ],
  };
}
