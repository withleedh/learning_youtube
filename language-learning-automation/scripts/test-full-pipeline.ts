/**
 * Creative → Structural 전체 파이프라인 테스트
 *
 * 목적:
 * 1. Creative 대본의 재미/감정이 학습 대본에서도 유지되는지 확인
 * 2. 한국인이 공감할 수 있는 상황인지 확인
 * 3. 학습 가치가 있는 문장인지 확인
 *
 * 사용법: npx tsx scripts/test-full-pipeline.ts
 */

import 'dotenv/config';
import { generateCreativeScript } from '../src/script/pipeline/creative-generator';
import { convertToStructuredFormat } from '../src/script/pipeline/structural-converter';
import { calculateEngagementScore } from '../src/script/pipeline/validators';
import { loadConfig } from '../src/config/loader';
import type { Category } from '../src/script/types';

async function main() {
  const channelId = 'english';
  const category: Category = 'conversation';
  const topic = '좋아하는 사람에게 고백했어요';
  const sentenceCount = 15;

  console.log('🎬 전체 파이프라인 테스트: Creative → Structural\n');
  console.log(`주제: ${topic}`);
  console.log('='.repeat(70));

  const config = await loadConfig(channelId);

  // ========================================
  // Phase 1: Creative Phase
  // ========================================
  console.log('\n📝 [Phase 1] Creative 대본 생성 중...\n');

  const screenplay = await generateCreativeScript({
    topic,
    category,
    config,
    sentenceCount,
  });

  // Creative 대본 전체 출력
  console.log('─'.repeat(70));
  console.log('🎭 CREATIVE 대본 (원본)');
  console.log('─'.repeat(70));
  console.log(screenplay.rawText);
  console.log('─'.repeat(70));

  // Engagement Score
  const score = await calculateEngagementScore(screenplay, config.meta.targetLanguage);
  console.log(`\n📊 Engagement Score: ${score.total}/100`);
  console.log(
    `   감정선: ${score.breakdown.emotionalArc}/25 | 자연스러움: ${score.breakdown.naturalFlow}/25`
  );
  console.log(
    `   몰입도: ${score.breakdown.engagement}/25 | 기억에 남음: ${score.breakdown.memorability}/25`
  );

  // ========================================
  // Phase 2: Structural Phase
  // ========================================
  console.log('\n📐 [Phase 2] 학습용 대본으로 변환 중...\n');

  const structured = await convertToStructuredFormat({
    screenplay,
    config,
    targetLanguage: config.meta.targetLanguage,
    nativeLanguage: config.meta.nativeLanguage,
    originalTopic: topic,
  });

  // ========================================
  // 비교 출력: Creative vs Structural
  // ========================================
  console.log('─'.repeat(70));
  console.log('📚 학습용 대본 (변환 결과)');
  console.log('─'.repeat(70));
  console.log(`제목: ${structured.metadata.title.target}`);
  console.log(`한국어: ${structured.metadata.title.native}\n`);

  structured.sentences.forEach((s, i) => {
    console.log(`[${s.id}] ${s.speaker}`);
    console.log(`   🇺🇸 ${s.target}`);
    console.log(`   🇰🇷 ${s.native}`);
    console.log(`   📝 빈칸: ${s.blankAnswer} → 오답: ${s.wrongWordChoices?.join(', ')}`);
    console.log('');
  });

  // ========================================
  // 품질 분석
  // ========================================
  console.log('='.repeat(70));
  console.log('🔍 품질 분석');
  console.log('='.repeat(70));

  // 1. 재미 요소 체크
  console.log('\n1️⃣ 재미 요소 (Creative 대본에서)');
  const funElements = analyzeFunElements(screenplay.rawText);
  funElements.forEach((e) => console.log(`   ${e}`));

  // 2. 한국인 공감 체크
  console.log('\n2️⃣ 한국인 공감 요소');
  const relatableElements = analyzeRelatability(screenplay.rawText, structured.sentences);
  relatableElements.forEach((e) => console.log(`   ${e}`));

  // 3. 학습 가치 체크
  console.log('\n3️⃣ 학습 가치');
  const learningValue = analyzeLearningValue(structured.sentences);
  learningValue.forEach((e) => console.log(`   ${e}`));

  // 4. 번역 자연스러움 체크
  console.log('\n4️⃣ 번역 자연스러움');
  const translationQuality = analyzeTranslation(structured.sentences);
  translationQuality.forEach((e) => console.log(`   ${e}`));

  // ========================================
  // 최종 판정
  // ========================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 최종 판정');
  console.log('='.repeat(70));

  const passed = score.total >= 80;
  console.log(`\nEngagement Score: ${score.total}/100 ${passed ? '✅' : '⚠️'}`);
  console.log(`문장 수: ${structured.sentences.length}개`);
  console.log(`\n결과: ${passed ? '✅ 재미와 학습 가치 모두 유지됨' : '⚠️ 개선 필요'}`);
}

// ========================================
// 분석 함수들
// ========================================

