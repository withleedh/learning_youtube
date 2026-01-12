import { promises as fs } from 'fs';
import path from 'path';
import { characterPairSchema, type CharacterDefinition, type CharacterPair } from './types';

const CHANNELS_DIR = path.join(process.cwd(), 'channels');
const ASSETS_DIR = path.join(process.cwd(), 'assets');

/**
 * CharacterManager handles loading, saving, and managing character definitions
 * for dialogue shorts generation.
 */
export class CharacterManager {
  private characterCache: Map<string, CharacterPair> = new Map();

  /**
   * Load characters for a specific channel from the channel configuration
   * @param channelId - The channel ID to load characters for
   * @returns CharacterPair containing all characters for the channel
   * @throws Error if channel config not found or dialogueShorts section missing
   */
  async loadCharacters(channelId: string): Promise<CharacterPair> {
    // Check cache first
    const cached = this.characterCache.get(channelId);
    if (cached) {
      return cached;
    }

    const configPath = path.join(CHANNELS_DIR, `${channelId}.json`);

    // Read channel config file
    let fileContent: string;
    try {
      fileContent = await fs.readFile(configPath, 'utf-8');
    } catch (error) {
      throw new Error(`Channel config not found: ${channelId}`);
    }

    // Parse JSON
    let rawConfig: Record<string, unknown>;
    try {
      rawConfig = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Invalid JSON in channel config: ${channelId}.json`);
    }

    // Extract dialogueShorts section
    const dialogueShorts = rawConfig.dialogueShorts as Record<string, unknown> | undefined;
    if (!dialogueShorts || !dialogueShorts.characters) {
      throw new Error(`No dialogueShorts.characters section found in channel config: ${channelId}`);
    }

    // Build CharacterPair from config
    const characterPairData = {
      channelId,
      characters: dialogueShorts.characters,
      defaultSceneStyle: (dialogueShorts.scenePreferences as Record<string, unknown>)
        ?.defaultLocation as string | undefined,
    };

    // Validate against schema
    const result = characterPairSchema.safeParse(characterPairData);
    if (!result.success) {
      const errors = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid character configuration for ${channelId}: ${errors}`);
    }

    // Cache and return
    this.characterCache.set(channelId, result.data);
    return result.data;
  }

  /**
   * Save character pair to the channel configuration
   * @param pair - The CharacterPair to save
   * @throws Error if unable to write to config file
   */
  async saveCharacters(pair: CharacterPair): Promise<void> {
    // Validate the pair first
    const validationResult = characterPairSchema.safeParse(pair);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid character pair: ${errors}`);
    }

    const configPath = path.join(CHANNELS_DIR, `${pair.channelId}.json`);

    // Read existing config
    let existingConfig: Record<string, unknown>;
    try {
      const fileContent = await fs.readFile(configPath, 'utf-8');
      existingConfig = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist, create minimal config
      existingConfig = {
        channelId: pair.channelId,
      };
    }

    // Update dialogueShorts section
    const dialogueShorts = (existingConfig.dialogueShorts as Record<string, unknown>) || {};
    dialogueShorts.characters = pair.characters;

    if (pair.defaultSceneStyle) {
      const scenePreferences = (dialogueShorts.scenePreferences as Record<string, unknown>) || {};
      scenePreferences.defaultLocation = pair.defaultSceneStyle;
      dialogueShorts.scenePreferences = scenePreferences;
    }

    existingConfig.dialogueShorts = dialogueShorts;

    // Write back to file
    await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');

    // Update cache
    this.characterCache.set(pair.channelId, pair);
  }

  /**
   * Get the reference image path for a specific character
   * @param characterId - The character ID to get the image path for
   * @returns The reference image path if it exists, undefined otherwise
   */
  getReferenceImagePath(characterId: string): string | undefined {
    // Search through all cached character pairs
    for (const pair of this.characterCache.values()) {
      const character = pair.characters.find((c) => c.id === characterId);
      if (character?.referenceImagePath) {
        return character.referenceImagePath;
      }
    }
    return undefined;
  }

  /**
   * Get a character by ID from a specific channel
   * @param channelId - The channel ID
   * @param characterId - The character ID
   * @returns The character definition if found
   */
  async getCharacter(
    channelId: string,
    characterId: string
  ): Promise<CharacterDefinition | undefined> {
    const pair = await this.loadCharacters(channelId);
    return pair.characters.find((c) => c.id === characterId);
  }

  /**
   * Update a character's reference image path
   * @param channelId - The channel ID
   * @param characterId - The character ID
   * @param imagePath - The new reference image path
   */
  async updateReferenceImagePath(
    channelId: string,
    characterId: string,
    imagePath: string
  ): Promise<void> {
    const pair = await this.loadCharacters(channelId);
    const character = pair.characters.find((c) => c.id === characterId);

    if (!character) {
      throw new Error(`Character not found: ${characterId} in channel ${channelId}`);
    }

    character.referenceImagePath = imagePath;
    await this.saveCharacters(pair);
  }

  /**
   * Get the assets directory path for a channel's characters
   * @param channelId - The channel ID
   * @returns The path to the channel's character assets directory
   */
  getCharacterAssetsDir(channelId: string): string {
    return path.join(ASSETS_DIR, channelId, 'characters');
  }

  /**
   * Clear the character cache
   */
  clearCache(): void {
    this.characterCache.clear();
  }
}

// Export singleton instance for convenience
export const characterManager = new CharacterManager();
