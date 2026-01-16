import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { SurvivalScript, SurvivalRound, SurvivalCharacter } from './types';
import { synthesizeWithGoogle } from '../tts/google';
import type { EdgeVoice } from '../tts/edge';

// =============================================================================
// Types and Schemas
// =============================================================================

/**
 * TTS Provider type for survival audio
 */
export type SurvivalTTSProvider = 'google' | 'edge';

/**
 * Gender type for TTS voices
 */
export type VoiceGender = 'MALE' | 'FEMALE';

/**
 * Voice entry with name and gender
 */
export interface VoiceEntry {
  name: string;
  gender: VoiceGender;
  /** Pitch adjustment in semitones (-20.0 to 20.0) */
  pitch?: number;
}

/**
 * Available Google TTS voices for English (Neural2 series)
 * Each voice has a specific gender that must match the API call
 */
export const ENGLISH_VOICES: VoiceEntry[] = [
  // Male voices
  { name: 'en-US-Neural2-A', gender: 'MALE' },
  { name: 'en-US-Neural2-D', gender: 'MALE' },
  { name: 'en-US-Neural2-I', gender: 'MALE' },
  { name: 'en-US-Neural2-J', gender: 'MALE' },
  // Female voices
  { name: 'en-US-Neural2-C', gender: 'FEMALE' },
  { name: 'en-US-Neural2-E', gender: 'FEMALE' },
  { name: 'en-US-Neural2-F', gender: 'FEMALE' },
  { name: 'en-US-Neural2-G', gender: 'FEMALE' },
  { name: 'en-US-Neural2-H', gender: 'FEMALE' },
];

/**
 * Available Google TTS voices for Korean
 */
export const KOREAN_VOICES: VoiceEntry[] = [
  { name: 'ko-KR-Neural2-A', gender: 'FEMALE' },
  { name: 'ko-KR-Neural2-B', gender: 'FEMALE' },
  { name: 'ko-KR-Neural2-C', gender: 'MALE' },
  { name: 'ko-KR-Chirp3-HD-Achird', gender: 'FEMALE' },
];

/**
 * Voice configuration for survival content
 * Supports character-specific voices for cat and dog
 * Requirements: 11.1, 11.2, 11.6
 */
export interface SurvivalAudioConfig {
  provider: SurvivalTTSProvider;
  /** Korean TTS voice for situation narration */
  situationVoice: VoiceEntry;
  /** Korean language code */
  koreanLanguageCode: string;
  /** English TTS voice for cat character */
  catVoice: VoiceEntry;
  /** English TTS voice for dog character */
  dogVoice: VoiceEntry;
  /** English language code */
  englishLanguageCode: string;
  /** Korean TTS voice for explanation */
  explanationVoice: VoiceEntry;
}

/**
 * Audio file metadata for survival rounds
 */
export const survivalAudioFileSchema = z.object({
  roundId: z.number().int().positive(),
  phase: z.enum(['situation', 'dogAnswer', 'catAnswer', 'explanation']),
  path: z.string().min(1),
  duration: z.number().min(0),
  text: z.string().min(1),
});

export type SurvivalAudioFile = z.infer<typeof survivalAudioFileSchema>;

/**
 * Audio generation result for survival
 */
export interface SurvivalAudioResult {
  success: boolean;
  audioFile?: SurvivalAudioFile;
  error?: string;
}

/**
 * Full audio set for a single round
 */
export interface RoundAudioSet {
  roundId: number;
  situation?: SurvivalAudioFile;
  dogAnswer?: SurvivalAudioFile;
  catAnswer?: SurvivalAudioFile;
  explanation?: SurvivalAudioFile;
}

/**
 * Sound effects paths for survival game show
 * Requirements: 11.3, 11.4
 */
export interface SurvivalSFXPaths {
  /** Sound effect for floor drop animation */
  floorDrop: string;
  /** Sound effect for HP decrease */
  hpDecrease: string;
  /** Sound effect for victory celebration */
  victory: string;
  /** Sound effect for round start */
  roundStart: string;
}

/**
 * Complete audio files structure for survival video
 */
