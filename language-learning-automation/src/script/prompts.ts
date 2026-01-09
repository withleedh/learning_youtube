import type { Category } from './types';
import type { ChannelConfig } from '../config/types';

// Category descriptions for prompt context (초중급 레벨)
const categoryDescriptions: Record<Category, string> = {
  story: `짧고 쉬운 일상 에피소드. 간단한 문장으로 자연스러운 흐름.
예시 주제: 처음 해외여행 갔던 날, 새 친구를 사귄 이야기, 맛있는 음식을 먹은 날`,

  conversation: `두 사람의 간단한 실전 대화. 기본 요청과 응답, 간단한 옵션 선택.
예시 주제: 카페에서 음료 주문, 식당에서 메뉴 고르기, 가게에서 물건 사기`,

  news: `쉽고 간결한 뉴스 문장. 일상적인 정보 전달.
예시 주제: 오늘 날씨, 주말 행사 안내, 새로 오픈한 가게 소식`,

  announcement: `간단한 안내에 대해 두 사람이 대화하는 형식. 쉬운 정보 교환.
예시: "비행기 탑승 시작한대요" "몇 번 게이트예요?", "세일 한대요" "언제까지예요?"
⚠️ CRITICAL: Must be a natural CONVERSATION between M and F discussing announcements, NOT a broadcast announcement itself!`,

  travel_business: `여행 기본 상황. 간단한 요청과 응답.
예시 주제: 호텔 체크인, 택시 타기, 길 물어보기, 식당 예약`,

  lesson: `쉬운 생활 상식이나 팁을 설명하는 문장.
예시 주제: 감기 예방법, 여행 짐 싸는 팁, 간단한 요리법`,

  fairytale: `짧고 쉬운 동화. 간단한 문장으로 이야기 전달.
예시 주제: 토끼와 거북이, 해와 바람, 개미와 베짱이`,
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
Act as a friendly ESL instructor creating content for pre-intermediate learners.

# Task
Create a simple, practical ${meta.targetLanguage} conversation script for a language learning video.

## Category: ${category}
${categoryDesc}

## Topic: ${topic || 'Choose an engaging topic that fits the category'}

# Constraints (Content)
1. **Level:** CEFR A2~B1 (초중급/Pre-Intermediate). Clear, practical, easy to follow.
2. **Characters:** Two characters (M = Male, F = Female). Alternate speakers starting with M.
3. **Length:** Exactly ${content.sentenceCount} sentences total.
4. **Difficulty:** ${content.difficulty}
5. **Sentence Length:** 5-11 words in ${meta.targetLanguage} (keep it short and clear)
6. **Key Expressions:** Use common, practical expressions learners can use right away
   - Basic requests: "Can I have...", "I'd like...", "Could you..."
   - Simple questions: "How much is...", "Where is...", "What time..."
   - Common responses: "Sure", "No problem", "Here you go"
7. **Dialogue Flow:** 
   - Basic request + simple options/choices
   - NO complex problem-solving or conflicts
   - Natural but simple conversation
8. **Blank Logic:** For each sentence, select ONE key word (verb, noun, adjective) crucial for understanding

# Output Format (JSON)
{
  "metadata": {
    "topic": "specific topic description",
    "style": "casual/formal/narrative",
    "title": {
      "target": "Title in ${meta.targetLanguage}",
      "native": "Title in ${meta.nativeLanguage}"
    },
    "characters": [
      {
        "id": "M",
        "name": "Character name (e.g., James, Minho)",
        "gender": "male",
        "ethnicity": "e.g., American, Korean, British",
        "role": "e.g., customer, barista, teacher"
      },
      {
        "id": "F",
        "name": "Character name (e.g., Sarah, Yuna)",
        "gender": "female",
        "ethnicity": "e.g., American, Korean, British",
        "role": "e.g., customer, barista, teacher"
      }
    ],
    "imagePrompt": "A warm illustration of [scene description incorporating the characters above - use their exact gender, ethnicity, and role]. Be specific about the setting and character appearances."
  },
  "sentences": [
    {
      "id": 1,
      "speaker": "M",
      "target": "Full sentence in ${meta.targetLanguage}",
      "targetPronunciation": "Pronunciation written in ${meta.nativeLanguage} script (e.g., if target is English and native is Korean: 'Hello' -> '헬로우', if target is Korean and native is English: '안녕' -> 'annyeong')",
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
- targetPronunciation: Write how to pronounce the target sentence using ${meta.nativeLanguage} characters
- Words array should include the blankAnswer and 2-3 other important vocabulary
- Keep sentences SHORT (5-11 words) - this is crucial for beginners
- Use contractions (I'm, don't, can't) for natural speech
- Avoid complex grammar (relative clauses, passive voice, conditionals)
- characters: Define BOTH M and F characters with realistic names, specific ethnicity (not just "Asian"), and their role in the dialogue
- imagePrompt: MUST reference the characters array - describe the exact characters (gender, ethnicity, role) in the scene

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
- Length: 5-11 words (keep it short and clear for pre-intermediate learners)
- Include natural ${meta.nativeLanguage} translation
- Include targetPronunciation (pronunciation in ${meta.nativeLanguage} script)
- Identify one key vocabulary word as blank word
- Provide 2-3 word meanings

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
