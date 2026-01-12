import { z } from 'zod';

/**
 * Character appearance schema
 * Defines the visual characteristics of a character for consistent image generation
 */
export const characterAppearanceSchema = z.object({
  ethnicity: z.string().min(1, 'Ethnicity is required'),
  complexion: z.string().optional(), // e.g., 'fair, radiant, bright white tone'
  hairColor: z.string().min(1, 'Hair color is required'),
  hairStyle: z.string().min(1, 'Hair style is required'),
  clothing: z.string().min(1, 'Clothing description is required'),
  distinguishingFeatures: z.string().optional(),
});

/**
 * Character definition schema
 * Defines a single character with all attributes needed for dialogue generation and video creation
 */
export const characterDefinitionSchema = z.object({
  id: z.string().min(1, 'Character ID is required'),
  name: z.string().min(1, 'Character name is required'),
  nameKorean: z.string().min(1, 'Korean name is required'),
  age: z.enum(['child', 'teen', 'adult', 'senior']),
  gender: z.enum(['male', 'female']),
  relationship: z.string().optional(), // e.g., "grandfather", "granddaughter"
  appearance: characterAppearanceSchema,
  personality: z.string().optional(), // Affects dialogue style
  referenceImagePath: z.string().optional(), // Path to generated reference image
});

/**
 * Character pair schema
 * Defines a group of characters (1-3) for a channel's dialogue shorts
 */
export const characterPairSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  characters: z
    .array(characterDefinitionSchema)
    .min(1, 'At least 1 character is required')
    .max(3, 'Maximum 3 characters allowed'),
  defaultSceneStyle: z.string().optional(), // e.g., "warm home interior"
});

// TypeScript types inferred from Zod schemas
export type CharacterAppearance = z.infer<typeof characterAppearanceSchema>;
export type CharacterDefinition = z.infer<typeof characterDefinitionSchema>;
export type CharacterPair = z.infer<typeof characterPairSchema>;
