/**
 * Visual Generator Module
 *
 * Phase 3 of the multi-step script pipeline.
 * Generates scene prompts with camera directions and character appearances.
 *
 * Role: "You are a cinematographer"
 * Focus: Scene boundaries, camera directions, lighting, character consistency
 * Output: ScenePrompt array with character appearances
 *
 * @module visual-generator
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
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
 * This is Phase 3 of the pipeline, focusing on cinematography.
 * The AI is instructed to act as a cinematographer and produce
 * scene prompts with consistent character appearances and varied camera work.
 *
 * @param input - Visual generator input containing structured script and config
 * @returns VisualOutput with characters (with appearances) and scene prompts
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 */
export async function generateVisualPrompts(input: VisualGeneratorInput): Promise<VisualOutput> {
  const { structuredScript, config } = input;

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.text });

  const prompt = buildVisualPrompt(structuredScript, config);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse visual output from response
  const visualOutput = parseVisualOutput(text, structuredScript);

  // Validate and fix any issues
  const validated = validateAndFixVisualOutput(visualOutput, structuredScript);

  return validated;
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Infer emotion from sentence content.
 * Analyzes text for emotional indicators.
 */
function inferEmotion(text: string): string {
  const lowerText = text.toLowerCase();

  // Joy/Excitement indicators
  if (
    lowerText.includes('!') ||
    lowerText.includes('fantastic') ||
    lowerText.includes('amazing') ||
    lowerText.includes('passed') ||
    lowerText.includes('got the job') ||
    lowerText.includes('congratulations')
  ) {
    return 'joyful';
  }

  // Anxiety/Worry indicators
  if (
    lowerText.includes('waiting') ||
    lowerText.includes('nervous') ||
    lowerText.includes('worried') ||
    lowerText.includes("can't believe") ||
    lowerText.includes('shaking')
  ) {
    return 'anxious';
  }

  // Question/Curiosity indicators
  if (lowerText.includes('?')) {
    return 'curious';
  }

  // Supportive/Warm indicators
  if (
    lowerText.includes('thank you') ||
    lowerText.includes('believe in') ||
    lowerText.includes("let's") ||
    lowerText.includes('together')
  ) {
    return 'warm';
  }

  // Surprise indicators
  if (lowerText.includes('wait') || lowerText.includes('really') || lowerText.includes('oh')) {
    return 'surprised';
  }

  return 'neutral';
}

/**
 * Infer setting from topic.
 * Maps common topics to appropriate locations.
 */
function inferSettingFromTopic(topic: string): { location: string; atmosphere: string } {
  const lowerTopic = topic.toLowerCase();

  // Job/Interview related
  if (
    lowerTopic.includes('job') ||
    lowerTopic.includes('interview') ||
    lowerTopic.includes('합격') ||
    lowerTopic.includes('면접')
  ) {
    return { location: 'modern cafe with large windows', atmosphere: 'casual yet professional' };
  }

  // Health related
  if (
    lowerTopic.includes('health') ||
    lowerTopic.includes('checkup') ||
    lowerTopic.includes('건강') ||
    lowerTopic.includes('검진')
  ) {
    return { location: 'bright living room or kitchen', atmosphere: 'comfortable and domestic' };
  }

  // Weather/Season related
  if (
    lowerTopic.includes('weather') ||
    lowerTopic.includes('cold') ||
    lowerTopic.includes('한파') ||
    lowerTopic.includes('날씨')
  ) {
    return {
      location: 'cozy indoor space with window view',
      atmosphere: 'warm contrast to outside',
    };
  }

  // Food/Restaurant related
  if (
    lowerTopic.includes('food') ||
    lowerTopic.includes('restaurant') ||
    lowerTopic.includes('음식') ||
    lowerTopic.includes('맛집')
  ) {
    return { location: 'trendy restaurant or food court', atmosphere: 'lively and appetizing' };
  }

  // Travel related
  if (lowerTopic.includes('travel') || lowerTopic.includes('trip') || lowerTopic.includes('여행')) {
    return { location: 'airport lounge or travel agency', atmosphere: 'exciting and adventurous' };
  }

  // Default
  return { location: 'modern urban cafe', atmosphere: 'casual and friendly' };
}

