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
1. **Level:** CEFR A1~A2 (Pre-Intermediate). Natural but accessible.
2. **Speaker:** Single narrator (${speaker} = ${speakerGender})
3. **Length:** Exactly ${content.sentenceCount} sentences total.
4. **Sentence Length:** 5-15 words per sentence. Short and clear.
5. **Difficulty:** ${content.difficulty}

# Structure
${getNarrationStructure(category)}

${blankWordGuide}

${imagePromptGuide}

# CRITICAL: Character ID Rules
- The "characters" array must contain EXACTLY ONE character: the narrator
- The narrator's "id" MUST be "${speaker}" (not "Boy", "Girl", "Snowman", etc.)
- Story characters (like a boy, snowman, animal) are described in scenePrompts, NOT in the characters array
- The narrator is the voice reading the story, not a character IN the story

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
        "role": "narrator",
        "appearance": {
          "age": "early-30s",
          "hair": "specific hair color, length, style",
          "eyes": "eye color and shape",
          "skin": "skin tone",
          "build": "height and body type",
          "clothing": "specific outfit with colors",
          "distinctiveFeatures": "optional unique features"
        }
      }
    ],
    "scenePrompts": [
      {
        "sentenceRange": [1, 4],
        "setting": "scene location and environment details",
        "mood": "emotional tone",
        "characterActions": "what is happening in the scene (describe story characters here)",
        "cameraDirection": "Wide establishing shot, eye-level, slowly pushing in",
        "lighting": "lighting setup matching mood",
        "transition": "Fade in from black"
      },
      {
        "sentenceRange": [5, 8],
        "setting": "scene progression",
        "mood": "emotional tone",
        "characterActions": "what is happening",
        "cameraDirection": "Medium shot, slight low angle for engagement",
        "lighting": "consistent with scene 1",
        "transition": "Soft cut"
      },
      {
        "sentenceRange": [9, 12],
        "setting": "climax scene",
        "mood": "emotional tone",
        "characterActions": "key moment",
        "cameraDirection": "Close-up, eye-level, shallow depth of field",
        "lighting": "dramatic lighting for emotional peak",
        "transition": "Match cut"
      },
      {
        "sentenceRange": [13, 15],
        "setting": "resolution scene",
        "mood": "emotional tone",
        "characterActions": "ending moment",
        "cameraDirection": "Medium wide shot pulling back, uplifting angle",
        "lighting": "warm, optimistic lighting",
        "transition": "Slow fade out"
      }
    ]
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
      "wrongWordChoices": ["similar_word_1", "similar_word_2"]
    }
  ]
}

# Critical Rules
- **CHARACTERS ARRAY: Must contain EXACTLY 1 character with id="${speaker}" (the narrator)**
- **DO NOT add story characters (boy, snowman, animal, etc.) to the characters array**
- **ALL sentences must have speaker: "${speaker}"**
- Native translation must sound natural and conversational, not textbook-style.
- blankAnswer MUST appear exactly in the target sentence.
- targetBlank MUST contain exactly "_______" (7 underscores).
- Words array: Include blankAnswer + 1-2 useful vocabulary words.
- wrongWordChoices: Include 2 phonetically similar SINGLE WORDS (not sentences!) for word quiz.

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
1. **Level:** CEFR A1-A2 (Pre-Intermediate). Natural but accessible.
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
        "role": "role in situation",
        "appearance": {
          "age": "mid-20s to early-30s",
          "hair": "specific hair color, length, style",
          "eyes": "eye color and shape",
          "skin": "skin tone and features",
          "build": "height and body type",
          "clothing": "specific outfit with colors",
          "distinctiveFeatures": "optional unique features"
        }
      },
      {
        "id": "F",
        "name": "Name",
        "gender": "female",
        "ethnicity": "specific ethnicity",
        "role": "role in situation",
        "appearance": {
          "age": "mid-20s to early-30s",
          "hair": "specific hair color, length, style",
          "eyes": "eye color and shape",
          "skin": "skin tone and features",
          "build": "height and body type",
          "clothing": "specific outfit with colors",
          "distinctiveFeatures": "optional unique features"
        }
      }
    ],
    "scenePrompts": [
      {
        "sentenceRange": [1, 4],
        "setting": "location description with environment details",
        "mood": "emotional tone",
        "characterActions": "what characters are doing",
        "cameraDirection": "Wide establishing shot, eye-level, slowly pushing in to medium",
        "lighting": "lighting setup matching mood and location",
        "transition": "Fade in from black"
      },
      {
        "sentenceRange": [5, 8],
        "setting": "same location, different perspective",
        "mood": "emotional tone",
        "characterActions": "what characters are doing",
        "cameraDirection": "Over-the-shoulder shot, focusing on listener's reactions",
        "lighting": "consistent with scene 1",
        "transition": "Soft cut"
      },
      {
        "sentenceRange": [9, 12],
        "setting": "same location, intimate framing",
        "mood": "emotional tone",
        "characterActions": "what characters are doing",
        "cameraDirection": "Close-up two-shot, shallow depth of field, eye-level",
        "lighting": "warm key light for emotional connection",
        "transition": "Match cut on gesture"
      },
      {
        "sentenceRange": [13, 15],
        "setting": "same location, resolution framing",
        "mood": "emotional tone",
        "characterActions": "what characters are doing",
        "cameraDirection": "Medium shot pulling back, slight low angle for uplifting feel",
        "lighting": "bright, optimistic lighting",
        "transition": "Slow fade out"
      }
    ]
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
      "wrongWordChoices": ["similar_word_1", "similar_word_2"]
    }
  ]
}