export interface SurvivalAudioFiles {
  /** Intro audio (optional) */
  intro?: string;
  /** Audio files for each round */
  rounds: Array<{
    situation?: string;
    dogAnswer?: string;
    catAnswer?: string;
    explanation?: string;
  }>;
  /** Ending audio (optional) */
  ending?: string;
  /** Sound effects paths */
  sfx: SurvivalSFXPaths;
}

/**
 * Audio manifest for a survival script
 */
export interface SurvivalAudioManifest {
  scriptDate: string;
  channelId: string;
  rounds: RoundAudioSet[];
  totalDuration: number;
  sfx: SurvivalSFXPaths;
}

// =============================================================================
// Default Configurations
// =============================================================================

/**
 * Default voice configuration for survival content
 * Cat and dog have different English voices for character distinction
 * Requirements: 2.5, 11.2
 */
export const DEFAULT_SURVIVAL_AUDIO_CONFIG: SurvivalAudioConfig = {
  provider: 'google',
  // Korean voices for situation and explanation
  situationVoice: { name: 'ko-KR-Chirp3-HD-Achird', gender: 'FEMALE' },
  koreanLanguageCode: 'ko-KR',
  // Character-specific English voices (will be randomized per episode)
  catVoice: { name: 'en-US-Neural2-F', gender: 'FEMALE' }, // Female voice for cat
  dogVoice: { name: 'en-US-Neural2-D', gender: 'MALE' }, // Male voice for dog
  englishLanguageCode: 'en-US',
  // Explanation voice (Korean)
  explanationVoice: { name: 'ko-KR-Chirp3-HD-Achird', gender: 'FEMALE' },
};

/**
 * Get random voice from a list
 */
export function getRandomVoice(voices: VoiceEntry[], seed?: number): VoiceEntry {
  const index =
    seed !== undefined ? Math.abs(seed) % voices.length : Math.floor(Math.random() * voices.length);
  return voices[index];
}

/**
 * Get random English male voice
 */
export function getRandomMaleVoice(seed?: number): VoiceEntry {
  const maleVoices = ENGLISH_VOICES.filter((v) => v.gender === 'MALE');
  return getRandomVoice(maleVoices, seed);
}

/**
 * Get random English female voice
 */
export function getRandomFemaleVoice(seed?: number): VoiceEntry {
  const femaleVoices = ENGLISH_VOICES.filter((v) => v.gender === 'FEMALE');
  return getRandomVoice(femaleVoices, seed);
}

/**
 * Character voice presets
 * Gender is fixed, voice is randomly selected from available voices
 */
export const CHARACTER_VOICE_PRESETS = {
  cat: {
    gender: 'FEMALE' as VoiceGender,
    pitch: 6, // High pitch for cute cat voice
  },
  dog: {
    gender: 'MALE' as VoiceGender,
    pitch: -3, // Lower pitch for friendly dog voice
  },
} as const;

/**
 * Get random voice by gender
 */
export function getRandomVoiceByGender(gender: VoiceGender, seed?: number): VoiceEntry {
  const voices = ENGLISH_VOICES.filter((v) => v.gender === gender);
  return getRandomVoice(voices, seed);
}

/**
 * Create voice config for survival content
 * Gender is fixed per character, voice is randomly selected
 *
 * Character voice characteristics:
 * - Cat: Female voice (random) + pitch +6 (cute/playful)
 * - Dog: Male voice (random) + pitch -3 (friendly/warm)
 */
export function createFixedVoiceConfig(seed?: number): SurvivalAudioConfig {
  // Use seed for reproducible random selection
  const catSeed = seed !== undefined ? seed : Math.floor(Math.random() * 1000);
  const dogSeed = seed !== undefined ? seed + 1 : Math.floor(Math.random() * 1000);

  // Get random voice by fixed gender
  const baseCatVoice = getRandomVoiceByGender(CHARACTER_VOICE_PRESETS.cat.gender, catSeed);
  const baseDogVoice = getRandomVoiceByGender(CHARACTER_VOICE_PRESETS.dog.gender, dogSeed);

  const catVoice: VoiceEntry = {
    ...baseCatVoice,
    pitch: CHARACTER_VOICE_PRESETS.cat.pitch,
  };

  const dogVoice: VoiceEntry = {
    ...baseDogVoice,
    pitch: CHARACTER_VOICE_PRESETS.dog.pitch,
  };

  // Korean voice for narration (no pitch adjustment)
  const koreanVoice: VoiceEntry = { name: 'ko-KR-Chirp3-HD-Achird', gender: 'FEMALE' };

  return {
    provider: 'google',
    situationVoice: koreanVoice,
    koreanLanguageCode: 'ko-KR',
    catVoice,
    dogVoice,
    englishLanguageCode: 'en-US',
    explanationVoice: koreanVoice,
  };
}

