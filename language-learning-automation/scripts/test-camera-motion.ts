/**
 * Camera Motion Parser 테스트
 * cameraDirection 프롬프트가 제대로 파싱되는지 확인
 */

import { parseCameraDirection, generateMotionConfig } from '../src/components/CameraMotion';

// 실제 생성된 cameraDirection 예시들
const testCases = [
  "Wide establishing shot, eye-level, utilizing the break room's natural window light to create a bright, open composition that emphasizes the casual atmosphere",
  'Medium tracking shot, slight low angle, moving backward down the corridor to keep pace with the characters while capturing their nervous body language',
  "Close-up, shallow depth of field, isolating the characters' faces against a bokeh background of office monitors to heighten the intimacy of the planning phase",
  'Medium wide shot, pulling back slowly from the elevator doors to reveal the empty office behind them, signaling the end of the workday',
  'Over-the-shoulder shot, eye-level, focusing on the listener while the speaker is partially visible',
  'Two-shot, medium close, static camera with subtle push-in as the conversation intensifies',
  'Extreme close-up on hands exchanging a document, shallow depth of field',
  "Bird's eye view of the cafe table, slowly descending crane shot",
  'Dutch angle, low light, creating tension as the character enters the room',
  'Panning left across the cityscape, wide establishing shot at golden hour',
];

console.log('🎬 Camera Motion Parser Test\n');
console.log('='.repeat(80));

testCases.forEach((direction, index) => {
  console.log(`\n📹 Test ${index + 1}:`);
  console.log(`Input: "${direction.substring(0, 60)}..."`);

  const parsed = parseCameraDirection(direction);
  const motion = generateMotionConfig(parsed);

  console.log('\n  Parsed Info:');
  console.log(`    Shot Type: ${parsed.shotType}`);
  console.log(`    Angle: ${parsed.angle}`);
  console.log(`    Movement: ${parsed.movement}`);
  console.log(`    DOF: ${parsed.depthOfField}`);
  console.log(`    Speed: ${parsed.speed}`);
  console.log(`    Intensity: ${parsed.intensity}`);

  console.log('\n  Motion Config:');
  console.log(`    Scale: ${motion.scaleStart.toFixed(2)} → ${motion.scaleEnd.toFixed(2)}`);
  console.log(`    Pan X: ${motion.panXStart.toFixed(1)}% → ${motion.panXEnd.toFixed(1)}%`);
  console.log(`    Pan Y: ${motion.panYStart.toFixed(1)}% → ${motion.panYEnd.toFixed(1)}%`);
  console.log(`    Rotate: ${motion.rotateStart.toFixed(1)}° → ${motion.rotateEnd.toFixed(1)}°`);
  console.log(`    Origin: ${motion.transformOrigin}`);

  console.log('-'.repeat(80));
});

console.log('\n✅ All tests completed!');
