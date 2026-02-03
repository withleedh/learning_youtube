/**
 * Creative → Structural Phase 테스트 스크립트
 * Creative Phase 결과를 Structural Phase로 변환하여 학습용 대본 생성 테스트
 *
 * 사용법: npx tsx scripts/test-structural-phase.ts
 */

import 'dotenv/config';
import { generateCreativeScript } from '../src/script/pipeline/creative-generator';
import { convertToStructuredFormat } from '../src/script/pipeline/structural-converter';
import { calculateEngagementScore } from '../src/script/pipeline/validators';
import { loadConfig } from '../src/config/loader';
import type { Category } from '../src/script/types';

async function main() {
  // 테스트 설정
  const channelId = 'english';
  const category: Category = 'conversation';
  const topic = '좋아하는 사람에게 고백했어요'; // 한국어 주제
  const sentenceCount = 15;

  console.log('🎬 Creative → Structural Phase 테스트\n');
  console.log(`📋 설정:`);
  console.log(`   - 채널: ${channelId}`);
  console.log(`   - 카테고리: ${category}`);
  console.log(`   - 주제: ${topic}`);
  console.log(`   - 문장 수: ${sentenceCount}`);
  console.log('');

  // 채널 설정 로드
  const config = await loadConfig(channelId);

  // ========================================
  // Phase 1: Creative Phase
  // ========================================
  console.log('='.repeat(60));
  console.log('🎭 Phase 1: Creative Phase');
  console.log('='.repeat(60));

  const creativeStart = Date.now();
  const screenplay = await generateCreativeScript({
    topic,
    category,
    config,
    sentenceCount,
  });
  const creativeDuration = Date.now() - creativeStart;

  console.log(`⏱️ 생성 시간: ${(creativeDuration / 1000).toFixed(1)}초`);
  console.log(`📝 제목: ${screenplay.title}`);
  console.log(`👥 등장인물: ${screenplay.characters.map((c) => `${c.id}(${c.name})`).join(', ')}`);

  // 대사 수 계산
  const totalDialogue = screenplay.scenes.reduce((sum, s) => sum + s.dialogue.length, 0);
  console.log(`💬 대사 수: ${totalDialogue}`);

  // Engagement Score
  const engagementScore = await calculateEngagementScore(screenplay, config.meta.targetLanguage);
  console.log(`\n📊 Engagement Score: ${engagementScore.total}/100`);
  console.log(`   - Emotional Arc: ${engagementScore.breakdown.emotionalArc}/25`);
  console.log(`   - Natural Flow: ${engagementScore.breakdown.naturalFlow}/25`);
  console.log(`   - Engagement: ${engagementScore.breakdown.engagement}/25`);
  console.log(`   - Memorability: ${engagementScore.breakdown.memorability}/25`);

  // ========================================
  // Phase 2: Structural Phase
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📐 Phase 2: Structural Phase');
  console.log('='.repeat(60));

  const structuralStart = Date.now();
  const structured = await convertToStructuredFormat({
    screenplay,
    config,
    targetLanguage: config.meta.targetLanguage,
    nativeLanguage: config.meta.nativeLanguage,
    originalTopic: topic,
  });
  const structuralDuration = Date.now() - structuralStart;

  console.log(`⏱️ 변환 시간: ${(structuralDuration / 1000).toFixed(1)}초`);
  console.log(`\n📋 메타데이터:`);
  console.log(`   - 제목 (영어): ${structured.metadata.title.target}`);
  console.log(`   - 제목 (한국어): ${structured.metadata.title.native}`);
  console.log(`   - 스타일: ${structured.metadata.style}`);

  // ========================================
  // 학습용 대본 출력
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📚 학습용 대본 (Structured Sentences)');
  console.log('='.repeat(60));

  structured.sentences.forEach((s, i) => {
    console.log(`\n[${s.id}] ${s.speaker}`);
    console.log(`   영어: ${s.target}`);
    console.log(`   빈칸: ${s.targetBlank}`);
    console.log(`   정답: ${s.blankAnswer}`);
    console.log(`   오답: ${s.wrongWordChoices?.join(', ') || 'N/A'}`);
    console.log(`   번역: ${s.native}`);
    if (s.words && s.words.length > 0) {
      console.log(`   단어: ${s.words.map((w) => `${w.word}(${w.meaning})`).join(', ')}`);
    }
  });

  // ========================================
  // 품질 검증
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ 품질 검증');
  console.log('='.repeat(60));

  let issues = 0;

  // 1. title.native 검증
  if (structured.metadata.title.native !== topic) {
    console.log(
      `❌ title.native 불일치: "${structured.metadata.title.native}" (expected: "${topic}")`
    );
    issues++;
  } else {
    console.log(`✅ title.native 정확: "${structured.metadata.title.native}"`);
  }

  // 2. blankAnswer 검증
  const badBlanks = structured.sentences.filter((s) => {
    const word = s.blankAnswer.toLowerCase();
    const forbidden = [
      'a',
      'an',
      'the',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'is',
      'are',
      'was',
      'were',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
    ];
    return forbidden.includes(word);
  });

  if (badBlanks.length > 0) {
    console.log(`❌ 부적절한 blankAnswer ${badBlanks.length}개:`);
    badBlanks.forEach((s) => console.log(`   - [${s.id}] "${s.blankAnswer}"`));
    issues += badBlanks.length;
  } else {
    console.log(`✅ 모든 blankAnswer가 학습 가치 있음`);
  }

  // 3. blankAnswer가 target에 포함되는지 검증
  const missingBlanks = structured.sentences.filter(
    (s) => !s.target.toLowerCase().includes(s.blankAnswer.toLowerCase())
  );

  if (missingBlanks.length > 0) {
    console.log(`❌ blankAnswer가 target에 없음 ${missingBlanks.length}개:`);
    missingBlanks.forEach((s) =>
      console.log(`   - [${s.id}] "${s.blankAnswer}" not in "${s.target}"`)
    );
    issues += missingBlanks.length;
  } else {
    console.log(`✅ 모든 blankAnswer가 target에 포함됨`);
  }

  // 4. wrongWordChoices 검증
  const badChoices = structured.sentences.filter(
    (s) =>
      s.wrongWordChoices?.some((c) => c.includes(' ')) ||
      s.wrongWordChoices?.some((c) => c.toLowerCase() === s.blankAnswer.toLowerCase())
  );

  if (badChoices.length > 0) {
    console.log(`❌ 부적절한 wrongWordChoices ${badChoices.length}개:`);
    badChoices.forEach((s) => console.log(`   - [${s.id}] ${s.wrongWordChoices?.join(', ')}`));
    issues += badChoices.length;
  } else {
    console.log(`✅ 모든 wrongWordChoices가 유효함`);
  }

  // 5. 단어 수 검증 (4-15)
  const badWordCount = structured.sentences.filter((s) => {
    const words = s.target.split(/\s+/).filter((w) => w.length > 0);
    return words.length < 4 || words.length > 15;
  });

  if (badWordCount.length > 0) {
    console.log(`❌ 단어 수 범위 초과 ${badWordCount.length}개:`);
    badWordCount.forEach((s) => {
      const count = s.target.split(/\s+/).filter((w) => w.length > 0).length;
      console.log(`   - [${s.id}] ${count}단어: "${s.target}"`);
    });
    issues += badWordCount.length;
  } else {
    console.log(`✅ 모든 문장이 4-15 단어 범위 내`);
  }

  // ========================================
  // 최종 결과
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 최종 결과');
  console.log('='.repeat(60));
  console.log(`총 소요 시간: ${((creativeDuration + structuralDuration) / 1000).toFixed(1)}초`);
  console.log(`Engagement Score: ${engagementScore.total}/100`);
  console.log(`문장 수: ${structured.sentences.length}`);
  console.log(`품질 이슈: ${issues}개`);
  console.log(`\n결과: ${issues === 0 ? '✅ PASS' : '⚠️ ISSUES FOUND'}`);

  // JSON 출력 (디버깅용)
  console.log('\n' + '='.repeat(60));
  console.log('📄 JSON 출력 (처음 3개 문장)');
  console.log('='.repeat(60));
  console.log(
    JSON.stringify(
      {
        metadata: structured.metadata,
        sentences: structured.sentences.slice(0, 3),
      },
      null,
      2
    )
  );
}

main().catch(console.error);
