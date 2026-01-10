import type { Category } from './types';
import type { ChannelConfig } from '../config/types';
import { CATEGORY_SCRIPT_FORMAT, isNarrationCategory, getDefaultSpeaker } from './category-tones';

/**
 * Generate the main prompt for script generation
 */
export function generateScriptPrompt(
  config: ChannelConfig,
  category: Category,
  topic?: string
): string {
  if (isNarrationCategory(category)) {
    return generateNarrationPrompt(config, category, topic);
  }
  return generateDialoguePrompt(config, category, topic);
}

/**
 * 나레이션 형식 프롬프트 (story, news, announcement, lesson, fairytale)
 */
function generateNarrationPrompt(
  config: ChannelConfig,
  category: Category,
  topic?: string
): string {
  const { meta, content } = config;
  const formatConfig = CATEGORY_SCRIPT_FORMAT[category];
  const speaker = getDefaultSpeaker(category);
  const speakerGender = speaker === 'M' ? 'male' : 'female';

  const categoryGuide = getNarrationCategoryGuide(category);

  return `# Role
Act as a **skilled content writer** who creates engaging ${meta.targetLanguage} narration scripts for language learners.

# Task
Create a ${meta.targetLanguage} **narration script** (single speaker) for a language learning video.
Format: ${formatConfig.description}

## Category: ${category}
${categoryGuide}

## Topic: ${topic || 'Choose a specific, engaging topic from the category'}

# Constraints
1. **Level:** CEFR A2~B1 (Pre-Intermediate). Easy but natural.
2. **Speaker:** Single narrator (${speaker} = ${speakerGender})
3. **Length:** Exactly ${content.sentenceCount} sentences total.
4. **Sentence Length:** 5-15 words per sentence.
5. **Difficulty:** ${content.difficulty}

# Structure
${getNarrationStructure(category)}

# Output Format (JSON)
{
  "metadata": {
    "topic": "Specific topic",
    "style": "${getStyleForCategory(category)}",
    "title": {
      "target": "Title in ${meta.targetLanguage}",
      "native": "Title in ${meta.nativeLanguage}"
    },
    "characters": [
      {
        "id": "${speaker}",
        "name": "${speaker === 'M' ? 'James' : 'Sarah'}",
        "gender": "${speakerGender}",
        "ethnicity": "American",
        "role": "narrator"
      }
    ],
    "imagePrompt": "A warm illustration of [topic scene]. Soft colors, inviting atmosphere."
  },
  "sentences": [
    {
      "id": 1,
      "speaker": "${speaker}",
      "target": "Full sentence in ${meta.targetLanguage}",
      "targetPronunciation": "Pronunciation in ${meta.nativeLanguage} script",
      "targetBlank": "Sentence with _______",
      "blankAnswer": "key word",
      "native": "Natural ${meta.nativeLanguage} translation",
      "words": [
        { "word": "vocabulary", "meaning": "meaning" }
      ]
    }
  ]
}

# Critical Rules
- **ALL sentences must have speaker: "${speaker}"**
- Native translation must sound natural, not textbook-style.
- blankAnswer MUST appear in the target sentence.
- targetBlank MUST contain exactly "_______".
- Words array: Include blankAnswer + 1-2 useful words.

Generate ONLY the JSON output. No additional text.`;
}

/**
 * 대화 형식 프롬프트 (conversation, travel_business)
 */
