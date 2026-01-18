/**
 * 새로운 스크립트 포맷 테스트
 * - 캐릭터 appearance 필드
 * - scenePrompts 배열
 */

import 'dotenv/config';
import { loadConfig } from '../src/config/loader';
import { generateScript } from '../src/script/generator';

async function main() {
  console.log('🧪 Testing new script format with character appearance and scene prompts...\n');

  // english 채널 설정 로드
  const config = await loadConfig('english');
  console.log(`📺 Channel: ${config.channelId}`);
  console.log(`🎯 Target: ${config.meta.targetLanguage} → ${config.meta.nativeLanguage}\n`);

  // travel_business 카테고리로 스크립트 생성 (대화 형식)
  console.log('📝 Generating script with travel_business category...');
  console.log('   (This will test dialogue format with 2 characters)\n');

  const script = await generateScript(
    config,
    'travel_business',
    '카페에서 주문하기', // 테스트용 토픽
    1 // 후보 1개만 생성 (빠른 테스트)
  );

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📋 GENERATED SCRIPT ANALYSIS');
  console.log('='.repeat(60));

  console.log('\n📌 Metadata:');
  console.log(`   Topic: ${script.metadata.topic}`);
  console.log(`   Title: ${script.metadata.title.target} / ${script.metadata.title.native}`);

  console.log('\n👥 Characters:');
  for (const char of script.metadata.characters) {
    console.log(`\n   [${char.id}] ${char.name} (${char.gender}, ${char.ethnicity})`);
    console.log(`       Role: ${char.role}`);

    if (char.appearance) {
      console.log('       ✅ Appearance (NEW):');
      console.log(`          Age: ${char.appearance.age}`);
      console.log(`          Hair: ${char.appearance.hair}`);
      console.log(`          Eyes: ${char.appearance.eyes}`);
      console.log(`          Skin: ${char.appearance.skin}`);
      console.log(`          Build: ${char.appearance.build}`);
      console.log(`          Clothing: ${char.appearance.clothing}`);
      if (char.appearance.distinctiveFeatures) {
        console.log(`          Features: ${char.appearance.distinctiveFeatures}`);
      }
    } else {
      console.log('       ❌ No appearance data (legacy format)');
    }
  }

  console.log('\n🎬 Scene Prompts:');
  if (script.metadata.scenePrompts && script.metadata.scenePrompts.length > 0) {
    console.log(`   ✅ Found ${script.metadata.scenePrompts.length} scene prompts (NEW):`);
    for (const scene of script.metadata.scenePrompts) {
      console.log(`\n   Scene [${scene.sentenceRange[0]}-${scene.sentenceRange[1]}]:`);
      console.log(`      Setting: ${scene.setting}`);
      console.log(`      Mood: ${scene.mood}`);
      console.log(`      Actions: ${scene.characterActions}`);
    }
  } else {
    console.log('   ❌ No scenePrompts (legacy format)');
    if (script.metadata.imagePrompt) {
      console.log(`   Legacy imagePrompt: ${script.metadata.imagePrompt.substring(0, 100)}...`);
    }
  }

  console.log('\n📝 Sentences Preview (first 3):');
  for (const sentence of script.sentences.slice(0, 3)) {
    console.log(`   [${sentence.id}] ${sentence.speaker}: "${sentence.target}"`);
  }

  // JSON 파일로 저장
  const outputPath = `output/test-new-format-${Date.now()}.json`;
  const fs = await import('fs/promises');
  await fs.mkdir('output', { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(script, null, 2));
  console.log(`\n💾 Full script saved to: ${outputPath}`);

  // 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  const hasAppearance = script.metadata.characters.every((c) => c.appearance);
  const hasScenePrompts = script.metadata.scenePrompts && script.metadata.scenePrompts.length > 0;

  console.log(`   Character Appearance: ${hasAppearance ? '✅ YES' : '❌ NO'}`);
  console.log(`   Scene Prompts: ${hasScenePrompts ? '✅ YES' : '❌ NO'}`);
  console.log(`   Total Sentences: ${script.sentences.length}`);

  if (hasAppearance && hasScenePrompts) {
    console.log('\n🎉 New format working correctly!');
  } else {
    console.log('\n⚠️ Some new fields are missing. Check the prompt.');
  }
}

main().catch(console.error);
