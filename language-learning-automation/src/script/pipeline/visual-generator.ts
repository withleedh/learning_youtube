/**
 * Visual Generator Module
 *
 * Phase 3 of the multi-step script pipeline.
 * Now uses scene information from Creative phase and adds:
 * - Character appearances (detailed physical descriptions)
 * - Camera directions (cinematography details)
 *
 * @module visual-generator
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS, getGeminiApiKey } from '../../config/gemini';
import type { Character, ScenePrompt, Appearance } from '../types';
import type { ChannelConfig } from '../../config/types';
import type { VisualGeneratorInput, VisualOutput, StructuredSentences } from './types';
import { validateSceneCoverage, MIN_SCENE_COUNT, MAX_SCENE_COUNT } from './validators';

// ============================================================================
// Visual Generator Implementation
// ============================================================================

/**
 * Generate visual prompts for scene images.
 *
 * Now leverages scene information from Creative phase:
 * - Uses existing scene boundaries and visual hints
 * - Adds detailed character appearances
 * - Adds specific camera directions
 */
export async function generateVisualPrompts(input: VisualGeneratorInput): Promise<VisualOutput> {
  const { structuredScript, config } = input;

  // Check if we already have scene info from Creative phase
  const hasCreativeScenes = structuredScript.scenes && structuredScript.scenes.length > 0;

  if (hasCreativeScenes) {
    // Use Creative's scene info, just add character appearances and camera details
    return enhanceCreativeScenes(structuredScript, config);
  }

  // Fallback: Generate scenes from scratch (legacy behavior)
  return generateScenesFromScratch(structuredScript, config);
}

/**
 * Enhance scenes from Creative phase with character appearances and camera details.
 * This is the new preferred path - Creative already did the hard work.
 */
async function enhanceCreativeScenes(
  structuredScript: StructuredSentences,
  config: ChannelConfig
): Promise<VisualOutput> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const prompt = buildEnhancementPrompt(structuredScript, config);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse character appearances from response
  const characters = parseCharacterAppearances(text, structuredScript);

  // Convert Creative scenes to ScenePrompts with camera directions
  const scenePrompts = convertCreativeScenesToPrompts(structuredScript, text);

  return { characters, scenePrompts };
}

/**
 * Build prompt to enhance Creative's scenes with character appearances.
 */
function buildEnhancementPrompt(
  structuredScript: StructuredSentences,
  _config: ChannelConfig
): string {
  const { metadata, scenes } = structuredScript;

  // Format existing scenes for context
  const scenesSummary = (scenes || [])
    .map(
      (s, i) =>
        `Scene ${i + 1}: ${s.setting}\n  Mood: ${s.visual?.mood || 'neutral'}\n  Location: ${s.visual?.location || s.setting}`
    )
    .join('\n');

  return `# Role
You are a character designer and cinematographer.

# Task
Add detailed character appearances and camera directions to these existing scenes.

## Script Info
- Title: ${metadata.title.target}
- Characters: ${metadata.characters.map((c) => `${c.id} (${c.name})`).join(', ')}

## Existing Scenes (from script)
${scenesSummary}

# Output JSON
{
  "characters": [
    {
      "id": "${metadata.characters[0]?.id || 'M'}",
      "name": "${metadata.characters[0]?.name || 'Character'}",
      "appearance": {
        "age": "specific age range (e.g., mid-20s)",
        "hair": "color, length, style",
        "eyes": "color",
        "skin": "tone",
        "build": "body type",
        "clothing": "outfit description",
        "distinctiveFeatures": "any unique features"
      }
    }${
      metadata.characters.length > 1
        ? `,
    {
      "id": "${metadata.characters[1]?.id || 'F'}",
      "name": "${metadata.characters[1]?.name || 'Character'}",
      "appearance": {
        "age": "specific age range",
        "hair": "color, length, style",
        "eyes": "color",
        "skin": "tone",
        "build": "body type",
        "clothing": "outfit description",
        "distinctiveFeatures": "any unique features"
      }
    }`
        : ''
    }
  ],
  "cameraDirections": [
    "Wide establishing shot, eye-level",
    "Medium shot, slight low angle",
    "Close-up, shallow depth of field",
    "Medium wide shot, pulling back"
  ]
}

# Rules
1. Create consistent, detailed appearances for each character
2. Appearances should match the scene mood and setting
3. Camera directions should progress: Wide → Medium → Close-up → Wide
4. Keep clothing appropriate for the setting

Output ONLY valid JSON.`;
}

