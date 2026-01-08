/**
 * TTS Audio Duration Utilities
 * MP3 파일의 길이를 측정하는 유틸리티
 */

import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

/**
 * MP3 파일의 duration을 초 단위로 반환
 * ffprobe를 사용하여 정확한 길이 측정
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    // ffprobe 사용 (ffmpeg 설치 필요)
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8' }
    );
    return parseFloat(result.trim());
  } catch {
    // ffprobe가 없으면 파일 크기 기반 추정 (MP3 128kbps 기준)
    const stats = await fs.stat(filePath);
    const fileSizeInBytes = stats.size;
    // 128kbps = 16KB/s
    const estimatedDuration = fileSizeInBytes / (16 * 1024);
    return estimatedDuration;
  }
}

/**
 * 인트로 TTS 파일들의 duration을 측정
 */
export async function getIntroTTSDurations(
  assetsDir: string
): Promise<{ viralDuration: number; guideDuration: number }> {
  const viralPath = path.join(assetsDir, 'intro-viral.mp3');
  const guidePath = path.join(assetsDir, 'intro-narration.mp3');

  let viralDuration = 4.5; // 기본값
  let guideDuration = 2.5; // 기본값

  try {
    viralDuration = await getAudioDuration(viralPath);
  } catch {
    console.warn(`⚠️ Could not measure viral TTS duration, using default: ${viralDuration}s`);
  }

  try {
    guideDuration = await getAudioDuration(guidePath);
  } catch {
    console.warn(`⚠️ Could not measure guide TTS duration, using default: ${guideDuration}s`);
  }

  return { viralDuration, guideDuration };
}