function generateDialoguePrompt(config: ChannelConfig, category: Category, topic?: string): string {
  const { meta, content } = config;
  const formatConfig = CATEGORY_SCRIPT_FORMAT[category];

  const categoryGuide = getDialogueCategoryGuide(category);

  return `# Role
Act as a **skilled screenwriter** who creates relatable dialogues for language learners.

# Task
Create a natural ${meta.targetLanguage} **conversation script** (two speakers) for a language learning video.
Format: ${formatConfig.description}

## Category: ${category}
${categoryGuide}

## Topic: ${topic || 'Choose a specific, relatable everyday situation'}

# Constraints
1. **Level:** CEFR A2~B1 (Pre-Intermediate). Easy but natural.
2. **Characters:** Two characters (M = Male, F = Female)
3. **Length:** Exactly ${content.sentenceCount} sentences total.
4. **Sentence Length:** 5-12 words per sentence.
5. **Difficulty:** ${content.difficulty}

# Dialogue Guidelines
- **Hook:** Start with a specific situation (NOT "Hello, how are you?")
- **Flow:** Characters must RESPOND to each other naturally
- **Ending:** Satisfying conclusion (gratitude, relief, encouragement)

# Natural Dialogue Techniques
- Softeners: "Actually,", "Well,", "I think..."
- Reactions: "Oh!", "Really?", "That's great!"
- Hesitation: "Um...", "Let me see..."

# Output Format (JSON)
{
  "metadata": {
    "topic": "Specific situation",
    "style": "Relatable/Natural",
    "title": {
      "target": "Title in ${meta.targetLanguage}",
      "native": "Title in ${meta.nativeLanguage}"
    },
    "characters": [
      {
        "id": "M",
        "name": "Name",
        "gender": "male",
        "ethnicity": "specific ethnicity",
        "role": "role in situation"
      },
      {
        "id": "F",
        "name": "Name",
        "gender": "female",
        "ethnicity": "specific ethnicity",
        "role": "role in situation"
      }
    ],
    "imagePrompt": "A warm illustration of [scene]. Two people interacting naturally."
  },
  "sentences": [
    {
      "id": 1,
      "speaker": "M or F",
      "target": "Full sentence in ${meta.targetLanguage}",
      "targetPronunciation": "Pronunciation in ${meta.nativeLanguage} script",
      "targetBlank": "Sentence with _______",
      "blankAnswer": "key word",
      "native": "Natural ${meta.nativeLanguage} translation",
      "words": [
        { "word": "vocabulary", "meaning": "meaning" }
      ]
    }
  ]
}

# Critical Rules
- **Alternate speakers naturally** (not strictly M-F-M-F, but balanced)
- Native translation must sound natural, not textbook-style.
- blankAnswer MUST appear in the target sentence.
- targetBlank MUST contain exactly "_______".
- Dialogue must flow naturally between speakers.

Generate ONLY the JSON output. No additional text.`;
}

/**
 * 나레이션 카테고리별 가이드
 */
function getNarrationCategoryGuide(category: Category): string {
  const guides: Partial<Record<Category, string>> = {
    story: `1인칭 회상 스토리. 개인적인 경험담을 부드럽게 전달.
- 감성적이고 공감되는 일상 이야기
- "I remember when...", "Last year, I..." 같은 회상 표현 사용
- 감정이 담긴 자연스러운 흐름`,

    news: `뉴스 앵커 스타일. 객관적이고 명확한 정보 전달.
- 사실 기반의 정보 전달
- 개인 감정 없이 객관적 톤
- "According to...", "Experts say...", "This trend..." 같은 뉴스 표현`,

    announcement: `안내 방송 스타일. 명확하고 친절한 정보 전달.
- 공항, 기차역, 매장 등의 안내 방송
- 정중하고 명확한 톤
- "Attention please...", "We would like to inform..." 같은 안내 표현`,

    lesson: `교육/설명 스타일. 유용한 정보를 쉽게 전달.
- 팁, 방법, 이유 등을 설명
- "Here's how to...", "The reason is...", "First, ... Second, ..." 같은 설명 표현
- 숫자나 단계를 활용한 구조적 설명`,

    fairytale: `동화 나레이션 스타일. 따뜻하고 교훈적인 이야기.
- "Once upon a time...", "One day..." 같은 동화 표현
- 캐릭터와 상황 묘사
- 교훈이나 메시지가 담긴 결말`,
  };

  return guides[category] || '';
}

/**
 * 대화 카테고리별 가이드
 */
