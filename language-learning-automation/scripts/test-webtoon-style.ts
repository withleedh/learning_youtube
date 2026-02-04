/**
 * 웹툰 스타일 이미지 생성 테스트
 * 경쟁사 "귀가 트이는 영어" 스타일 재현
 */
import 'dotenv/config';
import path from 'path';
import { generateIllustration } from '../src/image/generator';
import { getStyleById } from '../src/image/art-styles';

async function testWebtoonStyle() {
  console.log('🎨 Testing Webtoon Warm Style (귀트영 스타일)\n');

  // 스타일 확인
  const style = getStyleById('webtoon_warm');
  if (style) {
    console.log(`Style: ${style.name}`);
    console.log(`Prompt: ${style.prompt}\n`);
  }

  const outputDir = path.join(process.cwd(), 'output', 'test-webtoon');

  // 테스트 씬들
  const testScenes = [
    {
      topic: '졸업 선물 고르기',
      title: 'Picking a Graduation Gift',
      scene:
        'A young woman in her late 20s with honey blonde hair showing a silver watch to her friend in a cozy living room. Warm afternoon sunlight through the window. Both characters have friendly, excited expressions.',
    },
    {
      topic: '카페에서 주문하기',
      title: 'Ordering at a Cafe',
      scene:
        'A young Korean woman ordering coffee at a cozy cafe counter. The barista is a friendly young man. Warm interior lighting, coffee machines in background.',
    },
    {
      topic: '길 물어보기',
      title: 'Asking for Directions',
      scene:
        'A tourist asking directions from a local on a sunny street. Both characters are smiling. European-style buildings in the background.',
    },
  ];

  for (let i = 0; i < testScenes.length; i++) {
    const { topic, title, scene } = testScenes[i];
    const outputPath = path.join(outputDir, `webtoon_test_${i + 1}.png`);

    console.log(`\n📸 Generating scene ${i + 1}: ${topic}`);
    console.log(`   Scene: ${scene.substring(0, 80)}...`);

    try {
      await generateIllustration(topic, title, scene, outputPath, 'webtoon_warm');
      console.log(`   ✅ Saved: ${outputPath}`);
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }

  console.log('\n✅ Test complete! Check output/test-webtoon/ folder');
}

testWebtoonStyle().catch(console.error);
