/**
 * Competitor Examples Database
 *
 * 경쟁 채널 "귀가 뚫리는 영어" 고성과 영상에서 추출한 실제 스크립트 예시
 * 패턴별로 1-2개씩 선별하여 Few-shot 학습에 활용
 *
 * 출처: reference copy/subtitles/*.json
 * 주의: 문장 복사 금지, 패턴/스타일만 학습용
 */

import type { Category } from './types';

// ============================================
// 1. 경쟁 채널 스크립트 예시 타입
// ============================================

export interface CompetitorExample {
  videoId: string;
  title: string;
  titleKorean: string;
  category: Category;
  patternId: string;
  viewCount: number;
  sentences: string[];
  techniques: {
    hook: string; // 첫 3문장 중 호기심 유발 문장
    hookAnalysis: string; // 왜 이 훅이 효과적인지
    climax: string; // 감정적 피크 문장
    climaxAnalysis: string;
    ending: string; // 마지막 여운 문장
    endingAnalysis: string;
  };
  styleNotes: string[]; // 문체 특징
}

// ============================================
// 2. Story 카테고리 예시 (향수/회상)
// ============================================

export const STORY_NOSTALGIA_EXAMPLE: CompetitorExample = {
  videoId: '81BXYvpnQko',
  title: 'Visiting the House Where I Lived as a Child',
  titleKorean: '어릴 때 살던 집에 방문하게 됐어요',
  category: 'story',
  patternId: 'nostalgia',
  viewCount: 23540,
  sentences: [
    'I work as an electronics repairman.',
    'One day, I got a call to fix a TV.',
    'The address seemed familiar.',
    'When I arrived, I stopped in front of the house.',
    'It was the house where I lived as a child.',
    'I stood there for a moment.',
    'Many old memories came flooding back.',
    'I rang the doorbell and went inside.',
    'I fixed the TV in the living room.',
    'After finishing the job, I looked around the house.',
    'The rooms looked smaller than before.',
    'On one wall, I saw lines with numbers.',
    'They showed how tall I grew each year.',
    'Near the door, I found a small dent.',
    'I remembered that I made it while playing as a child.',
    // 이후 아버지 일기장 발견 → 감정 폭발
    'After the repair, I told the owner the truth.',
    'I said that I had lived in this house long ago.',
    'The owner looked surprised and smiled.',
    'The owner said they had found an old item in the house.',
    'It was something left behind by the previous family.',
    'The owner gave me an old notebook.',
    'It was a journal my father kept about my growth.',
    'Inside, he wrote about moments from my life.',
    'He wrote about the day he scolded me.',
    'He said his heart hurt more than mine.',
    'He wrote that he wanted me to grow into a good man.',
    'Another page was about the first movie we watched together.',
    'He wrote that my joy stayed in his heart all day.',
    'In the back of the notebook, it said he would give it to me when I became an adult.',
    'But he passed away before he could do that.',
    'After his death, we sold the house and moved away.',
    'I never knew this notebook existed.',
    'Holding it, my hands began to shake.',
    "In that quiet room, I felt my father's love clearly.",
    'That day, the love he saved for me finally reached my heart.',
  ],
  techniques: {
    hook: 'The address seemed familiar.',
    hookAnalysis:
      '호기심 갭(Curiosity Gap) - 왜 익숙한지 설명하지 않아 시청자가 궁금해함. 직접적으로 "어릴 때 살던 집이었다"라고 하지 않고 암시만 함.',
    climax: 'Holding it, my hands began to shake.',
    climaxAnalysis:
      '신체 반응으로 감정 전달 - "I was very emotional"이라고 직접 말하지 않고, 손이 떨리는 신체 반응으로 보여줌. Show, don\'t tell.',
    ending: 'That day, the love he saved for me finally reached my heart.',
    endingAnalysis:
      '열린 결말 + 여운 - "finally"로 오랜 시간의 무게를, "reached my heart"로 감정적 완결을 표현. 시청자도 함께 감동받게 됨.',
  },
  styleNotes: [
    '1인칭 회상 시점 (I work, I got, I arrived)',
    '짧은 문장 (5-10단어) 유지',
    '감각적 표현 (flooding back, began to shake)',
    '구체적 디테일 (lines with numbers, small dent)',
    '시간 순서대로 자연스러운 전개',
    '감정을 직접 말하지 않고 상황/행동으로 보여줌',
  ],
};

