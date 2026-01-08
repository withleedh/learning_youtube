import { z } from 'zod';

// Color hex pattern validation
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');

// Meta section schema
export const metaSchema = z.object({
  name: z.string().min(1, 'Channel name is required'),
  targetLanguage: z.string().min(1, 'Target language is required'),
  nativeLanguage: z.string().min(1, 'Native language is required'),
  youtubeChannelId: z.string().optional(),
});

// Theme section schema
export const themeSchema = z.object({
  logo: z.string().min(1, 'Logo path is required'),
  introSound: z.string().min(1, 'Intro sound path is required'),
  backgroundStyle: z.string().optional().default('illustration'),
  primaryColor: hexColorSchema.optional().default('#87CEEB'),
  secondaryColor: hexColorSchema.optional().default('#FF69B4'),
});

// Colors section schema
export const colorsSchema = z.object({
  maleText: hexColorSchema,
  femaleText: hexColorSchema,
  nativeText: hexColorSchema,
  wordMeaning: hexColorSchema.optional().default('#888888'),
  background: hexColorSchema.optional().default('#000000'),
});

// Layout section schema
export const layoutSchema = z.object({
  step3ImageRatio: z.number().min(0).max(1).optional().default(0.4),
  subtitlePosition: z.enum(['center', 'bottom']).optional().default('center'),
  speakerIndicator: z.enum(['left', 'none']).optional().default('left'),
});

// TTS section schema
export const ttsSchema = z.object({
  provider: z.enum(['openai', 'google']),
  maleVoice: z.string().min(1, 'Male voice is required'),
  femaleVoice: z.string().min(1, 'Female voice is required'),
  targetLanguageCode: z.string().min(1, 'Target language code is required'),
  speed: z.number().min(0.5).max(2.0).optional().default(1.0),
});

// Content section schema
export const contentSchema = z.object({
  sentenceCount: z.number().int().min(1).max(20),
  repeatCount: z.number().int().min(1).max(20),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
});

// Full ChannelConfig schema
export const channelConfigSchema = z.object({
  channelId: z.string().regex(/^[a-z_]+$/, 'Channel ID must be lowercase with underscores only'),
  meta: metaSchema,
  theme: themeSchema,
  colors: colorsSchema,
  layout: layoutSchema.optional().default({}),
  tts: ttsSchema,
  content: contentSchema,
});

// TypeScript types inferred from Zod schemas
export type Meta = z.infer<typeof metaSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Colors = z.infer<typeof colorsSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type TTS = z.infer<typeof ttsSchema>;
export type Content = z.infer<typeof contentSchema>;
export type ChannelConfig = z.infer<typeof channelConfigSchema>;