/**
 * Get camera pattern for scene index.
 * Follows a natural progression: Wide → Medium → Close-up → Medium-wide
 */
function getCameraPattern(sceneIndex: number, totalScenes: number, mood: string): string {
  // Base pattern cycle
  const patterns = [
    'Wide establishing shot, eye-level',
    'Medium shot, slight low angle',
    'Close-up, eye-level, shallow depth of field',
    'Over-the-shoulder shot',
    'Medium wide shot, pulling back slowly',
  ];

  // Adjust for emotional moments
  if (mood === 'joyful' || mood === 'anxious') {
    if (sceneIndex === totalScenes - 1) {
      return 'Medium wide shot, slowly pulling back to show both characters';
    }
    return 'Close-up, eye-level, shallow depth of field';
  }

  return patterns[sceneIndex % patterns.length];
}

/**
 * Build the visual generation prompt.
 *
 * Key principles:
 * - Focus on cinematography
 * - Consistent character appearances
 * - Varied camera directions
 * - Scene boundaries based on emotional beats
 *
 * @param structuredScript - The structured script from structural phase
 * @param config - Channel configuration
 * @returns The prompt string
 */
function buildVisualPrompt(structuredScript: StructuredSentences, _config: ChannelConfig): string {
  const { metadata, sentences } = structuredScript;
  const totalSentences = sentences.length;

  // Calculate recommended scene count
  const recommendedScenes = suggestSceneCount(totalSentences);

  // Infer setting from topic
  const topicSetting = inferSettingFromTopic(metadata.topic || metadata.title.native);

  // Format sentences with emotion tags
  const sentenceList = sentences
    .map((s) => {
      const emotion = inferEmotion(s.target);
      return `${s.id}. [${s.speaker}] [${emotion}] ${s.target}`;
    })
    .join('\n');

  // Suggest scene boundaries based on emotional shifts
  const suggestedBoundaries = suggestSceneBoundaries(sentences);
  const boundaryHints = suggestedBoundaries
    .map(([start, end], i) => `Scene ${i + 1}: sentences ${start}-${end}`)
    .join('\n');

  // Few-shot example
  const fewShotExample = `
## ✅ Good Example (Reference)
Topic: "건강 검진 결과가 나왔어요" (Health checkup results)

{
  "characters": [
    {
      "id": "M",
      "name": "James",
      "gender": "male",
      "ethnicity": "American",
      "role": "friend sharing health concerns",
      "appearance": {
        "age": "early-30s",
        "hair": "short brown hair, neatly combed",
        "eyes": "hazel eyes",
        "skin": "light tan complexion",
        "build": "average height, slightly athletic",
        "clothing": "navy blue polo shirt, khaki pants",
        "distinctiveFeatures": "reading glasses on head"
      }
    }
  ],
  "scenePrompts": [
    {
      "sentenceRange": [1, 5],
      "setting": "Bright kitchen with morning sunlight, coffee cups on counter",
      "mood": "casual, slightly concerned",
      "characterActions": "M holding coffee, F looking at phone with furrowed brow",
      "cameraDirection": "Medium shot, eye-level, showing both characters",
      "lighting": "Warm natural morning light from window",
      "transition": "Fade in"
    },
    {
      "sentenceRange": [6, 10],
      "setting": "Same kitchen, closer view",
      "mood": "empathetic, supportive",
      "characterActions": "F nodding sympathetically, M gesturing while explaining",
      "cameraDirection": "Over-the-shoulder from F, focusing on M's expressions",
      "lighting": "Consistent warm daylight",
      "transition": "Cut"
    }
  ]
}`;

  return `# Role
You are a cinematographer creating visual scenes for a language learning video.
Focus on EMOTIONAL STORYTELLING through camera work and lighting.

# Task
Create ${recommendedScenes.recommended} scene prompts for this script.

## Script Info
- Title: ${metadata.title.target} (${metadata.title.native})
- Topic: ${metadata.topic || 'conversation'}
- Inferred Setting: ${topicSetting.location}
- Atmosphere: ${topicSetting.atmosphere}

## Characters
${metadata.characters.map((c) => `- ${c.id} (${c.name}): ${c.role}`).join('\n')}

## Sentences with Emotion Tags
${sentenceList}

## Suggested Scene Boundaries (based on emotional flow)
${boundaryHints}

# Visual Direction Rules

## 1. Camera Pattern (MUST follow this progression)
- Scene 1: Wide establishing shot (show environment)
- Scene 2: Medium shot (conversation)
- Scene 3: Close-up (emotional peak)
- Scene 4: Medium-wide (resolution/ending)

## 2. Lighting by Emotion
- [anxious] → Slightly dim, focused lighting
- [joyful] → Bright, warm golden light
- [curious] → Natural daylight
- [warm] → Soft, diffused warm tones
- [surprised] → Sudden brightness change

## 3. Character Actions (CRITICAL)
Match actions to emotion tags:
- [anxious]: fidgeting, checking phone, biting lip
- [joyful]: smiling widely, hands raised, leaning forward
- [curious]: tilting head, raised eyebrows
- [warm]: reaching out, nodding, soft smile
- [surprised]: eyes wide, mouth open, frozen posture

${fewShotExample}

# Output Format (JSON)
{
  "characters": [
    {
      "id": "${metadata.characters[0]?.id || 'M'}",
      "name": "${metadata.characters[0]?.name || 'James'}",
      "gender": "${metadata.characters[0]?.gender || 'male'}",
      "ethnicity": "${metadata.characters[0]?.ethnicity || 'American'}",
      "role": "${metadata.characters[0]?.role || 'narrator'}",
      "appearance": {
        "age": "specific age (e.g., mid-20s)",
        "hair": "color, length, style",
        "eyes": "color and shape",
        "skin": "tone description",
        "build": "body type",
        "clothing": "specific outfit for this scene",
        "distinctiveFeatures": "unique features"
      }
    }
  ],
  "scenePrompts": [
    {
      "sentenceRange": [1, 4],
      "setting": "${topicSetting.location} - add specific details",
      "mood": "match the emotion tags in this range",
      "characterActions": "specific actions matching emotions",
      "cameraDirection": "follow the camera pattern above",
      "lighting": "match the emotion-lighting rules",
      "transition": "fade/cut/match cut"
    }
  ]
}

# Critical Rules
1. Cover ALL ${totalSentences} sentences (no gaps)
2. Follow the camera pattern progression
3. Match lighting to emotion tags
4. Character actions must reflect the emotion in each scene
5. Keep setting consistent (${topicSetting.location})
6. Scene count: ${recommendedScenes.min}-${recommendedScenes.max}

Generate ONLY the JSON output.`;
}

