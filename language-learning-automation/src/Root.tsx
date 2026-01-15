import { Composition } from 'remotion';
import { Intro, calculateIntroDuration } from './compositions/Intro';
import { Main, calculateTotalDuration, type MainProps } from './compositions/Main';
import { Step1, calculateStep1Duration } from './compositions/Step1';
import { Step2, calculateStep2Duration } from './compositions/Step2';
import { Step3, calculateStep3Duration } from './compositions/Step3';
import { Step4, calculateStep4Duration } from './compositions/Step4';
import { StepTransition, STEP_TRANSITION_DURATION } from './compositions/StepTransition';
import { Ending, ENDING_DURATION } from './compositions/Ending';
import {
  FillInBlankShorts,
  calculateFillInBlankShortsDuration,
} from './compositions/FillInBlankShorts';
import {
  SingleSentenceShort,
  calculateSingleSentenceShortDuration,
} from './compositions/SingleSentenceShort';
import {
  ListeningQuizShort,
  calculateListeningQuizShortDuration,
  generateQuizChoices,
} from './compositions/ListeningQuizShort';
import { CatInterviewShort, calculateCatInterviewDuration } from './compositions/CatInterviewShort';
import {
  ComparisonLongform,
  calculateTotalDuration as calculateComparisonDuration,
  getVideoTiming,
} from './compositions/ComparisonLongform';
import { ComparisonView } from './compositions/ComparisonView';
import { HookIntro } from './compositions/HookIntro';
import { CTAEnding } from './compositions/CTAEnding';
import { createSampleComparisonScript } from './comparison/sample';
import type { TimingProfileType } from './comparison/timing-profile';
import type { ChannelConfig } from './config/types';
import type { Script } from './script/types';
import type { AudioFile } from './tts/types';

// =============================================================================
// Dynamic Loading from public/ folder
// When running "npm run start", place these files in public/:
//   - script.json (from output folder)
//   - config.json (from channels/ folder)
//   - audio/manifest.json (from output folder)
//   - background.png
//   - assets/ folder
// =============================================================================

// Try to load dynamic data from public/ folder
let dynamicScript: Script | null = null;
let dynamicConfig: ChannelConfig | null = null;
let dynamicAudioFiles: AudioFile[] | null = null;

// ComparisonScript for ComparisonLongform compositions
import type { ComparisonScript } from './comparison/types';
let dynamicComparisonScript: ComparisonScript | null = null;

try {
  // These will be loaded at build time if files exist in public/
  dynamicScript = require('../public/script.json') as Script;
  dynamicConfig = require('../public/config.json') as ChannelConfig;
  const rawAudioFiles = require('../public/audio/manifest.json') as AudioFile[];
  // Convert paths to relative paths for staticFile()
  dynamicAudioFiles = rawAudioFiles.map((af) => ({
    ...af,
    path: `audio/${af.path.split('/').pop()}`,
  }));
  console.log('✅ Loaded dynamic data from public/ folder');
} catch {
  console.log('ℹ️ Using sample data (no dynamic data in public/)');
}

// Try to load ComparisonScript separately (for ComparisonLongform)
try {
  const rawScript = require('../public/script.json');
  // Check if it's a ComparisonScript by looking for 'segments' with ComparisonSegment structure
  if (rawScript.segments && rawScript.segments[0]?.koreanExpression) {
    dynamicComparisonScript = rawScript as ComparisonScript;
    console.log('✅ Loaded ComparisonScript from public/ folder');
  }
} catch {
  // Ignore - will use sample data
}

// TTS duration (실제 파일에서 측정된 값)
const VIRAL_TTS_DURATION = 5.256;
const GUIDE_TTS_DURATION = 3.936;
const STEP_TTS_DURATIONS = [8.52, 8.904, 9.72, 7.464];
const CLOSING_TTS_DURATION = 2.952;

