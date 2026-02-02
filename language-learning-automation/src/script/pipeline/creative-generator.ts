/**
 * Creative Generator Module
 *
 * Phase 1 of the multi-step script pipeline.
 * Generates free-form screenplay scripts without JSON constraints.
 *
 * Role: "You are a Netflix screenwriter"
 * Focus: Story, emotion, engagement, natural dialogue
 * Output: Human-readable screenplay format
 *
 * @module creative-generator
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS, getGeminiApiKey } from '../../config/gemini';
import type { Category } from '../types';
import type { ChannelConfig } from '../../config/types';
import type { CreativeGeneratorInput, ScreenplayOutput } from './types';
import { CATEGORY_SCRIPT_FORMAT, isNarrationCategory, getDefaultSpeaker } from '../category-tones';

// ============================================================================
// Creative Generator Implementation
// ============================================================================

/**
 * Generate a creative screenplay script without JSON constraints.
 *
 * This is Phase 1 of the pipeline, focusing purely on creative writing.
 * The AI is instructed to act as a Netflix screenwriter and produce
 * engaging, emotionally resonant content.
 *
 * @param input - Creative generator input containing topic, category, config
 * @returns ScreenplayOutput with title, characters, scenes, and raw text
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */
export async function generateCreativeScript(
  input: CreativeGeneratorInput
): Promise<ScreenplayOutput> {
  const { topic, category, config, sentenceCount } = input;

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const prompt = buildCreativePrompt(topic, category, config, sentenceCount);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const rawText = response.text();

  // Parse the screenplay from raw text
  const screenplay = parseScreenplayFromRawText(rawText, category);

  return screenplay;
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Build the creative prompt for screenplay generation.
 *
 * Key principles:
 * - No JSON constraints
 * - Focus on emotional arc and engagement
 * - Natural conversational patterns
 * - Category-specific tone adaptation
 *
 * @param topic - The topic for the script
 * @param category - The category (story, conversation, etc.)
 * @param config - Channel configuration
 * @param sentenceCount - Target number of sentences
 * @returns The prompt string
 */
function buildCreativePrompt(
  topic: string,
  category: Category,
  config: ChannelConfig,
  sentenceCount: number
): string {
  const formatConfig = CATEGORY_SCRIPT_FORMAT[category];
  const isNarration = isNarrationCategory(category);

  const roleDescription = isNarration
    ? 'You are a Netflix screenwriter specializing in compelling first-person narratives.'
    : 'You are a Netflix screenwriter specializing in natural, engaging dialogue.';

  const categoryGuidance = getCategoryCreativeGuidance(category);
  const dialogueTechniques = getDialogueTechniques(isNarration);
  const emotionalArcGuidance = getEmotionalArcGuidance(category);

  return `# Role
${roleDescription}

Your job is to write an emotionally engaging screenplay that will captivate viewers.
Focus ONLY on storytelling - no JSON, no word counting, no educational formatting.

# Task
Write a ${config.meta.targetLanguage} screenplay for a language learning video.
Format: ${formatConfig.description}

## Topic: ${topic}

## Category: ${category}
${categoryGuidance}

# Creative Guidelines

## Emotional Arc
${emotionalArcGuidance}

## Dialogue Techniques
${dialogueTechniques}

## Natural Language Patterns
- Use contractions naturally: "I'm", "don't", "can't", "it's", "we're", "they're"
- Include reactions: "Oh!", "Really?", "Wow!", "That's great!", "I see."
- Add hesitations where natural: "Well...", "Um...", "Let me think..."
- Use softeners: "Actually,", "I think...", "Maybe...", "Kind of..."

${
  isNarration
    ? ''
    : `## ✅ Reference Example (High-Performing Competitor Script)
Topic: "건강 검진 결과가 나왔어요" (Health checkup results)

M: I got my checkup results yesterday.
F: Oh, really? I got mine last week.
M: How did your results look?
F: Most things were fine, but my blood pressure was high.
M: That sounds a bit serious.
F: Yes, the doctor told me to be careful. What did the doctor suggest?
M: He said I should exercise more and eat less salt.
F: That makes sense for high blood pressure.
M: Yes, and I need better sleep, too.
F: I see. My results were not great either.
M: Oh, what was the problem for you?
F: The dentist said I have a cavity.
M: That's too bad, but it's pretty common.
F: Yes, it hurts whenever I eat something.
M: Did you make an appointment yet?
F: Yes, I will see the dentist tomorrow.
M: That's good. Early treatment really helps.
F: I agree. I should be more careful about brushing my teeth.

**Notice the patterns:**
- Reactions: "Oh, really?", "That sounds...", "I see.", "That's too bad"
- Both share experiences: M talks about blood pressure, F talks about cavity
- Q&A flow: Questions lead to more sharing
- Empathy: "That makes sense", "I agree"
- Short sentences: 5-10 words each
`
}

# Output Format
Write in SCREENPLAY FORMAT with clear structure:

TITLE: [Your creative title]

CHARACTERS:
- M (Name): [Brief character description]
- F (Name): [Brief character description] (if dialogue format)

---

SCENE 1: [LOCATION] - [TIME OF DAY]
[Stage direction in brackets]

${isNarration ? 'M or F' : 'M/F'}: [Dialogue line]
   (emotion or beat)
   [Action description]

${isNarration ? '' : 'F/M: [Response line]\n   (reaction)'}

---

SCENE 2: [LOCATION] - [TIME OF DAY]
...continue...

# Constraints
1. Write approximately ${sentenceCount} dialogue lines total
2. ${isNarration ? 'Single narrator' : 'Two characters alternating naturally'}
3. Each line should be 5-15 words (natural sentence length)
4. Focus on emotional engagement, not educational structure
5. Make it feel like a real Netflix script, not a textbook

# Critical Rules
- DO NOT output JSON
- DO NOT count words or add educational annotations
- DO NOT include blank words or quiz elements
- FOCUS purely on compelling storytelling
- Use speaker labels: ${isNarration ? getDefaultSpeaker(category) + ':' : 'M: and F:'}

Write the screenplay now. Be creative, emotional, and engaging.`;
}

/**
 * Get category-specific creative guidance
 */
function getCategoryCreativeGuidance(category: Category): string {
  const guidance: Record<Category, string> = {
    story: `**Personal Story Style**
- First-person narrative with emotional depth
- Start with a hook that draws viewers in
- Build to an emotional climax
- End with reflection or realization
- Make it feel like sharing with a close friend`,

    conversation: `**Natural Conversation Style**
- Two people having a genuine conversation
- Start with a specific situation, not generic greetings
- Characters should react to each other naturally
- Include emotional beats and genuine responses
- End with resolution or connection`,

    news: `**Engaging News Story Style**
- Hook viewers with surprising or interesting facts
- Build curiosity throughout
- Use storytelling techniques even for factual content
- Make statistics feel personal and relatable
- End with impact or call to reflection`,

    announcement: `**Announcement with Personality**
- Clear information delivery with warmth
- Acknowledge the listener's situation
- Provide helpful context
- End with reassurance or next steps`,

    travel_business: `**Immersive Experience Style**
- Put viewers in the situation
- Include sensory details
- Natural problem-solving dialogue
- Cultural nuances and authentic interactions
- Satisfying resolution`,

    lesson: `**Engaging Educational Style**
- Hook with a relatable problem or question
- Build understanding step by step
- Use examples and analogies
- Make information feel personally relevant
- End with actionable insight`,

    fairytale: `**Magical Storytelling Style**
- Classic fairytale opening
- Rich descriptive language
- Clear character motivations
- Building tension and resolution
- Meaningful moral or lesson woven naturally`,
  };

  return guidance[category];
}

/**
 * Get dialogue techniques based on format
 */
function getDialogueTechniques(isNarration: boolean): string {
  if (isNarration) {
    return `**Narration Techniques**
- Vary sentence rhythm (short punchy + longer flowing)
- Use rhetorical questions to engage viewers
- Include sensory details
- Build emotional momentum
- Use pauses and beats for emphasis`;
  }

  return `**Dialogue Techniques (CRITICAL - Follow These Patterns)**

## 1. Reaction + Self-Experience Pattern (MUST USE)
When A shares something, B must:
1. React first ("Oh, really?", "That sounds...", "I see.")
2. Share their own related experience
3. Then ask a follow-up question

❌ BAD (No reaction, no self-experience):
M: I got my test results yesterday.
F: What did the doctor say?

✅ GOOD (Reaction + Self-experience + Question):
M: I got my test results yesterday.
F: Oh, really? I got mine last week. How did yours look?

## 2. Q&A Chain Pattern
Every 2-3 exchanges should have a question that invites more sharing:
- "What about you?"
- "How did that go?"
- "What did they say?"
- "Did you try...?"

## 3. Empathy Responses (Use 3-4 times per script)
- "That makes sense."
- "I know how you feel."
- "That's too bad, but..."
- "I agree."
- "That sounds nice."

## 4. Both Characters Share (CRITICAL)
Both M and F must share their own experiences/opinions, not just one person talking and the other reacting.

## Example Flow:
M: [Shares situation]
F: [Reaction] + [Own experience] + [Question]
M: [Answer] + [More detail]
F: [Empathy] + [Advice or shared feeling]
M: [Agreement] + [Future action]
F: [Support] + [Positive ending]`;
}

/**
 * Get emotional arc guidance based on category
 */
function getEmotionalArcGuidance(category: Category): string {
  const arcs: Record<Category, string> = {
    story: `Hook → Build curiosity → Emotional peak → Reflection → Warm resolution`,
    conversation: `Situation setup → Exploration → Complication → Understanding → Connection`,
    news: `Surprising hook → Context building → Key revelation → Impact → Reflection`,
    announcement: `Attention → Information → Acknowledgment → Reassurance`,
    travel_business: `Situation → Challenge → Navigation → Success → Satisfaction`,
    lesson: `Problem/Question → Exploration → Insight → Application → Empowerment`,
    fairytale: `Once upon a time → Challenge → Journey → Climax → Moral/Resolution`,
  };

  return arcs[category];
}

// ============================================================================
// Screenplay Parsing (Basic)
// ============================================================================

/**
 * Parse screenplay from raw text output.
 *
 * This is a basic parser that extracts structure from the AI's screenplay output.
 * A more robust parser is in screenplay-parser.ts.
 *
 * @param rawText - The raw screenplay text from AI
 * @param category - The category for default speaker assignment
 * @returns Parsed ScreenplayOutput
 */
function parseScreenplayFromRawText(rawText: string, category: Category): ScreenplayOutput {
  // Extract title
  let title = 'Untitled';
  const titleMatch = rawText.match(/TITLE:\s*(.+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Extract characters
  const characters = extractCharacters(rawText, category);

  // Extract scenes
  const scenes = extractScenes(rawText);

  return {
    title,
    characters,
    scenes,
    rawText,
  };
}

/**
 * Extract characters from screenplay text
 */
function extractCharacters(
  rawText: string,
  category: Category
): Array<{ id: 'M' | 'F'; name: string; description: string }> {
  const characters: Array<{ id: 'M' | 'F'; name: string; description: string }> = [];

  // Look for CHARACTERS section
  const charactersMatch = rawText.match(/CHARACTERS:\s*([\s\S]*?)(?=---|\n\n\n|SCENE)/i);

  if (charactersMatch) {
    const characterSection = charactersMatch[1];

    // Match patterns like "- M (James): description" or "- F (Sarah): description"
    const mMatch = characterSection.match(/-\s*M\s*\(([^)]+)\):\s*(.+)/i);
    const fMatch = characterSection.match(/-\s*F\s*\(([^)]+)\):\s*(.+)/i);

    if (mMatch) {
      characters.push({
        id: 'M',
        name: mMatch[1].trim(),
        description: mMatch[2].trim(),
      });
    }

    if (fMatch) {
      characters.push({
        id: 'F',
        name: fMatch[1].trim(),
        description: fMatch[2].trim(),
      });
    }
  }

  // If no characters found, create defaults based on category
  if (characters.length === 0) {
    const isNarration = isNarrationCategory(category);
    const defaultSpeaker = getDefaultSpeaker(category);

    if (isNarration) {
      characters.push({
        id: defaultSpeaker,
        name: defaultSpeaker === 'M' ? 'James' : 'Sarah',
        description: 'Narrator',
      });
    } else {
      characters.push(
        { id: 'M', name: 'James', description: 'Male speaker' },
        { id: 'F', name: 'Sarah', description: 'Female speaker' }
      );
    }
  }

  return characters;
}

/**
 * Extract scenes from screenplay text
 */
function extractScenes(rawText: string): Array<{
  sceneNumber: number;
  setting: string;
  dialogue: Array<{
    speaker: 'M' | 'F' | 'NARRATOR';
    line: string;
    emotion?: string;
    action?: string;
  }>;
}> {
  const scenes: Array<{
    sceneNumber: number;
    setting: string;
    dialogue: Array<{
      speaker: 'M' | 'F' | 'NARRATOR';
      line: string;
      emotion?: string;
      action?: string;
    }>;
  }> = [];

  // Split by scene markers
  const sceneBlocks = rawText.split(/---+/).filter((block) => block.trim());

  let sceneNumber = 0;

  for (const block of sceneBlocks) {
    // Check if this block contains a scene header
    const sceneHeaderMatch = block.match(/SCENE\s*(\d+):\s*(.+?)(?:\n|$)/i);

    if (sceneHeaderMatch) {
      sceneNumber = parseInt(sceneHeaderMatch[1], 10);
      const setting = sceneHeaderMatch[2].trim();

      // Extract dialogue from this scene
      const dialogue = extractDialogueFromBlock(block);

      if (dialogue.length > 0) {
        scenes.push({
          sceneNumber,
          setting,
          dialogue,
        });
      }
    }
  }

  // If no scenes found, create a single scene with all dialogue
  if (scenes.length === 0) {
    const allDialogue = extractDialogueFromBlock(rawText);
    if (allDialogue.length > 0) {
      scenes.push({
        sceneNumber: 1,
        setting: 'Unknown location',
        dialogue: allDialogue,
      });
    }
  }

  return scenes;
}

/**
 * Extract dialogue lines from a text block
 */
function extractDialogueFromBlock(block: string): Array<{
  speaker: 'M' | 'F' | 'NARRATOR';
  line: string;
  emotion?: string;
  action?: string;
}> {
  const dialogue: Array<{
    speaker: 'M' | 'F' | 'NARRATOR';
    line: string;
    emotion?: string;
    action?: string;
  }> = [];

  const lines = block.split('\n');

  let currentSpeaker: 'M' | 'F' | 'NARRATOR' | null = null;
  let currentLine = '';
  let currentEmotion: string | undefined;
  let currentAction: string | undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for speaker label (M:, F:, NARRATOR:)
    const speakerMatch = trimmedLine.match(/^(M|F|NARRATOR):\s*(.*)$/i);

    if (speakerMatch) {
      // Save previous dialogue if exists
      if (currentSpeaker && currentLine) {
        dialogue.push({
          speaker: currentSpeaker,
          line: currentLine.trim(),
          emotion: currentEmotion,
          action: currentAction,
        });
      }

      // Start new dialogue
      currentSpeaker = speakerMatch[1].toUpperCase() as 'M' | 'F' | 'NARRATOR';
      currentLine = speakerMatch[2];
      currentEmotion = undefined;
      currentAction = undefined;
    } else if (currentSpeaker) {
      // Check for emotion annotation (emotion) or (beat)
      const emotionMatch = trimmedLine.match(/^\(([^)]+)\)$/);
      if (emotionMatch) {
        currentEmotion = emotionMatch[1];
        continue;
      }

      // Check for action annotation [action]
      const actionMatch = trimmedLine.match(/^\[([^\]]+)\]$/);
      if (actionMatch) {
        currentAction = actionMatch[1];
        continue;
      }

      // Continue current dialogue line
      if (trimmedLine && !trimmedLine.startsWith('SCENE') && !trimmedLine.startsWith('---')) {
        currentLine += ' ' + trimmedLine;
      }
    }
  }

  // Don't forget the last dialogue
  if (currentSpeaker && currentLine) {
    dialogue.push({
      speaker: currentSpeaker,
      line: currentLine.trim(),
      emotion: currentEmotion,
      action: currentAction,
    });
  }

  return dialogue;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if the output is in valid screenplay format (not JSON)
 *
 * @param text - The raw text to validate
 * @returns true if it's screenplay format, false if it's JSON
 */
