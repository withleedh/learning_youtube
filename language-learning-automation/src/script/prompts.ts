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

  const fewShotExample = getNarrationFewShotExample(category);
  const categoryGuide = getNarrationCategoryGuide(category);
  const blankWordGuide = getBlankWordGuide();
  const imagePromptGuide = getImagePromptGuide();

  return `# Role
You are a skilled content writer creating ${meta.targetLanguage} narration scripts for language learning videos.

# Task
Create a ${meta.targetLanguage} **narration script** (single speaker) for a language learning video.
Format: ${formatConfig.description}

## Category: ${category}
${categoryGuide}

## Topic: ${topic || 'Choose a specific, engaging topic'}

# Few-Shot Example
${fewShotExample}

# Constraints
1. **Level:** CEFR A2~B1 (Pre-Intermediate). Natural but accessible.
2. **Speaker:** Single narrator (${speaker} = ${speakerGender})
3. **Length:** Exactly ${content.sentenceCount} sentences total.
4. **Sentence Length:** 5-15 words per sentence. Short and clear.
5. **Difficulty:** ${content.difficulty}

# Structure
${getNarrationStructure(category)}

${blankWordGuide}

${imagePromptGuide}

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
    "imagePrompt": "Pixar/Disney style 3D animation scene description..."
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
      ],
      "wrongAnswers": [
        "Similar but wrong sentence 1",
        "Similar but wrong sentence 2"
      ]
    }
  ]
}

# Critical Rules
- **ALL sentences must have speaker: "${speaker}"**
- Native translation must sound natural and conversational, not textbook-style.
- blankAnswer MUST appear exactly in the target sentence.
- targetBlank MUST contain exactly "_______" (7 underscores).
- Words array: Include blankAnswer + 1-2 useful vocabulary words.
- wrongAnswers: Include 2 similar-sounding but incorrect sentences for listening quiz.

Generate ONLY the JSON output. No additional text.`;
}

/**
 * 대화 형식 프롬프트 (conversation, travel_business)
 */
function generateDialoguePrompt(config: ChannelConfig, category: Category, topic?: string): string {
  const { meta, content } = config;
  const formatConfig = CATEGORY_SCRIPT_FORMAT[category];

  const fewShotExample = getDialogueFewShotExample(category);
  const categoryGuide = getDialogueCategoryGuide(category);
  const blankWordGuide = getBlankWordGuide();
  const imagePromptGuide = getImagePromptGuide();

  return `# Role
You are a skilled screenwriter creating natural ${meta.targetLanguage} dialogue scripts for language learning videos.

# Task
Create a natural ${meta.targetLanguage} **conversation script** (two speakers) for a language learning video.
Format: ${formatConfig.description}

## Category: ${category}
${categoryGuide}

## Topic: ${topic || 'Choose a specific, relatable everyday situation'}

# Few-Shot Example
${fewShotExample}

# Constraints
1. **Level:** CEFR A2~B1 (Pre-Intermediate). Natural but accessible.
2. **Characters:** Two characters (M = Male, F = Female)
3. **Length:** Exactly ${content.sentenceCount} sentences total.
4. **Sentence Length:** 5-12 words per sentence. Short and punchy.
5. **Difficulty:** ${content.difficulty}

# Dialogue Guidelines
- **Hook:** Start with a specific situation (NOT generic greetings like "Hello, how are you?")
- **Flow:** Characters must RESPOND to each other naturally, building on what was said
- **Reactions:** Include natural reactions: "Oh!", "Really?", "That's great!", "I see."
- **Ending:** Satisfying conclusion (agreement, gratitude, relief, or encouragement)

# Natural Dialogue Techniques
- Softeners: "Actually,", "Well,", "I think...", "Maybe..."
- Reactions: "Oh!", "Really?", "That's great!", "I see.", "Wow!"
- Hesitation: "Um...", "Let me see...", "Hmm..."
- Contractions: Use "I'm", "don't", "can't", "it's" for natural speech

${blankWordGuide}

${imagePromptGuide}

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
    "imagePrompt": "Pixar/Disney style 3D animation scene description..."
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
      ],
      "wrongAnswers": [
        "Similar but wrong sentence 1",
        "Similar but wrong sentence 2"
      ]
    }
  ]
}

# Critical Rules
- **Alternate speakers naturally** (not strictly M-F-M-F, but balanced overall)
- Native translation must sound natural and conversational, not textbook-style.
- blankAnswer MUST appear exactly in the target sentence.
- targetBlank MUST contain exactly "_______" (7 underscores).
- Dialogue must flow naturally - each line should connect to the previous one.
- wrongAnswers: Include 2 similar-sounding but incorrect sentences for listening quiz.

Generate ONLY the JSON output. No additional text.`;
}