/**
 * Parse character appearances from AI response.
 */
function parseCharacterAppearances(
  text: string,
  structuredScript: StructuredSentences
): Character[] {
  try {
    // Extract JSON
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/) || jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1] || jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const characters: Character[] = [];

    for (const c of parsed.characters || []) {
      const baseChar = structuredScript.metadata.characters.find((ch) => ch.id === c.id);
      characters.push({
        id: (c.id as 'M' | 'F') || 'M',
        name: c.name || baseChar?.name || 'Character',
        gender: baseChar?.gender || (c.id === 'F' ? 'female' : 'male'),
        ethnicity: baseChar?.ethnicity || 'American',
        role: baseChar?.role || 'character',
        appearance: c.appearance as Appearance,
      });
    }

    // Ensure all characters from script are included
    for (const baseChar of structuredScript.metadata.characters) {
      if (!characters.find((c) => c.id === baseChar.id)) {
        characters.push({
          ...baseChar,
          appearance: createDefaultAppearance(baseChar.id),
        });
      }
    }

    return characters;
  } catch (error) {
    console.error('Failed to parse character appearances:', error);
    // Return characters with default appearances
    return structuredScript.metadata.characters.map((c) => ({
      ...c,
      appearance: createDefaultAppearance(c.id),
    }));
  }
}

/**
 * Convert Creative scenes to ScenePrompts with camera directions.
 */
function convertCreativeScenesToPrompts(
  structuredScript: StructuredSentences,
  aiResponse: string
): ScenePrompt[] {
  const { scenes, sentences } = structuredScript;

  if (!scenes || scenes.length === 0) {
    // Fallback to default scene distribution
    return createDefaultScenePrompts(sentences.length);
  }

  // Parse camera directions from AI response
  let cameraDirections: string[] = [];
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      cameraDirections = parsed.cameraDirections || [];
    }
  } catch {
    // Use default camera directions
  }

  // Default camera progression
  const defaultCameras = [
    'Wide establishing shot, eye-level',
    'Medium shot, slight low angle',
    'Close-up, eye-level, shallow depth of field',
    'Over-the-shoulder shot',
    'Medium wide shot, pulling back slowly',
    'Two-shot, eye-level',
  ];

  // Calculate sentence ranges for each scene
  const scenePrompts: ScenePrompt[] = [];
  let sentenceIndex = 1;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const dialogueCount = scene.dialogue?.length || 0;
    const endIndex = Math.min(sentenceIndex + dialogueCount - 1, sentences.length);

    const camera = cameraDirections[i] || defaultCameras[i % defaultCameras.length];

    scenePrompts.push({
      sentenceRange: [sentenceIndex, endIndex] as [number, number],
      setting: scene.visual?.location || scene.setting || 'Unknown location',
      mood: scene.visual?.mood || 'neutral',
      characterActions: scene.visual?.characterActions || 'Characters present',
      cameraDirection: camera,
      lighting: scene.visual?.lighting || inferLightingFromTime(scene.visual?.timeOfDay || 'DAY'),
      transition: i === 0 ? 'Fade in' : 'Cut',
    });

    sentenceIndex = endIndex + 1;
  }

  // Ensure all sentences are covered
  if (
    scenePrompts.length > 0 &&
    scenePrompts[scenePrompts.length - 1].sentenceRange[1] < sentences.length
  ) {
    scenePrompts[scenePrompts.length - 1].sentenceRange[1] = sentences.length;
  }

  return scenePrompts;
}

/**
 * Create default appearance for a character.
 */
function createDefaultAppearance(id: 'M' | 'F'): Appearance {
  if (id === 'M') {
    return {
      age: 'late-20s',
      hair: 'short dark brown hair',
      eyes: 'brown eyes',
      skin: 'light tan complexion',
      build: 'average height, slim build',
      clothing: 'casual button-up shirt, jeans',
      distinctiveFeatures: 'friendly smile',
    };
  } else {
    return {
      age: 'mid-20s',
      hair: 'shoulder-length black hair',
      eyes: 'dark brown eyes',
      skin: 'fair complexion',
      build: 'average height, slim build',
      clothing: 'casual blouse, light cardigan',
      distinctiveFeatures: 'warm expression',
    };
  }
}

/**
 * Infer lighting from time of day.
 */
