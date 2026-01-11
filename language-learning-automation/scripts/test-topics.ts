#!/usr/bin/env node

/**
 * 주제 생성 테스트 스크립트
 * Usage: npx tsx scripts/test-topics.ts [category] [count] [--lang=en]
 * Example:
 *   npx tsx scripts/test-topics.ts story 10          # 한국어 제목 (기본)
 *   npx tsx scripts/test-topics.ts story 10 --lang=en # 영어 제목
 */

import 'dotenv/config';
import { selectTimlyTopic } from '../src/script/topic-selector';
import type { Category } from '../src/script/types';

const CATEGORIES: Category[] = [
  'story',
  'conversation',
  'news',
  'announcement',
  'travel_business',
  'lesson',
  'fairytale',
];

async function testTopics() {
  const args = process.argv.slice(2);

  // --lang 옵션 파싱
  const langArg = args.find((a) => a.startsWith('--lang='));
  const isEnglish = langArg === '--lang=en';
  const filteredArgs = args.filter((a) => !a.startsWith('--lang='));

  const categoryArg = filteredArgs[0] as Category | undefined;
  const count = parseInt(filteredArgs[1] || '10', 10);

  // 언어 설정
  const targetLanguage = isEnglish ? 'Korean' : 'English';
  const nativeLanguage = isEnglish ? 'English' : 'Korean';

  // 카테고리 지정 안하면 랜덤
  const categories = categoryArg && CATEGORIES.includes(categoryArg) ? [categoryArg] : CATEGORIES;

  console.log(`\n🎯 주제 생성 테스트 (${count}개)`);
  console.log(`📝 제목 언어: ${nativeLanguage}`);
  console.log(`🎓 학습 언어: ${targetLanguage}\n`);
  console.log('─'.repeat(60));

  for (let i = 1; i <= count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];

    try {
      const topic = await selectTimlyTopic(category, targetLanguage, nativeLanguage);
      console.log(`${i.toString().padStart(2)}. [${category.padEnd(15)}] ${topic}`);
    } catch (error) {
      console.error(`${i.toString().padStart(2)}. [${category.padEnd(15)}] ❌ 에러:`, error);
    }
  }

  console.log('─'.repeat(60));
  console.log('\n✅ 완료!\n');
}

testTopics().catch(console.error);
