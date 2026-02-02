/**
 * 경쟁 채널 전체 영상 데이터 수집 스크립트
 * YouTube Data API v3 사용
 *
 * 사용법: npx ts-node scripts/fetch-competitor-videos.ts
 */

import { google } from 'googleapis';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const youtube = google.youtube('v3');

// 경쟁 채널 정보
const COMPETITOR_CHANNELS = [
  {
    id: 'UCgWooJK1SjcnhKzLsiCJ9Nw', // 귀가 뚫리는 영어
    name: 'ear_opening_english',
    displayName: '귀가 뚫리는 영어',
  },
  // 필요시 다른 채널 추가
];

interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  durationSeconds: number;
  thumbnailUrl: string;
  tags: string[];
}

interface ChannelData {
  channelId: string;
  channelName: string;
  displayName: string;
  fetchedAt: string;
  totalVideos: number;
  videos: VideoInfo[];
}

/**
 * ISO 8601 duration을 초로 변환
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 채널의 모든 영상 ID 가져오기
 */
async function getAllVideoIds(channelId: string, apiKey: string): Promise<string[]> {
  const videoIds: string[] = [];
  let nextPageToken: string | undefined;

  // 먼저 uploads playlist ID 가져오기
  const channelResponse = await youtube.channels.list({
    key: apiKey,
    id: [channelId],
    part: ['contentDetails'],
  });

  const uploadsPlaylistId =
    channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error(`Cannot find uploads playlist for channel ${channelId}`);
  }

  console.log(`📋 Uploads playlist: ${uploadsPlaylistId}`);

  // Playlist items 순회
  let page = 1;
  do {
    console.log(`   Fetching page ${page}...`);

    const response = await youtube.playlistItems.list({
      key: apiKey,
      playlistId: uploadsPlaylistId,
      part: ['contentDetails'],
      maxResults: 50,
      pageToken: nextPageToken,
    });

    const items = response.data.items || [];
    for (const item of items) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) {
        videoIds.push(videoId);
      }
    }

    nextPageToken = response.data.nextPageToken || undefined;
    page++;

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (nextPageToken);

  return videoIds;
}

/**
 * 영상 상세 정보 가져오기 (50개씩 배치)
 */
async function getVideoDetails(videoIds: string[], apiKey: string): Promise<VideoInfo[]> {
  const videos: VideoInfo[] = [];

  // 50개씩 배치 처리
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    console.log(
      `   Fetching details ${i + 1}-${Math.min(i + 50, videoIds.length)} of ${videoIds.length}...`
    );

    const response = await youtube.videos.list({
      key: apiKey,
      id: batch,
      part: ['snippet', 'statistics', 'contentDetails'],
    });

    for (const item of response.data.items || []) {
      const snippet = item.snippet;
      const stats = item.statistics;
      const contentDetails = item.contentDetails;

      if (!snippet || !stats || !contentDetails) continue;

      videos.push({
        videoId: item.id || '',
        title: snippet.title || '',
        description: snippet.description || '',
        publishedAt: snippet.publishedAt || '',
        viewCount: parseInt(stats.viewCount || '0', 10),
        likeCount: parseInt(stats.likeCount || '0', 10),
        commentCount: parseInt(stats.commentCount || '0', 10),
        duration: contentDetails.duration || '',
        durationSeconds: parseDuration(contentDetails.duration || ''),
        thumbnailUrl:
          snippet.thumbnails?.maxres?.url ||
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.default?.url ||
          '',
        tags: snippet.tags || [],
      });
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return videos;
}

/**
 * 메인 실행
 */
async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error('❌ YOUTUBE_API_KEY not found in .env');
    console.log('\n환경변수 설정 방법:');
    console.log('1. Google Cloud Console에서 YouTube Data API v3 활성화');
    console.log('2. API 키 생성');
    console.log('3. .env 파일에 YOUTUBE_API_KEY=your_key 추가');
    process.exit(1);
  }

  const outputDir = path.join(process.cwd(), 'reference', 'competitors');
  await fs.mkdir(outputDir, { recursive: true });

  for (const channel of COMPETITOR_CHANNELS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎬 Fetching: ${channel.displayName}`);
    console.log(`${'='.repeat(60)}`);

    try {
      // 1. 모든 영상 ID 수집
      console.log('\n📥 Step 1: Collecting video IDs...');
      const videoIds = await getAllVideoIds(channel.id, apiKey);
      console.log(`   Found ${videoIds.length} videos`);

      // 2. 영상 상세 정보 수집
      console.log('\n📊 Step 2: Fetching video details...');
      const videos = await getVideoDetails(videoIds, apiKey);

      // 3. 조회수 순 정렬
      videos.sort((a, b) => b.viewCount - a.viewCount);

      // 4. 데이터 저장
      const channelData: ChannelData = {
        channelId: channel.id,
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
      console.log(
        `   Total views: ${videos.reduce((sum, v) => sum + v.viewCount, 0).toLocaleString()}`
      );

      // 5. 요약 통계 출력
      console.log(`\n📈 Top 10 Videos:`);
      videos.slice(0, 10).forEach((v, i) => {
        console.log(
          `   ${i + 1}. ${v.viewCount.toLocaleString().padStart(10)} views | ${v.title.slice(0, 50)}`
        );
      });
    } catch (error) {
      console.error(`❌ Error fetching ${channel.displayName}:`, error);
    }
  }

  console.log('\n🎉 Done!');
}

main().catch(console.error);