function inferLightingFromTime(timeOfDay: string): string {
  const time = timeOfDay.toUpperCase();
  switch (time) {
    case 'MORNING':
      return 'Soft morning light, golden hour';
    case 'DAY':
      return 'Bright natural daylight';
    case 'AFTERNOON':
      return 'Warm afternoon sunlight';
    case 'EVENING':
      return 'Warm golden hour, sunset tones';
    case 'NIGHT':
      return 'Dim ambient lighting, warm interior lights';
    case 'CONTINUOUS':
      return 'Consistent with previous scene';
    default:
      return 'Natural lighting';
  }
}

// ============================================================================
// Legacy: Generate Scenes From Scratch
// ============================================================================

/**
 * Generate scenes from scratch (legacy behavior).
 * Used when Creative phase didn't provide scene information.
 */
async function generateScenesFromScratch(
  structuredScript: StructuredSentences,
  config: ChannelConfig
): Promise<VisualOutput> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const prompt = buildLegacyVisualPrompt(structuredScript, config);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  const visualOutput = parseLegacyVisualOutput(text, structuredScript);
  return validateAndFixVisualOutput(visualOutput, structuredScript);
}

/**
 * Build legacy visual prompt (when no Creative scenes available).
 */
function buildLegacyVisualPrompt(
  structuredScript: StructuredSentences,
  _config: ChannelConfig
): string {
  const { metadata, sentences } = structuredScript;
  const totalSentences = sentences.length;
  const recommendedScenes = suggestSceneCount(totalSentences);

  const sentenceList = sentences.map((s) => `${s.id}. [${s.speaker}] ${s.target}`).join('\n');

  return `# Role
You are a cinematographer creating visual scenes for a language learning video.

# Task
Create ${recommendedScenes.recommended} scene prompts for this script.

## Script Info
- Title: ${metadata.title.target}
- Characters: ${metadata.characters.map((c) => `${c.id} (${c.name})`).join(', ')}

## Sentences
${sentenceList}

# Output JSON
{
  "characters": [
    {
      "id": "M",
      "name": "Name",
      "gender": "male",
      "ethnicity": "American",
      "role": "description",
      "appearance": {
        "age": "age range",
        "hair": "description",
        "eyes": "color",
        "skin": "tone",
        "build": "body type",
        "clothing": "outfit",
        "distinctiveFeatures": "features"
      }
    }
  ],
  "scenePrompts": [
    {
      "sentenceRange": [1, 4],
      "setting": "Location description",
      "mood": "emotional tone",
      "characterActions": "what characters are doing",
      "cameraDirection": "camera angle and movement",
      "lighting": "lighting description",
      "transition": "fade/cut"
    }
  ]
}

# Rules
1. Cover ALL ${totalSentences} sentences
2. Scene count: ${recommendedScenes.min}-${recommendedScenes.max}
3. Camera progression: Wide → Medium → Close-up → Wide
4. Consistent character appearances

Output ONLY valid JSON.`;
}

/**
 * Parse legacy visual output.
 */
