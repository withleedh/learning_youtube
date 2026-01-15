/**
 * Sample comparison script creation for testing
 * This file has no Node.js dependencies and can be used in browser/jsdom environments
 */

import {
  type ComparisonScript,
  type ComparisonSegment,
  type ComparisonCategory,
  type Difficulty,
} from './types';

/**
 * Create a sample comparison script for testing (without API call)
 */
export function createSampleComparisonScript(
  channelId: string,
  segmentCount: number = 30
): ComparisonScript {
  const categories: ComparisonCategory[] = [
    'daily',
    'business',
    'emotion',
    'request_reject',
    'apology_thanks',
  ];
  const difficulties: Difficulty[] = ['A2', 'B1', 'B2', 'C1'];

  const segments: ComparisonSegment[] = Array.from({ length: segmentCount }, (_, i) => ({
    id: i + 1,
    category: categories[i % categories.length],
    situation: `샘플 상황 ${i + 1}`,
    koreanExpression: {
      text: `Sample Korean expression ${i + 1}`,
      literal: `직역 ${i + 1}`,
    },
    nativeExpression: {
      text: `Sample native expression ${i + 1}`,
      note: `뉘앙스 설명 ${i + 1}`,
    },
    explanation: `설명 ${i + 1}: 이렇게 말하면 더 자연스럽습니다.`,
    difficulty: difficulties[Math.floor(i / (segmentCount / 4)) % difficulties.length],
  }));

  const today = new Date().toISOString().split('T')[0];

  return {
    channelId,
    date: today,
    title: {
      korean: '한국인 vs 원어민 일상편 #0001',
      english: 'Korean vs Native - Daily #0001',
    },
    hook: {
      text: '90%가 틀리는 영어',
      subtext: '당신도 이렇게 말하고 있을지도...',
    },
    hookVariants: [
      { text: '90%가 틀리는 영어', subtext: '당신도 이렇게 말하고 있을지도...' },
      { text: '이거 모르면 망신당합니다', subtext: '원어민 앞에서 절대 쓰면 안 되는 표현' },
      { text: '한국인만 쓰는 영어', subtext: '원어민은 이렇게 말해요' },
    ],
    segments,
    cta: {
      question: '여러분은 몇 개나 알고 계셨나요?',
      reminder: '구독과 좋아요로 응원해주세요!',
    },
  };
}
