/**
 * Creative Generator Module
 *
 * Phase 1 of the multi-step script pipeline.
 * Generates structured JSON screenplay with scenes and visual directions.
 *
 * @module creative-generator
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
 * Generate a creative screenplay script in JSON format.
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

  // Parse JSON from response
  const screenplay = parseJsonScreenplay(rawText, category);

  return screenplay;
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildCreativePrompt(
  topic: string,
  category: Category,
  config: ChannelConfig,
  sentenceCount: number
): string {
  const formatConfig = CATEGORY_SCRIPT_FORMAT[category];
  const isNarration = isNarrationCategory(category);

  if (isNarration) {
    return buildNarrationPrompt(topic, category, config, sentenceCount, formatConfig);
  } else {
    return buildConversationPrompt(topic, category, config, sentenceCount, formatConfig);
  }
}

/**
 * Build prompt for narration/story categories - JSON output
 */
function buildNarrationPrompt(
  topic: string,
  category: Category,
  config: ChannelConfig,
  sentenceCount: number,
  formatConfig: { description: string }
): string {
  const categoryGuidance = getCategoryCreativeGuidance(category);
  const defaultSpeaker = getDefaultSpeaker(category);
  const recommendedScenes = Math.max(3, Math.min(6, Math.ceil(sentenceCount / 4)));

  return `# Role
You are a warm storyteller creating a short film script for language learners.

# Task
Create a ${config.meta.targetLanguage} narration script in JSON format.
Topic: ${topic}
Category: ${category} - ${categoryGuidance}

# Language Level: A1-A2 (Beginner)
- Simple sentences (5-10 words)
- Common vocabulary only
- Use contractions naturally ("I'm", "don't", "can't")
- NO idioms, NO complex grammar

# Reference Style (match this tone):
"I grew up in a small and quiet town.
My childhood was not easy at all.
I did not have a father at home.
I lived only with my mother."

# Output JSON Schema
{
  "title": "Simple English Title",
  "characters": [
    {
      "id": "${defaultSpeaker}",
      "name": "Character Name",
      "description": "Brief description"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "setting": "INT. LOCATION - TIME",
      "visual": {
        "location": "Detailed location description",
        "timeOfDay": "MORNING/DAY/EVENING/NIGHT",
        "mood": "warm/nostalgic/hopeful/etc",
        "lighting": "Lighting description",
        "characterActions": "What we see happening"
      },
      "dialogue": [
        {
          "speaker": "${defaultSpeaker}",
          "line": "Simple sentence here.",
          "emotion": "reflective"
        }
      ]
    }
  ]
}

# Requirements
1. Create ${recommendedScenes} scenes
2. Total ${sentenceCount} dialogue lines across all scenes
3. Each scene has 3-5 dialogue lines
4. Single narrator (${defaultSpeaker})
5. Each line: 5-10 words, simple vocabulary
6. Include visual directions for each scene

# Example Output
{
  "title": "A Summer Memory",
  "characters": [
    {"id": "${defaultSpeaker}", "name": "Sarah", "description": "A woman remembering her childhood"}
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "setting": "EXT. COUNTRYSIDE - DAY",
      "visual": {
        "location": "A small village with green fields",
        "timeOfDay": "DAY",
        "mood": "nostalgic, warm",
        "lighting": "Bright summer sunlight",
        "characterActions": "A young girl runs through tall grass"
      },
      "dialogue": [
        {"speaker": "${defaultSpeaker}", "line": "I remember that summer very well.", "emotion": "nostalgic"},
        {"speaker": "${defaultSpeaker}", "line": "The sun was warm on my face.", "emotion": "warm"},
        {"speaker": "${defaultSpeaker}", "line": "I was only seven years old.", "emotion": "reflective"}
      ]
    }
  ]
}

Output ONLY valid JSON. No markdown, no explanation.`;
}

/**
 * Build prompt for conversation categories - JSON output
 */
