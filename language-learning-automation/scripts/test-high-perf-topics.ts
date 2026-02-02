/**
 * 고성과 토픽 샘플링 테스트
 */

import { buildTopicExamplesPrompt, sampleHighPerfTopics } from '../src/script/high-perf-topics';

console.log('=== story 카테고리 ===');
console.log(buildTopicExamplesPrompt('story', 5));

console.log('\n=== conversation 카테고리 ===');
console.log(buildTopicExamplesPrompt('conversation', 5));

console.log('\n=== fairytale 카테고리 ===');
console.log(buildTopicExamplesPrompt('fairytale', 5));

console.log('\n=== 샘플링 테스트 (3회) ===');
for (let i = 0; i < 3; i++) {
  console.log(`\n[${i + 1}회차]`);
  const samples = sampleHighPerfTopics('story', 3);
  samples.forEach((s) => console.log(`  - ${s.topic} (${s.viewCount.toLocaleString()})`));
}
