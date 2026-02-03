/**
 * Test script for the new realistic, warm style
 * Based on "귀가 트이는 영어" reference scripts
 */

import 'dotenv/config';
import { generateCreativeScript } from '../src/script/pipeline/creative-generator';
import { convertToStructuredFormat } from '../src/script/pipeline/structural-converter';
import type { ChannelConfig } from '../src/config/types';

const testConfig: ChannelConfig = {
  id: 'english',
  meta: {
    channelName: 'Test Channel',
    targetLanguage: 'English',
    nativeLanguage: 'Korean',
    targetAudience: 'Korean learners',
  },
  script: {
    sentenceCount: 15,
    categories: ['story', 'conversation'],
    categoryWeights: { story: 0.5, conversation: 0.5 },
  },
  tts: {
    provider: 'google',
    speeds: [0.8, 1.0, 1.2],
    voiceConfig: {
      male: { languageCode: 'en-US', name: 'en-US-Neural2-D' },
      female: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
    },
  },
  video: {
    format: 'shorts',
    resolution: { width: 1080, height: 1920 },
    fps: 30,
  },
  upload: {
    platform: 'youtube',
    schedule: 'daily',
  },
};

async function testStoryStyle() {
  console.log('\n' + '='.repeat(60));
  console.log('📖 Testing STORY style (1인칭 나레이션)');
  console.log('='.repeat(60));

  const storyTopics = [
    '비 오는 날 길고양이를 만났어요',
    '처음으로 혼자 여행을 갔어요',
    '오랜만에 고향에 돌아갔어요',
  ];

  const topic = storyTopics[Math.floor(Math.random() * storyTopics.length)];
  console.log(`\n🎯 Topic: ${topic}\n`);

  try {
    const creative = await generateCreativeScript({
      topic,
      category: 'story',
      config: testConfig,
      sentenceCount: 15,
    });

    console.log('📝 Creative Script:');
    console.log('-'.repeat(40));
    console.log(creative.rawText);
    console.log('-'.repeat(40));

    // Test structural conversion
    console.log('\n🔄 Converting to structured format...\n');
    const structured = await convertToStructuredFormat({
      screenplay: creative,
      category: 'story',
      config: testConfig,
      sentenceCount: 15,
      originalTopic: topic,
    });

    console.log('📋 Structured Script:');
    console.log('-'.repeat(40));
    console.log(`Title: ${structured.metadata.title.target}`);
    console.log(`Native: ${structured.metadata.title.native}`);
    console.log(`\nSentences (${structured.sentences.length}):`);
    structured.sentences.slice(0, 5).forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.speaker}] ${s.english}`);
      console.log(`     ${s.korean}`);
    });
    if (structured.sentences.length > 5) {
      console.log(`  ... and ${structured.sentences.length - 5} more`);
    }
    console.log('-'.repeat(40));

    return { creative, structured };
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

async function testConversationStyle() {
  console.log('\n' + '='.repeat(60));
  console.log('💬 Testing CONVERSATION style (대화형)');
  console.log('='.repeat(60));

  const conversationTopics = [
    '카페에서 친구와 취미 이야기',
    '지하철에서 지갑을 잃어버렸어요',
    '호텔에서 체크인을 해요',
  ];

  const topic = conversationTopics[Math.floor(Math.random() * conversationTopics.length)];
  console.log(`\n🎯 Topic: ${topic}\n`);

  try {
    const creative = await generateCreativeScript({
      topic,
      category: 'conversation',
      config: testConfig,
      sentenceCount: 15,
    });

    console.log('📝 Creative Script:');
    console.log('-'.repeat(40));
    console.log(creative.rawText);
    console.log('-'.repeat(40));

    // Test structural conversion
    console.log('\n🔄 Converting to structured format...\n');
    const structured = await convertToStructuredFormat({
      screenplay: creative,
      category: 'conversation',
      config: testConfig,
      sentenceCount: 15,
      originalTopic: topic,
    });

    console.log('📋 Structured Script:');
    console.log('-'.repeat(40));
    console.log(`Title: ${structured.metadata.title.target}`);
    console.log(`Native: ${structured.metadata.title.native}`);
    console.log(`\nSentences (${structured.sentences.length}):`);
    structured.sentences.slice(0, 5).forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.speaker}] ${s.english}`);
      console.log(`     ${s.korean}`);
    });
    if (structured.sentences.length > 5) {
      console.log(`  ... and ${structured.sentences.length - 5} more`);
    }
    console.log('-'.repeat(40));

    return { creative, structured };
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

async function main() {
  console.log('🎬 Testing New Realistic Style');
  console.log('Based on "귀가 트이는 영어" reference scripts');
  console.log('No forced humor, warm and authentic tone\n');

  try {
    // Test story style
    await testStoryStyle();

    // Test conversation style
    await testConversationStyle();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