function buildConversationPrompt(
  topic: string,
  category: Category,
  config: ChannelConfig,
  sentenceCount: number,
  formatConfig: { description: string }
): string {
  const categoryGuidance = getCategoryCreativeGuidance(category);
  const recommendedScenes = Math.max(3, Math.min(6, Math.ceil(sentenceCount / 4)));

  return `# Role
You are a screenwriter creating a natural conversation for language learners.

# Task
Create a ${config.meta.targetLanguage} dialogue script in JSON format.
Topic: ${topic}
Category: ${category} - ${categoryGuidance}

# Language Level: A1-A2 (Beginner)
- Simple sentences (5-12 words)
- Common vocabulary only
- Use contractions naturally ("I'm", "don't", "Yeah", "Sure")
- NO idioms, NO exaggerated expressions

# Reference Style (match this natural tone):
M: Hi. You look relaxed today. Did you sleep well?
F: Yeah, I did. I had a quiet night at home.
M: That sounds nice. Did you do anything fun?
F: I watched a short video about photography.

# Output JSON Schema
{
  "title": "Simple English Title",
  "characters": [
    {"id": "M", "name": "Name", "description": "Brief description"},
    {"id": "F", "name": "Name", "description": "Brief description"}
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "setting": "INT. LOCATION - TIME",
      "visual": {
        "location": "Detailed location description",
        "timeOfDay": "MORNING/DAY/EVENING/NIGHT",
        "mood": "warm/casual/excited/etc",
        "lighting": "Lighting description",
        "characterActions": "What we see the characters doing"
      },
      "dialogue": [
        {"speaker": "M", "line": "Hey, how are you?", "emotion": "friendly"},
        {"speaker": "F", "line": "I'm good, thanks!", "emotion": "cheerful"}
      ]
    }
  ]
}

# Requirements
1. Create ${recommendedScenes} scenes
2. Total ${sentenceCount} dialogue lines across all scenes
3. Each scene has 3-5 dialogue exchanges
4. Two speakers: M and F
5. Each line: 5-12 words, natural speech
6. Include visual directions for each scene
7. Natural turn-taking (not strict M-F-M-F)

# Example Output
{
  "title": "Meeting an Old Friend",
  "characters": [
    {"id": "M", "name": "Daniel", "description": "A friendly young man"},
    {"id": "F", "name": "Anna", "description": "His old friend from college"}
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "setting": "INT. COZY CAFE - AFTERNOON",
      "visual": {
        "location": "A warm cafe with large windows",
        "timeOfDay": "AFTERNOON",
        "mood": "warm, friendly",
        "lighting": "Soft afternoon sunlight",
        "characterActions": "Daniel waves as Anna enters the cafe"
      },
      "dialogue": [
        {"speaker": "M", "line": "Hey Anna! Long time no see.", "emotion": "happy"},
        {"speaker": "F", "line": "Hi Daniel! It's been two years.", "emotion": "surprised"},
        {"speaker": "M", "line": "You look great. Please sit down.", "emotion": "warm"},
        {"speaker": "F", "line": "Thanks. I'm so happy to see you.", "emotion": "grateful"}
      ]
    }
  ]
}

Output ONLY valid JSON. No markdown, no explanation.`;
}

function getCategoryCreativeGuidance(category: Category): string {
  const guidance: Record<Category, string> = {
    story: 'Warm first-person narrative about a personal experience',
    conversation: 'Natural dialogue between two people',
    news: 'Simple news report style',
    announcement: 'Clear announcement with helpful information',
    travel_business: 'Practical travel or service conversation',
    lesson: 'Educational narrative with clear takeaway',
    fairytale: 'Simple storytelling with clear characters',
  };
  return guidance[category];
}

// ============================================================================
// JSON Parsing
// ============================================================================

function parseJsonScreenplay(rawText: string, category: Category): ScreenplayOutput {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = rawText.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object
  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate and transform to ScreenplayOutput
    return {
      title: parsed.title || 'Untitled',
      characters: (parsed.characters || []).map(
        (c: { id?: string; name?: string; description?: string }) => ({
          id: (c.id as 'M' | 'F') || 'M',
          name: c.name || 'Character',
          description: c.description || '',
        })
      ),
      scenes: (parsed.scenes || []).map(
        (
          s: {
            sceneNumber?: number;
            setting?: string;
            visual?: {
              location?: string;
              timeOfDay?: string;
              mood?: string;
              lighting?: string;
              characterActions?: string;
            };
            dialogue?: Array<{
              speaker?: string;
              line?: string;
              emotion?: string;
            }>;
          },
          index: number
        ) => ({
          sceneNumber: s.sceneNumber || index + 1,
          setting: s.setting || 'Unknown location',
          visual: s.visual
            ? {
                location: s.visual.location || s.setting || 'Unknown',
                timeOfDay: s.visual.timeOfDay || 'DAY',
                mood: s.visual.mood || 'neutral',
                lighting: s.visual.lighting,
                characterActions: s.visual.characterActions,
              }
            : undefined,
          dialogue: (s.dialogue || []).map(
            (d: { speaker?: string; line?: string; emotion?: string }) => ({
              speaker: (d.speaker as 'M' | 'F' | 'NARRATOR') || 'M',
              line: d.line || '',
              emotion: d.emotion,
            })
          ),
        })
      ),
      rawText,
    };
  } catch (error) {
    console.error('Failed to parse JSON screenplay:', error);
    console.error('Raw text:', rawText.substring(0, 500));

    // Return fallback
    const defaultSpeaker = getDefaultSpeaker(category);
    return {
      title: 'Untitled',
      characters: [{ id: defaultSpeaker, name: 'Narrator', description: 'Default narrator' }],
      scenes: [
        {
          sceneNumber: 1,
          setting: 'Unknown location',
          dialogue: [
            { speaker: defaultSpeaker, line: 'Script generation failed.', emotion: undefined },
          ],
        },
      ],
      rawText,
    };
  }
}

// ============================================================================
// Validation Helpers (kept for compatibility)
// ============================================================================

export function isScreenplayFormat(text: string): boolean {
  // Now we expect JSON, so check if it's valid JSON
  try {
    const trimmed = text.trim();
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function hasNaturalDialoguePatterns(text: string): boolean {
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
    "I'll",
    "you'll",
    "that's",
    "what's",
    "didn't",
    "wasn't",
  ];

  const lowerText = text.toLowerCase();
  return contractions.some((c) => lowerText.includes(c.toLowerCase()));
}