function parseLegacyVisualOutput(
  text: string,
  structuredScript: StructuredSentences
): VisualOutput {
  try {
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/) || jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1] || jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    const characters: Character[] = (parsed.characters || []).map(
      (
        c: {
          id?: string;
          name?: string;
          gender?: string;
          ethnicity?: string;
          role?: string;
          appearance?: Appearance;
        },
        index: number
      ) => {
        const fallbackChar = structuredScript.metadata.characters[index];
        return {
          id: (c.id as 'M' | 'F') || fallbackChar?.id || (index === 0 ? 'M' : 'F'),
          name: c.name || fallbackChar?.name || 'Character',
          gender: (c.gender as 'male' | 'female') || fallbackChar?.gender || 'male',
          ethnicity: c.ethnicity || fallbackChar?.ethnicity || 'American',
          role: c.role || fallbackChar?.role || 'character',
          appearance: c.appearance,
        };
      }
    );

    if (characters.length === 0) {
      characters.push(
        ...structuredScript.metadata.characters.map((c) => ({
          ...c,
          appearance: createDefaultAppearance(c.id),
        }))
      );
    }

    const scenePrompts: ScenePrompt[] = (parsed.scenePrompts || []).map(
      (sp: {
        sentenceRange?: [number, number];
        setting?: string;
        mood?: string;
        characterActions?: string;
        cameraDirection?: string;
        lighting?: string;
        transition?: string;
      }) => ({
        sentenceRange: sp.sentenceRange || [1, 1],
        setting: sp.setting || 'Unknown location',
        mood: sp.mood || 'neutral',
        characterActions: sp.characterActions || 'Characters present',
        cameraDirection: sp.cameraDirection || 'Medium shot',
        lighting: sp.lighting,
        transition: sp.transition,
      })
    );

    return { characters, scenePrompts };
  } catch (error) {
    console.error('Failed to parse legacy visual output:', error);
    return {
      characters: structuredScript.metadata.characters.map((c) => ({
        ...c,
        appearance: createDefaultAppearance(c.id),
      })),
      scenePrompts: createDefaultScenePrompts(structuredScript.sentences.length),
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

export function suggestSceneCount(totalSentences: number): {
  min: number;
  max: number;
  recommended: number;
} {
  const idealScenesLow = Math.ceil(totalSentences / 5);
  const idealScenesHigh = Math.ceil(totalSentences / 3);

  const min = Math.max(MIN_SCENE_COUNT, idealScenesLow);
  const max = Math.min(MAX_SCENE_COUNT, idealScenesHigh);
  const recommended = Math.round((min + max) / 2);

  return {
    min: Math.min(min, MAX_SCENE_COUNT),
    max: Math.max(max, MIN_SCENE_COUNT),
    recommended: Math.max(MIN_SCENE_COUNT, Math.min(MAX_SCENE_COUNT, recommended)),
  };
}

export function suggestSceneBoundaries(
  sentences: StructuredSentences['sentences']
): Array<[number, number]> {
  const totalSentences = sentences.length;
  const { recommended } = suggestSceneCount(totalSentences);

  if (totalSentences === 0) return [];

  const boundaries: Array<[number, number]> = [];
  const sentencesPerScene = Math.ceil(totalSentences / recommended);

  let start = 1;
  for (let i = 0; i < recommended; i++) {
    const end = Math.min(start + sentencesPerScene - 1, totalSentences);
    boundaries.push([start, end]);
    start = end + 1;
    if (start > totalSentences) break;
  }

  if (boundaries.length > 0 && boundaries[boundaries.length - 1][1] < totalSentences) {
    boundaries[boundaries.length - 1][1] = totalSentences;
  }

  return boundaries;
}

function createDefaultScenePrompts(totalSentences: number): ScenePrompt[] {
  const boundaries = suggestSceneBoundaries(
    Array.from({ length: totalSentences }, (_, i) => ({
      id: i + 1,
      speaker: 'M' as const,
      target: '',
      targetBlank: '',
      blankAnswer: '',
      native: '',
      words: [],
    }))
  );

  const cameras = [
    'Wide establishing shot, eye-level',
    'Medium shot, slight low angle',
    'Close-up, eye-level',
    'Over-the-shoulder shot',
    'Medium wide shot, pulling back',
  ];

  return boundaries.map(([start, end], index) => ({
    sentenceRange: [start, end] as [number, number],
    setting: `Scene ${index + 1}`,
    mood: 'neutral',
    characterActions: 'Characters present',
    cameraDirection: cameras[index % cameras.length],
  }));
}

function validateAndFixVisualOutput(
  visualOutput: VisualOutput,
  structuredScript: StructuredSentences
): VisualOutput {
  const totalSentences = structuredScript.sentences.length;
  let { characters, scenePrompts } = visualOutput;

  const coverageErrors = validateSceneCoverage(scenePrompts, totalSentences);

  if (coverageErrors.length > 0) {
    scenePrompts = fixSceneCoverage(scenePrompts, totalSentences);
  }

  scenePrompts = ensureCameraVariety(scenePrompts);

  return { characters, scenePrompts };
}

function fixSceneCoverage(scenePrompts: ScenePrompt[], totalSentences: number): ScenePrompt[] {
  if (scenePrompts.length === 0) {
    return createDefaultScenePrompts(totalSentences);
  }

  const sorted = [...scenePrompts].sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]);
  const covered = new Set<number>();
  const fixed: ScenePrompt[] = [];

  for (const scene of sorted) {
    const [start, end] = scene.sentenceRange;
    if (start > end || start < 1) continue;

    let adjustedStart = start;
    while (covered.has(adjustedStart) && adjustedStart <= end) {
      adjustedStart++;
    }

    if (adjustedStart <= end) {
      const adjustedEnd = Math.min(end, totalSentences);
      fixed.push({ ...scene, sentenceRange: [adjustedStart, adjustedEnd] });
      for (let i = adjustedStart; i <= adjustedEnd; i++) covered.add(i);
    }
  }

  for (let i = 1; i <= totalSentences; i++) {
    if (!covered.has(i)) {
      let gapEnd = i;
      while (gapEnd + 1 <= totalSentences && !covered.has(gapEnd + 1)) gapEnd++;
      fixed.push({
        sentenceRange: [i, gapEnd],
        setting: 'Continuation',
        mood: 'neutral',
        characterActions: 'Characters continue',
        cameraDirection: 'Medium shot',
      });
      for (let j = i; j <= gapEnd; j++) covered.add(j);
    }
  }

  return fixed.sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]);
}

