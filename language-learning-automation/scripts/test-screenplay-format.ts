/**
 * Test screenplay format generation
 * Tests the new JSON screenplay format with scenes and visual directions
 */

import 'dotenv/config';
import { generateCreativeScript } from '../src/script/pipeline/creative-generator';
import { convertToStructuredFormat } from '../src/script/pipeline/structural-converter';
import { generateVisualPrompts } from '../src/script/pipeline/visual-generator';
import type { ChannelConfig } from '../src/config/types';

const testConfig: ChannelConfig = {
  id: 'english',
  meta: {
    channelName: 'Test Channel',
    targetLanguage: 'English',
    nativeLanguage: 'Korean',
  },
  script: {
    sentenceCount: 15,
    categories: ['conversation', 'story'],
    defaultCategory: 'conversation',
  },
  tts: {
    provider: 'google',
    voiceConfig: {
      male: { name: 'en-US-Neural2-D', pitch: -1 },
      female: { name: 'en-US-Neural2-G', pitch: 2 },
    },
  },
  image: {
    style: 'Pixar 3D',
    aspectRatio: '16:9',
  },
  video: {
    fps: 30,
    width: 1920,
    height: 1080,
  },
};

async function testFullPipeline() {
  console.log('🎬 Testing Full Pipeline with Scene Integration\n');
  console.log('='.repeat(60));

  const topic = '카페에서 오랜 친구를 만났어요';
  const category = 'conversation' as const;

  // Phase 1: Creative
  console.log('\n📝 Phase 1: Creative Generation');
  console.log('-'.repeat(40));

  const creative = await generateCreativeScript({
    topic,
    category,
    config: testConfig,
    sentenceCount: 15,
  });

  console.log('✅ Title:', creative.title);
  console.log('✅ Characters:', creative.characters.length);
  console.log('✅ Scenes from Creative:', creative.scenes.length);

  creative.scenes.forEach((scene, i) => {
    console.log(`\n  Scene ${i + 1}: ${scene.setting}`);
    if (scene.visual) {
      console.log(`    📍 Location: ${scene.visual.location}`);
      console.log(`    🎭 Mood: ${scene.visual.mood}`);
      console.log(`    💡 Lighting: ${scene.visual.lighting}`);
    }
    console.log(`    💬 Dialogue: ${scene.dialogue.length} lines`);
  });

  // Phase 2: Structural
  console.log('\n\n📐 Phase 2: Structural Conversion');
  console.log('-'.repeat(40));

  const structured = await convertToStructuredFormat({
    screenplay: creative,
    config: testConfig,
    targetLanguage: 'English',
    nativeLanguage: 'Korean',
    originalTopic: topic,
  });

  console.log('✅ Sentences:', structured.sentences.length);
  console.log('✅ Scenes passed through:', structured.scenes?.length || 0);

  // Phase 3: Visual
  console.log('\n\n🎥 Phase 3: Visual Enhancement');
  console.log('-'.repeat(40));

  const visual = await generateVisualPrompts({
    structuredScript: structured,
    config: testConfig,
  });

  console.log('✅ Characters with appearances:', visual.characters.length);
  visual.characters.forEach((c) => {
    console.log(`\n  ${c.id} (${c.name}):`);
    if (c.appearance) {
      console.log(`    Age: ${c.appearance.age}`);
      console.log(`    Hair: ${c.appearance.hair}`);
      console.log(`    Clothing: ${c.appearance.clothing}`);
    }
  });

  console.log('\n✅ Scene Prompts:', visual.scenePrompts.length);
  visual.scenePrompts.forEach((sp, i) => {
    console.log(`\n  Scene ${i + 1}: sentences ${sp.sentenceRange[0]}-${sp.sentenceRange[1]}`);
    console.log(`    📍 Setting: ${sp.setting}`);
    console.log(`    🎭 Mood: ${sp.mood}`);
    console.log(`    📷 Camera: ${sp.cameraDirection}`);
    console.log(`    💡 Lighting: ${sp.lighting}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ Full pipeline test completed!');
  console.log('\n📊 Summary:');
  console.log(`  - Creative scenes: ${creative.scenes.length}`);
  console.log(`  - Structured sentences: ${structured.sentences.length}`);
  console.log(`  - Visual scene prompts: ${visual.scenePrompts.length}`);
  console.log(`  - Characters with appearances: ${visual.characters.length}`);
}

testFullPipeline().catch(console.error);
