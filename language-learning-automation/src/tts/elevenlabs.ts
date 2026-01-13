import { promises as fs } from 'fs';
import path from 'path';
import type { AudioFile, SpeedVariant, AudioGenerationResult } from './types';
import { generateAudioFilename } from './types';

// ElevenLabs models
export const ELEVENLABS_MODELS = {
  multilingual_v2: 'eleven_multilingual_v2',
  turbo_v2_5: 'eleven_turbo_v2_5',
  v3_alpha: 'eleven_v3', // Latest, most expressive
} as const;

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Popular ElevenLabs voices
export const ELEVENLABS_VOICES = {
  // English voices
  rachel: '21m00Tcm4TlvDq8ikWAM', // Rachel - calm, young female
  drew: '29vD33N1CtxCmqQRPOHJ', // Drew - well-rounded male
  clyde: '2EiwWnXFnvU5JabPnv8n', // Clyde - war veteran male
  paul: '5Q0t7uMcjvnagumLfvZi', // Paul - ground reporter male
  domi: 'AZnzlk1XvdvUeBnXmlld', // Domi - strong female
  dave: 'CYw3kZ02Hs0563khs1Fj', // Dave - conversational male
  fin: 'D38z5RcWu1voky8WS1ja', // Fin - sailor male
  sarah: 'EXAVITQu4vr4xnSDxMaL', // Sarah - soft female
  antoni: 'ErXwobaYiN019PkySvjV', // Antoni - well-rounded male
  thomas: 'GBv7mTt0atIp3Br8iCZE', // Thomas - calm male
  charlie: 'IKne3meq5aSn9XLyUdCD', // Charlie - casual male
  emily: 'LcfcDJNUP1GQjkzn1xUU', // Emily - calm female
  elli: 'MF3mGyEYCl7XYWbV9V6O', // Elli - emotional female
  callum: 'N2lVS1w4EtoT3dr4eOWO', // Callum - hoarse male
  patrick: 'ODq5zmih8GrVes37Dizd', // Patrick - shouty male
  harry: 'SOYHLrjzK2X1ezoPC6cr', // Harry - anxious male
  liam: 'TX3LPaxmHKxFdv7VOQHJ', // Liam - articulate male
  dorothy: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - pleasant female
  josh: 'TxGEqnHWrfWFTfGW9XjX', // Josh - deep male
  arnold: 'VR6AewLTigWG4xSOukaG', // Arnold - crisp male
  charlotte: 'XB0fDUnXU5powFXDhCwa', // Charlotte - seductive female
  matilda: 'XrExE9yKIg1WjnnlVkGX', // Matilda - warm female
  matthew: 'Yko7PKs6WkxO6TQCNsec', // Matthew - audiobook male
  james: 'ZQe5CZNOzWyzPSCn5a3c', // James - calm male
  joseph: 'Zlb1dXrM653N07WRdFW3', // Joseph - narrator male
  jeremy: 'bVMeCyTHy58xNoL34h3p', // Jeremy - excited male
  michael: 'flq6f7yk4E4fJM5XTYuZ', // Michael - audiobook male
  ethan: 'g5CIjZEefAph4nQFvHAz', // Ethan - narrator male
  gigi: 'jBpfuIE2acCO8z3wKNLl', // Gigi - childish female
  freya: 'jsCqWAovK2LkecY7zXl4', // Freya - expressive female
  grace: 'oWAxZDx7w5VEj9dCyTzz', // Grace - audiobook female
  daniel: 'onwK4e9ZLuTAKqWW03F9', // Daniel - deep male
  serena: 'pFZP5JQG7iQjIQuC4Bku', // Serena - pleasant female
  adam: 'pNInz6obpgDQGcFmaJgB', // Adam - deep male
  nicole: 'piTKgcLEGmPE4e6mEKli', // Nicole - whisper female
  jessie: 't0jbNlBVZ17f02VDIeMI', // Jessie - raspy female
  ryan: 'wViXBPUzp2ZZixB1xQuM', // Ryan - soldier male
  sam: 'yoZ06aMxZJJ28mfd3POQ', // Sam - raspy male
  glinda: 'z9fAnlkpzviPz146aGWa', // Glinda - witch female
  giovanni: 'zcAOhNBS3c14rBihAFp1', // Giovanni - foreigner male
  mimi: 'zrHiDhphv9ZnVXBqCLjz', // Mimi - childish female
} as const;

