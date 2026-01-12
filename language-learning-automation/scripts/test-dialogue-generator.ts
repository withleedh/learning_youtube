import 'dotenv/config';
import { DialogueGenerator } from '../src/dialogue/generator';
import type { DialogueGeneratorConfig } from '../src/dialogue/types';
import type { CharacterDefinition } from '../src/character/types';

// 캐릭터 정의 - 서양 할머니 & 한국인 손자
const grandma: CharacterDefinition = {
  id: 'grandma',
  name: 'Grandma Rose',
  nameKorean: '로즈 할머니',
  age: 'senior',
  gender: 'female',
  relationship: 'grandmother',
  appearance: {
    ethnicity: 'Caucasian',
    complexion: 'fair, soft, with gentle laugh lines',
    hairColor: 'silver-white',
    hairStyle: 'elegantly styled short curls, soft waves',
    clothing: 'cozy cream-colored cashmere cardigan over a floral blouse, pearl necklace',
    distinguishingFeatures:
      'warm hazel eyes behind delicate gold-rimmed glasses, rosy cheeks, kind gentle smile',
  },
  personality: 'warm, nurturing, patient, speaks softly with "Oh my sweetie" tone',
};

const grandson: CharacterDefinition = {
  id: 'grandson',
  name: 'Minjun',
  nameKorean: '민준이',
  age: 'child',
  gender: 'male',
  relationship: 'grandson',
  appearance: {
    ethnicity: 'Korean',
    complexion: 'fair, healthy rosy cheeks',
    hairColor: 'black',
    hairStyle: 'cute bowl cut, soft and fluffy',
    clothing: 'adorable striped t-shirt with denim overalls',
    distinguishingFeatures: 'big round curious eyes, chubby cheeks, mischievous smile',
  },
  personality: 'curious, playful, speaks Konglish cutely, eager to learn',
};

async function main() {
  const generator = new DialogueGenerator();

  // 테스트할 표현
  const config: DialogueGeneratorConfig = {
    targetExpression: "I'm starving!",
    targetMeaning: '배가 너무 고파요!',
    foreignCharacterId: 'grandma', // 할머니 = 한국어로 말함
    nativeCharacterId: 'grandson', // 손자 = 영어로 말함
    scenePreference: 'cozy kitchen, grandma cooking',
    mood: 'warm, loving, playful',
    viewerNativeLanguage: 'korean',
    targetLanguage: 'english',
  };

  console.log('🎬 Dialogue Script Generator Test\n');
  console.log('📝 Target Expression:', config.targetExpression);
  console.log('📝 Target Meaning:', config.targetMeaning);
  console.log('\n🎭 Characters:');
  console.log(`   - ${grandma.name} (${grandma.nameKorean}): speaks Korean`);
  console.log(`   - ${grandson.name} (${grandson.nameKorean}): speaks English`);
  console.log('\n---\n');

  try {
    const script = await generator.generate(config, grandma, grandson);

    console.log('\n📜 Generated Script:\n');
    console.log(`ID: ${script.id}`);
    console.log(`Target: "${script.targetExpression}" = "${script.targetMeaning}"`);
    console.log(`\nScene: ${script.sceneContext.location}`);
    console.log(`Mood: ${script.sceneContext.mood}`);
    console.log(`Action: ${script.sceneContext.action}`);
    console.log(`\nDialogue (${script.lines.length} lines):`);
    console.log('─'.repeat(50));

    for (const line of script.lines) {
      const langEmoji = line.speakingLanguage === 'korean' ? '🇰🇷' : '🇺🇸';
      const targetMark = line.isTargetExpression ? ' ⭐' : '';
      console.log(`\n${langEmoji} ${line.speakerName} (${line.emotion || 'neutral'})${targetMark}`);
      console.log(`   "${line.text}"`);
      if (line.translation) {
        console.log(`   → ${line.translation}`);
      }
      if (line.pronunciation) {
        console.log(`   🔊 ${line.pronunciation}`);
      }
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`\n⏱️ Estimated Duration: ${script.estimatedDuration}s`);
    console.log(`🏷️ Tags: ${script.tags?.join(', ') || 'none'}`);

    console.log('\n📹 Veo Prompt:');
    console.log('─'.repeat(50));
    console.log(script.veoPrompt);

    // JSON 저장
    const fs = await import('fs/promises');
    const outputPath = 'output/test-dialogue-script.json';
    await fs.mkdir('output', { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(script, null, 2));
    console.log(`\n✅ Script saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