function ensureCameraVariety(scenePrompts: ScenePrompt[]): ScenePrompt[] {
  if (scenePrompts.length < 3) return scenePrompts;

  const directions = scenePrompts.map((sp) => sp.cameraDirection?.toLowerCase().trim());
  const uniqueDirections = new Set(directions);

  if (uniqueDirections.size === 1) {
    const cameras = [
      'Wide establishing shot, eye-level',
      'Medium shot, slight low angle',
      'Close-up, eye-level',
      'Over-the-shoulder shot',
      'Medium wide shot, pulling back',
    ];
    return scenePrompts.map((sp, i) => ({
      ...sp,
      cameraDirection: cameras[i % cameras.length],
    }));
  }

  return scenePrompts;
}

// ============================================================================
// Exports
// ============================================================================

export function identifyBreakPoints(sentences: StructuredSentences['sentences']): number[] {
  const breakPoints: number[] = [];
  const transitionWords = ['suddenly', 'then', 'later', 'next', 'finally', 'meanwhile'];

  for (let i = 0; i < sentences.length - 1; i++) {
    const current = sentences[i];
    const next = sentences[i + 1];
    let breakScore = 0;

    if (current.speaker !== next.speaker) breakScore += 1;
    if (current.target.endsWith('?') || current.target.endsWith('!')) breakScore += 1;
    if (transitionWords.some((w) => next.target.toLowerCase().startsWith(w))) breakScore += 2;

    if (breakScore >= 2) breakPoints.push(current.id);
  }

  return breakPoints;
}

export function areCharacterAppearancesConsistent(characters: Character[]): boolean {
  const byId = new Map<string, Character[]>();
  for (const char of characters) {
    const existing = byId.get(char.id) || [];
    existing.push(char);
    byId.set(char.id, existing);
  }

  for (const [, chars] of byId) {
    if (chars.length <= 1) continue;
    const first = JSON.stringify(chars[0].appearance);
    for (let i = 1; i < chars.length; i++) {
      if (JSON.stringify(chars[i].appearance) !== first) return false;
    }
  }
  return true;
}

export function doCameraDirectionsVary(scenePrompts: ScenePrompt[]): boolean {
  if (scenePrompts.length < 3) return true;
  const directions = scenePrompts.map((sp) => sp.cameraDirection?.toLowerCase().trim() || '');
  return new Set(directions.filter((d) => d.length > 0)).size > 1;
}

// Legacy exports for compatibility
export {
  buildLegacyVisualPrompt as buildVisualPrompt,
  parseLegacyVisualOutput as parseVisualOutput,
  validateAndFixVisualOutput,
  fixSceneCoverage,
  createDefaultScenePrompts,
  createDefaultAppearance as ensureCharacterConsistency,
  ensureCameraVariety,
};

export function inferEmotion(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('!') || lower.includes('amazing') || lower.includes('congratulations'))
    return 'joyful';
  if (lower.includes('nervous') || lower.includes('worried')) return 'anxious';
  if (lower.includes('?')) return 'curious';
  if (lower.includes('thank') || lower.includes('together')) return 'warm';
  return 'neutral';
}

export function inferSettingFromTopic(topic: string): { location: string; atmosphere: string } {
  const lower = topic.toLowerCase();
  if (lower.includes('cafe') || lower.includes('coffee'))
    return { location: 'cozy cafe', atmosphere: 'warm' };
  if (lower.includes('travel') || lower.includes('trip'))
    return { location: 'airport', atmosphere: 'exciting' };
  return { location: 'modern urban setting', atmosphere: 'casual' };
}

export function getCameraPattern(index: number, _total: number, _mood: string): string {
  const patterns = ['Wide shot', 'Medium shot', 'Close-up', 'Over-the-shoulder', 'Medium wide'];
  return patterns[index % patterns.length];
}