// ============================================================================
// Scene Boundary Detection
// ============================================================================

/**
 * Suggest scene count based on total sentences.
 *
 * @param totalSentences - Total number of sentences
 * @returns Recommended scene count range
 *
 * **Validates: Requirements 3.1, 3.5**
 */
export function suggestSceneCount(totalSentences: number): {
  min: number;
  max: number;
  recommended: number;
} {
  // Base calculation: roughly 3-5 sentences per scene
  const idealScenesLow = Math.ceil(totalSentences / 5);
  const idealScenesHigh = Math.ceil(totalSentences / 3);

  // Clamp to valid range
  const min = Math.max(MIN_SCENE_COUNT, idealScenesLow);
  const max = Math.min(MAX_SCENE_COUNT, idealScenesHigh);

  // Recommended is the middle
  const recommended = Math.round((min + max) / 2);

  return {
    min: Math.min(min, MAX_SCENE_COUNT),
    max: Math.max(max, MIN_SCENE_COUNT),
    recommended: Math.max(MIN_SCENE_COUNT, Math.min(MAX_SCENE_COUNT, recommended)),
  };
}

/**
 * Suggest scene boundaries based on content analysis.
 *
 * This helper analyzes sentences to identify natural break points based on:
 * - Speaker changes (potential scene transitions)
 * - Emotional beat indicators (questions, exclamations)
 * - Content transitions (topic shifts)
 *
 * @param sentences - Array of sentences from structured script
 * @returns Array of suggested scene boundaries (sentence ranges)
 *
 * **Validates: Requirements 3.1, 3.5**
 */
