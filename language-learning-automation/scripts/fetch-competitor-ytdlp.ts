/**
 * 경쟁 채널 전체 영상 데이터 수집 (yt-dlp 사용)
 * API 키 불필요
 *
 * 사전 설치: brew install yt-dlp (macOS)
 * 사용법: npx ts-node scripts/fetch-competitor-ytdlp.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// 경쟁 채널 정보
const COMPETITOR_CHANNELS = [
  {
    url: 'https://www.youtube.com/channel/UC3YmhT0aCMrP-0jt5kF_KFg',
    name: 'ear_opening_english',
    displayName: '귀가 뚫리는 영어',
  },
];

interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  duration: number;
  thumbnailUrl: string;
  tags: string[];
}

interface ChannelData {
  channelName: string;
  displayName: string;
  fetchedAt: string;
  totalVideos: number;
  videos: VideoInfo[];
}

async function fetchChannelVideos(channelUrl: string): Promise<VideoInfo[]> {
  console.log(`📥 Fetching videos from ${channelUrl}...`);
  console.log('   This may take a few minutes...\n');

  // yt-dlp로 채널 전체 영상 메타데이터 추출
  const command = `yt-dlp --flat-playlist --dump-json "${channelUrl}/videos"`;

  try {
    const { stdout } = await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });

    const videos: VideoInfo[] = [];
    const lines = stdout.trim().split('\n');

    console.log(`   Found ${lines.length} videos in playlist\n`);

    // 각 영상의 상세 정보 가져오기 (배치로)
    const videoIds = lines
      .map((line) => {
        try {
          const data = JSON.parse(line);
          return data.id;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // 50개씩 배치로 상세 정보 가져오기
    const batchSize = 20;
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      console.log(
        `   Fetching details ${i + 1}-${Math.min(i + batchSize, videoIds.length)} of ${videoIds.length}...`
      );

      for (const videoId of batch) {
        try {
          const detailCmd = `yt-dlp --dump-json "https://www.youtube.com/watch?v=${videoId}" 2>/dev/null`;
          const { stdout: detailOut } = await execAsync(detailCmd, { maxBuffer: 10 * 1024 * 1024 });
          const data = JSON.parse(detailOut);

          videos.push({
            videoId: data.id,
            title: data.title || '',
            description: data.description || '',
            publishedAt: data.upload_date
              ? `${data.upload_date.slice(0, 4)}-${data.upload_date.slice(4, 6)}-${data.upload_date.slice(6, 8)}`
              : '',
            viewCount: data.view_count || 0,
            likeCount: data.like_count || 0,
            duration: data.duration || 0,
            thumbnailUrl: data.thumbnail || '',
            tags: data.tags || [],
          });
        } catch (err) {
          console.log(`   ⚠️ Failed to fetch ${videoId}`);
        }
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return videos;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

/**
 * 빠른 버전: 기본 정보만 (조회수 없음)
 */
async function fetchChannelVideosFast(channelUrl: string): Promise<VideoInfo[]> {
  console.log(`📥 Fast fetch from ${channelUrl}...`);

  const command = `yt-dlp --flat-playlist --dump-json "${channelUrl}/videos"`;

  try {
    const { stdout } = await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });

    const videos: VideoInfo[] = [];
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        videos.push({
          videoId: data.id || '',
          title: data.title || '',
          description: '',
          publishedAt: '',
          viewCount: data.view_count || 0,
          likeCount: 0,
          duration: data.duration || 0,
          thumbnailUrl: '',
          tags: [],
        });
      } catch {}
    }

    return videos;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

/**
 * 상세 버전: 모든 정보 (느림)
 */
async function fetchChannelVideosDetailed(channelUrl: string): Promise<VideoInfo[]> {
  console.log(`📥 Detailed fetch from ${channelUrl}...`);
  console.log('   ⚠️ This will take a LONG time (1-2 hours for 200+ videos)\n');

  const command = `yt-dlp --dump-json --no-download "${channelUrl}/videos"`;

  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: 100 * 1024 * 1024,
      timeout: 3600000, // 1 hour
    });

    const videos: VideoInfo[] = [];
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        videos.push({
          videoId: data.id || '',
          title: data.title || '',
          description: data.description || '',
          publishedAt: data.upload_date
            ? `${data.upload_date.slice(0, 4)}-${data.upload_date.slice(4, 6)}-${data.upload_date.slice(6, 8)}`
            : '',
          viewCount: data.view_count || 0,
          likeCount: data.like_count || 0,
          duration: data.duration || 0,
          thumbnailUrl: data.thumbnail || '',
          tags: data.tags || [],
        });
      } catch {}
    }

    return videos;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

async function main() {
  // yt-dlp 설치 확인
  try {
    await execAsync('yt-dlp --version');
  } catch {
    console.error('❌ yt-dlp not installed');
    console.log('\n설치 방법:');
    console.log('  macOS: brew install yt-dlp');
    console.log('  Linux: pip install yt-dlp');
    console.log('  Windows: winget install yt-dlp');
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'reference', 'competitors');
  await fs.mkdir(outputDir, { recursive: true });

  const mode = process.argv[2] || 'detailed'; // fast, detailed

  for (const channel of COMPETITOR_CHANNELS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎬 Fetching: ${channel.displayName}`);
    console.log(`   Mode: ${mode}`);
    console.log(`${'='.repeat(60)}\n`);

    let videos: VideoInfo[];

    if (mode === 'fast') {
      videos = await fetchChannelVideosFast(channel.url);
    } else {
      videos = await fetchChannelVideosDetailed(channel.url);
    }

    // 조회수 순 정렬
    videos.sort((a, b) => b.viewCount - a.viewCount);

    const channelData: ChannelData = {
      channelName: channel.name,
      displayName: channel.displayName,
      fetchedAt: new Date().toISOString(),
      totalVideos: videos.length,
      videos,
    };

    const outputPath = path.join(outputDir, `${channel.name}.json`);
    await fs.writeFile(outputPath, JSON.stringify(channelData, null, 2));

    console.log(`\n✅ Saved to: ${outputPath}`);
    console.log(`   Total videos: ${videos.length}`);

    if (videos.length > 0 && videos[0].viewCount > 0) {
      console.log(
        `   Total views: ${videos.reduce((sum, v) => sum + v.viewCount, 0).toLocaleString()}`
      );
      console.log(`\n📈 Top 10 Videos:`);
      videos.slice(0, 10).forEach((v, i) => {
        console.log(
          `   ${i + 1}. ${v.viewCount.toLocaleString().padStart(10)} views | ${v.title.slice(0, 50)}`
        );
      });
    }
  }

  console.log('\n🎉 Done!');
}

main().catch(console.error);
