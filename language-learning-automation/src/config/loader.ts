import { promises as fs } from 'fs';
import path from 'path';
import { channelConfigSchema, type ChannelConfig } from './types';

const CHANNELS_DIR = path.join(process.cwd(), 'channels');

/**
 * Load and validate a channel configuration file
 * @param channelId - The channel ID (filename without .json extension)
 * @returns Validated ChannelConfig object
 * @throws Error if file not found, invalid JSON, or schema validation fails
 */
export async function loadConfig(channelId: string): Promise<ChannelConfig> {
  const configPath = path.join(CHANNELS_DIR, `${channelId}.json`);

  // Read file
  let fileContent: string;
  try {
    fileContent = await fs.readFile(configPath, 'utf-8');
  } catch (error) {
    const availableChannels = await listChannels();
    throw new Error(
      `Channel config not found: ${channelId}. Available channels: ${availableChannels.join(', ') || 'none'}`
    );
  }

  // Parse JSON
  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Invalid JSON in config file: ${channelId}.json`);
  }

  // Validate schema
  const result = channelConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid config schema for ${channelId}: ${errors}`);
  }

  return result.data;
}

/**
 * Validate if an unknown object is a valid ChannelConfig
 * @param config - Object to validate
 * @returns true if valid, false otherwise
 */
export function validateConfig(config: unknown): config is ChannelConfig {
  if (config === null || config === undefined) {
    return false;
  }
  return channelConfigSchema.safeParse(config).success;
}

/**
 * List all available channel IDs
 * @returns Array of channel IDs (filenames without .json extension)
 */
export async function listChannels(): Promise<string[]> {
  try {
    const files = await fs.readdir(CHANNELS_DIR);
    return files.filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));
  } catch {
    return [];
  }
}