# Critical Rules
- **Alternate speakers naturally** (not strictly M-F-M-F, but balanced overall)
- Native translation must sound natural and conversational, not textbook-style.
- blankAnswer MUST appear exactly in the target sentence.
- targetBlank MUST contain exactly "_______" (7 underscores).
- Dialogue must flow naturally - each line should connect to the previous one.
- wrongWordChoices: Include 2 phonetically similar SINGLE WORDS (not sentences!) for word quiz.

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

    news: `**흥미로운 뉴스 스토리텔링** - 놀라운 사실을 재미있게 전달
- 청자의 호기심을 자극하는 훅으로 시작
- "Guess what happened?", "You won't believe this!", "Here's something amazing..."
- 놀라운 사실, 반전, 드라마틱한 전개 포함
- 통계나 구체적 숫자로 신뢰감 부여
- 마지막에 "이게 우리에게 의미하는 것" 또는 감탄으로 마무리
- 딱딱한 뉴스 앵커가 아닌, 친구에게 신기한 소식 전하는 느낌`,

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

# WrongWordChoices Guide (CRITICAL for Shorts Quiz)
Generate 2 wrong SINGLE WORDS that sound similar to the blankAnswer.
These will be used in A/B/C word-choice quizzes in 5-second Shorts.

**IMPORTANT: wrongWordChoices must be SINGLE WORDS, not sentences!**

**Techniques for creating confusing wrong word choices:**
1. **Minimal pairs:** "walk" vs "work", "play" vs "pay", "right" vs "light"
2. **Similar sounds:** "hear" vs "here", "their" vs "there", "some" vs "same"
3. **Tense confusion:** "meet" vs "met", "like" vs "liked"
4. **Contraction parts:** "would" vs "wood", "can" vs "can't"
5. **Rhyming words:** "meeting" vs "eating" vs "beating"

**Examples:**
- blankAnswer: "meeting" → wrongWordChoices: ["eating", "beating"]
- blankAnswer: "familiar" → wrongWordChoices: ["similar", "family"]
- blankAnswer: "flooding" → wrongWordChoices: ["flowing", "floating"]
- blankAnswer: "becoming" → wrongWordChoices: ["coming", "beginning"]
- blankAnswer: "coffee" → wrongWordChoices: ["copy", "coughing"]

**Rules:**
- MUST be single words (1 word only, no phrases)
- Should sound phonetically similar to blankAnswer
- Should be real English words (not nonsense)
- Should be plausible in the sentence context`;
}

/**
 * imagePrompt 가이드
 */
function getImagePromptGuide(): string {
  return `# Character Appearance Guide (CRITICAL for consistency)
Each character MUST have detailed, specific appearance description.
This will be used to generate consistent character images across multiple scenes.

**Appearance fields (required for each character):**
- age: "mid-20s", "early-30s", "late-40s"
- hair: "short black hair, slightly wavy" (color + length + style)
- eyes: "warm brown almond-shaped eyes" (color + shape)
- skin: "light tan complexion with freckles" (tone + features)
- build: "average height, slim build" or "tall, athletic build"
- clothing: "navy blazer over white t-shirt, dark jeans" (specific items + colors)
- distinctiveFeatures: "small mole near left eye" (optional but helps consistency)