export type ElevenLabsVoiceId = (typeof ELEVENLABS_VOICES)[keyof typeof ELEVENLABS_VOICES];

interface ElevenLabsRequest {
  text: string;
  model_id: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

/**
 * Get ElevenLabs API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Synthesize speech using ElevenLabs API
 */
export async function synthesizeWithElevenLabs(
  text: string,
  voiceId: string,
  modelId: string = 'eleven_v3'
): Promise<Buffer> {
  const apiKey = getApiKey();

  const request: ElevenLabsRequest = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  };

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate audio at a specific speed using ElevenLabs
 * Note: ElevenLabs doesn't have native speed control, so we use ffmpeg for speed adjustment
 */
export async function generateWithElevenLabsAtSpeed(
  text: string,
  voiceId: string,
  speed: SpeedVariant,
  outputDir: string,
  sentenceId: number | string,
  speaker: 'M' | 'F',
  modelId: string = 'eleven_v3'
): Promise<AudioGenerationResult> {
  try {
    // Generate at normal speed first
    const audioBuffer = await synthesizeWithElevenLabs(text, voiceId, modelId);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename and save
    const filename = generateAudioFilename(sentenceId, speaker, speed);
    const filePath = path.join(outputDir, filename);

    // If speed is 1.0x, save directly
    if (speed === '1.0x') {
      await fs.writeFile(filePath, audioBuffer);
    } else {
      // Use ffmpeg to adjust speed
      const tempPath = path.join(outputDir, `temp_${filename}`);
      await fs.writeFile(tempPath, audioBuffer);

      const speedMultiplier = speed === '0.8x' ? 0.8 : 1.2;
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // atempo filter for speed adjustment (0.5 to 2.0 range)
      await execAsync(
        `ffmpeg -y -i "${tempPath}" -filter:a "atempo=${speedMultiplier}" "${filePath}"`
      );

      // Clean up temp file
      await fs.unlink(tempPath);
    }

    // Get actual audio duration from the file
    let duration = 3.0; // fallback
    try {
      const { parseBuffer } = await import('music-metadata');
      const fileBuffer = await fs.readFile(filePath);
      const metadata = await parseBuffer(fileBuffer, { mimeType: 'audio/mpeg' });
      duration = metadata.format.duration || 3.0;
    } catch {
      // Fallback: estimate based on character count
      const charCount = text.length;
      const baseDuration = charCount * 0.08; // ~0.08 seconds per character for ElevenLabs
      const speedMultiplier = speed === '0.8x' ? 0.8 : speed === '1.0x' ? 1.0 : 1.2;
      duration = baseDuration / speedMultiplier;
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
 * Generate all speed variants for a sentence using ElevenLabs
 */
export async function generateAllSpeedsWithElevenLabs(
  text: string,
  voiceId: string,
  outputDir: string,
  sentenceId: number | string,
  speaker: 'M' | 'F',
  modelId: string = 'eleven_v3'
): Promise<AudioGenerationResult[]> {
  const speeds: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
  const results: AudioGenerationResult[] = [];

  // Generate 1.0x first (base), then derive others
  for (const speed of speeds) {
    const result = await generateWithElevenLabsAtSpeed(
      text,
      voiceId,
      speed,
      outputDir,
      sentenceId,
      speaker,
      modelId
    );
    results.push(result);
  }

  return results;
}

/**
 * Get available voices from ElevenLabs API
 */
export async function getAvailableVoices(): Promise<
  Array<{ voice_id: string; name: string; labels: Record<string, string> }>
> {
  const apiKey = getApiKey();

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  const data = await response.json();
  return data.voices;
}