/**
 * 나레이션 카테고리별 가이드
 */
function getNarrationCategoryGuide(category: Category): string {
  const guides: Partial<Record<Category, string>> = {
    story: `**1인칭 회상 스토리** - 개인적인 경험담을 부드럽게 전달
- 감성적이고 공감되는 일상 이야기
- "I remember when...", "Last year, I...", "One day, I got a call..." 같은 회상 표현
- 감정 변화가 있는 자연스러운 흐름
- 마지막에 깨달음이나 감동적인 결말`,

    news: `**뉴스 앵커 스타일** - 객관적이고 명확한 정보 전달
- 사실 기반의 정보 전달 (개인 감정 없이)
- 3인칭 시점으로 객관적 보도
- "Korean food is becoming popular...", "This trend has grown...", "Experts say..."
- 통계, 전문가 의견, 현황 설명 포함`,

    announcement: `**안내 방송 스타일** - 명확하고 친절한 정보 전달
- 공항, 기차역, 매장, 아파트 등의 안내 방송
- 정중하고 명확한 톤
- "Attention please...", "We would like to inform...", "Please note that..."
- 시간, 장소, 변경사항 등 구체적 정보 포함`,

    lesson: `**교육/설명 스타일** - 유용한 정보를 쉽게 전달
- 팁, 방법, 이유 등을 단계별로 설명
- "Today I will explain...", "The first habit is...", "The reason is..."
- 숫자나 단계를 활용한 구조적 설명 (First, Second, Third...)
- 실용적인 조언과 예시 포함`,

    fairytale: `**동화 나레이션 스타일** - 따뜻하고 교훈적인 이야기
- "Once upon a time...", "There was a quiet garden...", "One day..."
- 3인칭 시점의 서사적 스토리텔링
- 캐릭터와 상황 묘사가 풍부함
- 교훈이나 메시지가 담긴 결말`,
  };

  return guides[category] || '';
}

/**
 * 대화 카테고리별 가이드
 */
function getDialogueCategoryGuide(category: Category): string {
  const guides: Partial<Record<Category, string>> = {
    conversation: `**일상적인 두 사람의 대화** - 공감되는 상황
- 카페, 식당, 거리, 집 등 일상 장소
- 자연스러운 질문과 대답, 리액션
- 감정 표현 포함 ("I was really excited", "That's disappointing")
- 서로의 말에 반응하며 대화 진행`,

    travel_business: `**여행/비즈니스 상황 대화** - 실용적인 표현
- 호텔, 공항, 레스토랑, 회의실, 상점 등
- 요청, 확인, 문제 해결 상황
- 정중하면서도 자연스러운 톤
- 실제 상황에서 바로 쓸 수 있는 표현`,
  };

  return guides[category] || '';
}

/**
 * 나레이션 Few-Shot 예시
 */
