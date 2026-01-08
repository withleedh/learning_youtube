import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import {
  type SpeedVariant,
  type AudioFile,
  type AudioGenerationResult,
  speedMultipliers,
  generateAudioFilename,
} from './types';

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

// OpenAI TTS voices
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Generate audio using OpenAI TTS API
 */
export async function generateWithOpenAI(
  text: string,
  voice: OpenAIVoice,
  speed: SpeedVariant,
  outputDir: string,
  sentenceId: number,
  speaker: 'M' | 'F'
): Promise<AudioGenerationResult> {
  try {
    const client = getOpenAIClient();
    const speedMultiplier = speedMultipliers[speed];

    // Generate audio
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      speed: speedMultiplier,
      response_format: 'mp3',
    });

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename and path
    const filename = generateAudioFilename(sentenceId, speaker, speed);
    const outputPath = path.join(outputDir, filename);

    // Write audio file
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);

    // Get file stats for duration estimation
    // Note: Actual duration would require audio parsing, using estimate here
    const stats = await fs.stat(outputPath);
    const estimatedDuration = stats.size / 16000; // Rough estimate for MP3

    const audioFile: AudioFile = {
      sentenceId,
      speaker,
      speed,
      path: outputPath,
      duration: estimatedDuration,
    };

    return { success: true, audioFile };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Generate all speed variants for a sentence using OpenAI TTS
 */
export async function generateAllSpeedsWithOpenAI(
  text: string,
  voice: OpenAIVoice,
  outputDir: string,
  sentenceId: number,
  speaker: 'M' | 'F'
): Promise<AudioGenerationResult[]> {
  const speeds: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
  const results: AudioGenerationResult[] = [];

  for (const speed of speeds) {
    const result = await generateWithOpenAI(text, voice, speed, outputDir, sentenceId, speaker);
    results.push(result);

    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}
