import { promises as fs } from 'fs';
import path from 'path';
import type { AudioFile, SpeedVariant, AudioGenerationResult } from './types';
import { generateAudioFilename } from './types';

const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

interface GoogleTTSRequest {
  input: {
    text: string;
  };
  voice: {
    languageCode: string;
    name?: string;
    ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  };
  audioConfig: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
    speakingRate?: number;
    pitch?: number;
  };
}

interface GoogleTTSResponse {
  audioContent: string; // base64 encoded audio
}

// Google Cloud TTS voice names for English
export const GOOGLE_VOICES = {
  male: 'en-US-Neural2-D', // Male neural voice
  female: 'en-US-Neural2-F', // Female neural voice
} as const;

/**
 * Synthesize speech using Google Cloud TTS API
 */
export async function synthesizeWithGoogle(
  text: string,
  languageCode: string,
  voiceName: string,
  gender: 'MALE' | 'FEMALE',
  speakingRate: number = 1.0
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const request: GoogleTTSRequest = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
      ssmlGender: gender,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate,
    },
  };

  const response = await fetch(`${GOOGLE_TTS_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google TTS API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GoogleTTSResponse;
  return Buffer.from(data.audioContent, 'base64');
}

/**
 * Generate audio at a specific speed
 */
export async function generateWithGoogleAtSpeed(
  text: string,
  languageCode: string,
  voiceName: string,
  gender: 'MALE' | 'FEMALE',
  speed: SpeedVariant,
  outputDir: string,
  sentenceId: number | string,
  speaker: 'M' | 'F'
): Promise<AudioGenerationResult> {
  try {
    // Convert speed variant to speaking rate
    const speakingRate = speed === '0.8x' ? 0.8 : speed === '1.0x' ? 1.0 : 1.2;

    const audioBuffer = await synthesizeWithGoogle(
      text,
      languageCode,
      voiceName,
      gender,
      speakingRate
    );

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename and save
    const filename = generateAudioFilename(sentenceId, speaker, speed);
    const filePath = path.join(outputDir, filename);
    await fs.writeFile(filePath, audioBuffer);

    // Estimate duration (rough estimate: ~150 words per minute at 1.0x)
    const wordCount = text.split(/\s+/).length;
    const baseDuration = (wordCount / 150) * 60; // seconds
    const adjustedDuration = baseDuration / speakingRate;

    const audioFile: AudioFile = {
      sentenceId: typeof sentenceId === 'string' ? parseInt(sentenceId) || 0 : sentenceId,
      speaker,
      speed,
      path: filePath,
      duration: adjustedDuration,
    };

    return { success: true, audioFile };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate all speed variants for a sentence using Google TTS
 */
export async function generateAllSpeedsWithGoogle(
  text: string,
  languageCode: string,
  voiceName: string,
  gender: 'MALE' | 'FEMALE',
  outputDir: string,
  sentenceId: number | string,
  speaker: 'M' | 'F'
): Promise<AudioGenerationResult[]> {
  const speeds: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
  const results: AudioGenerationResult[] = [];

  for (const speed of speeds) {
    const result = await generateWithGoogleAtSpeed(
      text,
      languageCode,
      voiceName,
      gender,
      speed,
      outputDir,
      sentenceId,
      speaker
    );
    results.push(result);
  }

  return results;
}