// ============================================
// 3. Fairytale 카테고리 예시 (동화/교훈)
// ============================================

export const FAIRYTALE_EXAMPLE: CompetitorExample = {
  videoId: 'l9tKgY_QnKg',
  title: 'The Flower That Bloomed Last in the Garden',
  titleKorean: '정원에서 가장 늦게 피어난 꽃',
  category: 'fairytale',
  patternId: 'fairytale',
  viewCount: 11392,
  sentences: [
    'There was a quiet and beautiful garden.',
    'Many kinds of flowers grew together in the garden.',
    'Spring came and warm sunlight touched the soil.',
    'Soon the season of blooming began.',
    'Some flowers bloomed very quickly.',
    'They opened wide and showed their bright colors.',
    'People stopped and praised them.',
    'The garden looked full of life.',
    'But one small flower did not bloom.',
    'It stayed closed and silent.',
    'The other flowers laughed at it.',
    'They said it was slow and unimportant.',
    'People passed by without noticing it.',
    'The small flower did not hurry.',
    'It grew roots deep under the ground.',
    'It gathered food and light in its own time.',
    'Then summer came quietly.',
    'The early flowers began to fade.',
    'Their colors disappeared faster than expected.',
    'Some flowers were gone before the season ended.',
    'Then at last the quiet flower bloomed.',
    'It opened slowly, but it looked truly beautiful.',
    'Days passed and it did not fade.',
    'The sun rose and set.',
    'Seasons changed, but it stayed in bloom.',
    'The other flowers looked at it in shame.',
    'They realized they had rushed too fast.',
    'They learned that being fast was not what mattered.',
    'People remembered this flower the longest.',
    'It remained the most beautiful flower in the garden.',
    "Today's lesson: what matters is not how fast you move, but what you grow into.",
  ],
  techniques: {
    hook: 'But one small flower did not bloom.',
    hookAnalysis:
      '"But"으로 반전 시작 - 앞의 화려한 꽃들과 대비되는 주인공 등장. 시청자는 이 꽃이 어떻게 될지 궁금해함.',
    climax: 'Then at last the quiet flower bloomed.',
    climaxAnalysis:
      '"at last"로 기다림의 보상 - 오랜 인내 끝에 드디어 피어남. 시청자도 함께 안도와 기쁨을 느낌.',
    ending: "Today's lesson: what matters is not how fast you move, but what you grow into.",
    endingAnalysis:
      '명확한 교훈 제시 - 동화의 핵심 메시지를 직접 전달. 시청자가 삶에 적용할 수 있는 인사이트.',
  },
  styleNotes: [
    '3인칭 서사 시점 (There was, It stayed)',
    '의인화 (flowers laughed, looked in shame)',
    '대비 구조 (빠른 꽃 vs 느린 꽃)',
    '시간의 흐름 (Spring → Summer → Seasons changed)',
    '반복되는 구조 (bloom, fade, bloom again)',
    '마지막에 명확한 교훈 제시',
  ],
};

// ============================================
// 4. News 카테고리 예시 (정보/트렌드)
// ============================================

