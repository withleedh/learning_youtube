/**
 * 경쟁 채널 영상 목록 업데이트 (yt-dlp 사용)
 * reference/ear_opening_english_list.json 갱신
 *
 * 사용법: npx ts-node scripts/update-competitor-list.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const CHANNEL_URL = 'https://www.youtube.com/channel/UC3YmhT0aCMrP-0jt5kF_KFg';
const OUTPUT_PATH = 'reference copy/ear_opening_english_list.json';

interface VideoItem {
  id: string;
  title: string;
  url: string;
  viewCount: number;
  duration: number;
  publishedAt?: string;
}

async function main() {
  console.log('📥 Fetching video list from 귀가 뚫리는 영어...\n');

  // yt-dlp로 채널 전체 영상 목록 가져오기 (flat-playlist = 빠름, 기본 정보만)
  const command = `yt-dlp --flat-playlist --dump-json "${CHANNEL_URL}/videos"`;

  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 300000, // 5분
    });

    const lines = stdout.trim().split('\n');
    const videos: VideoItem[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        // 채널 정보나 플레이리스트는 스킵
        if (data._type === 'url' && data.ie_key === 'YoutubeTab') continue;
        if (!data.id || !data.title) continue;

        videos.push({
          id: data.id,
          title: data.title,
          url: `https://www.youtube.com/watch?v=${data.id}`,
          viewCount: data.view_count || 0,
          duration: data.duration || 0,
        });
      } catch {}
    }

    // 조회수 순 정렬
    videos.sort((a, b) => b.viewCount - a.viewCount);

    // 저장
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(videos, null, 2));

    console.log(`✅ Saved ${videos.length} videos to ${OUTPUT_PATH}`);
    console.log(`\n📊 Statistics:`);
    console.log(`   Total videos: ${videos.length}`);
    console.log(
      `   Total views: ${videos.reduce((sum, v) => sum + v.viewCount, 0).toLocaleString()}`
    );
    console.log(
      `   Avg views: ${Math.round(videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length).toLocaleString()}`
    );

    console.log(`\n🏆 Top 10 Videos:`);
    videos.slice(0, 10).forEach((v, i) => {
      console.log(
        `   ${(i + 1).toString().padStart(2)}. ${v.viewCount.toLocaleString().padStart(10)} | ${v.title.slice(0, 50)}`
      );
    });
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
