/**
 * 성과 기반 주제 선택 시스템 테스트
 */

import { selectTimlyTopic } from '../src/script/topic-selector';
import {
  selectPatternByWeight,
  getCompatiblePatterns,
  PERFORMANCE_PATTERNS,
} from '../src/script/performance-patterns';
import type { Category } from '../src/script/types';

async function testPerformancePatterns() {
  console.log('🎯 성과 기반 패턴 선택 시스템 테스트\n');
  console.log('='.repeat(60));

  // 1. 패턴 DB 확인
  console.log('\n📊 패턴 DB 요약:');
  console.log(`총 ${PERFORMANCE_PATTERNS.length}개 패턴\n`);

  for (const pattern of PERFORMANCE_PATTERNS.slice(0, 5)) {
    console.log(
      `  ${pattern.id.padEnd(20)} | 가중치: ${(pattern.weight * 100).toFixed(1)}% | 평균: ${pattern.avgViews.toLocaleString()} 조회수`
    );
  }
  console.log('  ...');

  // 2. 카테고리별 호환 패턴 확인
  console.log('\n📋 카테고리별 호환 패턴:');
  const categories: Category[] = ['story', 'fairytale', 'news', 'conversation', 'travel_business'];

  for (const category of categories) {
    const compatible = getCompatiblePatterns(category);
    console.log(`  ${category.padEnd(15)} → ${compatible.map((p) => p.id).join(', ')}`);
  }

  // 3. 패턴 선택 시뮬레이션 (10회)
  console.log('\n🎲 패턴 선택 시뮬레이션 (story 카테고리, 10회):');
  const selectionCounts: Record<string, number> = {};

  for (let i = 0; i < 10; i++) {
    const selection = selectPatternByWeight('story', []);
    selectionCounts[selection.pattern.id] = (selectionCounts[selection.pattern.id] || 0) + 1;
  }

  for (const [patternId, count] of Object.entries(selectionCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${patternId.padEnd(20)} : ${'█'.repeat(count)} (${count}회)`);
  }

  // 4. 실제 주제 생성 테스트
  console.log('\n' + '='.repeat(60));
  console.log('🚀 실제 주제 생성 테스트\n');

  const testCategories: Category[] = ['story', 'fairytale', 'news'];

  for (const category of testCategories) {
    console.log(`\n📌 카테고리: ${category}`);
    console.log('-'.repeat(40));

    try {
      const topic = await selectTimlyTopic(category, 'English', 'Korean', 3);
      console.log(`\n   ✅ 선택된 주제: "${topic}"\n`);
    } catch (error) {
      console.error(`   ❌ 에러: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 테스트 완료!');
}

testPerformancePatterns().catch(console.error);