export function suggestSceneBoundaries(
  sentences: StructuredSentences['sentences']
): Array<[number, number]> {
  const totalSentences = sentences.length;
  const { min, max, recommended } = suggestSceneCount(totalSentences);

  if (totalSentences === 0) return [];

  // Identify potential break points based on content
  const breakPoints = identifyBreakPoints(sentences);

  // If we have good break points, use them
  if (breakPoints.length >= min - 1 && breakPoints.length <= max - 1) {
    return createBoundariesFromBreakPoints(breakPoints, totalSentences);
  }

  // Fall back to even distribution
  const boundaries: Array<[number, number]> = [];
  const sentencesPerScene = Math.ceil(totalSentences / recommended);

  let start = 1;
  for (let i = 0; i < recommended; i++) {
    const end = Math.min(start + sentencesPerScene - 1, totalSentences);
    boundaries.push([start, end]);
    start = end + 1;

    if (start > totalSentences) break;
  }

  // Ensure last boundary covers remaining sentences
  if (boundaries.length > 0 && boundaries[boundaries.length - 1][1] < totalSentences) {
    boundaries[boundaries.length - 1][1] = totalSentences;
  }

  return boundaries;
}

/**
 * Identify potential scene break points based on content analysis.
 *
 * Looks for:
 * - Speaker changes (dialogue exchanges)
 * - Emotional beats (questions, exclamations)
 * - Transition words
 *
 * @param sentences - Array of sentences to analyze
 * @returns Array of sentence IDs where breaks could occur (after that sentence)
 */
export function identifyBreakPoints(sentences: StructuredSentences['sentences']): number[] {
  const breakPoints: number[] = [];

  // Transition indicators that suggest scene changes
  const transitionWords = [
    'suddenly',
    'then',
    'later',
    'next',
    'finally',
    'meanwhile',
    'after',
    'before',
    'when',
    'now',
    'so',
    'but then',
  ];

  // Emotional beat indicators
  const emotionalIndicators = ['!', '?', '...'];

  for (let i = 0; i < sentences.length - 1; i++) {
    const current = sentences[i];
    const next = sentences[i + 1];
    let breakScore = 0;

    // Speaker change suggests potential scene break
    if (current.speaker !== next.speaker) {
      breakScore += 1;
    }

    // Emotional beat at end of current sentence
    const currentTarget = current.target.toLowerCase();
    if (emotionalIndicators.some((ind) => currentTarget.endsWith(ind))) {
      breakScore += 1;
    }

    // Transition word at start of next sentence
    const nextTarget = next.target.toLowerCase();
    if (transitionWords.some((word) => nextTarget.startsWith(word))) {
      breakScore += 2;
    }

    // Question followed by answer pattern
    if (currentTarget.endsWith('?') && !nextTarget.endsWith('?')) {
      breakScore += 1;
    }

    // Strong break point (score >= 2)
    if (breakScore >= 2) {
      breakPoints.push(current.id);
    }
  }

  return breakPoints;
}

/**
 * Create scene boundaries from identified break points.
 *
 * @param breakPoints - Array of sentence IDs where breaks occur
 * @param totalSentences - Total number of sentences
 * @returns Array of scene boundaries
 */
