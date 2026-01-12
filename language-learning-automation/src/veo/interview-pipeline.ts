/**
 * 인터뷰 콘텐츠 파이프라인
 * 채널 설정 → 콘텐츠 생성 → Veo 영상 생성
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  loadChannelConfig,
  generateDailyContent,
  saveDailyContent,
  type ChannelConfig,
  type DailyContent,
} from './content-generator';
import { VeoGenerator } from './generator';
import type { VeoRequest } from './types';

export interface PipelineResult {
  content: DailyContent;
  videoPath: string;
  outputDir: string;
}

/**
 * 인터뷰 콘텐츠 파이프라인 실행
 */
export async function runInterviewPipeline(
  channelId: string,
  options?: {
    theme?: string;
    skipVideoGeneration?: boolean;
  }
): Promise<PipelineResult> {
  console.log('🚀 Starting Interview Content Pipeline\n');

  // 1. 채널 설정 로드
  const config = loadChannelConfig(channelId);
  console.log(`📺 Channel: ${config.channelName}`);
  console.log(`🐱 Character: ${config.character.name}\n`);

  // 2. 일일 콘텐츠 생성
  console.log('📝 Generating daily content...');
  const content = await generateDailyContent(channelId, { theme: options?.theme });

  console.log(`   Theme: ${content.theme}`);
  console.log(`   Dialogues:`);
  content.dialogues.forEach((d, i) => {
    console.log(`     ${i + 1}. Q: ${d.question} → A: ${d.answer}`);
  });
  console.log(`   Background: ${content.background}`);
  console.log(`   Outfit: ${content.outfit || 'none'}`);
  console.log('');

  // 3. 콘텐츠 저장
  const contentPath = saveDailyContent(channelId, content);
  const outputDir = path.dirname(contentPath);

  // 4. Veo 영상 생성
  let videoPath = '';
  if (!options?.skipVideoGeneration) {
    console.log('\n🎬 Generating video with Veo...');
    console.log('─'.repeat(60));
    console.log(content.veoPrompt);
    console.log('─'.repeat(60));

    videoPath = await generateInterviewVideo(config, content, outputDir);
  }

  console.log('\n✅ Pipeline completed!');
  console.log(`   Content: ${contentPath}`);
  if (videoPath) {
    console.log(`   Video: ${videoPath}`);
  }

  return {
    content,
    videoPath,
    outputDir,
  };
}

/**
 * 인터뷰 영상 생성
 */
async function generateInterviewVideo(
  config: ChannelConfig,
  content: DailyContent,
  outputDir: string
): Promise<string> {
  const generator = new VeoGenerator();

  // Reference images 준비
  const referenceImages: { imagePath: string; referenceType: 'asset' | 'style' }[] = [];

  if (config.veoConfig.useReferenceImages) {
    // 캐릭터 이미지
    if (config.character.imagePath && fs.existsSync(config.character.imagePath)) {
      referenceImages.push({
        imagePath: config.character.imagePath,
        referenceType: 'asset',
      });
    }

    // 마이크 이미지
    if (config.props?.microphone && fs.existsSync(config.props.microphone)) {
      referenceImages.push({
        imagePath: config.props.microphone,
        referenceType: 'asset',
      });
    }
  }

  // Veo 요청 생성
  const request: VeoRequest = {
    prompt: content.veoPrompt,
    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
    config: {
      model: 'veo-3.1-generate-preview',
      aspectRatio: config.veoConfig.aspectRatio as '16:9' | '9:16',
      resolution: '720p',
      durationSeconds: String(config.veoConfig.durationSeconds),
      personGeneration: config.veoConfig.personGeneration as 'allow_adult' | 'allow_all',
    },
    negativePrompt:
      'blurry, low quality, distorted, subtitles, captions, text overlay, on-screen text, watermark',
  };

  // 영상 생성
  const result = await generator.generateVideo(request);

  // 영상 다운로드
  const videoFileName = `${content.date}_${config.channelId}.mp4`;
  const videoPath = path.join(outputDir, videoFileName);
  await generator.downloadVideo(result.videoPath, videoPath);

  return videoPath;
}