/**
 * Create randomized voice config for an episode
 * Ensures cat and dog have different voices with character-specific pitch
 *
 * Character voice characteristics:
 * - Cat: Higher pitch (+3 to +6 semitones) for cute/playful sound
 * - Dog: Lower pitch (-2 to -4 semitones) for friendly/warm sound
 *
 * @deprecated Use createFixedVoiceConfig() for consistent character voices
 */
export function createRandomizedVoiceConfig(seed?: number): SurvivalAudioConfig {
  // Use seed to get consistent but different voices for cat and dog
  const catSeed = seed !== undefined ? seed : Math.floor(Math.random() * 1000);
  const dogSeed = seed !== undefined ? seed + 1 : Math.floor(Math.random() * 1000);

  // Randomly decide if cat is male or female
  const catIsFemale = catSeed % 2 === 0;

  const baseCatVoice = catIsFemale ? getRandomFemaleVoice(catSeed) : getRandomMaleVoice(catSeed);
  const baseDogVoice = catIsFemale ? getRandomMaleVoice(dogSeed) : getRandomFemaleVoice(dogSeed);

  // Add character-specific pitch adjustments
  // Cat: Higher pitch for cute/playful character (+3 to +6 semitones)
  const catPitch = 3 + (catSeed % 4); // 3, 4, 5, or 6
  // Dog: Lower pitch for friendly/warm character (-2 to -4 semitones)
  const dogPitch = -2 - (dogSeed % 3); // -2, -3, or -4

  const catVoice: VoiceEntry = {
    ...baseCatVoice,
    pitch: catPitch,
  };

  const dogVoice: VoiceEntry = {
    ...baseDogVoice,
    pitch: dogPitch,
  };

  // Random Korean voice for narration (no pitch adjustment for narrator)
  const koreanVoice = getRandomVoice(KOREAN_VOICES, catSeed);

  return {
    provider: 'google',
    situationVoice: koreanVoice,
    koreanLanguageCode: 'ko-KR',
    catVoice,
    dogVoice,
    englishLanguageCode: 'en-US',
    explanationVoice: koreanVoice,
  };
}

/**
 * Default sound effects paths
 * These should be placed in public/sfx/ directory
 */
export const DEFAULT_SFX_PATHS: SurvivalSFXPaths = {
  floorDrop: 'sfx/floor_drop.mp3',
  hpDecrease: 'sfx/hp_decrease.mp3',
  victory: 'sfx/victory.mp3',
  roundStart: 'sfx/round_start.mp3',
};

// =============================================================================
// Constants
// =============================================================================

/** Maximum retry attempts for TTS generation */
const MAX_RETRIES = 3;
/** Delay between retries in milliseconds */
const RETRY_DELAY_MS = 1000;
/** Delay between API calls to avoid rate limiting */
const API_CALL_DELAY_MS = 200;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate audio filename for survival round phase
 */
export function generateSurvivalAudioFilename(
  roundId: number,
  phase: SurvivalAudioFile['phase']
): string {
  return `round_${roundId.toString().padStart(2, '0')}_${phase}.mp3`;
}

/**
 * Get the appropriate voice for a character
 */
export function getCharacterVoice(
  character: SurvivalCharacter,
  config: SurvivalAudioConfig
): VoiceEntry {
  return character === 'cat' ? config.catVoice : config.dogVoice;
}

/**
 * Get the answer text for a specific character from a round
 */
export function getCharacterAnswerText(round: SurvivalRound, character: SurvivalCharacter): string {
  if (round.konglishAnswer.character === character) {
    return round.konglishAnswer.text;
  }
  return round.nativeAnswer.text;
}

// =============================================================================
// TTS Generation Functions
// =============================================================================

/**
 * Generate TTS audio using Google TTS
 */