function getNarrationFewShotExample(category: Category): string {
  const examples: Partial<Record<Category, string>> = {
    story: `**Topic: 어릴 때 살던 집에 방문하게 됐어요**

Sentence flow example:
1. "I work as an electronics repairman."
2. "One day, I got a call to fix a TV."
3. "The address seemed familiar."
4. "When I arrived, I stopped in front of the house."
5. "It was the house where I lived as a child."
6. "I stood there for a moment."
7. "Many old memories came flooding back."
...
(감정적 전개 후 감동적인 결말)`,

    news: `**Topic: 한국 음식이 해외에서 큰 인기예요**

Sentence flow example:
1. "Korean food is becoming very popular around the world."
2. "Many people in different countries enjoy Korean dishes."
3. "This trend has grown quickly in recent years."
4. "Korean food is known for its strong flavors."
5. "Spicy dishes are especially popular with young people."
6. "Kimchi is one of the most famous Korean foods."
7. "Many health experts say kimchi is good for the body."
...
(객관적 정보 전달, 개인 감정 없이)`,

    lesson: `**Topic: 돈이 줄줄 새는 사람들의 5가지 습관**

Sentence flow example:
1. "Some people work hard every day."
2. "But they still cannot save much money."
3. "This is not about luck or talent at all."
4. "Today I will explain common habits of people who fail to save."
5. "The first habit is spending money first and checking later."
6. "They buy something small without thinking."
7. "Then they check the bank app at night."
...
(숫자/단계별 구조적 설명)`,

    fairytale: `**Topic: 정원에서 가장 늦게 피어난 꽃**

Sentence flow example:
1. "There was a quiet and beautiful garden."
2. "Many kinds of flowers grew together in the garden."
3. "Spring came and warm sunlight touched the soil."
4. "Soon the season of blooming began."
5. "Some flowers bloomed very quickly."
6. "They opened wide and showed their bright colors."
7. "But one small flower did not bloom."
...
(서사적 전개 후 교훈적 결말)`,

    announcement: `**Topic: 비행기가 2시간 지연됐대요**

Sentence flow example:
1. "Attention all passengers."
2. "We have an important announcement."
3. "Flight KE123 to Tokyo has been delayed."
4. "The new departure time is 3:30 PM."
5. "We apologize for any inconvenience."
6. "Please remain in the waiting area."
7. "Free meal vouchers will be provided."
...
(명확한 정보 전달, 정중한 톤)`,
  };

  return examples[category] || '';
}

/**
 * 대화 Few-Shot 예시
 */
function getDialogueFewShotExample(category: Category): string {
  const examples: Partial<Record<Category, string>> = {
    conversation: `**Topic: 크리스마스에 약속 있으세요?**

Sentence flow example:
M: "Christmas is only a few days away."
M: "Do you have any plans for it?"
F: "Yes, I actually already had plans for Christmas."
M: "Oh, really? What were you planning to do?"
F: "I was planning to have a small party with my friends."
M: "That sounds fun. You must have been excited."
F: "Yes, I was really looking forward to meeting everyone."
M: "Did something change with your plan?"
F: "Yes, some of my friends had to work on Christmas."
M: "That's unfortunate. So the party was cancelled?"
F: "We ended up canceling it."
...
(자연스러운 대화 흐름, 서로 반응하며 진행)`,

    travel_business: `**Topic: 호텔에서 체크인을 해요**

Sentence flow example:
M: "Hello, I have a reservation under the name Kim."
F: "Let me check that for you."
F: "Yes, I found your reservation."
M: "Great. Is my room ready?"
F: "Yes, your room is on the 5th floor."
M: "Does the room have a nice view?"
F: "Yes, you can see the ocean from your window."
M: "That sounds wonderful."
F: "Here is your room key."
M: "Thank you. What time is breakfast?"
F: "Breakfast is served from 7 to 10 AM."
...
(실용적 표현, 정중하면서 자연스러운 톤)`,
  };

  return examples[category] || '';
}

/**
 * blankWord 선택 가이드
 */
