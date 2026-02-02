/**
 * 경쟁 채널 제목에서 상황/스토리 부분만 추출
 * "[카테고리] - [상황/스토리] [이모지]" 형식에서 상황/스토리만 뽑기
 */

import { promises as fs } from 'fs';

interface VideoItem {
  id: string;
  title: string;
  viewCount: number;
}

interface TopicItem {
  topic: string; // 상황/스토리 부분
  viewCount: number;
  originalTitle: string;
  category: string; // 카테고리 (영어 듣기 연습, 영어 회화 듣기 등)
}

async function main() {
  const data = await fs.readFile('reference copy/ear_opening_english_list.json', 'utf-8');
  const videos: VideoItem[] = JSON.parse(data);

  const topics: TopicItem[] = [];

  for (const video of videos) {
    const { title, viewCount } = video;

    // 패턴: "[카테고리] - [상황/스토리] [이모지]"
    // 예: "영어 듣기 연습 - 서울에 한파가 시작됐어요 ☃️🧊🍃"

    const match = title.match(/^(.+?)\s*-\s*(.+?)(\s*[^\w\s가-힣]+)?$/);

    if (match) {
      const category = match[1].trim();
      let topic = match[2].trim();

      // 이모지 제거 (더 정확하게)
      topic = topic
        .replace(
          /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu,
          ''
        )
        .trim();

      topics.push({
        topic,
        viewCount,
        originalTitle: title,
        category,
      });
    } else {
      // 매칭 안 되는 경우 전체 제목 사용
      let topic = title
        .replace(
          /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu,
          ''
        )
        .trim();
      topics.push({
        topic,
        viewCount,
        originalTitle: title,
        category: 'unknown',
      });
    }
  }

  // 조회수 순 정렬
  topics.sort((a, b) => b.viewCount - a.viewCount);

  // 저장
  await fs.writeFile('reference copy/extracted_topics.json', JSON.stringify(topics, null, 2));

  console.log(`✅ Extracted ${topics.length} topics\n`);

  // 카테고리별 통계
  const categoryStats: Record<string, { count: number; totalViews: number }> = {};
  for (const t of topics) {
    if (!categoryStats[t.category]) {
      categoryStats[t.category] = { count: 0, totalViews: 0 };
    }
    categoryStats[t.category].count++;
    categoryStats[t.category].totalViews += t.viewCount;
  }

  console.log('📊 카테고리별 통계:');
  Object.entries(categoryStats)
    .sort((a, b) => b[1].totalViews - a[1].totalViews)
    .forEach(([cat, stats]) => {
      const avgViews = Math.round(stats.totalViews / stats.count);
      console.log(`   ${cat}: ${stats.count}개, 평균 ${avgViews.toLocaleString()} views`);
    });

  console.log('\n🏆 Top 30 Topics (조회수 순):');
  topics.slice(0, 30).forEach((t, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. ${t.viewCount.toLocaleString().padStart(10)} | ${t.topic}`
    );
  });
}

main().catch(console.error);
