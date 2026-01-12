import 'dotenv/config';
import { generateReferenceImage } from '../src/character/image-generator';
import {
  buildCharacterPrompt,
  CHARACTER_IMAGE_PROMPTS,
  type PromptStyle,
} from '../src/character/prompts';
import type { CharacterDefinition } from '../src/character/types';

// 테스트용 캐릭터 정의 - 서양 할머니 & 한국인 손자
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

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function main() {
  const style: PromptStyle = (process.argv[2] as PromptStyle) || 'veo_reference';
  const count = parseInt(process.argv[3] || '1', 10);

  console.log('🎬 Character Reference Image Generation Test\n');
  console.log(`📷 Style: ${style}`);
  console.log(`🔢 Count: ${count} images per character`);
  console.log(`   Available styles: ${Object.keys(CHARACTER_IMAGE_PROMPTS).join(', ')}\n`);

  // 스타일 템플릿 출력
  const template = CHARACTER_IMAGE_PROMPTS[style];
  console.log('🎨 Style Template:');
  console.log(`   Prefix: ${template.prefix}`);
  console.log(`   Scene: ${template.scene}`);
  console.log(`   Style: ${template.style}\n`);

  // 프롬프트 확인
  console.log('📝 Grandma prompt:');
  console.log(buildCharacterPrompt(grandma, style));
  console.log('\n📝 Grandson prompt:');
  console.log(buildCharacterPrompt(grandson, style));
  console.log('\n---\n');

  // 이미지 생성
  for (let i = 1; i <= count; i++) {
    const timestamp = getTimestamp();
    console.log(`\n🖼️ [${i}/${count}] Generating grandma image...`);
    const grandmaPath = await generateReferenceImage(
      grandma,
      `assets/english_grandma/characters/grandma_${timestamp}.png`,
      style
    );
    console.log(`✅ Grandma image: ${grandmaPath}`);

    console.log(`🖼️ [${i}/${count}] Generating grandson image...`);
    const grandsonPath = await generateReferenceImage(
      grandson,
      `assets/english_grandma/characters/grandson_${timestamp}.png`,
      style
    );
    console.log(`✅ Grandson image: ${grandsonPath}`);
  }

  console.log('\n🎉 Done! Check the assets/english_grandma/characters/ folder.');
  console.log(`   Generated ${count * 2} images total.`);
}

main().catch(console.error);