function createBoundariesFromBreakPoints(
  breakPoints: number[],
  totalSentences: number
): Array<[number, number]> {
  const boundaries: Array<[number, number]> = [];

  // Sort break points
  const sorted = [...breakPoints].sort((a, b) => a - b);

  let start = 1;
  for (const breakPoint of sorted) {
    if (breakPoint >= start && breakPoint < totalSentences) {
      boundaries.push([start, breakPoint]);
      start = breakPoint + 1;
    }
  }

  // Add final scene
  if (start <= totalSentences) {
    boundaries.push([start, totalSentences]);
  }

  return boundaries;
}

// ============================================================================
// Output Parsing
// ============================================================================

/**
 * Parse the visual output from AI response.
 *
 * @param text - Raw text from AI
 * @param structuredScript - Original structured script for fallback
 * @returns Parsed VisualOutput
 */
function parseVisualOutput(text: string, structuredScript: StructuredSentences): VisualOutput {
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from visual generator response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse JSON from visual generator response');
  }

  const data = parsed as {
    characters?: Array<{
      id?: string;
      name?: string;
      gender?: string;
      ethnicity?: string;
      role?: string;
      appearance?: Appearance;
    }>;
    scenePrompts?: Array<{
      sentenceRange?: [number, number];
      setting?: string;
      mood?: string;
      characterActions?: string;
      cameraDirection?: string;
      lighting?: string;
      transition?: string;
    }>;
  };

  // Build characters with appearances
  const characters: Character[] = (data.characters || []).map((c, index) => {
    const fallbackChar = structuredScript.metadata.characters[index];
    return {
      id: (c.id as 'M' | 'F') || fallbackChar?.id || (index === 0 ? 'M' : 'F'),
      name: c.name || fallbackChar?.name || (index === 0 ? 'James' : 'Sarah'),
      gender:
        (c.gender as 'male' | 'female') ||
        fallbackChar?.gender ||
        (index === 0 ? 'male' : 'female'),
      ethnicity: c.ethnicity || fallbackChar?.ethnicity || 'American',
      role: c.role || fallbackChar?.role || 'character',
      appearance: c.appearance,
    };
  });

  // If no characters parsed, use defaults from structured script
  if (characters.length === 0) {
    characters.push(...structuredScript.metadata.characters);
  }

  // Build scene prompts
  const scenePrompts: ScenePrompt[] = (data.scenePrompts || []).map((sp) => ({
    sentenceRange: sp.sentenceRange || [1, 1],
    setting: sp.setting || 'Unknown location',
    mood: sp.mood || 'neutral',
    characterActions: sp.characterActions || 'Characters present',
    cameraDirection: sp.cameraDirection || 'Medium shot',
    lighting: sp.lighting,
    transition: sp.transition,
  }));

  return { characters, scenePrompts };
}

// ============================================================================
// Validation and Fixing
// ============================================================================

/**
 * Validate and fix the visual output.
 *
 * @param visualOutput - The parsed visual output
 * @param structuredScript - Original structured script for reference
 * @returns Validated and fixed VisualOutput
 */
function validateAndFixVisualOutput(
  visualOutput: VisualOutput,
  structuredScript: StructuredSentences
): VisualOutput {
  const totalSentences = structuredScript.sentences.length;
  let { characters, scenePrompts } = visualOutput;

  // Validate scene coverage
  const coverageErrors = validateSceneCoverage(scenePrompts, totalSentences);

  if (coverageErrors.length > 0) {
    // Try to fix scene coverage
    scenePrompts = fixSceneCoverage(scenePrompts, totalSentences);
  }

  // Ensure character appearance consistency
  characters = ensureCharacterConsistency(characters);

  // Ensure camera direction variety
  scenePrompts = ensureCameraVariety(scenePrompts);

  return { characters, scenePrompts };
}

/**
 * Fix scene coverage issues.
 *
 * @param scenePrompts - Original scene prompts
 * @param totalSentences - Total number of sentences to cover
 * @returns Fixed scene prompts with proper coverage
 */
