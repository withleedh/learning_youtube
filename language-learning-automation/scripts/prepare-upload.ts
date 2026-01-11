#!/usr/bin/env node

/**
 * Prepare and upload video files to Google Drive for YouTube upload via n8n
 *
 * Usage:
 *   npx tsx scripts/prepare-upload.ts --channel english
 *   npx tsx scripts/prepare-upload.ts --channel english --folder 2026-01-08_174127
 *   npx tsx scripts/prepare-upload.ts --channel english --upload  (auto upload to Drive)
 */

import 'dotenv/config';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import path from 'path';
import { google } from 'googleapis';

interface UploadInfo {
  title: string;
  description: string;
  tags: string[];
  language: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
  channelId: string;
  category: string;
  topic: string;
}

interface ScriptMetadata {
  metadata: {
    title: { target: string };
    topic: string;
  };
  category: string;
}

interface ChannelConfig {
  meta: {
    targetLanguage: string;
    nativeLanguage: string;
  };
}

// Google Drive folder IDs - set these in .env
const DRIVE_PENDING_FOLDER_ID = process.env.DRIVE_PENDING_FOLDER_ID || '';

async function getGoogleAuth() {
  // Use service account or OAuth
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsPath) {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    return auth;
  }

  // OAuth flow for personal account
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );

  // Check for saved tokens
  const tokenPath = path.join(process.cwd(), '.google-token.json');
  try {
    const tokens = JSON.parse(await fs.readFile(tokenPath, 'utf-8'));
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  } catch {
    // Need to authenticate
    console.log('\n🔐 Google Drive 인증이 필요합니다.');
    console.log('다음 URL을 브라우저에서 열어주세요:\n');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });
    console.log(authUrl);
    console.log('\n인증 후 받은 코드를 입력하세요:');

    const code = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => resolve(data.toString().trim()));
    });

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    await fs.writeFile(tokenPath, JSON.stringify(tokens));
    console.log('✅ 인증 완료! 토큰이 저장되었습니다.\n');

    return oauth2Client;
  }
}

async function uploadToDrive(
  auth:
    | ReturnType<typeof google.auth.GoogleAuth.prototype.getClient>
    | InstanceType<typeof google.auth.OAuth2>,
  filePath: string,
  fileName: string,
  folderId: string,
  mimeType: string
): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: auth as any });

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: createReadStream(filePath),
    },
    fields: 'id',
  });

  return response.data.id || '';
}

async function main() {
  const args = process.argv.slice(2);
  let channelId = 'english';
  let folderName = '';
  let shouldUpload = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--channel' && args[i + 1]) {
      channelId = args[i + 1];
    }
    if (args[i] === '--folder' && args[i + 1]) {
      folderName = args[i + 1];
    }
    if (args[i] === '--upload') {
      shouldUpload = true;
    }
  }

  if (!folderName) {
    // Find latest folder
    const channelDir = path.join(process.cwd(), 'output', channelId);
    const folders = await fs.readdir(channelDir);
    const dateFolders = folders
      .filter((f) => /^\d{4}-\d{2}-\d{2}/.test(f))
      .sort()
      .reverse();

    if (dateFolders.length === 0) {
      console.error('No output folders found');
      process.exit(1);
    }
    folderName = dateFolders[0];
  }

  const outputDir = path.join(process.cwd(), 'output', channelId, folderName);
  console.log(`\n📁 Processing: ${outputDir}\n`);

  // Load script JSON
  const files = await fs.readdir(outputDir);
  const scriptFile = files.find(
    (f) => f.endsWith('.json') && !f.includes('manifest') && !f.includes('_info')
  );

  if (!scriptFile) {
    console.error('No script file found');
    process.exit(1);
  }

  const scriptPath = path.join(outputDir, scriptFile);
  const scriptContent = await fs.readFile(scriptPath, 'utf-8');
  const script: ScriptMetadata = JSON.parse(scriptContent);

  // Load channel config
  const configPath = path.join(process.cwd(), 'channels', `${channelId}.json`);
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config: ChannelConfig = JSON.parse(configContent);

  // Load upload_info.txt for timeline
  let timeline = '';
  const uploadInfoPath = path.join(outputDir, 'upload_info.txt');
  try {
    timeline = await fs.readFile(uploadInfoPath, 'utf-8');
  } catch {
    // No timeline file
  }

  // Generate description and tags
  const description = generateDescription(config, script, timeline);
  const tags = generateTags(config, script);

  const uploadInfo: UploadInfo = {
    title: script.metadata.title.target,
    description,
    tags,
    language: config.meta.nativeLanguage === 'Korean' ? 'ko' : 'en',
    privacyStatus: 'public',
    channelId,
    category: script.category,
    topic: script.metadata.topic,
  };

  // Create base name from folder
  const baseName = `${folderName}_${script.metadata.topic.replace(/\s+/g, '_').substring(0, 30)}`;

  // Save info file
  const infoPath = path.join(outputDir, `${baseName}_info.json`);
  await fs.writeFile(infoPath, JSON.stringify(uploadInfo, null, 2));
  console.log(`✅ Created: ${baseName}_info.json`);

  // Rename video and thumbnail for upload
  const videoSrc = path.join(outputDir, 'video.mp4');
  const videoDst = path.join(outputDir, `${baseName}.mp4`);
  const thumbSrc = path.join(outputDir, 'thumbnail.png');
  const thumbDst = path.join(outputDir, `${baseName}_thumb.png`);

  try {
    await fs.access(videoSrc);
    await fs.rename(videoSrc, videoDst);
    console.log(`✅ Renamed: ${baseName}.mp4`);
  } catch {
    // Check if already renamed
    try {
      await fs.access(videoDst);
      console.log(`✓ Already exists: ${baseName}.mp4`);
    } catch {
      console.log('⚠️ video.mp4 not found');
    }
  }

  try {
    await fs.access(thumbSrc);
    await fs.rename(thumbSrc, thumbDst);
    console.log(`✅ Renamed: ${baseName}_thumb.png`);
  } catch {
    try {
      await fs.access(thumbDst);
      console.log(`✓ Already exists: ${baseName}_thumb.png`);
    } catch {
      console.log('⚠️ thumbnail.png not found');
    }
  }

  console.log(`\n📦 Files ready:`);
  console.log(`   ${baseName}.mp4`);
  console.log(`   ${baseName}_thumb.png`);
  console.log(`   ${baseName}_info.json`);

  // Upload to Google Drive if requested
  if (shouldUpload) {
    if (!DRIVE_PENDING_FOLDER_ID) {
      console.error('\n❌ DRIVE_PENDING_FOLDER_ID not set in .env');
      console.log('Google Drive 폴더 ID를 .env에 설정해주세요:');
      console.log('DRIVE_PENDING_FOLDER_ID=your_folder_id_here');
      process.exit(1);
    }

    console.log('\n☁️ Uploading to Google Drive...');

    const auth = await getGoogleAuth();

    // Upload video
    console.log('   📤 Uploading video...');
    await uploadToDrive(auth, videoDst, `${baseName}.mp4`, DRIVE_PENDING_FOLDER_ID, 'video/mp4');
    console.log('   ✅ Video uploaded');

    // Upload thumbnail
    console.log('   📤 Uploading thumbnail...');
    await uploadToDrive(
      auth,
      thumbDst,
      `${baseName}_thumb.png`,
      DRIVE_PENDING_FOLDER_ID,
      'image/png'
    );
    console.log('   ✅ Thumbnail uploaded');

    // Upload info
    console.log('   📤 Uploading info...');
    await uploadToDrive(
      auth,
      infoPath,
      `${baseName}_info.json`,
      DRIVE_PENDING_FOLDER_ID,
      'application/json'
    );
    console.log('   ✅ Info uploaded');

    console.log(`\n🎉 All files uploaded to Google Drive!`);
    console.log(`   n8n이 예약된 시간에 자동으로 YouTube에 업로드합니다.`);
  } else {
    console.log(`\n👉 Google Drive에 자동 업로드하려면:`);
    console.log(`   npx tsx scripts/prepare-upload.ts --channel ${channelId} --upload`);
  }
}

