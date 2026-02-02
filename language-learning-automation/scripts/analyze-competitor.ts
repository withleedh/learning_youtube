/**
 * 경쟁 채널 분석 스크립트
 * 166개 영상 데이터를 분석하여 고성과 패턴 추출
 */

import { promises as fs } from 'fs';
import path from 'path';

interface VideoData {
  title: string;
  views: number;
  duration: number;
}

interface PatternAnalysis {
  pattern: string;
  keywords: string[];
  totalViews: number;
  videoCount: number;
  avgViews: number;
  weight: number; // 가중치 (조회수 기반)
  examples: string[];
}

// 패턴 정의 (키워드 기반)
const PATTERN_DEFINITIONS: Record<string, string[]> = {
  // 시의성/날씨
  weather_seasonal: [
    '한파',
    '폭염',
    '눈',
    '비',
    '겨울',
    '여름',
    '봄',
    '가을',
    '크리스마스',
    '새해',
    '추석',
    '설날',
  ],

  // 동화/우화
  fairytale: ['동화', '쥐', '개', '토끼', '거북이', '여우', '사자', '욕심', '교훈'],

  // 감성/동물
  emotional_animal: ['고양이', '강아지', '길고양이', '반려', '입양'],

  // 실용 회화 (장소)
  practical_place: ['카페', '공항', '호텔', '레스토랑', '편의점', '약국', '백화점', '시장', '병원'],

  // 여행
  travel: ['여행', '비행기', '택시', '지하철', '버스', '입국', '체크인', '짐'],

  // 일상 공감
  daily_relatable: ['지각', '늦잠', '잃어버', '분실', '고장', '실수'],

  // 향수/회상
  nostalgia: ['어릴 때', '옛날', '첫사랑', '동창회', '추억', '살던 집'],

  // 자기계발/교훈
  self_improvement: ['습관', '방법', '이유', '특징', '비결', '극복', '성공'],

  // 감정적 편지/메시지
  emotional_letter: ['편지', '메시지', '군대', '입대', '작년의 나'],

  // 뉴스/시사
  news: ['뉴스', '발견', '인기', '화제'],

  // 기내 안내
  announcement: ['안내', '방송', '기내'],

  // 인생/철학
  life_philosophy: ['인생', '살아가는', '나이', '죽기 전'],
};

async function analyzeCompetitor() {
  // 데이터 로드
  const dataPath = path.join(process.cwd(), 'reference copy/ear_opening_english_videos.json');
  const content = await fs.readFile(dataPath, 'utf-8');

  const videos: VideoData[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      if (item.title && item.view_count) {
        videos.push({
          title: item.title,
          views: item.view_count,
          duration: item.duration || 0,
        });
      }
    } catch {}
  }

  console.log(`\n📊 경쟁 채널 분석: "귀가 뚫리는 영어"\n`);
  console.log(`총 영상 수: ${videos.length}개`);
  console.log(`총 조회수: ${videos.reduce((sum, v) => sum + v.views, 0).toLocaleString()}`);
  console.log(
    `평균 조회수: ${Math.round(videos.reduce((sum, v) => sum + v.views, 0) / videos.length).toLocaleString()}`
  );

  // 패턴별 분석
  const patternResults: PatternAnalysis[] = [];
  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);

  for (const [pattern, keywords] of Object.entries(PATTERN_DEFINITIONS)) {
    const matchedVideos = videos.filter((v) => keywords.some((kw) => v.title.includes(kw)));

    if (matchedVideos.length > 0) {
      const patternViews = matchedVideos.reduce((sum, v) => sum + v.views, 0);
      patternResults.push({
        pattern,
        keywords,
        totalViews: patternViews,
        videoCount: matchedVideos.length,
        avgViews: Math.round(patternViews / matchedVideos.length),
        weight: patternViews / totalViews, // 전체 조회수 대비 비중
        examples: matchedVideos
          .sort((a, b) => b.views - a.views)
          .slice(0, 3)
          .map((v) => `${v.views.toLocaleString()} - ${v.title}`),
      });
    }
  }

  // 가중치 순으로 정렬
  patternResults.sort((a, b) => b.weight - a.weight);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📈 패턴별 성과 분석 (가중치 순)`);
  console.log(`${'='.repeat(80)}\n`);

  for (const result of patternResults) {
    console.log(`\n🏷️  ${result.pattern.toUpperCase()}`);
    console.log(
      `   가중치: ${(result.weight * 100).toFixed(1)}% | 영상 수: ${result.videoCount}개 | 평균 조회수: ${result.avgViews.toLocaleString()}`
    );
    console.log(`   키워드: ${result.keywords.slice(0, 5).join(', ')}`);
    console.log(`   Top 3:`);
    result.examples.forEach((ex) => console.log(`     - ${ex}`));
  }

  // 가중치 기반 선택 확률 계산
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 추천 선택 확률 (가중치 기반)`);
  console.log(`${'='.repeat(80)}\n`);

  const totalWeight = patternResults.reduce((sum, p) => sum + p.weight, 0);
  for (const result of patternResults.slice(0, 10)) {
    const probability = ((result.weight / totalWeight) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(parseFloat(probability) / 2));
    console.log(`${result.pattern.padEnd(20)} ${bar} ${probability}%`);
  }

  // TypeScript 코드로 출력
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 생성된 패턴 DB (TypeScript)`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`export const HIGH_PERFORMANCE_PATTERNS = [`);
  for (const result of patternResults) {
    console.log(`  {`);
    console.log(`    id: '${result.pattern}',`);
    console.log(`    weight: ${result.weight.toFixed(4)},`);
    console.log(`    avgViews: ${result.avgViews},`);
    console.log(
      `    keywords: [${result.keywords
        .slice(0, 5)
        .map((k) => `'${k}'`)
        .join(', ')}],`
    );
    console.log(`    examples: [`);
    result.examples.slice(0, 2).forEach((ex) => {
      const title = ex.split(' - ')[1]?.replace(/"/g, '\\"') || '';
      console.log(`      '${title}',`);
    });
    console.log(`    ],`);
    console.log(`  },`);
  }
  console.log(`];`);
}

analyzeCompetitor().catch(console.error);
