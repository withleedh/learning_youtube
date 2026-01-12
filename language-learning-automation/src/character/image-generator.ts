import { promises as fs } from 'fs';
import path from 'path';
import { GEMINI_API_URLS, getGeminiApiKey, type GeminiImageResponse } from '../config/gemini';
import type { CharacterDefinition } from './types';
import { buildCharacterPrompt, type PromptStyle } from './prompts';

// Re-export for convenience
export { buildCharacterPrompt, type PromptStyle } from './prompts';

const ASSETS_DIR = path.join(process.cwd(), 'assets');

/**
 * Generate a reference image for a character using Gemini Image API
 * @param character - The character definition to generate an image for
 * @param outputPath - Optional custom output path (defaults to assets/{channelId}/characters/{characterId}.png)
 * @param style - Prompt style to use (default: 'candid_film')
 * @returns The path to the generated image
 */
export async function generateReferenceImage(
  character: CharacterDefinition,
  outputPath?: string,
  style: PromptStyle = 'candid_film'
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const prompt = buildCharacterPrompt(character, style);

  console.log(`🎨 Generating reference image for character: ${character.name}...`);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['image', 'text'],
      responseMimeType: 'text/plain',
    },
  };

  const response = await fetch(`${GEMINI_API_URLS.image}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GeminiImageResponse;

  // Find the image part in the response
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        // Decode base64 image
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');

        // Determine output path
        const finalOutputPath = outputPath || getDefaultImagePath(character.id);

        // Ensure output directory exists
        await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });

        // Save the image
        await fs.writeFile(finalOutputPath, imageBuffer);

        console.log(`✅ Reference image saved to: ${finalOutputPath}`);
        return finalOutputPath;
      }
    }
  }

  throw new Error(`No image generated for character: ${character.name}`);
}

/**
 * Get the default image path for a character
 * @param characterId - The character ID
 * @param channelId - Optional channel ID for organizing by channel
 * @returns The default path for the character's reference image
 */
export function getDefaultImagePath(characterId: string, channelId?: string): string {
  if (channelId) {
    return path.join(ASSETS_DIR, channelId, 'characters', `${characterId}.png`);
  }
  return path.join(ASSETS_DIR, 'characters', `${characterId}.png`);
}

/**
 * Generate reference images for all characters in a channel
 * @param characters - Array of character definitions
 * @param channelId - The channel ID for organizing output
 * @returns Map of character IDs to their generated image paths
 */
export async function generateAllReferenceImages(
  characters: CharacterDefinition[],
  channelId: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  console.log(`🎬 Generating reference images for ${characters.length} characters...`);

  for (const character of characters) {
    try {
      const outputPath = getDefaultImagePath(character.id, channelId);
      const imagePath = await generateReferenceImage(character, outputPath);
      results.set(character.id, imagePath);
    } catch (error) {
      console.error(`❌ Failed to generate image for ${character.name}:`, error);
      // Continue with other characters
    }
  }

  console.log(`✅ Generated ${results.size}/${characters.length} reference images`);
  return results;
}

/**
 * Check if a reference image exists for a character
 * @param characterId - The character ID
 * @param channelId - Optional channel ID
 * @returns True if the reference image exists
 */
export async function referenceImageExists(
  characterId: string,
  channelId?: string
): Promise<boolean> {
  const imagePath = getDefaultImagePath(characterId, channelId);
  try {
    await fs.access(imagePath);
    return true;
  } catch {
    return false;
  }
}
