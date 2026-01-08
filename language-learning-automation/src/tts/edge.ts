import { promises as fs } from 'fs';
import path from 'path';
import type { AudioFile, AudioGenerationResult, SpeedVariant } from './types';
import { speedMultipliers, generateAudioFilename } from './types';

// Edge TTS voices for English
export type EdgeVoice =
  | 'en-US-GuyNeural' // Male
  | 'en-US-JennyNeural' // Female
  | 'en-US-AriaNeural' // Female
  | 'en-US-DavisNeural' // Male
  | 'en-US-AmberNeural' // Female
  | 'en-US-AnaNeural' // Female (Child)
  | 'en-US-AndrewNeural' // Male
  | 'en-US-BrandonNeural' // Male
  | 'en-US-ChristopherNeural' // Male
  | 'en-US-CoraNeural' // Female
  | 'en-US-ElizabethNeural' // Female
  | 'en-US-EricNeural' // Male
  | 'en-US-JacobNeural' // Male
  | 'en-US-MichelleNeural' // Female
  | 'en-US-MonicaNeural' // Female
  | 'en-US-RogerNeural' // Male
  | 'en-US-SteffanNeural' // Male
  | string;

/**
 * Convert speed variant to Edge TTS rate string
 */
function speedToRate(speed: SpeedVariant): string {
  switch (speed) {
    case '0.8x':
      return '-20%';
    case '1.0x':
      return '+0%';
    case '1.2x':
      return '+20%';
  }
}

/**
 * Generate audio for a single speed variant using Edge TTS
 */
export async function generateWithEdge(
  text: string,
  voice: EdgeVoice,
  speed: SpeedVariant,
  outputDir: string,
  sentenceId: number,
  speaker: 'M' | 'F'
): Promise<AudioGenerationResult> {
  try {
    // Dynamic import for @andresaya/edge-tts
    const { EdgeTTS } = await import('@andresaya/edge-tts');

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename and path
    const filename = generateAudioFilename(sentenceId, speaker, speed);
    const filePath = path.join(outputDir, filename);

    // Create TTS instance
    const tts = new EdgeTTS();

    // Convert speed to rate
    const rate = speedToRate(speed);

    // Generate audio
    await tts.synthesize(text, voice, {
      rate,
    });

    // Get audio buffer and save to file
    const audioBuffer = await tts.toBuffer();
    await fs.writeFile(filePath, audioBuffer);

    // Estimate duration based on text length and speed
    const wordCount = text.split(/\s+/).length;
    const baseDuration = (wordCount / 150) * 60; // ~150 words per minute
    const speedMultiplier = speedMultipliers[speed];
    const adjustedDuration = baseDuration / speedMultiplier;

    const audioFile: AudioFile = {
      sentenceId,
      speaker,
      speed,
      path: filePath,
      duration: Math.max(adjustedDuration, 1.5), // Minimum 1.5 seconds
    };

    return { success: true, audioFile };
  } catch (error) {
    console.error(`TTS Error for sentence ${sentenceId} at ${speed}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate all speed variants for a sentence using Edge TTS
 */
export async function generateAllSpeedsWithEdge(
  text: string,
  voice: EdgeVoice,
  outputDir: string,
  sentenceId: number,
  speaker: 'M' | 'F'
): Promise<AudioGenerationResult[]> {
  const speeds: SpeedVariant[] = ['0.8x', '1.0x', '1.2x'];
  const results: AudioGenerationResult[] = [];

  for (const speed of speeds) {
    const result = await generateWithEdge(text, voice, speed, outputDir, sentenceId, speaker);
    results.push(result);

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return results;
}
