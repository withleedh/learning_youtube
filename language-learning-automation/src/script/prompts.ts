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
Act as a **skilled screenwriter** who creates relatable, slice-of-life dialogues for language learners.

# Task
Create a natural ${meta.targetLanguage} conversation script that feels like a **real moment from everyday life**.
The goal is to make learners think: "I've been in this situation before!" or "I might need to say this someday."

## Category: ${category}
${categoryDesc}

## Topic: ${topic || 'Choose a specific, relatable everyday situation from the category'}

# Constraints (Content)
1. **Level:** CEFR A2~B1 (Pre-Intermediate). Easy but natural.
2. **Characters:** Two characters (M = Male, F = Female) in a realistic situation.
3. **Length:** Exactly ${content.sentenceCount} sentences total.
4. **Difficulty:** ${content.difficulty}
5. **Sentence Length:** 5-12 words (Keep it conversational).

6. **Tone & Style:**
   - Natural, relatable, engaging
   - Can be: helpful, curious, relieved, slightly frustrated then resolved, encouraging
   - **Avoid:** Overly sweet/romantic tone, dry transactional exchanges, textbook-style dialogues

7. **Story Arc (Make it feel like a mini-story):**
   - **Hook (1-2 sentences):** Start with a specific situation or small problem (NOT generic greetings)
     Examples: "Excuse me, is this seat taken?", "Oh no, I think I left my wallet...", "This line is so long today."
   - **Development (middle):** Natural back-and-forth where characters actually respond to each other
   - **Resolution (last 2-3 sentences):** A satisfying ending with:
     - Small relief: "Phew!", "That was close."
     - Achievement: "I did it!", "It worked!"
     - Gratitude: "Thanks, you saved me."
     - Encouragement: "You've got this!", "Good luck!"

8. **Natural Dialogue Techniques:**
   - Softeners: "Actually,", "Well,", "I think...", "Maybe..."
   - Reactions: "Oh!", "Really?", "Wait, what?", "That's a relief."
   - Hesitation: "Um...", "Let me see...", "Hmm..."
   - Follow-up questions (shows active listening): "How long?", "Which one?", "Are you sure?"

9. **Characters Must:**
   - Actually RESPOND to what the other person says (not just take turns talking)
   - Show realistic reactions to the situation
   - Have a clear reason to be talking to each other

# Good vs Bad Examples
✅ GOOD Hook: "Excuse me, do you know if this bus goes downtown?"
❌ BAD Hook: "Hello! How are you today?"

✅ GOOD Ending: "Oh, that's my stop. Thanks for the help!" / "No problem. Have a good one!"
❌ BAD Ending: "Goodbye." / "Goodbye."

✅ GOOD Reaction: "Wait, it's buy one get one free? I didn't see that!"
❌ BAD Reaction: "That is good information. Thank you."

# Output Format (JSON)
{
  "metadata": {
    "topic": "Specific situation (e.g., 'Helping a stranger find the right bus stop')",
    "style": "Relatable/Slice-of-life/Natural",
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
        "role": "specific role in this situation (e.g., local commuter)"
      },
      {
        "id": "F",
        "name": "Name",
        "gender": "female",
        "ethnicity": "specific ethnicity",
        "role": "specific role in this situation (e.g., tourist asking for directions)"
      }
    ],
    "imagePrompt": "A realistic, warm illustration of [specific scene]. Show [specific action/interaction]. Natural lighting, everyday setting, expressive faces."
  },
  "sentences": [
    {
      "id": 1,
      "speaker": "M",
      "target": "Full sentence in ${meta.targetLanguage}",
      "targetPronunciation": "Pronunciation in ${meta.nativeLanguage} script",
      "targetBlank": "Sentence with _______",
      "blankAnswer": "key word",
      "native": "Natural spoken ${meta.nativeLanguage} (NOT literal translation)",
      "words": [
        { "word": "vocabulary", "meaning": "meaning" }
      ]
    }
  ]
}

# Critical Rules
- **Native translation:** Must sound like how people actually talk, not textbook translation.
  ❌ "나는 커피를 원합니다" → ✅ "커피 주세요" or "커피 한 잔 할게요"
- The blankAnswer MUST appear in the target sentence.
- targetBlank MUST contain exactly "_______".
- Words array: Include blankAnswer + 1-2 useful words from the sentence.
- **Dialogue must flow:** Each line should connect to the previous one.
- **Ending:** Must feel complete and satisfying (not abrupt).

Generate ONLY the JSON output. No additional text.`;
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