export const NEWS_EXAMPLE: CompetitorExample = {
  videoId: 'MN3UGEEzaw4',
  title: 'Korean Food is Very Popular Overseas',
  titleKorean: '한국 음식이 해외에서 큰 인기예요',
  category: 'news',
  patternId: 'news',
  viewCount: 19367,
  sentences: [
    'Korean food is becoming very popular around the world.',
    'Many people in different countries enjoy Korean dishes.',
    'This trend has grown quickly in recent years.',
    'Korean food is known for its strong flavors.',
    'Spicy dishes are especially popular with young people.',
    'Kimchi is one of the most famous Korean foods.',
    'It is made with vegetables and spices.',
    'Many health experts say kimchi is good for the body.',
    'Samgyupsal is also popular in many cities.',
    'People like to cook meat at the table.',
    'This style of eating feels fun and social.',
    'Korean street food is gaining attention as well.',
    'Foods like tteokbokki are easy to find online.',
    'Many videos show people trying Korean food.',
    'These videos often get millions of views.',
    'Social media plays a big role in this trend.',
    'Fans share photos of meals from Korean restaurants.',
    'Korean dramas also help spread food culture.',
    'Viewers see characters enjoying meals together.',
    'This makes the food look more appealing.',
    'Many Korean food brands are expanding overseas.',
    'They open new stores in large cities.',
    'Some supermarkets now sell Korean products.',
    'Instant ramen from Korea is selling well.',
    'People enjoy their unique taste.',
    'Cooking Korean food at home is also becoming common.',
    'Simple recipes are easy to follow.',
    'Online classes teach how to make Korean dishes.',
    'Experts say the popularity will continue.',
    'Korean food is now a global favorite.',
  ],
  techniques: {
    hook: 'Korean food is becoming very popular around the world.',
    hookAnalysis:
      '핵심 정보 먼저 제시 - 뉴스 스타일의 역피라미드 구조. 가장 중요한 정보를 첫 문장에 배치.',
    climax: 'These videos often get millions of views.',
    climaxAnalysis: '구체적 숫자로 임팩트 - "millions"이라는 숫자가 트렌드의 규모를 실감나게 전달.',
    ending: 'Korean food is now a global favorite.',
    endingAnalysis: '결론 요약 - 전체 내용을 한 문장으로 정리. "global favorite"로 긍정적 마무리.',
  },
  styleNotes: [
    '객관적 3인칭 시점 (Korean food is, People like)',
    '현재 시제 중심 (is becoming, is known)',
    '구체적 예시 나열 (Kimchi, Samgyupsal, tteokbokki)',
    '통계/숫자 활용 (millions of views)',
    '원인-결과 구조 (dramas → food culture spread)',
    '전문가 의견 인용 (Experts say)',
  ],
};

// ============================================
// 5. Conversation 카테고리 예시 (일상 대화)
// ============================================

export const CONVERSATION_EXAMPLE: CompetitorExample = {
  videoId: '-Phq8TePJhQ',
  title: 'I Got My Health Checkup Results',
  titleKorean: '건강 검진 결과가 나왔어요',
  category: 'conversation',
  patternId: 'daily_relatable',
  viewCount: 13316,
  sentences: [
    'I got my checkup results yesterday.',
    'Oh, really? I got mine last week.',
    'How did your results look?',
    'Most things were fine, but my blood pressure was high.',
    'That sounds a bit serious.',
    'Yes, the doctor told me to be careful.',
    'What did the doctor suggest?',
    'He said I should exercise more and eat less salt.',
    'That makes sense for high blood pressure.',
    'Yes, and I need better sleep, too.',
    'I see. My results were not great either.',
    'Oh, what was the problem for you?',
    'The dentist said I have a cavity.',
    "That's too bad, but it's pretty common.",
    'Yes, it hurts whenever I eat something.',
    'Did you make an appointment yet?',
    'Yes, I will see the dentist tomorrow.',
    "That's good. Early treatment really helps.",
    'I agree. I should be more careful about brushing my teeth.',
    "That's important to remember.",
    'I also need to eat fewer sweets.',
    "I know it's hard, but it's important.",
    'We both need healthier daily habits.',
    'Yes, these checkups were a good reminder.',
    'I want to start walking every evening.',
    'That sounds nice and easy to do.',
    'I will also drink more water each day.',
    'That will help a lot.',
    "Let's take better care of our health together.",
    "I agree. Let's support each other.",
  ],
  techniques: {
    hook: 'I got my checkup results yesterday.',
    hookAnalysis:
      '공감되는 상황으로 시작 - 누구나 경험하는 건강검진 결과. 시청자가 자신의 경험과 연결.',
    climax: 'Yes, it hurts whenever I eat something.',
    climaxAnalysis: '구체적 불편함 묘사 - 추상적인 "아프다"가 아닌 "먹을 때마다"로 공감 유발.',
    ending: "Let's support each other.",
    endingAnalysis: '따뜻한 마무리 - 서로 격려하며 긍정적으로 끝남. 시청자도 동기부여 받음.',
  },
  styleNotes: [
    '자연스러운 턴테이킹 (질문-대답 흐름)',
    '리액션 표현 (Oh, really?, That sounds, I see)',
    "공감 표현 (That's too bad, I agree)",
    '구체적 조언 (exercise more, eat less salt)',
    '격려와 다짐으로 마무리',
    '일상적이고 실용적인 어휘',
  ],
};

