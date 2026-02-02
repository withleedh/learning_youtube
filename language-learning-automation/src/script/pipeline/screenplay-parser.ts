/**
 * Screenplay Parser Module
 *
 * Parses human-readable screenplay format into structured data.
 * Handles speaker labels (M:, F:, NARRATOR:), emotion annotations,
 * and action descriptions.
 *
 * @module screenplay-parser
 * **Validates: Requirements 1.5, 2.1**
 */

import type {
  ScreenplayOutput,
  ScreenplayCharacter,
  ScreenplayScene,
  ScreenplayLine,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of parsing a screenplay
 */
export interface ParseResult {
  success: boolean;
  screenplay?: ScreenplayOutput;
  errors: string[];
  warnings: string[];
}

/**
 * Options for parsing
 */
export interface ParseOptions {
  /** Whether to be strict about format requirements */
  strict?: boolean;
  /** Default speaker if none specified */
  defaultSpeaker?: 'M' | 'F';
  /** Whether to allow NARRATOR as a speaker */
  allowNarrator?: boolean;
}

const DEFAULT_PARSE_OPTIONS: ParseOptions = {
  strict: false,
  defaultSpeaker: 'M',
  allowNarrator: true,
};

// ============================================================================
// Main Parser Function
// ============================================================================

/**
 * Parse a screenplay from raw text.
 *
 * Extracts:
 * - Title
 * - Characters (with names and descriptions)
 * - Scenes (with settings and dialogue)
 * - Dialogue lines (with speaker, text, emotion, action)
 *
 * @param rawText - The raw screenplay text
 * @param options - Parsing options
 * @returns ParseResult with screenplay data or errors
 *
 * **Validates: Requirements 1.5, 2.1**
 */
export function parseScreenplay(rawText: string, options: ParseOptions = {}): ParseResult {
  const opts = { ...DEFAULT_PARSE_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate input
  if (!rawText || typeof rawText !== 'string') {
    return {
      success: false,
      errors: ['Input must be a non-empty string'],
      warnings: [],
    };
  }

  const trimmedText = rawText.trim();

  // Check if it's JSON (which is invalid for screenplay format)
  if (isLikelyJSON(trimmedText)) {
    return {
      success: false,
      errors: ['Input appears to be JSON, not screenplay format'],
      warnings: [],
    };
  }

  // Parse title
  const title = parseTitle(trimmedText, warnings);

  // Parse characters
  const characters = parseCharacters(trimmedText, opts, warnings);

  // Parse scenes
  const scenes = parseScenes(trimmedText, opts, warnings);

  // Validate we have content
  if (scenes.length === 0) {
    errors.push('No scenes or dialogue found in screenplay');
  }

  const totalDialogueLines = scenes.reduce((sum, scene) => sum + scene.dialogue.length, 0);
  if (totalDialogueLines === 0) {
    errors.push('No dialogue lines found in screenplay');
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }

  return {
    success: true,
    screenplay: {
      title,
      characters,
      scenes,
      rawText,
    },
    errors: [],
    warnings,
  };
}

// ============================================================================
// Title Parsing
// ============================================================================

/**
 * Parse the title from screenplay text
 */
function parseTitle(text: string, warnings: string[]): string {
  // Try multiple title patterns
  const patterns = [/TITLE:\s*(.+?)(?:\n|$)/i, /^#\s*(.+?)(?:\n|$)/m, /^"(.+?)"(?:\n|$)/m];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  warnings.push('No title found, using default');
  return 'Untitled Screenplay';
}

// ============================================================================
// Character Parsing
// ============================================================================

/**
 * Parse characters from screenplay text
 */
function parseCharacters(
  text: string,
  opts: ParseOptions,
  _warnings: string[]
): ScreenplayCharacter[] {
  const characters: ScreenplayCharacter[] = [];

  // Look for CHARACTERS section
  const sectionMatch = text.match(/CHARACTERS:\s*([\s\S]*?)(?=---|\n\n\n|SCENE\s*\d|$)/i);

  if (sectionMatch) {
    const section = sectionMatch[1];

    // Parse M character
    const mPatterns = [
      /-\s*M\s*\(([^)]+)\):\s*(.+)/i,
      /-\s*M\s*\(([^)]+)\)/i,
      /M\s*[-–]\s*([^:,\n]+)(?::\s*(.+))?/i,
    ];

    for (const pattern of mPatterns) {
      const match = section.match(pattern);
      if (match) {
        characters.push({
          id: 'M',
          name: match[1].trim(),
          description: match[2]?.trim() || 'Male character',
        });
        break;
      }
    }

    // Parse F character
    const fPatterns = [
      /-\s*F\s*\(([^)]+)\):\s*(.+)/i,
      /-\s*F\s*\(([^)]+)\)/i,
      /F\s*[-–]\s*([^:,\n]+)(?::\s*(.+))?/i,
    ];

    for (const pattern of fPatterns) {
      const match = section.match(pattern);
      if (match) {
        characters.push({
          id: 'F',
          name: match[1].trim(),
          description: match[2]?.trim() || 'Female character',
        });
        break;
      }
    }
  }

  // If no characters found, infer from dialogue
  if (characters.length === 0) {
    const hasMSpeaker = /\bM:/i.test(text);
    const hasFSpeaker = /\bF:/i.test(text);
    const hasNarrator = /\bNARRATOR:/i.test(text);

    if (hasMSpeaker) {
      characters.push({
        id: 'M',
        name: 'James',
        description: 'Male speaker',
      });
    }

    if (hasFSpeaker) {
      characters.push({
        id: 'F',
        name: 'Sarah',
        description: 'Female speaker',
      });
    }

    // If only narrator, use default speaker
    if (characters.length === 0 && hasNarrator) {
      characters.push({
        id: opts.defaultSpeaker!,
        name: opts.defaultSpeaker === 'M' ? 'James' : 'Sarah',
        description: 'Narrator',
      });
    }

    // Fallback to default
    if (characters.length === 0) {
      // Note: warnings parameter available but not used for now
      characters.push({
        id: opts.defaultSpeaker!,
        name: opts.defaultSpeaker === 'M' ? 'James' : 'Sarah',
        description: 'Default character',
      });
    }
  }

  return characters;
}