function fixSceneCoverage(scenePrompts: ScenePrompt[], totalSentences: number): ScenePrompt[] {
  // If no scenes or invalid, create default distribution
  if (scenePrompts.length === 0) {
    return createDefaultScenePrompts(totalSentences);
  }

  // Sort by start range
  const sorted = [...scenePrompts].sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]);

  // Find gaps and overlaps
  const covered = new Set<number>();
  const fixed: ScenePrompt[] = [];

  for (const scene of sorted) {
    const [start, end] = scene.sentenceRange;

    // Skip invalid ranges
    if (start > end || start < 1) continue;

    // Adjust for overlaps
    let adjustedStart = start;
    while (covered.has(adjustedStart) && adjustedStart <= end) {
      adjustedStart++;
    }

    if (adjustedStart <= end) {
      const adjustedEnd = Math.min(end, totalSentences);
      fixed.push({
        ...scene,
        sentenceRange: [adjustedStart, adjustedEnd],
      });

      for (let i = adjustedStart; i <= adjustedEnd; i++) {
        covered.add(i);
      }
    }
  }

  // Fill gaps
  for (let i = 1; i <= totalSentences; i++) {
    if (!covered.has(i)) {
      // Find the gap range
      let gapEnd = i;
      while (gapEnd + 1 <= totalSentences && !covered.has(gapEnd + 1)) {
        gapEnd++;
      }

      // Add a scene for this gap
      fixed.push({
        sentenceRange: [i, gapEnd],
        setting: 'Continuation of scene',
        mood: 'neutral',
        characterActions: 'Characters continue',
        cameraDirection: 'Medium shot',
      });

      for (let j = i; j <= gapEnd; j++) {
        covered.add(j);
      }
    }
  }

  // Sort again and ensure scene count is valid
  const result = fixed.sort((a, b) => a.sentenceRange[0] - b.sentenceRange[0]);

  // Merge if too many scenes
  if (result.length > MAX_SCENE_COUNT) {
    return mergeScenes(result, MAX_SCENE_COUNT);
  }

  // Split if too few scenes
  if (result.length < MIN_SCENE_COUNT && totalSentences >= MIN_SCENE_COUNT) {
    return splitScenes(result, MIN_SCENE_COUNT, totalSentences);
  }

  return result;
}

/**
 * Create default scene prompts with even distribution.
 */
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

  return boundaries.map(([start, end], index) => ({
    sentenceRange: [start, end] as [number, number],
    setting: `Scene ${index + 1}`,
    mood: 'neutral',
    characterActions: 'Characters present',
    cameraDirection: getVariedCameraDirection(index),
  }));
}

/**
 * Merge scenes to reduce count.
 */
function mergeScenes(scenes: ScenePrompt[], targetCount: number): ScenePrompt[] {
  while (scenes.length > targetCount && scenes.length > 1) {
    // Find the smallest scene to merge with its neighbor
    let smallestIndex = 0;
    let smallestSize = Infinity;

    for (let i = 0; i < scenes.length; i++) {
      const size = scenes[i].sentenceRange[1] - scenes[i].sentenceRange[0] + 1;
      if (size < smallestSize) {
        smallestSize = size;
        smallestIndex = i;
      }
    }

    // Merge with previous or next
    const mergeWith = smallestIndex > 0 ? smallestIndex - 1 : smallestIndex + 1;
    if (mergeWith < scenes.length) {
      const [scene1, scene2] =
        smallestIndex < mergeWith
          ? [scenes[smallestIndex], scenes[mergeWith]]
          : [scenes[mergeWith], scenes[smallestIndex]];

      const merged: ScenePrompt = {
        sentenceRange: [scene1.sentenceRange[0], scene2.sentenceRange[1]],
        setting: scene1.setting,
        mood: scene1.mood,
        characterActions: scene1.characterActions,
        cameraDirection: scene1.cameraDirection,
        lighting: scene1.lighting,
        transition: scene2.transition,
      };

      scenes.splice(Math.min(smallestIndex, mergeWith), 2, merged);
    }
  }

  return scenes;
}

