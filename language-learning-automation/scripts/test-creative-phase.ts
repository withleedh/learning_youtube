/**
 * Creative Phase 테스트 스크립트
 * 대본 생성만 단독으로 테스트
 *
 * 사용법: npx tsx scripts/test-creative-phase.ts
 */

import 'dotenv/config';
import { generateCreativeScript } from '../src/script/pipeline/creative-generator';
import { calculateEngagementScore } from '../src/script/pipeline/validators';
import { loadConfig } from '../src/config/loader';
import type { Category } from '../src/script/types';

async function main() {
  // 테스트 설정
  const channelId = 'english';
  const category: Category = 'conversation';
  const topic = '좋아하는 사람에게 고백했어요'; // 한국어 주제
  const sentenceCount = 15;

  console.log('🎬 Creative Phase 테스트 시작\n');
  console.log(`📋 설정:`);
  console.log(`   - 채널: ${channelId}`);
  console.log(`   - 카테고리: ${category}`);
  console.log(`   - 주제: ${topic}`);
  console.log(`   - 문장 수: ${sentenceCount}`);
  console.log('');

  // 채널 설정 로드
  const config = await loadConfig(channelId);

  // Creative Phase 실행
  console.log('🎭 대본 생성 중...\n');
  const startTime = Date.now();

  const screenplay = await generateCreativeScript({
    topic,
    category,
    config,
    sentenceCount,
  });

  const duration = Date.now() - startTime;
  console.log(`⏱️ 생성 시간: ${(duration / 1000).toFixed(1)}초\n`);

  // 결과 출력
  console.log('='.repeat(60));
  console.log('📝 생성된 대본');
  console.log('='.repeat(60));
  console.log(`\n제목: ${screenplay.title}\n`);

  console.log('등장인물:');
  screenplay.characters.forEach((c) => {
    console.log(`  - ${c.id} (${c.name}): ${c.description}`);
  });

  console.log('\n--- 대본 내용 ---\n');
  console.log(screenplay.rawText);
  console.log('\n--- 대본 끝 ---\n');

  // 파싱된 구조 출력
  console.log('='.repeat(60));
  console.log('🔍 파싱된 구조');
  console.log('='.repeat(60));
  console.log(`\n씬 개수: ${screenplay.scenes.length}`);

  let totalDialogue = 0;
  screenplay.scenes.forEach((scene, i) => {
    console.log(`\n[Scene ${scene.sceneNumber}] ${scene.setting}`);
    scene.dialogue.forEach((d) => {
      const emotion = d.emotion ? ` (${d.emotion})` : '';
      console.log(`  ${d.speaker}: ${d.line}${emotion}`);
      totalDialogue++;
    });
  });

  console.log(`\n총 대사 수: ${totalDialogue}`);

  // Engagement Score 평가
  console.log('\n' + '='.repeat(60));
  console.log('📊 Engagement Score 평가');
  console.log('='.repeat(60));

  const engagementScore = await calculateEngagementScore(screenplay, config.meta.targetLanguage);

  console.log(`\n총점: ${engagementScore.total}/100`);
  console.log(`  - Emotional Arc: ${engagementScore.breakdown.emotionalArc}/25`);
  console.log(`  - Natural Flow: ${engagementScore.breakdown.naturalFlow}/25`);
  console.log(`  - Engagement: ${engagementScore.breakdown.engagement}/25`);
  console.log(`  - Memorability: ${engagementScore.breakdown.memorability}/25`);

  if (engagementScore.strengths.length > 0) {
    console.log(`\n✅ 강점:`);
    engagementScore.strengths.forEach((s) => console.log(`   - ${s}`));
  }

  if (engagementScore.issues.length > 0) {
    console.log(`\n⚠️ 개선점:`);
    engagementScore.issues.forEach((i) => console.log(`   - ${i}`));
  }

  const passed = engagementScore.total >= 60;
  console.log(`\n결과: ${passed ? '✅ PASS' : '❌ FAIL'} (기준: 60점)`);
}

main().catch(console.error);