// Sample config for preview
const sampleConfig: ChannelConfig = {
  channelId: 'english',
  meta: {
    name: '귀가 뚫리는 영어',
    targetLanguage: 'English',
    nativeLanguage: 'Korean',
  },
  theme: {
    logo: 'english/logo.png',
    introSound: 'english/intro.mp3',
    backgroundStyle: 'gradient',
    primaryColor: '#FFD700',
    secondaryColor: '#1E90FF',
  },
  colors: {
    maleText: '#4A90D9',
    femaleText: '#E91E8C',
    nativeText: '#FFFFFF',
    wordMeaning: '#AAAAAA',
    background: '#000000',
  },
  layout: {
    step3ImageRatio: 0.4,
    subtitlePosition: 'center',
    speakerIndicator: 'left',
  },
  tts: {
    provider: 'openai',
    maleVoice: 'onyx',
    femaleVoice: 'nova',
    targetLanguageCode: 'en-US',
    speed: 1.0,
  },
  content: {
    sentenceCount: 6,
    repeatCount: 3,
    difficulty: 'beginner',
  },
  uiLabels: {
    introTitle: '오늘의 학습',
    // Step titles (for intro and step indicators)
    step1Title: '전체 흐름 파악 (자막 없이 듣기)',
    step2Title: '자막으로 내용 이해 하기',
    step3Title: '3단계 반복 듣기',
    step4Title: '기적의 순간 (다시 자막 없이 듣기)',
    // Step descriptions (for intro)
    step1Desc: '자막 없이 소리에만 집중하며, 상황을 상상해보세요.',
    step2Desc: '자막과 함께 들으며, 안 들렸던 부분을 확인하세요.',
    step3Desc: '[느리게-빈칸-빠르게] 반복으로 영어가 들리기 시작해요.',
    step4Desc: '놀랍게 선명해진 영어를 직접 확인해보세요!',
    // Step3 phase labels
    step3PhaseTitle: 'STEP 3 · 반복 훈련',
    phaseIntro: '🎧 천천히 듣기',
    phaseTraining: '🧩 빈칸 퀴즈',
    phaseChallenge: '⚡ 빠르게 듣기',
    phaseReview: '✨ 마무리',
  },
  thumbnail: {
    channelName: '들려요! English!',
    characterStyle: 'custom',
    customCharacters: 'a friendly Caucasian man and a cheerful Korean woman',
    backgroundColor: 'dark blue',
  },
};

// Sample script for preview
const sampleScript: Script = {
  channelId: 'english',
  date: '2026-01-08',
  category: 'conversation',
  metadata: {
    topic: 'Morning Coffee',
    style: 'casual',
    title: {
      target: 'Morning Coffee Chat',
      native: '아침 커피 대화',
    },
    characters: [
      {
        id: 'M' as const,
        name: 'James',
        gender: 'male' as const,
        ethnicity: 'American',
        role: 'friend',
      },
      {
        id: 'F' as const,
        name: 'Soo-jin',
        gender: 'female' as const,
        ethnicity: 'Korean',
        role: 'friend',
      },
    ],
  },
  sentences: [
    {
      id: 1,
      speaker: 'M',
      target: 'Good morning! Would you like some coffee?',
      targetBlank: 'Good morning! Would you like some _______?',
      blankAnswer: 'coffee',
      native: '좋은 아침이에요! 커피 드실래요?',
      words: [
        { word: 'morning', meaning: '아침' },
        { word: 'coffee', meaning: '커피' },
      ],
    },
    {
      id: 2,
      speaker: 'F',
      target: 'Yes, please. I need my morning caffeine.',
      targetBlank: 'Yes, please. I need my morning _______.',
      blankAnswer: 'caffeine',
      native: '네, 주세요. 아침 카페인이 필요해요.',
      words: [
        { word: 'please', meaning: '제발, 부탁해요' },
        { word: 'caffeine', meaning: '카페인' },
      ],
    },
    {
      id: 3,
      speaker: 'M',
      target: 'How do you take your coffee?',
      targetBlank: 'How do you _______ your coffee?',
      blankAnswer: 'take',
      native: '커피 어떻게 드세요?',
      words: [
        { word: 'take', meaning: '(음료를) 마시다' },
        { word: 'coffee', meaning: '커피' },
      ],
    },
    {
      id: 4,
      speaker: 'F',
      target: 'Just black, no sugar.',
      targetBlank: 'Just black, no _______.',
      blankAnswer: 'sugar',
      native: '그냥 블랙으로요, 설탕 없이요.',
      words: [
        { word: 'black', meaning: '블랙 (커피)' },
        { word: 'sugar', meaning: '설탕' },
      ],
    },
    {
      id: 5,
      speaker: 'M',
      target: "That's the best way to enjoy it.",
      targetBlank: "That's the best way to _______ it.",
      blankAnswer: 'enjoy',
      native: '그게 가장 좋은 방법이죠.',
      words: [
        { word: 'best', meaning: '최고의' },
        { word: 'enjoy', meaning: '즐기다' },
      ],
    },
    {
      id: 6,
      speaker: 'F',
      target: 'I agree. It tastes so much better.',
      targetBlank: 'I agree. It _______ so much better.',
      blankAnswer: 'tastes',
      native: '동의해요. 훨씬 맛있어요.',
      words: [
        { word: 'agree', meaning: '동의하다' },
        { word: 'tastes', meaning: '맛이 나다' },
      ],
    },
  ],
};

