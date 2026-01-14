import { promises as fs } from 'fs';
import { execSync } from 'child_process';

/**
 * Remove metadata (Remotion watermark) from a video file using ffmpeg
 * and set encoder tag to "H.264" (CapCut style)
 * @param videoPath - Path to the video file
 * @param silent - If true, don't log anything
 * @returns true if metadata was removed, false if ffmpeg failed
 */
export async function removeVideoMetadata(videoPath: string, silent = false): Promise<boolean> {
  const cleanPath = videoPath.replace('.mp4', '_clean.mp4');
  
  try {
    // Remove all metadata and set encoder to "H.264" (CapCut style)
    // -map_metadata -1: Remove all container metadata
    // -fflags +bitexact: Prevent FFmpeg from adding encoder info
    // -metadata:s:v encoder="H.264": Set video stream encoder tag
    execSync(
      `ffmpeg -y -i "${videoPath}" -map_metadata -1 -fflags +bitexact -metadata:s:v encoder="H.264" -c copy "${cleanPath}"`,
      { stdio: 'pipe' }
    );
    await fs.unlink(videoPath);
    await fs.rename(cleanPath, videoPath);
    if (!silent) {
      console.log(`   ✅ Metadata removed (encoder: H.264)`);
    }
    return true;
  } catch {
    if (!silent) {
      console.log(`   ⚠️ Could not remove metadata (ffmpeg not found?)`);
    }
    return false;
  }
}