function getBlankWordGuide(): string {
  return `# BlankWord Selection Guide
Choose words that are:
- **Learnable:** Common, useful vocabulary (not too easy, not too hard)
- **Contextual:** Meaning is clear from the sentence context
- **Varied:** Mix of nouns, verbs, adjectives, adverbs

**Good Examples:**
- "I was really looking forward to _______ everyone." → "meeting"
- "The address seemed _______." → "familiar"
- "Many old memories came _______ back." → "flooding"
- "Korean food is _______ very popular." → "becoming"

**Bad Examples (avoid):**
- Articles: "a", "an", "the"
- Pronouns: "I", "you", "he", "she", "it"
- Basic verbs: "is", "are", "was", "were", "have", "has"
- Prepositions alone: "in", "on", "at", "to", "for"

# WrongAnswers Guide (for Listening Quiz Shorts)
Generate 2 wrong answer sentences that sound similar to the correct sentence.
These will be used in A/B/C multiple choice listening quizzes.

**Techniques for creating confusing wrong answers:**
1. **Contraction confusion:** "I'd like" → "I like", "can't" → "can", "won't" → "want"
2. **Tense confusion:** "liked" → "like", "wanted" → "want", "was" → "is"
3. **Similar sounds:** "hear" → "here", "their" → "there", "your" → "you're"
4. **Word order change:** Slightly rearrange words
5. **Similar word substitution:** "some" → "same", "then" → "than"

**Example:**
- Correct: "I'd like some coffee, please."
- Wrong 1: "I like some coffee, please." (contraction removed)
- Wrong 2: "I'd like same coffee, please." (similar sound word)

**Rules:**
- Wrong answers must be grammatically plausible (not obviously wrong)
- Wrong answers should sound similar when spoken quickly
- Each wrong answer should differ by only 1-2 words from the correct sentence`;
}

/**
 * imagePrompt 가이드
 */
function getImagePromptGuide(): string {
  return `# ImagePrompt Guide
Create a Pixar/Disney style 3D animation scene description.

**Structure:**
1. **Scene:** What is happening in the image
2. **Characters:** Who is in the scene (if any), their expressions
3. **Setting:** Where it takes place, time of day
4. **Mood:** Warm, cozy, exciting, peaceful, etc.
5. **Colors:** Soft pastels, warm tones, vibrant colors, etc.

**Example:**
"A cozy Korean restaurant interior with warm lighting. A young couple sits at a wooden table, enjoying samgyupsal. Steam rises from the grill between them. The woman laughs while the man flips the meat. Soft orange and yellow tones create a warm, inviting atmosphere. Pixar-style 3D animation with detailed textures."

**Rules:**
- NO text or words in the image
- NO logos or brand names
- Focus on emotion and atmosphere
- Keep it family-friendly`;
}

/**
 * 나레이션 구조 가이드
 */
function getNarrationStructure(category: Category): string {
  const structures: Partial<Record<Category, string>> = {
    story: `**Story Structure:**
- **도입 (1-3문장):** 상황 설정, 화자 소개, 시간/장소
- **전개 (중간):** 에피소드 진행, 감정 변화, 디테일
- **마무리 (2-3문장):** 깨달음, 감정적 결론, 여운`,

    news: `**News Structure:**
- **헤드라인 (1-2문장):** 핵심 뉴스 요약
- **상세 내용 (중간):** 배경, 원인, 현황, 통계
- **마무리 (1-2문장):** 전망, 영향, 전문가 의견`,

    announcement: `**Announcement Structure:**
- **주의 환기 (1문장):** "Attention please" 등
- **핵심 안내 (중간):** 시간, 장소, 변경사항, 이유
- **마무리 (1-2문장):** 사과, 감사, 추가 안내`,

    lesson: `**Lesson Structure:**
- **주제 소개 (2-3문장):** 오늘 배울 내용, 왜 중요한지
- **본문 (중간):** 단계별 설명 (First, Second, Third...), 예시
- **마무리 (1-2문장):** 요약, 격려, 실천 권유`,

    fairytale: `**Fairytale Structure:**
- **도입 (2-3문장):** "Once upon a time..." 배경 설정, 캐릭터 소개
- **전개 (중간):** 사건 진행, 갈등, 캐릭터 성장
- **결말 (2-3문장):** 해결, 교훈, 따뜻한 마무리`,
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
    lesson: 'Educational/Structured',
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

## BlankWord Rules:
- Choose a learnable, useful vocabulary word
- Avoid articles (a, an, the), pronouns (I, you, he), basic verbs (is, are, was)

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
