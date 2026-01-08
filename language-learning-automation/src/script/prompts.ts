import type { Category } from './types';
import type { ChannelConfig } from '../config/types';

// Category descriptions for prompt context
const categoryDescriptions: Record<Category, string> = {
  story: `일상 속 에피소드를 담은 짧은 이야기. 자연스러운 문장 흐름과 감정 표현에 초점.
예시 주제: 첫 출근 날, 친구와의 재회, 우연한 만남, 감동적인 순간`,

  conversation: `남녀가 주고받는 실전 대화. 질문과 응답 구조, 회화 패턴에 초점.
예시 주제: 카페에서 주문, 길 묻기, 쇼핑, 약속 잡기`,

  news: `간결하고 정보 중심의 뉴스 문장. 정확한 듣기와 어휘 확장에 초점.
예시 주제: 날씨 예보, 교통 정보, 지역 소식, 간단한 사건 보도`,

  announcement: `남녀가 광고, 안내문, 공지사항에 대해 대화하는 형식. 실생활에서 접하는 안내 정보를 대화로 주고받음.
예시: "백화점 세일 한대요" "언제까지예요?", "공항 게이트 바뀌었대" "어디로요?", "엘리베이터 점검 중이래" "계단 써야겠네"
⚠️ CRITICAL: Must be a natural CONVERSATION between M and F discussing announcements, NOT a broadcast announcement itself!`,

  travel_business: `여행과 업무 상황에서 자주 쓰이는 실용 영어.
예시 주제: 호텔 체크인, 비행기 탑승, 회의 일정, 이메일 작성`,

  lesson: `다양한 상식을 설명하는 영어 문장. 지식 기반의 설명형 영어에 초점.
예시 주제: 과학 상식, 역사 이야기, 문화 설명, 생활 팁`,

  fairytale: `명작 동화를 들으며 교훈과 함께 영어 표현을 익히는 편안한 청취.
예시 주제: 이솝 우화, 전래 동화, 교훈적인 이야기`,
};

/**
 * Generate the main prompt for script generation
 */
export function generateScriptPrompt(
  config: ChannelConfig,
  category: Category,
  topic?: string
): string {
  const { meta, content } = config;
  const categoryDesc = categoryDescriptions[category];

  return `# Role
Act as a world-class ESL instructor and a native ${meta.targetLanguage} screenwriter.

# Task
Create a realistic ${meta.targetLanguage} conversation script for a language learning video.

## Category: ${category}
${categoryDesc}

## Topic: ${topic || 'Choose an engaging topic that fits the category'}

# Constraints (Content)
1. **Level:** CEFR B1~B2 (Intermediate). Natural, idiomatic, but clear enough for learners.
2. **Characters:** Two characters (M = Male, F = Female). Alternate speakers starting with M.
3. **Length:** Exactly ${content.sentenceCount} sentences total.
4. **Difficulty:** ${content.difficulty}
5. **Sentence Length:** 10-20 words in ${meta.targetLanguage}
6. **Key Expressions:** Use phrasal verbs and collocations native speakers actually use
   - Instead of "wait" → use "hang on", "hold on"
   - Instead of "understand" → use "get it", "catch on"
   - Instead of "leave" → use "head out", "take off"
7. **Dialogue Flow:** Make it natural with questions, answers, reactions, and follow-ups
8. **Blank Logic:** For each sentence, select ONE key word (verb, noun, adjective) crucial for understanding

# Output Format (JSON)
{
  "metadata": {
    "topic": "specific topic description",
    "style": "casual/formal/narrative",
    "title": {
      "target": "Title in ${meta.targetLanguage}",
      "native": "Title in ${meta.nativeLanguage}"
    }
  },
  "sentences": [
    {
      "id": 1,
      "speaker": "M",
      "target": "Full sentence in ${meta.targetLanguage}",
      "targetBlank": "Sentence with _______ replacing the key word",
      "blankAnswer": "the key word that was replaced",
      "native": "Natural translation in ${meta.nativeLanguage}",
      "words": [
        { "word": "vocabulary", "meaning": "뜻" },
        { "word": "word2", "meaning": "뜻2" }
      ]
    }
  ]
}

# Critical Rules
- The blankAnswer MUST appear in the target sentence
- The targetBlank MUST contain exactly "_______" (7 underscores) where blankAnswer was
- Words array should include the blankAnswer and 2-4 other important vocabulary
- Make the conversation feel like a real drama scene
- Use contractions (I'm, don't, can't) for natural speech
- Include filler words occasionally (well, you know, I mean) for authenticity

Generate ONLY the JSON output, no additional text.`;
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
- Length: 10-20 words
- Include natural ${meta.nativeLanguage} translation
- Identify one key vocabulary word as blank word
- Provide 3-5 word meanings

## Output Format (JSON):
{
  "id": ${sentenceId},
  "speaker": "${speaker}",
  "target": "Full sentence",
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