// Sample audio files (mock data for preview - no actual audio)
const sampleAudioFiles: AudioFile[] = sampleScript.sentences.flatMap((sentence) => [
  {
    sentenceId: sentence.id,
    speaker: sentence.speaker,
    speed: '0.8x' as const,
    path: '',
    duration: 3.5,
  },
  {
    sentenceId: sentence.id,
    speaker: sentence.speaker,
    speed: '1.0x' as const,
    path: '',
    duration: 3.0,
  },
  {
    sentenceId: sentence.id,
    speaker: sentence.speaker,
    speed: '1.2x' as const,
    path: '',
    duration: 2.5,
  },
]);

// =============================================================================
// Use dynamic data if available, otherwise fall back to sample data
// =============================================================================
const activeConfig = dynamicConfig ?? sampleConfig;
const activeScript = dynamicScript ?? sampleScript;
const activeAudioFiles = dynamicAudioFiles ?? sampleAudioFiles;

// Calculate durations
const step1Duration = calculateStep1Duration(activeAudioFiles);
const step2Duration = calculateStep2Duration(activeScript.sentences, activeAudioFiles);
const step3Duration = calculateStep3Duration(
  activeScript.sentences,
  activeAudioFiles,
  activeConfig.content.repeatCount
);
const step4Duration = calculateStep4Duration(activeAudioFiles);

// 동적 인트로 길이 계산
const introDuration = calculateIntroDuration(
  VIRAL_TTS_DURATION,
  GUIDE_TTS_DURATION,
  STEP_TTS_DURATIONS,
  CLOSING_TTS_DURATION
);
const totalDuration = calculateTotalDuration(
  activeScript.sentences,
  activeAudioFiles,
  activeConfig.content.repeatCount,
  VIRAL_TTS_DURATION,
  GUIDE_TTS_DURATION,
  STEP_TTS_DURATIONS,
  CLOSING_TTS_DURATION
);

// calculateMetadata function for Main composition (외부로 추출하여 ESLint prop-types 우회)
const calculateMainMetadata = ({ props }: { props: MainProps }) => {
  const actualDuration = calculateTotalDuration(
    props.script.sentences,
    props.audioFiles,
    props.config.content.repeatCount,
    props.viralNarrationDuration,
    props.guideNarrationDuration,
    props.stepNarrationDurations,
    props.closingNarrationDuration
  );
  return {
    durationInFrames: actualDuration,
  };
};