// ============================================================================
// Scene Parsing
// ============================================================================

/**
 * Parse scenes from screenplay text
 */
function parseScenes(text: string, opts: ParseOptions, _warnings: string[]): ScreenplayScene[] {
  const scenes: ScreenplayScene[] = [];

  // Try to split by scene markers
  const sceneBlocks = splitIntoSceneBlocks(text);

  if (sceneBlocks.length > 0) {
    for (const block of sceneBlocks) {
      const scene = parseSceneBlock(block, opts);
      if (scene && scene.dialogue.length > 0) {
        scenes.push(scene);
      }
    }
  }

  // If no scenes found, treat entire text as one scene
  if (scenes.length === 0) {
    const dialogue = extractAllDialogue(text, opts);
    if (dialogue.length > 0) {
      scenes.push({
        sceneNumber: 1,
        setting: 'Unspecified location',
        dialogue,
      });
    }
  }

  // Renumber scenes if needed
  scenes.forEach((scene, index) => {
    scene.sceneNumber = index + 1;
  });

  return scenes;
}

/**
 * Split text into scene blocks
 */
function splitIntoSceneBlocks(text: string): string[] {
  const blocks: string[] = [];

  // Try splitting by "---" dividers first
  const dividerBlocks = text.split(/\n---+\n/).filter((b) => b.trim());

  // Check if any block contains SCENE header
  const hasSceneHeaders = dividerBlocks.some((b) => /SCENE\s*\d+/i.test(b));

  if (hasSceneHeaders) {
    // Use divider blocks
    for (const block of dividerBlocks) {
      if (/SCENE\s*\d+/i.test(block) || /\b(M|F|NARRATOR):/i.test(block)) {
        blocks.push(block);
      }
    }
  } else {
    // Try splitting by SCENE headers
    const sceneMatches = text.split(/(?=SCENE\s*\d+)/i).filter((b) => b.trim());
    if (sceneMatches.length > 1) {
      blocks.push(...sceneMatches);
    } else {
      // No clear scene structure, return entire text
      blocks.push(text);
    }
  }

  return blocks;
}

/**
 * Parse a single scene block
 */
function parseSceneBlock(block: string, opts: ParseOptions): ScreenplayScene | null {
  // Extract scene header
  const headerMatch = block.match(/SCENE\s*(\d+):\s*(.+?)(?:\n|$)/i);

  let sceneNumber = 1;
  let setting = 'Unspecified location';

  if (headerMatch) {
    sceneNumber = parseInt(headerMatch[1], 10);
    setting = headerMatch[2].trim();
  }

  // Extract dialogue
  const dialogue = extractDialogueFromBlock(block, opts);

  if (dialogue.length === 0) {
    return null;
  }

  return {
    sceneNumber,
    setting,
    dialogue,
  };
}