export function isScreenplayFormat(text: string): boolean {
  // Check if it's NOT JSON
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return false; // It's valid JSON, not screenplay
    } catch {
      // Not valid JSON, continue checking
    }
  }

  // Check for screenplay markers
  const hasTitle = /TITLE:/i.test(text);
  const hasSpeakerLabels = /\b(M|F|NARRATOR):/i.test(text);
  const hasSceneMarkers = /SCENE\s*\d+/i.test(text) || /---/.test(text);

  // Must have speaker labels at minimum
  return hasSpeakerLabels && (hasTitle || hasSceneMarkers);
}

/**
 * Check if dialogue contains natural patterns (contractions, reactions)
 *
 * @param text - The screenplay text to check
 * @returns true if natural patterns are found
 */
export function hasNaturalDialoguePatterns(text: string): boolean {
  // Common contractions
  const contractions = [
    "I'm",
    "don't",
    "can't",
    "it's",
    "we're",
    "they're",
    "isn't",
    "aren't",
    "won't",
    "wouldn't",
    "couldn't",
    "shouldn't",
    "I've",
    "you've",
    "we've",
    "they've",
    "I'll",
    "you'll",
    "we'll",
    "they'll",
    "that's",
    "what's",
    "there's",
    "here's",
    "let's",
    "didn't",
    "wasn't",
    "weren't",
    "haven't",
    "hasn't",
    "hadn't",
  ];

  // Reaction words
  const reactions = [
    'Oh!',
    'Really?',
    'Wow!',
    "That's great!",
    'I see.',
    'Amazing!',
    'Incredible!',
    'Oh no!',
    'Oh my!',
    'Hmm',
    'Well...',
    'Actually,',
    'Um...',
    'Uh...',
  ];

  const lowerText = text.toLowerCase();

  // Check for contractions (case-insensitive)
  const hasContraction = contractions.some((c) => lowerText.includes(c.toLowerCase()));

  // Check for reactions (case-insensitive for the word part)
  const hasReaction = reactions.some((r) => {
    const reactionWord = r.replace(/[!?,.]+ $/, '').toLowerCase();
    return lowerText.includes(reactionWord);
  });

  return hasContraction || hasReaction;
}