/**
 * Split scenes to increase count.
 */
function splitScenes(
  scenes: ScenePrompt[],
  targetCount: number,
  _totalSentences: number
): ScenePrompt[] {
  const result: ScenePrompt[] = [];

  for (const scene of scenes) {
    const [start, end] = scene.sentenceRange;
    const size = end - start + 1;

    // If we need more scenes and this one is big enough to split
    if (result.length + (scenes.length - scenes.indexOf(scene)) < targetCount && size >= 2) {
      const mid = Math.floor((start + end) / 2);

      result.push({
        ...scene,
        sentenceRange: [start, mid],
      });

      result.push({
        ...scene,
        sentenceRange: [mid + 1, end],
        cameraDirection: getVariedCameraDirection(result.length),
      });
    } else {
      result.push(scene);
    }
  }

  return result;
}

/**
 * Ensure character appearances are consistent across the output.
 */
function ensureCharacterConsistency(characters: Character[]): Character[] {
  // Characters should already have consistent appearances from the AI
  // This function ensures the data structure is correct
  return characters.map((char) => ({
    ...char,
    appearance: char.appearance || undefined,
  }));
}

/**
 * Ensure camera directions vary across scenes.
 */
function ensureCameraVariety(scenePrompts: ScenePrompt[]): ScenePrompt[] {
  if (scenePrompts.length < 3) return scenePrompts;

  // Check if all camera directions are the same
  const directions = scenePrompts.map((sp) => sp.cameraDirection?.toLowerCase().trim());
  const uniqueDirections = new Set(directions);

  if (uniqueDirections.size === 1) {
    // All same - add variety
    return scenePrompts.map((sp, index) => ({
      ...sp,
      cameraDirection: getVariedCameraDirection(index),
    }));
  }

  return scenePrompts;
}

/**
 * Get a varied camera direction based on index.
 */
function getVariedCameraDirection(index: number): string {
  const directions = [
    'Wide establishing shot, eye-level',
    'Medium shot, slight low angle',
    'Close-up, eye-level',
    'Over-the-shoulder shot',
    'Medium close-up, high angle',
    'Two-shot, eye-level',
  ];

  return directions[index % directions.length];
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if character appearances are consistent across scenes.
 *
 * @param characters - Array of characters with appearances
 * @returns true if appearances are consistent
 *
 * **Validates: Requirement 3.3**
 */
export function areCharacterAppearancesConsistent(characters: Character[]): boolean {
  // Group characters by ID
  const byId = new Map<string, Character[]>();

  for (const char of characters) {
    const existing = byId.get(char.id) || [];
    existing.push(char);
    byId.set(char.id, existing);
  }

  // Check each character ID has consistent appearance
  for (const [, chars] of byId) {
    if (chars.length <= 1) continue;

    const firstAppearance = JSON.stringify(chars[0].appearance);
    for (let i = 1; i < chars.length; i++) {
      if (JSON.stringify(chars[i].appearance) !== firstAppearance) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if camera directions vary across scenes.
 *
 * @param scenePrompts - Array of scene prompts
 * @returns true if camera directions vary (not all identical)
 *
 * **Validates: Requirement 3.4**
 */
export function doCameraDirectionsVary(scenePrompts: ScenePrompt[]): boolean {
  if (scenePrompts.length < 3) return true; // Not enough scenes to require variety

  const directions = scenePrompts.map((sp) => sp.cameraDirection?.toLowerCase().trim() || '');

  const uniqueDirections = new Set(directions.filter((d) => d.length > 0));

  return uniqueDirections.size > 1;
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  buildVisualPrompt,
  parseVisualOutput,
  validateAndFixVisualOutput,
  fixSceneCoverage,
  createDefaultScenePrompts,
  ensureCharacterConsistency,
  ensureCameraVariety,
  inferEmotion,
  inferSettingFromTopic,
  getCameraPattern,
};