function generateDescription(
  config: ChannelConfig,
  script: ScriptMetadata,
  timeline: string
): string {
  const isKorean = config.meta.nativeLanguage === 'Korean';

  const langNames: Record<string, string> = isKorean
    ? { English: '영어', Korean: '한국어', Japanese: '일본어', Chinese: '중국어' }
    : { English: 'English', Korean: 'Korean', Japanese: 'Japanese', Chinese: 'Chinese' };

  const targetLang = langNames[config.meta.targetLanguage] || config.meta.targetLanguage;

  let desc = '';

  if (isKorean) {
    desc = `${targetLang} 듣기 연습 - ${script.metadata.topic}

🎧 이 영상은 4단계 학습법으로 구성되어 있습니다:
1️⃣ 자막 없이 듣기 - 전체 흐름 파악
2️⃣ 자막 보며 듣기 - 내용 이해
3️⃣ 반복 훈련 - 느리게/빈칸/빠르게
4️⃣ 최종 확인 - 다시 자막 없이

`;
  } else {
    desc = `${targetLang} Listening Practice - ${script.metadata.topic}

🎧 This video uses a 4-step learning method:
1️⃣ Listen without subtitles - Get the big picture
2️⃣ Listen with subtitles - Understand the content
3️⃣ Repetition training - Slow/Fill-in/Fast
4️⃣ Final check - Listen again without subtitles

`;
  }

  // Add timeline
  if (timeline) {
    const timelineSection = timeline.split('타임라인:')[1]?.split('\n\n')[0] || '';
    if (timelineSection) {
      desc += `⏱️ ${isKorean ? '타임라인' : 'Timeline'}:\n${timelineSection.trim()}\n\n`;
    }
  }

  // Add channel info
  desc += isKorean
    ? `\n📺 매일 새로운 ${targetLang} 듣기 영상이 업로드됩니다!\n구독과 알림 설정으로 매일 연습하세요 🔔`
    : `\n📺 New ${targetLang} listening videos uploaded daily!\nSubscribe and turn on notifications to practice every day 🔔`;

  // Add hashtags
  desc += `\n\n#${targetLang.replace(/\s/g, '')} #${isKorean ? '듣기연습' : 'ListeningPractice'} #${isKorean ? '언어학습' : 'LanguageLearning'}`;

  return desc;
}

function generateTags(config: ChannelConfig, script: ScriptMetadata): string[] {
  const isKorean = config.meta.nativeLanguage === 'Korean';
  const targetLang = config.meta.targetLanguage;

  const baseTags = isKorean
    ? [
        `${targetLang} 듣기`,
        `${targetLang} 회화`,
        `${targetLang} 공부`,
        `${targetLang} 학습`,
        '듣기 연습',
        '언어 학습',
        '외국어 공부',
        '리스닝',
      ]
    : [
        `${targetLang} listening`,
        `${targetLang} practice`,
        `learn ${targetLang}`,
        `${targetLang} conversation`,
        'listening practice',
        'language learning',
      ];

  // Add topic-related tags
  const topicTags = script.metadata.topic
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 3);

  return [...baseTags, ...topicTags];
}

main().catch(console.error);