function getDialogueCategoryGuide(category: Category): string {
  const guides: Partial<Record<Category, string>> = {
    conversation: `일상적인 두 사람의 대화. 공감되는 상황.
- 카페, 식당, 거리 등 일상 장소
- 자연스러운 질문과 대답
- 감정 표현과 리액션 포함`,

    travel_business: `여행/비즈니스 상황 대화. 실용적인 표현.
- 호텔, 공항, 레스토랑, 회의실 등
- 요청, 확인, 문제 해결 상황
- 정중하면서도 자연스러운 톤`,
  };

  return guides[category] || '';
}

/**
 * 나레이션 구조 가이드
 */
function getNarrationStructure(category: Category): string {
  const structures: Partial<Record<Category, string>> = {
    story: `- **도입 (1-2문장):** 상황 설정, 시간/장소 소개
- **전개 (중간):** 에피소드 진행, 감정 변화
- **마무리 (1-2문장):** 깨달음, 감정적 결론`,

    news: `- **헤드라인 (1-2문장):** 핵심 뉴스 요약
- **상세 내용 (중간):** 배경, 원인, 현황 설명
- **마무리 (1-2문장):** 전망, 영향, 전문가 의견`,

    announcement: `- **주의 환기 (1문장):** "Attention please" 등
- **핵심 안내 (중간):** 시간, 장소, 변경사항 등
- **마무리 (1-2문장):** 감사, 추가 안내`,

    lesson: `- **주제 소개 (1-2문장):** 오늘 배울 내용
- **본문 (중간):** 단계별 설명, 팁, 예시
- **마무리 (1-2문장):** 요약, 격려`,

    fairytale: `- **도입 (1-2문장):** "Once upon a time..." 배경 설정
- **전개 (중간):** 사건 진행, 갈등
- **결말 (1-2문장):** 해결, 교훈`,
  };

  return structures[category] || '';
}

/**
 * 카테고리별 스타일 문자열
 */
function getStyleForCategory(category: Category): string {
  const styles: Record<Category, string> = {
    story: 'Personal/Emotional/Reflective',
    conversation: 'Relatable/Natural',
    news: 'Informative/Objective',
    announcement: 'Clear/Polite/Informative',
    travel_business: 'Practical/Helpful',
    lesson: 'Educational/Friendly',
    fairytale: 'Warm/Whimsical/Moral',
  };
  return styles[category];
}

/**
 * Generate a prompt for regenerating a specific sentence
 */
export function generateSentencePrompt(
  config: ChannelConfig,
  sentenceId: number,
  speaker: 'M' | 'F',
  context: string
): string {
  const { meta, content } = config;

  return `Generate a single ${meta.targetLanguage} sentence for a language learning video.

## Context:
${context}

## Requirements:
- Sentence ID: ${sentenceId}
- Speaker: ${speaker === 'M' ? 'Male' : 'Female'}
- Difficulty: ${content.difficulty}
- Length: 5-12 words
- Include natural ${meta.nativeLanguage} translation
- Include targetPronunciation (pronunciation in ${meta.nativeLanguage} script)

## Output Format (JSON):
{
  "id": ${sentenceId},
  "speaker": "${speaker}",
  "target": "Full sentence",
  "targetPronunciation": "Pronunciation in ${meta.nativeLanguage} script",
  "targetBlank": "Sentence with _______",
  "blankAnswer": "key word",
  "native": "Translation",
  "words": [{ "word": "vocab", "meaning": "뜻" }]
}

Generate JSON only.`;
}

/**
 * Get category for a given day of week
 */
export function getCategoryForDay(date: Date): Category {
  const dayOfWeek = date.getDay();
  const categoryMap: Record<number, Category> = {
    0: 'fairytale', // Sunday
    1: 'story', // Monday
    2: 'conversation', // Tuesday
    3: 'news', // Wednesday
    4: 'announcement', // Thursday
    5: 'travel_business', // Friday
    6: 'lesson', // Saturday
  };
  return categoryMap[dayOfWeek];
}
