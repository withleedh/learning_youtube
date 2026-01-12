/**
 * 비디오 크롭 유틸리티
 * FFmpeg를 사용하여 16:9 → 1:1 등 비율 변환
 */

import { execSync } from 'child_process';
import * as path from 'path';

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5';

/**
 * 비디오를 지정된 비율로 크롭
 * @param inputPath 입력 비디오 경로
 * @param outputPath 출력 비디오 경로 (없으면 자동 생성)
 * @param targetRatio 목표 비율
 * @returns 출력 파일 경로
 */
export function cropVideo(
  inputPath: string,
  targetRatio: AspectRatio,
  outputPath?: string
): string {
  // 출력 경로 생성
  const ext = path.extname(inputPath);
  const baseName = path.basename(inputPath, ext);
  const dir = path.dirname(inputPath);
  const output = outputPath || path.join(dir, `${baseName}_${targetRatio.replace(':', 'x')}${ext}`);

  // 크롭 필터 계산
  const cropFilter = getCropFilter(targetRatio);

  console.log(`🎬 Cropping video to ${targetRatio}...`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${output}`);

  // FFmpeg 실행
  const cmd = `ffmpeg -i "${inputPath}" -vf "${cropFilter}" -c:a copy -y "${output}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ Cropped successfully!`);
    return output;
  } catch (error) {
    const err = error as Error;
    throw new Error(`FFmpeg crop failed: ${err.message}`);
  }
}

/**
 * 비율에 따른 FFmpeg 크롭 필터 생성
 * 16:9 (1280x720) 기준으로 중앙 크롭
 */
function getCropFilter(ratio: AspectRatio): string {
  switch (ratio) {
    case '1:1':
      // 16:9에서 1:1로: 높이 기준으로 정사각형 크롭 (중앙)
      return 'crop=ih:ih:(iw-ih)/2:0';

    case '9:16':
      // 16:9에서 9:16으로: 세로 영상 (중앙 크롭)
      return 'crop=ih*9/16:ih:(iw-ih*9/16)/2:0';

    case '4:5':
      // 16:9에서 4:5로: 인스타그램 피드용
      return 'crop=ih*4/5:ih:(iw-ih*4/5)/2:0';

    case '16:9':
    default:
      return 'copy';
  }
}

/**
 * 여러 비율로 한번에 크롭
 */
export function cropToMultipleRatios(
  inputPath: string,
  ratios: AspectRatio[]
): Record<AspectRatio, string> {
  const results: Record<string, string> = {};

  for (const ratio of ratios) {
    results[ratio] = cropVideo(inputPath, ratio);
  }

  return results as Record<AspectRatio, string>;
}