// ============================================================================
// Dialogue Extraction
// ============================================================================

/**
 * Extract all dialogue from text
 */
function extractAllDialogue(text: string, opts: ParseOptions): ScreenplayLine[] {
  return extractDialogueFromBlock(text, opts);
}

/**
 * Extract dialogue lines from a text block
 */
function extractDialogueFromBlock(block: string, opts: ParseOptions): ScreenplayLine[] {
  const dialogue: ScreenplayLine[] = [];
  const lines = block.split('\n');

  let currentSpeaker: 'M' | 'F' | 'NARRATOR' | null = null;
  let currentLine = '';
  let currentEmotion: string | undefined;
  let currentAction: string | undefined;

  const flushCurrentDialogue = () => {
    if (currentSpeaker && currentLine.trim()) {
      // Map NARRATOR to default speaker if not allowed
      let speaker = currentSpeaker;
      if (speaker === 'NARRATOR' && !opts.allowNarrator) {
        speaker = opts.defaultSpeaker!;
      }

      dialogue.push({
        speaker,
        line: cleanDialogueLine(currentLine),
        emotion: currentEmotion,
        action: currentAction,
      });
    }
    currentLine = '';
    currentEmotion = undefined;
    currentAction = undefined;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and scene headers
    if (!trimmed || /^SCENE\s*\d+/i.test(trimmed) || /^CHARACTERS:/i.test(trimmed)) {
      continue;
    }

    // Check for speaker label
    const speakerMatch = trimmed.match(/^(M|F|NARRATOR):\s*(.*)$/i);

    if (speakerMatch) {
      // Flush previous dialogue
      flushCurrentDialogue();

      // Start new dialogue
      currentSpeaker = speakerMatch[1].toUpperCase() as 'M' | 'F' | 'NARRATOR';
      currentLine = speakerMatch[2];
    } else if (currentSpeaker) {
      // Check for emotion annotation (emotion) or (beat)
      const emotionMatch = trimmed.match(/^\(([^)]+)\)$/);
      if (emotionMatch) {
        currentEmotion = emotionMatch[1];
        continue;
      }

      // Check for action annotation [action]
      const actionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (actionMatch) {
        currentAction = actionMatch[1];
        continue;
      }

      // Check for inline emotion at start of line
      const inlineEmotionMatch = trimmed.match(/^\(([^)]+)\)\s*(.+)$/);
      if (inlineEmotionMatch) {
        currentEmotion = inlineEmotionMatch[1];
        currentLine += ' ' + inlineEmotionMatch[2];
        continue;
      }

      // Continue current dialogue (if not a metadata line)
      if (!isMetadataLine(trimmed)) {
        currentLine += ' ' + trimmed;
      }
    }
  }

  // Flush final dialogue
  flushCurrentDialogue();

  return dialogue;
}

/**
 * Clean a dialogue line (remove extra whitespace, etc.)
 */
function cleanDialogueLine(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+([.,!?])/g, '$1');
}

/**
 * Check if a line is metadata (not dialogue content)
 */
function isMetadataLine(line: string): boolean {
  const metadataPatterns = [
    /^TITLE:/i,
    /^CHARACTERS:/i,
    /^SCENE\s*\d+/i,
    /^---+$/,
    /^#/,
    /^INT\./i,
    /^EXT\./i,
  ];

  return metadataPatterns.some((p) => p.test(line));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if text is likely JSON
 */
function isLikelyJSON(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Count total dialogue lines in a screenplay
 */
export function countDialogueLines(screenplay: ScreenplayOutput): number {
  return screenplay.scenes.reduce((sum, scene) => sum + scene.dialogue.length, 0);
}

/**
 * Get all dialogue text as a single string (for analysis)
 */
export function getAllDialogueText(screenplay: ScreenplayOutput): string {
  return screenplay.scenes.flatMap((scene) => scene.dialogue.map((d) => d.line)).join(' ');
}

/**
 * Check if screenplay has speaker labels
 */
export function hasSpeakerLabels(text: string): boolean {
  return /\b(M|F|NARRATOR):/i.test(text);
}

/**
 * Extract just the dialogue lines from raw text (without full parsing)
 */
export function extractDialogueLinesQuick(text: string): string[] {
  const lines: string[] = [];
  const matches = text.matchAll(/(?:M|F|NARRATOR):\s*(.+?)(?=\n(?:M|F|NARRATOR):|$)/gis);

  for (const match of matches) {
    const line = match[1].trim().replace(/\s+/g, ' ');
    if (line) {
      lines.push(line);
    }
  }

  return lines;
}