function analyzeFunElements(rawText: string): string[] {
  const elements: string[] = [];
  const text = rawText.toLowerCase();

  // 감정 표현 체크
  const emotions = ['nervous', 'excited', 'scared', 'happy', 'worried', 'embarrassed', 'relieved'];
  const foundEmotions = emotions.filter((e) => text.includes(e));
  if (foundEmotions.length >= 2) {
    elements.push(`✅ 다양한 감정 표현: ${foundEmotions.join(', ')}`);
  } else {
    elements.push(`⚠️ 감정 표현 부족 (${foundEmotions.length}개)`);
  }

  // 유머/서프라이즈 체크
  const humorIndicators = ['wait', 'what?', 'oh no', 'oh my', 'seriously', 'really?', 'no way'];
  const foundHumor = humorIndicators.filter((h) => text.includes(h));
  if (foundHumor.length >= 2) {
    elements.push(`✅ 유머/서프라이즈 요소: ${foundHumor.length}개`);
  } else {
    elements.push(`⚠️ 유머 요소 부족`);
  }

  // 대화 자연스러움 체크
  const naturalIndicators = ["i'm", "don't", "can't", "it's", "that's", "what's"];
  const foundNatural = naturalIndicators.filter((n) => text.includes(n));
  if (foundNatural.length >= 3) {
    elements.push(`✅ 자연스러운 축약형 사용: ${foundNatural.length}개`);
  } else {
    elements.push(`⚠️ 너무 딱딱한 문체`);
  }

  // 구체적 디테일 체크
  const hasNumbers = /\d+/.test(rawText);
  const hasSpecificActions = /(check|look|stare|grab|type|send|wait)/i.test(rawText);
  if (hasNumbers || hasSpecificActions) {
    elements.push(`✅ 구체적인 디테일 포함`);
  } else {
    elements.push(`⚠️ 구체적 디테일 부족`);
  }

  return elements;
}

function analyzeRelatability(rawText: string, sentences: any[]): string[] {
  const elements: string[] = [];
  const text = rawText.toLowerCase();

  // 서양 레퍼런스 체크 (피해야 할 것들)
  const westernRefs = [
    'raccoon',
    'pizza',
    'spreadsheet',
    'alaska',
    'football',
    'baseball',
    'burger',
  ];
  const foundWestern = westernRefs.filter((w) => text.includes(w));
  if (foundWestern.length === 0) {
    elements.push(`✅ 서양 특화 레퍼런스 없음`);
  } else {
    elements.push(`⚠️ 서양 레퍼런스 발견: ${foundWestern.join(', ')}`);
  }

  // 보편적 공감 요소 체크
  const universalElements = ['phone', 'text', 'message', 'reply', 'wait', 'nervous', 'heart'];
  const foundUniversal = universalElements.filter((u) => text.includes(u));
  if (foundUniversal.length >= 3) {
    elements.push(`✅ 보편적 공감 요소: ${foundUniversal.join(', ')}`);
  }

  // 번역이 자연스러운지 체크 (한국어 번역 샘플)
  const koreanTranslations = sentences.map((s) => s.native).join(' ');
  const hasNaturalKorean =
    koreanTranslations.includes('어') ||
    koreanTranslations.includes('야') ||
    koreanTranslations.includes('거');
  if (hasNaturalKorean) {
    elements.push(`✅ 자연스러운 한국어 번역 (구어체)`);
  } else {
    elements.push(`⚠️ 번역이 딱딱할 수 있음`);
  }

  return elements;
}

function analyzeLearningValue(sentences: any[]): string[] {
  const elements: string[] = [];

  // blankAnswer 품질 체크
  const blankWords = sentences.map((s) => s.blankAnswer);
  const goodBlanks = blankWords.filter((w) => {
    const lower = w.toLowerCase();
    const bad = ['a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'is', 'are', 'was', 'were'];
    return !bad.includes(lower) && w.length > 2;
  });

  elements.push(`✅ 학습 가치 있는 빈칸 단어: ${goodBlanks.length}/${sentences.length}개`);
  elements.push(`   예시: ${goodBlanks.slice(0, 5).join(', ')}`);

  // 문장 길이 체크
  const avgWords =
    sentences.reduce((sum, s) => {
      return sum + s.target.split(' ').length;
    }, 0) / sentences.length;

  if (avgWords >= 5 && avgWords <= 12) {
    elements.push(`✅ 적절한 문장 길이: 평균 ${avgWords.toFixed(1)}단어`);
  } else {
    elements.push(`⚠️ 문장 길이 조정 필요: 평균 ${avgWords.toFixed(1)}단어`);
  }

  // 다양한 문법 패턴 체크
  const patterns = {
    questions: sentences.filter((s) => s.target.includes('?')).length,
    exclamations: sentences.filter((s) => s.target.includes('!')).length,
    statements: sentences.filter((s) => !s.target.includes('?') && !s.target.includes('!')).length,
  };
  elements.push(
    `✅ 문장 유형: 질문 ${patterns.questions}개, 감탄 ${patterns.exclamations}개, 평서 ${patterns.statements}개`
  );

  return elements;
}

function analyzeTranslation(sentences: any[]): string[] {
  const elements: string[] = [];

  // 번역 길이 비교
  const lengthRatios = sentences.map((s) => {
    const engLen = s.target.length;
    const korLen = s.native.length;
    return korLen / engLen;
  });
  const avgRatio = lengthRatios.reduce((a, b) => a + b, 0) / lengthRatios.length;

  if (avgRatio >= 0.5 && avgRatio <= 1.5) {
    elements.push(`✅ 번역 길이 적절 (비율: ${avgRatio.toFixed(2)})`);
  } else {
    elements.push(`⚠️ 번역 길이 불균형 (비율: ${avgRatio.toFixed(2)})`);
  }

  // 샘플 번역 출력
  elements.push(`\n   📌 번역 샘플:`);
  sentences.slice(0, 3).forEach((s) => {
    elements.push(`   "${s.target}"`);
    elements.push(`   → "${s.native}"\n`);
  });

  return elements;
}

main().catch(console.error);