**Good Example:**
{
  "id": "F",
  "name": "Ji-min",
  "gender": "female",
  "ethnicity": "Korean",
  "role": "tourist",
  "appearance": {
    "age": "mid-20s",
    "hair": "long straight black hair with subtle brown highlights, worn down",
    "eyes": "dark brown almond-shaped eyes",
    "skin": "fair complexion with rosy cheeks",
    "build": "petite, 5'4, slim build",
    "clothing": "cream-colored cardigan over white blouse, light blue jeans, white sneakers",
    "distinctiveFeatures": "small silver hoop earrings"
  }
}

# Scene Prompts Guide (for multi-image generation)
Generate 4 scene prompts that divide the 15 sentences into visual segments.
Each scene should show the same characters in different moments of the conversation.

**Scene structure:**
- Scene 1 (sentences 1-4): Opening/Introduction
- Scene 2 (sentences 5-8): Development
- Scene 3 (sentences 9-12): Climax/Key moment
- Scene 4 (sentences 13-15): Resolution/Ending

**Scene prompt fields:**
- sentenceRange: [startId, endId] - which sentences this scene covers
- setting: specific location details (same location, different camera angle/focus)
- mood: emotional tone of this moment
- characterActions: what characters are doing in this specific moment
- cameraDirection: REQUIRED - cinematic camera instruction (see guide below)
- lighting: optional - lighting setup for mood
- transition: optional - how to transition to next scene

${getCinematicGuide()}

**Example scenePrompts with cinematic direction:**
[
  {
    "sentenceRange": [1, 4],
    "setting": "cozy grocery store checkout counter",
    "mood": "friendly, welcoming",
    "characterActions": "cashier greeting customer warmly, customer placing items on counter",
    "cameraDirection": "Wide establishing shot, eye-level, slowly pushing in to medium shot",
    "lighting": "Warm fluorescent store lighting with soft window light from entrance",
    "transition": "Fade in from black"
  },
  {
    "sentenceRange": [5, 8],
    "setting": "same checkout counter",
    "mood": "curious, engaged",
    "characterActions": "cashier leaning in with interest, customer looking thoughtful",
    "cameraDirection": "Over-the-shoulder shot from behind customer, focusing on cashier's expressive face",
    "lighting": "Same warm lighting, slight rim light on cashier's hair",
    "transition": "Soft cut"
  },
  {
    "sentenceRange": [9, 12],
    "setting": "same checkout counter",
    "mood": "warm, helpful",
    "characterActions": "cashier giving advice with a smile, customer nodding appreciatively",
    "cameraDirection": "Close-up two-shot, both faces in frame, shallow depth of field",
    "lighting": "Warm key light, gentle fill, creating intimate atmosphere",
    "transition": "Match cut on gesture"
  },
  {
    "sentenceRange": [13, 15],
    "setting": "checkout counter",
    "mood": "cheerful, satisfied",
    "characterActions": "customer handing card, both smiling warmly",
    "cameraDirection": "Medium shot pulling back slightly, showing completed transaction, slight low angle to feel uplifting",
    "lighting": "Bright, optimistic lighting with subtle lens flare from window",
    "transition": "Slow fade to white"
  }
]

**Rules:**
- Characters must wear the SAME clothing in all scenes
- Setting should be the SAME location (just different angles/focus)
- NO text or words in the image
- Keep it family-friendly
- VARY camera angles between scenes to create visual interest
- Use camera direction to emphasize emotional beats`;
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
 * 🎬 시네마틱 연출 가이드 (카메라, 조명, 전환)
 */
function getCinematicGuide(): string {
  return `# 🎬 Cinematic Direction Guide (CRITICAL for visual storytelling)

## Camera Shot Types (샷 사이즈)
Use these to control how much of the scene/character is visible:
- **Extreme Wide Shot (EWS)**: Shows vast environment, character is tiny - for establishing scale
- **Wide Shot (WS)**: Full body visible with environment - for establishing location
- **Medium Wide Shot (MWS)**: Knees up - shows body language + environment
- **Medium Shot (MS)**: Waist up - standard conversational shot
- **Medium Close-up (MCU)**: Chest up - shows emotion while maintaining context
- **Close-up (CU)**: Face fills frame - for emotional intensity, reactions
- **Extreme Close-up (ECU)**: Single feature (eyes, hands) - for dramatic emphasis