export const RemotionRoot: React.FC = () => {
  // Asset path prefix based on active config
  const assetPrefix = `assets/`;
  // const assetPrefix = `assets/${activeConfig.channelId}`;

  return (
    <>
      {/* Full Video - All Steps */}
      <Composition
        id="Main"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Main as any}
        durationInFrames={totalDuration}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          config: activeConfig,
          script: activeScript,
          audioFiles: activeAudioFiles,
          backgroundImage: 'background.png',
          thumbnailPath: `${assetPrefix}/thumbnail.png`,
          viralNarrationPath: `${assetPrefix}/intro-viral.mp3`,
          viralNarrationDuration: VIRAL_TTS_DURATION,
          guideNarrationPath: `${assetPrefix}/intro-narration.mp3`,
          guideNarrationDuration: GUIDE_TTS_DURATION,
          stepNarrationPaths: [
            `${assetPrefix}/intro-step1.mp3`,
            `${assetPrefix}/intro-step2.mp3`,
            `${assetPrefix}/intro-step3.mp3`,
            `${assetPrefix}/intro-step4.mp3`,
          ],
          stepNarrationDurations: STEP_TTS_DURATIONS,
          closingNarrationPath: `${assetPrefix}/intro-closing.mp3`,
          closingNarrationDuration: CLOSING_TTS_DURATION,
          stepTransitionTtsPaths: [
            `${assetPrefix}/step-transition-1.mp3`,
            `${assetPrefix}/step-transition-2.mp3`,
            `${assetPrefix}/step-transition-3.mp3`,
            `${assetPrefix}/step-transition-4.mp3`,
          ],
          stepTransitionBellPath: `${assetPrefix}/bell.wav`,
        }}
        calculateMetadata={calculateMainMetadata}
      />
      {/* Intro Only - 동적 길이 */}
      <Composition
        id="Intro"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Intro as any}
        durationInFrames={introDuration}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          channelName: activeConfig.meta.name,
          primaryColor: activeConfig.theme.primaryColor,
          secondaryColor: activeConfig.theme.secondaryColor,
          introSoundPath: `${assetPrefix}/intro.mp3`,
          introBackgroundPath: `${assetPrefix}/intro/background.png`,
          thumbnailPath: `${assetPrefix}/thumbnail.png`,
          targetLanguage: activeConfig.meta.targetLanguage,
          nativeLanguage: activeConfig.meta.nativeLanguage,
          viralNarrationPath: `${assetPrefix}/intro-viral.mp3`,
          viralNarrationDuration: VIRAL_TTS_DURATION,
          guideNarrationPath: `${assetPrefix}/intro-narration.mp3`,
          guideNarrationDuration: GUIDE_TTS_DURATION,
          stepNarrationPaths: [
            `${assetPrefix}/intro-step1.mp3`,
            `${assetPrefix}/intro-step2.mp3`,
            `${assetPrefix}/intro-step3.mp3`,
            `${assetPrefix}/intro-step4.mp3`,
          ],
          stepNarrationDurations: STEP_TTS_DURATIONS,
          closingNarrationPath: `${assetPrefix}/intro-closing.mp3`,
          closingNarrationDuration: CLOSING_TTS_DURATION,
          uiLabels: activeConfig.uiLabels,
        }}
      />
      {/* Step 1: 자막 없이 듣기 */}
      <Composition
        id="Step1"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Step1 as any}
        durationInFrames={step1Duration}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          backgroundImage: 'background.png',
          audioFiles: activeAudioFiles,
          title: activeScript.metadata.title.target,
        }}
      />
      {/* Step 2: 문장별 듣기 */}
      <Composition
        id="Step2"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Step2 as any}
        durationInFrames={step2Duration}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          backgroundImage: 'background.png',
          sentences: activeScript.sentences,
          audioFiles: activeAudioFiles,
          colors: {
            maleText: activeConfig.colors.maleText,
            femaleText: activeConfig.colors.femaleText,
            nativeText: activeConfig.colors.nativeText,
          },
        }}
      />
      {/* Step 3: 10번씩 반복 듣기 (Interval Training) */}
      <Composition
        id="Step3"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Step3 as any}
        durationInFrames={step3Duration}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          backgroundImage: 'background.png',
          sentences: activeScript.sentences,
          audioFiles: activeAudioFiles,
          colors: activeConfig.colors,
          repeatCount: activeConfig.content.repeatCount,
          imageRatio: activeConfig.layout.step3ImageRatio,
          uiLabels: activeConfig.uiLabels,
        }}
      />
      {/* Step 4: 다시 자막 없이 듣기 */}
      <Composition
        id="Step4"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Step4 as any}
        durationInFrames={step4Duration}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          backgroundImage: 'background.png',
          audioFiles: activeAudioFiles,
          title: activeScript.metadata.title.target,
        }}
      />
      {/* Step Transitions (스텝 전환 화면) */}
      {[1, 2, 3, 4].map((stepNum) => (
        <Composition
          key={`StepTransition${stepNum}`}
          id={`StepTransition${stepNum}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          component={StepTransition as any}
          durationInFrames={STEP_TRANSITION_DURATION}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            stepNumber: stepNum,
            ttsPath: `${assetPrefix}/step-transition-${stepNum}.mp3`,
            bellSoundPath: `${assetPrefix}/bell.wav`,
            nativeLanguage: activeConfig.meta.nativeLanguage,
          }}
        />
      ))}
      {/* Ending (엔딩 화면) */}
      <Composition
        id="Ending"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Ending as any}
        durationInFrames={ENDING_DURATION}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          backgroundPath: `${assetPrefix}/intro/background.png`,
          targetLanguage: activeConfig.meta.targetLanguage,
          nativeLanguage: activeConfig.meta.nativeLanguage,
        }}
      />
      {/* Single Sentence Short - Dynamic composition that accepts sentence via inputProps */}
      <Composition
        id="SingleSentenceShort"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SingleSentenceShort as any}
        durationInFrames={300} // Default, will be overridden by calculateMetadata
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          sentence: activeScript.sentences[0],
          audioFile:
            activeAudioFiles.find(
              (af) => af.sentenceId === activeScript.sentences[0]?.id && af.speed === '1.0x'
            ) || activeAudioFiles[0],
          config: activeConfig,
          backgroundImage: 'background.png',
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: calculateSingleSentenceShortDuration(
            props.audioFile,
            props.introAudioFile
          ),
        })}
      />
      {/* Cat Interview Short - 고양이 인터뷰 영어 학습 (9:16) */}
      <Composition
        id="CatInterviewShort"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={CatInterviewShort as any}
        durationInFrames={calculateCatInterviewDuration(2)} // 2개 대화 기본
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          dialogues: [
            { question: '"눈이 와요"는?', answer: "It's snowing!" },
            { question: '"추워요"는?', answer: "It's cold!" },
          ],
          videoPath: 'cat_interview/2026-01-12/2026-01-12_cat_interview.mp4',
          theme: 'Snowy Day',
          channelName: '나비의 영어교실',
        }}
      />
      ㅣ{/* Listening Quiz Short - 선택지 퀴즈 형식 (9:16) */}
      <Composition
        id="ListeningQuizShort"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ListeningQuizShort as any}
        durationInFrames={calculateListeningQuizShortDuration(
          activeAudioFiles.find(
            (af) => af.sentenceId === activeScript.sentences[0]?.id && af.speed === '1.0x'
          )?.duration,
          activeAudioFiles.find(
            (af) => af.sentenceId === activeScript.sentences[0]?.id && af.speed === '0.8x'
          )?.duration
        )}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          sentence: {
            ...activeScript.sentences[0],
            choices: generateQuizChoices(activeScript.sentences[0]),
          },
          audioFile:
            activeAudioFiles.find(
              (af) => af.sentenceId === activeScript.sentences[0]?.id && af.speed === '1.0x'
            ) || activeAudioFiles[0],
          slowAudioFile: activeAudioFiles.find(
            (af) => af.sentenceId === activeScript.sentences[0]?.id && af.speed === '0.8x'
          ),
          config: activeConfig,
          backgroundImage: 'background.png',
          sentenceIndex: 1,
          episodeTitle: activeScript.metadata.title.native,
          audioDuration: activeAudioFiles.find(
            (af) => af.sentenceId === activeScript.sentences[0]?.id && af.speed === '1.0x'
          )?.duration,
          slowAudioDuration: activeAudioFiles.find(
            (af) => af.sentenceId === activeScript.sentences[0]?.id && af.speed === '0.8x'
          )?.duration,
        }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calculateListeningQuizShortDuration(
              props.audioDuration,
              props.slowAudioDuration
            ),
          };
        }}
      />

      {/* ================================================================== */}
      {/* Comparison Longform Compositions (Korean vs Native) */}
      {/* ================================================================== */}

      {/* ComparisonLongform - Full comparison video */}
      <Composition
        id="ComparisonLongform"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ComparisonLongform as any}
        durationInFrames={calculateComparisonDuration(30, 'normal')} // 30 segments, normal profile
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          script: dynamicComparisonScript ?? createSampleComparisonScript('korean-vs-native', 30),
          backgroundImage: 'background.png',
          timingProfile: 'normal' as TimingProfileType,
          selectedHookVariant: 0,
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: calculateComparisonDuration(
            props.script?.segments?.length ?? 30,
            props.timingProfile ?? 'normal'
          ),
        })}
      />

      {/* ComparisonView - Single segment preview */}
      <Composition
        id="ComparisonView"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ComparisonView as any}
        durationInFrames={300} // 10 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          segment: createSampleComparisonScript('korean-vs-native', 25).segments[0],
          timingProfile: 'normal' as TimingProfileType,
          isBurst: false,
        }}
      />

      {/* HookIntro - Hook intro preview */}
      <Composition
        id="HookIntro"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={HookIntro as any}
        durationInFrames={150} // 5 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          hook: createSampleComparisonScript('korean-vs-native', 25).hook,
          hookVariants: createSampleComparisonScript('korean-vs-native', 25).hookVariants,
          selectedVariantIndex: 0,
          backgroundImage: 'background.png',
        }}
      />

      {/* CTAEnding - CTA ending preview */}
      <Composition
        id="CTAEnding"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={CTAEnding as any}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          cta: createSampleComparisonScript('korean-vs-native', 25).cta,
          backgroundImage: 'background.png',
        }}
      />
    </>
  );
};
