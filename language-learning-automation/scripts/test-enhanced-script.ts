/**
 * Test script for enhanced script generation system
 *
 * Tests:
 * 1. Topic combination generation
 * 2. Enhanced prompt generation
 * 3. Reference pattern integration
 */

import {
  generateTopicCombination,
  buildCombinationPrompt,
  buildTransformationPrompt,
  getCurrentSeasonalContext,
  THEMES,
  SITUATIONS,
  EMOTIONS,
} from '../src/script/topic-combination';

import {
  buildStylePatternPrompt,
  buildEmotionalArcPrompt,
  buildMicroDramaPrompt,
  buildEngagementHooksPrompt,
  getRecommendedArc,
  SENTENCE_STYLE_PATTERNS,
  EMOTIONAL_ARCS,
  HIGH_PERFORMANCE_PATTERNS,
} from '../src/script/reference-patterns';

import { generateScriptPrompt } from '../src/script/prompts';
import type { Category } from '../src/script/types';
import type { ChannelConfig } from '../src/config/types';

// Mock channel config for testing
const mockConfig: ChannelConfig = {
  channelId: 'test',
  meta: {
    name: 'Test Channel',
    targetLanguage: 'English',
    nativeLanguage: 'Korean',
  },
  theme: {
    logo: 'logo.png',
    introSound: 'intro.mp3',
    backgroundStyle: 'gradient',
    primaryColor: '#4A90D9',
    secondaryColor: '#2C5282',
    preferredArtStyle: 'watercolor',
  },
  content: {
    difficulty: 'beginner',
    sentenceCount: 15,
    repeatCount: 10,
  },
  layout: {
    step3ImageRatio: 0.4,
    subtitlePosition: 'center',
    speakerIndicator: 'left',
  },
  audio: {
    ttsProvider: 'google',
    voiceM: 'en-US-Neural2-D',
    voiceF: 'en-US-Neural2-F',
    speakingRate: 0.85,
  },
  uiLabels: {
    introTitle: 'English Listening Practice',
    step1Title: 'Step 1',
    step2Title: 'Step 2',
    step3Title: 'Step 3',
    step4Title: 'Step 4',
    step1Desc: 'Listen carefully',
    step2Desc: 'Listen with subtitles',
    step3Desc: 'Repeat practice',
    step4Desc: 'Final review',
    step3PhaseTitle: 'Phase',
    phaseIntro: 'Introduction',
    phaseTraining: 'Training',
    phaseChallenge: 'Challenge',
    phaseReview: 'Review',
    quizHook: 'Can you guess?',
  },
  shortsTheme: {
    backgroundColor: '#1a1a2e',
    accentColor: '#e94560',
    textColor: '#ffffff',
  },
  thumbnail: {
    style: 'dramatic',
    textPosition: 'center',
    showCharacter: true,
  },
};