async function generateWithGoogleTTS(
  text: string,
  languageCode: string,
  voice: VoiceEntry,
  outputPath: string,
  speed: number = 1.0
): Promise<{ success: boolean; duration: number; error?: string }> {
  try {
    const audioBuffer = await synthesizeWithGoogle(
      text,
      languageCode,
      voice.name,
      voice.gender, // Use the correct gender from voice entry
      speed, // Use provided speed
      voice.pitch ?? 0.0 // Use character-specific pitch or default
    );

    await fs.writeFile(outputPath, audioBuffer);

    // Get actual audio duration
    let duration = 3.0; // fallback
    try {
      const { parseBuffer } = await import('music-metadata');
      const metadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
      duration = metadata.format.duration || 3.0;
    } catch {
      // Fallback: estimate based on character count
      const charCount = text.length;
      duration = charCount * 0.1; // ~0.1 seconds per character
    }

    return { success: true, duration };
  } catch (error) {
    return {
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate TTS audio using Edge TTS
 */
async function generateWithEdgeTTS(
  text: string,
  voice: EdgeVoice,
  outputPath: string
): Promise<{ success: boolean; duration: number; error?: string }> {
  try {
    const { EdgeTTS } = await import('@andresaya/edge-tts');

    const tts = new EdgeTTS();
    await tts.synthesize(text, voice, { rate: '+0%' });

    const audioBuffer = await tts.toBuffer();
    await fs.writeFile(outputPath, audioBuffer);

    // Estimate duration based on text length
    const wordCount = text.split(/\s+/).length;
    const duration = Math.max((wordCount / 150) * 60, 1.5);

    return { success: true, duration };
  } catch (error) {
    return {
      success: false,
      duration: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// Phase Audio Generation
// =============================================================================

/**
 * Generate audio for a single phase of a survival round
 */
export async function generatePhaseAudio(
  roundId: number,
  phase: SurvivalAudioFile['phase'],
  text: string,
  config: SurvivalAudioConfig,
  outputDir: string,
  _characterForAnswer?: SurvivalCharacter
): Promise<SurvivalAudioResult> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const filename = generateSurvivalAudioFilename(roundId, phase);
  const outputPath = path.join(outputDir, filename);

  // Determine language, voice, and speed based on phase
  let languageCode: string;
  let voice: VoiceEntry;
  let speed = 1.0; // Default speed

  switch (phase) {
    case 'situation':
      // Situation is in Korean with pitch 3 and speed 1.2x
      languageCode = config.koreanLanguageCode;
      voice = { ...config.situationVoice, pitch: 3 };
      speed = 1.2;
      break;
    case 'dogAnswer':
      // Dog answer is in English with dog's voice
      languageCode = config.englishLanguageCode;
      voice = config.dogVoice;
      break;
    case 'catAnswer':
      // Cat answer is in English with cat's voice
      languageCode = config.englishLanguageCode;
      voice = config.catVoice;
      break;
    case 'explanation':
      // Explanation is in Korean
      languageCode = config.koreanLanguageCode;
      voice = config.explanationVoice;
      break;
    default:
      return {
        success: false,
        error: `Unknown phase: ${phase}`,
      };
  }

  let result: { success: boolean; duration: number; error?: string };

  if (config.provider === 'google') {
    result = await generateWithGoogleTTS(text, languageCode, voice, outputPath, speed);
  } else {
    result = await generateWithEdgeTTS(text, voice.name as EdgeVoice, outputPath);
  }

  if (result.success) {
    return {
      success: true,
      audioFile: {
        roundId,
        phase,
        path: outputPath,
        duration: result.duration,
        text,
      },
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

// =============================================================================
// Round Audio Generation
// =============================================================================

/**
 * Generate all audio files for a single survival round
 * Requirements: 11.1, 11.2, 11.6
 */
export async function generateRoundAudio(
  round: SurvivalRound,
  config: SurvivalAudioConfig,
  outputDir: string,
  onProgress?: (phase: string) => void
): Promise<RoundAudioSet> {
  const result: RoundAudioSet = { roundId: round.id };

  // Define phases with their text content
  const phases: Array<{
    phase: SurvivalAudioFile['phase'];
    text: string;
  }> = [
    { phase: 'situation', text: round.situation },
    { phase: 'dogAnswer', text: getCharacterAnswerText(round, 'dog') },
    { phase: 'catAnswer', text: getCharacterAnswerText(round, 'cat') },
    { phase: 'explanation', text: round.explanation },
  ];

  for (const { phase, text } of phases) {
    if (onProgress) {
      onProgress(phase);
    }

    let attempts = 0;
    let audioResult: SurvivalAudioResult | null = null;

    // Retry logic for TTS generation
    while (attempts < MAX_RETRIES) {
      audioResult = await generatePhaseAudio(round.id, phase, text, config, outputDir);

      if (audioResult.success) {
        break;
      }

      attempts++;
      if (attempts < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempts));
      }
    }

    if (audioResult?.success && audioResult.audioFile) {
      // Map phase to result property
      switch (phase) {
        case 'situation':
          result.situation = audioResult.audioFile;
          break;
        case 'dogAnswer':
          result.dogAnswer = audioResult.audioFile;
          break;
        case 'catAnswer':
          result.catAnswer = audioResult.audioFile;
          break;
        case 'explanation':
          result.explanation = audioResult.audioFile;
          break;
      }
    } else {
      console.error(
        `Failed to generate ${phase} audio for round ${round.id}: ${audioResult?.error}`
      );
    }

    // Small delay between phases to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, API_CALL_DELAY_MS));
  }

  return result;
}

// =============================================================================
// Full Script Audio Generation
// =============================================================================

/**
 * Audio generation result with durations
 */
export interface SurvivalAudioResultWithDurations {
  audioFiles: SurvivalAudioFiles;
  /** Audio durations per round */
  roundDurations: Array<{
    situation?: number;
    dogAnswer?: number;
    catAnswer?: number;
    explanation?: number;
  }>;
}

/**
 * Generate all audio files for a complete survival script
 * This is the main entry point for audio generation
 * Requirements: 11.1, 11.2, 11.6
 */
export async function generateSurvivalAudio(
  script: SurvivalScript,
  config: SurvivalAudioConfig,
  outputDir: string,
  onProgress?: (current: number, total: number, phase: string) => void
): Promise<SurvivalAudioResultWithDurations> {
  const roundAudioSets: RoundAudioSet[] = [];

  // Generate audio for each round
  for (let i = 0; i < script.rounds.length; i++) {
    const round = script.rounds[i];

    const roundAudio = await generateRoundAudio(round, config, outputDir, (phase) => {
      if (onProgress) {
        onProgress(i + 1, script.rounds.length, phase);
      }
    });

    roundAudioSets.push(roundAudio);
  }

  // Convert to SurvivalAudioFiles format
  const rounds = roundAudioSets.map((roundAudio) => ({
    situation: roundAudio.situation?.path,
    dogAnswer: roundAudio.dogAnswer?.path,
    catAnswer: roundAudio.catAnswer?.path,
    explanation: roundAudio.explanation?.path,
  }));

  // Extract durations for each round
  const roundDurations = roundAudioSets.map((roundAudio) => ({
    situation: roundAudio.situation?.duration,
    dogAnswer: roundAudio.dogAnswer?.duration,
    catAnswer: roundAudio.catAnswer?.duration,
    explanation: roundAudio.explanation?.duration,
  }));

  return {
    audioFiles: {
      rounds,
      sfx: DEFAULT_SFX_PATHS,
    },
    roundDurations,
  };
}

/**
 * Generate audio manifest with detailed metadata
 */
export async function generateSurvivalAudioManifest(
  script: SurvivalScript,
  config: SurvivalAudioConfig,
  outputDir: string,
  onProgress?: (current: number, total: number, phase: string) => void
): Promise<SurvivalAudioManifest> {
  const rounds: RoundAudioSet[] = [];
  let totalDuration = 0;

  // Generate audio for each round
  for (let i = 0; i < script.rounds.length; i++) {
    const round = script.rounds[i];

    const roundAudio = await generateRoundAudio(round, config, outputDir, (phase) => {
      if (onProgress) {
        onProgress(i + 1, script.rounds.length, phase);
      }
    });

    rounds.push(roundAudio);

    // Calculate round duration
    const roundDuration = getRoundAudioDuration(roundAudio);
    totalDuration += roundDuration;
  }

  return {
    scriptDate: script.date,
    channelId: script.channelId,
    rounds,
    totalDuration,
    sfx: DEFAULT_SFX_PATHS,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get total audio duration for a round
 */
export function getRoundAudioDuration(roundAudio: RoundAudioSet): number {
  return (
    (roundAudio.situation?.duration || 0) +
    (roundAudio.dogAnswer?.duration || 0) +
    (roundAudio.catAnswer?.duration || 0) +
    (roundAudio.explanation?.duration || 0)
  );
}

/**
 * Save audio manifest to JSON file
 */
export async function saveSurvivalAudioManifest(
  manifest: SurvivalAudioManifest,
  outputDir: string
): Promise<string> {
  const manifestPath = path.join(outputDir, 'survival_audio_manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

/**
 * Load audio manifest from JSON file
 */
export async function loadSurvivalAudioManifest(
  manifestPath: string
): Promise<SurvivalAudioManifest> {
  const content = await fs.readFile(manifestPath, 'utf-8');
  return JSON.parse(content) as SurvivalAudioManifest;
}

/**
 * Create voice config with custom character voices
 */
export function createSurvivalVoiceConfig(
  options: Partial<SurvivalAudioConfig>
): SurvivalAudioConfig {
  return {
    ...DEFAULT_SURVIVAL_AUDIO_CONFIG,
    ...options,
  };
}

/**
 * Create voice config from voice names (for backward compatibility)
 */
export function createVoiceConfigFromNames(
  catVoiceName: string,
  catGender: VoiceGender,
  dogVoiceName: string,
  dogGender: VoiceGender
): SurvivalAudioConfig {
  return {
    ...DEFAULT_SURVIVAL_AUDIO_CONFIG,
    catVoice: { name: catVoiceName, gender: catGender },
    dogVoice: { name: dogVoiceName, gender: dogGender },
  };
}

/**
 * Get SFX paths with custom base directory
 */
export function getSFXPaths(baseDir: string = 'sfx'): SurvivalSFXPaths {
  return {
    floorDrop: path.join(baseDir, 'floor_drop.mp3'),
    hpDecrease: path.join(baseDir, 'hp_decrease.mp3'),
    victory: path.join(baseDir, 'victory.mp3'),
    roundStart: path.join(baseDir, 'round_start.mp3'),
  };
}

/**
 * Convert SurvivalAudioManifest to SurvivalAudioFiles format
 * Useful for passing to Remotion compositions
 */
export function manifestToAudioFiles(manifest: SurvivalAudioManifest): SurvivalAudioFiles {
  return {
    rounds: manifest.rounds.map((round) => ({
      situation: round.situation?.path,
      dogAnswer: round.dogAnswer?.path,
      catAnswer: round.catAnswer?.path,
      explanation: round.explanation?.path,
    })),
    sfx: manifest.sfx,
  };
}

/**
 * Create mock audio files for testing (without actual TTS API calls)
 */
export async function createMockSurvivalAudioFiles(
  script: SurvivalScript,
  outputDir: string
): Promise<SurvivalAudioFiles> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const rounds: SurvivalAudioFiles['rounds'] = [];

  for (const round of script.rounds) {
    const phases: SurvivalAudioFile['phase'][] = [
      'situation',
      'dogAnswer',
      'catAnswer',
      'explanation',
    ];

    const roundFiles: SurvivalAudioFiles['rounds'][0] = {};

    for (const phase of phases) {
      const filename = generateSurvivalAudioFilename(round.id, phase);
      const filePath = path.join(outputDir, filename);

      // Create empty placeholder file
      await fs.writeFile(filePath, Buffer.alloc(0));

      switch (phase) {
        case 'situation':
          roundFiles.situation = filePath;
          break;
        case 'dogAnswer':
          roundFiles.dogAnswer = filePath;
          break;
        case 'catAnswer':
          roundFiles.catAnswer = filePath;
          break;
        case 'explanation':
          roundFiles.explanation = filePath;
          break;
      }
    }

    rounds.push(roundFiles);
  }

  return {
    rounds,
    sfx: DEFAULT_SFX_PATHS,
  };
}