// ============================================
// 6. 카테고리별 예시 매핑
// ============================================

export const COMPETITOR_EXAMPLES: Record<Category, CompetitorExample> = {
  story: STORY_NOSTALGIA_EXAMPLE,
  fairytale: FAIRYTALE_EXAMPLE,
  news: NEWS_EXAMPLE,
  conversation: CONVERSATION_EXAMPLE,
  travel_business: CONVERSATION_EXAMPLE, // 대화 형식 유사
  announcement: NEWS_EXAMPLE, // 정보 전달 형식 유사
  lesson: NEWS_EXAMPLE, // 정보 전달 형식 유사
};

// ============================================
// 7. 프롬프트 생성 헬퍼 함수
// ============================================

/**
 * 카테고리에 맞는 경쟁 채널 예시를 프롬프트 형식으로 반환
 */
export function getCompetitorExamplePrompt(category: Category): string {
  const example = COMPETITOR_EXAMPLES[category];

  return `## 🎯 High-Performance Reference (경쟁 채널 고성과 예시)

### 제목: ${example.titleKorean}
조회수: ${example.viewCount.toLocaleString()}회

### 전체 스크립트 (${example.sentences.length}문장)
${example.sentences.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

### 핵심 기법 분석

**🪝 Hook (훅):** "${example.techniques.hook}"
→ ${example.techniques.hookAnalysis}

**🔥 Climax (클라이맥스):** "${example.techniques.climax}"
→ ${example.techniques.climaxAnalysis}

**✨ Ending (여운):** "${example.techniques.ending}"
→ ${example.techniques.endingAnalysis}

### 문체 특징
${example.styleNotes.map((note) => `- ${note}`).join('\n')}

### ⚠️ 중요 규칙
1. 위 문장을 **그대로 복사하지 마세요**
2. **스타일과 기법**만 참고하세요
3. 새로운 주제로 **같은 품질**의 스크립트를 작성하세요
4. Hook → Development → Climax → Ending 구조를 유지하세요`;
}

/**
 * 훅 패턴만 추출하여 반환
 */
export function getHookPatterns(): string[] {
  return [
    'The [noun] seemed familiar.', // 호기심 갭
    'But one small [noun] did not [verb].', // 반전 시작
    'I got my [noun] results yesterday.', // 공감 상황
    '[Topic] is becoming very popular around the world.', // 트렌드 제시
    'One day, I got a call that changed everything.', // 전환점
    "I didn't know what was waiting for me.", // 미스터리
    'Something felt different that day.', // 예감
  ];
}

/**
 * 클라이맥스 패턴만 추출하여 반환
 */
export function getClimaxPatterns(): string[] {
  return [
    'Holding it, my [body part] began to [physical reaction].', // 신체 반응
    'Then at last the [subject] [verb]ed.', // 기다림의 보상
    'These [noun] often get millions of [noun].', // 숫자 임팩트
    'Yes, it [verb]s whenever I [action].', // 구체적 불편함
    'I never knew this [noun] existed.', // 발견의 충격
    'The [noun] looked at it in shame.', // 감정적 반전
  ];
}

/**
 * 엔딩 패턴만 추출하여 반환
 */
export function getEndingPatterns(): string[] {
  return [
    'That day, the [noun] finally reached my [noun].', // 감정적 완결
    "Today's lesson: [교훈 문장].", // 명확한 교훈
    '[Topic] is now a global favorite.', // 결론 요약
    "Let's [verb] each other.", // 따뜻한 마무리
    'I still think about it sometimes.', // 열린 여운
    'Some moments stay with us forever.', // 철학적 마무리
  ];
}