## Camera Angles (카메라 앵글)
Use these to create psychological effects:
- **Eye-level**: Neutral, relatable - default for conversations
- **Low angle (looking up)**: Makes subject powerful, heroic, intimidating
- **High angle (looking down)**: Makes subject vulnerable, small, weak
- **Dutch angle (tilted)**: Creates unease, tension, disorientation
- **Bird's eye**: God-like perspective, shows patterns, isolation
- **Worm's eye**: Extreme low, dramatic, surreal

## Camera Movement (카메라 움직임)
- **Static**: No movement - calm, stable
- **Push in / Dolly in**: Moving closer - increasing tension or intimacy
- **Pull back / Dolly out**: Moving away - revealing context or isolation
- **Pan**: Horizontal rotation - following action or revealing space
- **Tilt**: Vertical rotation - showing height or revealing
- **Tracking / Following**: Moving with subject - engagement, journey
- **Crane up/down**: Vertical movement - dramatic reveals

## Composition Techniques (구도)
- **Rule of thirds**: Subject off-center for dynamic composition
- **Center frame**: Subject centered for power, confrontation
- **Leading lines**: Use environment to guide eye to subject
- **Frame within frame**: Doorways, windows to create depth
- **Negative space**: Empty space for isolation, contemplation
- **Shallow depth of field**: Blurred background for focus on subject
- **Deep focus**: Everything sharp for environmental storytelling

## Lighting Styles (조명)
- **High-key**: Bright, even lighting - happy, optimistic, safe
- **Low-key**: Dark with strong shadows - dramatic, mysterious, tense
- **Golden hour**: Warm, soft, romantic - nostalgia, warmth
- **Blue hour**: Cool, melancholic - sadness, reflection
- **Rim/Back light**: Silhouette effect - mystery, drama
- **Practical lighting**: Using in-scene lights (lamps, windows) - naturalistic
- **Chiaroscuro**: Strong contrast - dramatic, artistic

## Mood to Lighting Mapping (IMPORTANT - be specific!)
Instead of abstract moods, use concrete lighting descriptions:
- "happy" → "bright high-key lighting, warm golden tones, soft fill light"
- "quiet" → "soft moonlight, cool blue tones, gentle volumetric fog"
- "tense" → "harsh shadows, high contrast, cool desaturated tones"
- "magical" → "ethereal glow, sparkle particles, iridescent highlights"
- "sad" → "overcast diffused light, desaturated cool tones, soft shadows"
- "cozy" → "warm interior lighting, soft shadows, amber tones from practical lights"
- "dramatic" → "chiaroscuro lighting, strong contrast, theatrical shadows"
- "peaceful" → "soft diffused light, pastel tones, gentle ambient glow"

## Transition Types (전환)
- **Cut**: Instant change - standard, energetic
- **Fade in/out**: Gradual from/to black - beginning/ending, time passage
- **Dissolve/Cross-fade**: Overlapping images - connection, memory
- **Match cut**: Similar shapes/actions connect scenes - clever storytelling
- **Wipe**: One image pushes another - stylized, retro
- **Jump cut**: Same subject, time skip - urgency, disorientation

## Emotional Beat Mapping (감정별 연출)
Match camera work to emotional content:
- **Joy/Excitement**: Bright lighting, dynamic movement, medium shots
- **Sadness/Loss**: Low-key lighting, static or slow push-in, close-ups
- **Tension/Conflict**: Dutch angles, tight framing, quick cuts
- **Revelation/Surprise**: Push-in to close-up, dramatic lighting change
- **Intimacy/Connection**: Shallow DOF, warm lighting, two-shots
- **Isolation/Loneliness**: Wide shots with negative space, cold lighting
- **Power/Authority**: Low angle, center frame, strong lighting
- **Vulnerability**: High angle, off-center, soft lighting

## Scene-by-Scene Progression (장면별 진행)
Vary your shots to maintain visual interest:
1. **Opening**: Wide establishing shot → sets the stage
2. **Development**: Medium shots, over-shoulder → conversation flow
3. **Climax**: Close-ups, dynamic angles → emotional peak
4. **Resolution**: Pull back to medium/wide → closure, breathing room

**IMPORTANT**: Each scene MUST have a different camera setup to avoid visual monotony!`;
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
