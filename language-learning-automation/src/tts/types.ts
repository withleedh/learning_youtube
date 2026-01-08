import { z } from 'zod';

// Speed variants for interval training
export const speedVariants = ['0.8x', '1.0x', '1.2x'] as const;
export type SpeedVariant = (typeof speedVariants)[number];

// Speed multiplier mapping
export const speedMultipliers: Record<SpeedVariant, number> = {
  '0.8x': 0.8,
  '1.0x': 1.0,
  '1.2x': 1.2,
};

// TTS Provider type
export type TTSProvider = 'openai' | 'google';

// TTS Options schema
export const ttsOptionsSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  voice: z.string().min(1, 'Voice is required'),
  speed: z.number().min(0.5).max(2.0),
  provider: z.enum(['openai', 'google']),
  languageCode: z.string().min(1, 'Language code is required'),
});

export type TTSOptions = z.infer<typeof ttsOptionsSchema>;

// Audio file metadata schema
export const audioFileSchema = z.object({
  sentenceId: z.number().int().positive(),
  speaker: z.enum(['M', 'F']),
  speed: z.enum(speedVariants),
  path: z.string().min(1, 'Path is required'),
  duration: z.number().min(0, 'Duration must be non-negative'),
});

export type AudioFile = z.infer<typeof audioFileSchema>;

// Audio generation result
export interface AudioGenerationResult {
  success: boolean;
  audioFile?: AudioFile;
  error?: string;
}

// TTS Generator interface
export interface TTSGeneratorInterface {
  generate(
    text: string,
    voice: string,
    speed: SpeedVariant,
    outputPath: string
  ): Promise<AudioGenerationResult>;
}

// Voice selection helper
export function selectVoice(speaker: 'M' | 'F', maleVoice: string, femaleVoice: string): string {
  return speaker === 'M' ? maleVoice : femaleVoice;
}

// Generate audio filename
export function generateAudioFilename(
  sentenceId: number,
  speaker: 'M' | 'F',
  speed: SpeedVariant
): string {
  return `sentence_${sentenceId.toString().padStart(2, '0')}_${speaker}_${speed.replace('.', '')}.mp3`;
}

// Calculate expected audio files count
export function calculateExpectedAudioCount(sentenceCount: number): number {
  return sentenceCount * speedVariants.length;
}