async function main() {
  console.log('🧪 Enhanced Script Generation System Test\n');
  console.log('='.repeat(60));

  // 1. Test Seasonal Context
  console.log('\n📅 1. Seasonal Context');
  const seasonalContext = getCurrentSeasonalContext();
  console.log(`   Month: ${seasonalContext.month}`);
  console.log(`   Season: ${seasonalContext.seasonKo} (${seasonalContext.season})`);
  console.log(`   Events: ${seasonalContext.events.join(', ')}`);
  console.log(`   Moods: ${seasonalContext.moods.join(', ')}`);

  // 2. Test Topic Combination
  console.log('\n🎲 2. Topic Combination Generation');
  const categories: Category[] = ['story', 'conversation', 'news', 'fairytale'];

  for (const category of categories) {
    const combination = generateTopicCombination(category, []);
    console.log(`\n   [${category}]`);
    console.log(`   Theme: ${combination.theme.nameKo} (${combination.theme.name})`);
    console.log(`   SubTheme: ${combination.subTheme}`);
    console.log(`   Situation: ${combination.situation.nameKo}`);
    console.log(`   Emotion: ${combination.emotion.nameKo} (${combination.emotion.intensity})`);
  }

  // 3. Test Combination Prompt
  console.log('\n📝 3. Combination Prompt');
  const testCombination = generateTopicCombination('story', []);
  const combinationPrompt = buildCombinationPrompt(testCombination);
  console.log(combinationPrompt.slice(0, 500) + '...');

  // 4. Test Transformation Prompt
  console.log('\n🔄 4. Transformation Strategies');
  const transformPrompt = buildTransformationPrompt();
  console.log(transformPrompt.slice(0, 500) + '...');

  // 5. Test Style Patterns
  console.log('\n🎨 5. Style Patterns');
  for (const category of ['story', 'conversation'] as Category[]) {
    console.log(`\n   [${category}]`);
    const pattern = SENTENCE_STYLE_PATTERNS[category];
    console.log(`   Word count: ${pattern.wordCount.min}-${pattern.wordCount.max}`);
    console.log(`   Emotional tones: ${pattern.emotionalTone.join(', ')}`);
    console.log(`   Characteristics: ${pattern.characteristics.slice(0, 2).join('; ')}`);
  }

  // 6. Test Emotional Arcs
  console.log('\n💫 6. Emotional Arcs');
  for (const [name, arc] of Object.entries(EMOTIONAL_ARCS)) {
    console.log(`\n   [${name}] ${arc.name}`);
    console.log(`   Phases: ${arc.phases.map((p) => p.phase).join(' → ')}`);
  }

  // 7. Test High Performance Patterns
  console.log('\n📈 7. High Performance Patterns');
  for (const pattern of HIGH_PERFORMANCE_PATTERNS.slice(0, 3)) {
    console.log(`\n   [${pattern.pattern}]`);
    console.log(`   Description: ${pattern.description}`);
    console.log(`   View range: ${pattern.viewCountRange}`);
    console.log(`   Examples: ${pattern.examples.slice(0, 2).join(', ')}`);
  }

  // 8. Test Enhanced Prompt Generation
  console.log('\n📄 8. Enhanced Prompt Generation');
  for (const category of ['story', 'conversation'] as Category[]) {
    console.log(`\n   [${category}]`);
    const prompt = generateScriptPrompt(mockConfig, category, undefined, {
      enableEmotionalArc: true,
      enableMicroDrama: true,
      enableEngagementHooks: true,
      enableCulturalDepth: true,
    });

    // Check for key sections
    const hasEmotionalArc = prompt.includes('Emotional Arc');
    const hasMicroDrama = prompt.includes('Micro-Drama');
    const hasEngagementHooks = prompt.includes('Engagement Hooks');
    const hasCulturalDepth = prompt.includes('Cultural Depth');
    const hasSeasonalContext = prompt.includes('계절 컨텍스트');

    console.log(`   ✓ Emotional Arc: ${hasEmotionalArc}`);
    console.log(`   ✓ Micro-Drama: ${hasMicroDrama}`);
    console.log(`   ✓ Engagement Hooks: ${hasEngagementHooks}`);
    console.log(`   ✓ Cultural Depth: ${hasCulturalDepth}`);
    console.log(`   ✓ Seasonal Context: ${hasSeasonalContext}`);
    console.log(`   Prompt length: ${prompt.length} chars`);
  }

  // 9. Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('\n📊 System Summary:');
  console.log(`   - Themes: ${THEMES.length}`);
  console.log(`   - Situations: ${SITUATIONS.length}`);
  console.log(`   - Emotions: ${EMOTIONS.length}`);
  console.log(`   - Emotional Arcs: ${Object.keys(EMOTIONAL_ARCS).length}`);
  console.log(`   - High Performance Patterns: ${HIGH_PERFORMANCE_PATTERNS.length}`);
  console.log(`   - Style Patterns: ${Object.keys(SENTENCE_STYLE_PATTERNS).length}`);
}

main().catch(console.error);
