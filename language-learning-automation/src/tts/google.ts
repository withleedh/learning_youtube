import { promises as fs } from 'fs';
import path from 'path';
import type { AudioFile, SpeedVariant, AudioGenerationResult } from './types';
import { generateAudioFilename } from './types';

const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

interface GoogleTTSRequest {
  input: {
    text?: string;
    ssml?: string;
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
 * Get access token from gcloud CLI (Application Default Credentials)
 */
async function getAccessToken(): Promise<string> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
  } catch (error) {
    throw new Error(
      'Failed to get gcloud access token. Make sure you are logged in with: gcloud auth login'
    );
  }
}

/**
 * Synthesize speech using Google Cloud TTS API with ADC
 */
export async function synthesizeWithGoogle(
  text: string,
  languageCode: string,
  voiceName: string,
  gender: 'MALE' | 'FEMALE',
  speakingRate: number = 1.0
): Promise<Buffer> {
  const accessToken = await getAccessToken();

  // SSML로 감싸서 끝에 무음 추가 (Google TTS 끝 잘림 방지)
  const ssmlText = `<speak>${text}<break time="300ms"/></speak>`;

  const request: GoogleTTSRequest = {
    input: { ssml: ssmlText },
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

  const response = await fetch(GOOGLE_TTS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Goog-User-Project': process.env.GOOGLE_CLOUD_PROJECT || 'project-7041221e-8ba7-4667-971',
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

    // Get actual audio duration from the file
    let duration = 3.0; // fallback
    try {
      const { parseBuffer } = await import('music-metadata');
      const metadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
      duration = metadata.format.duration || 3.0;
    } catch {
      // Fallback: estimate based on character count (better for Asian languages)
      const charCount = text.length;
      const baseDuration = charCount * 0.12; // ~0.12 seconds per character
      duration = baseDuration / speakingRate;
    }

    const audioFile: AudioFile = {
      sentenceId: typeof sentenceId === 'string' ? parseInt(sentenceId) || 0 : sentenceId,
      speaker,
      speed,
      path: filePath,
      duration,
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
