/**
 * SingleSentenceShort Component
 *
 * YouTube Shorts (9:16) Layout:
 * - Top 420px: Black area
 * - Middle: Quiz sentence area
 * - Bottom: 1:1 background image
 */

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import type { Sentence } from '../script/types';
import type { AudioFile } from '../tts/types';
import type { ChannelConfig } from '../config/types';

// =============================================================================
// Types
// =============================================================================

export interface SingleSentenceShortProps {
  sentence: Sentence;
  audioFile: AudioFile;
  introAudioFile?: AudioFile;
  config: ChannelConfig;
  backgroundImage?: string;
  sentenceIndex?: number;
  totalSentences?: number;
  episodeTitle?: string;
  channelName?: string; // 채널명 추가
}

// =============================================================================
// Layout Constants (1080x1920 for 9:16)
// =============================================================================

const TOP_BLACK_HEIGHT = 420; // 상단 검정 영역
const BOTTOM_PADDING = 350; // 하단 여백
const BOTTOM_IMAGE_HEIGHT = 608; // 이미지 영역 (16:9 = 1080x608)
const MIDDLE_HEIGHT = 1920 - TOP_BLACK_HEIGHT - BOTTOM_IMAGE_HEIGHT - BOTTOM_PADDING; // 중간 퀴즈 영역 (542px)

// =============================================================================
// Timing Constants (30fps)
// =============================================================================

const FPS = 30;
const INTRO_DURATION = Math.round(1.5 * FPS);
const TRANSITION_DURATION = Math.round(0.5 * FPS);
const THINK_TIME = Math.round(2 * FPS);
const INTRO_BGM_PADDING_BEFORE = Math.round(0.5 * FPS); // BGM 있을 때 앞에 0.5초 추가
const INTRO_BGM_PADDING_AFTER = Math.round(1 * FPS); // BGM 있을 때 뒤에 1초 추가

// =============================================================================
// Helper: 힌트로 보여줄 단어 인덱스 계산 (sentence.id 기반 일관성)
// =============================================================================

const getHintIndices = (wordCount: number, sentenceId: number): Set<number> => {
  const revealCount = Math.min(wordCount, Math.max(1, Math.ceil(wordCount / 4)));
  const indices = new Set<number>();

  let pseudoRandom = sentenceId;
  let maxIterations = 1000; // 무한 루프 방지
  while (indices.size < revealCount && maxIterations > 0) {
    pseudoRandom = (pseudoRandom * 1103515245 + 12345) % 2147483648;
    const idx = pseudoRandom % wordCount;
    indices.add(idx);
    maxIterations--;
  }
  return indices;
};

// 2차 힌트: 1/2까지 공개 (1차 힌트 포함)
const getSecondHintIndices = (wordCount: number, sentenceId: number): Set<number> => {
  const firstHints = getHintIndices(wordCount, sentenceId);
  const revealCount = Math.min(wordCount, Math.max(2, Math.ceil(wordCount / 2)));
  const indices = new Set<number>(firstHints);

  let pseudoRandom = sentenceId + 1000; // 다른 시드
  let maxIterations = 1000; // 무한 루프 방지
  while (indices.size < revealCount && maxIterations > 0) {
    pseudoRandom = (pseudoRandom * 1103515245 + 12345) % 2147483648;
    const idx = pseudoRandom % wordCount;
    indices.add(idx);
    maxIterations--;
  }
  return indices;
};

// =============================================================================
// Helper: 문장 길이에 따른 동적 폰트 크기 계산 (최대 2줄)
// =============================================================================

const getDynamicFontSize = (sentence: string): number => {
  const charCount = sentence.length;
  const wordCount = sentence.split(' ').length;

  // 말풍선 너비 약 900px 기준, 2줄 이내로 맞추기
  // 기본 72px에서 문장 길이에 따라 조절
  if (charCount <= 30 || wordCount <= 5) {
    return 72; // 짧은 문장
  } else if (charCount <= 45 || wordCount <= 7) {
    return 64; // 중간 문장
  } else if (charCount <= 60 || wordCount <= 9) {
    return 56; // 긴 문장
  } else if (charCount <= 80 || wordCount <= 12) {
    return 48; // 매우 긴 문장
  } else {
    return 42; // 아주 긴 문장
  }
};

// =============================================================================
// Helper: 단어를 고정 너비로 표시하는 컴포넌트
// =============================================================================

const WordSlot: React.FC<{
  word: string;
  isRevealed: boolean;
  primaryColor: string;
  opacity?: number;
  translateY?: number;
}> = ({ word, isRevealed, opacity = 1, translateY = 0 }) => {
  const punctuation = word.match(/[.,!?;:'"]+$/)?.[0] || '';
  const cleanWord = word.replace(/[.,!?;:'"]+$/, '');
  const blank = '_'.repeat(cleanWord.length);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
      }}
    >
      {/* 빈칸 영역 (cleanWord 기준) */}
      <span
        style={{
          display: 'inline-block',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        {/* 빈칸 (항상 표시) */}
        <span
          style={{
            color: '#666',
            fontFamily: 'monospace',
            letterSpacing: 2,
          }}
        >
          {blank}
        </span>
        {/* 정답 글자 (빈칸 위에 오버레이) */}
        {isRevealed && (
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, calc(-50% - 10px)) translateY(${translateY}px)`,
              color: '#333',
              fontWeight: 700,
              fontFamily: 'Pretendard, -apple-system, sans-serif',
              opacity: opacity,
              whiteSpace: 'nowrap',
            }}
          >
            {cleanWord}
          </span>
        )}
      </span>
      {/* 문장부호 (빈칸 옆에 별도 표시) */}
      {punctuation && (
        <span
          style={{
            color: '#666',
            fontFamily: 'monospace',
          }}
        >
          {punctuation}
        </span>
      )}
    </span>
  );
};

// =============================================================================
// Duration Calculator
// =============================================================================

export function calculateSingleSentenceShortDuration(
  audioFile: AudioFile,
  introAudioFile?: AudioFile
): number {
  const audioDurationFrames = Math.ceil(audioFile.duration * FPS);
  const introDuration = introAudioFile ? Math.ceil(introAudioFile.duration * FPS) : INTRO_DURATION;

  // BGM 패딩 추가 (앞 0.5초 + 뒤 1초)
  const introBgmPadding = INTRO_BGM_PADDING_BEFORE + INTRO_BGM_PADDING_AFTER;

  const phase1 = introBgmPadding + introDuration + audioDurationFrames + FPS;
  const phase2 = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;
  const phase3 = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;
  const phase4 = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;
  const phase5 = FPS * 5; // 5초

  return phase1 + phase2 + phase3 + phase4 + phase5;
}

// =============================================================================
// Main Component
// =============================================================================

export const SingleSentenceShort: React.FC<SingleSentenceShortProps> = ({
  sentence,
  audioFile,
  introAudioFile,
  config,
  backgroundImage,
  sentenceIndex,
  episodeTitle,
}) => {
  const audioDurationFrames = Math.ceil(audioFile.duration * FPS);
  const introDuration = introAudioFile ? Math.ceil(introAudioFile.duration * FPS) : INTRO_DURATION;

  // BGM 패딩 추가 (앞 0.5초 + 뒤 1초)
  const introBgmPadding = INTRO_BGM_PADDING_BEFORE + INTRO_BGM_PADDING_AFTER;

  const phase1Start = 0;
  const phase1Duration = introBgmPadding + introDuration + audioDurationFrames + FPS;

  const phase2Start = phase1Duration;
  const phase2Duration = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;

  const phase3Start = phase2Start + phase2Duration;
  const phase3Duration = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;

  const phase4Start = phase3Start + phase3Duration;
  const phase4Duration = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;

  const phase5Start = phase4Start + phase4Duration;
  const phase5Duration = FPS * 5; // 5초

  const primaryColor = sentence.speaker === 'M' ? config.colors.maleText : config.colors.femaleText;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Top Header Area (420px) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: TOP_BLACK_HEIGHT,
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 240,
          gap: 16,
        }}
      >
        {/* 이거 맞히면 네이티브? 👂 */}
        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            letterSpacing: 4,
          }}
        >
          <span style={{ color: '#FFFFFF' }}>이거 맞히면 </span>
          <span style={{ color: '#FF9500' }}>네이티브?</span>
          <span>👂</span>
        </div>
        {/* 주제 + 문장 번호 */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            textAlign: 'center',
            opacity: 0.7,
          }}
        >
          {episodeTitle && `${episodeTitle}`}
          {sentenceIndex && ` (${sentenceIndex})`}
        </div>
      </div>

      {/* Bottom Image Area (16:9, 1080x608) - Ken Burns subtle zoom */}
      <BottomImageArea backgroundImage={backgroundImage} />

      {/* Bottom padding area - 데드존이므로 비워둠 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: BOTTOM_PADDING,
          backgroundColor: '#000',
        }}
      />

      {/* Middle Quiz Area - Speech Bubble Style */}
      <div
        style={{
          position: 'absolute',
          top: TOP_BLACK_HEIGHT,
          left: 0,
          right: 0,
          height: MIDDLE_HEIGHT,
          backgroundColor: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
        }}
      >
        {/* Comic Book Speech Bubble with wobble animation */}
        <ComicSpeechBubble>
          {/* Phase-specific content inside bubble */}
          <Sequence from={phase1Start} durationInFrames={phase1Duration}>
            <Audio src={staticFile('assets/common/ding-dong.mp3')} volume={0.5} />
            <Phase1Listen
              audioFile={audioFile}
              introAudioFile={introAudioFile}
              introDuration={introDuration}
              sentence={sentence}
              nativeLanguage={config.meta.nativeLanguage}
              primaryColor={primaryColor}
              channelId={config.channelId}
            />
          </Sequence>

          <Sequence from={phase2Start} durationInFrames={phase2Duration}>
            <Audio src={staticFile('assets/common/ding-dong.mp3')} volume={0.5} />
            <Phase2Hint1 sentence={sentence} audioFile={audioFile} primaryColor={primaryColor} />
          </Sequence>

          <Sequence from={phase3Start} durationInFrames={phase3Duration}>
            <Audio src={staticFile('assets/common/ding-dong.mp3')} volume={0.5} />
            <Phase3Hint2 sentence={sentence} audioFile={audioFile} primaryColor={primaryColor} />
          </Sequence>

          <Sequence from={phase4Start} durationInFrames={phase4Duration}>
            <Audio src={staticFile('assets/common/ding-dong.mp3')} volume={0.5} />
            <Phase4Reveal
              sentence={sentence}
              audioFile={audioFile}
              primaryColor={primaryColor}
              channelId={config.channelId}
            />
          </Sequence>

          <Sequence from={phase5Start} durationInFrames={phase5Duration}>
            <Phase5CTA
              nativeLanguage={config.meta.nativeLanguage}
              primaryColor={primaryColor}
              channelId={config.channelId}
            />
          </Sequence>
        </ComicSpeechBubble>
      </div>
    </AbsoluteFill>
  );
};

// =============================================================================
// Comic Speech Bubble with Jagged Lines Animation
// =============================================================================

// =============================================================================
// Bottom Image Area with Ken Burns Effect
// =============================================================================

const BottomImageArea: React.FC<{ backgroundImage?: string }> = ({ backgroundImage }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Subtle zoom: 1.0 → 1.05 over the entire duration
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.05], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: BOTTOM_PADDING,
        left: 0,
        right: 0,
        height: BOTTOM_IMAGE_HEIGHT,
        overflow: 'hidden',
      }}
    >
      {backgroundImage && (
        <Img
          src={staticFile(backgroundImage)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
// Comic Speech Bubble with Jagged Lines Animation
// =============================================================================

const ComicSpeechBubble: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // SVG dimensions
  const width = 1032;
  const height = 420;
  const tailHeight = 50;
  const totalHeight = height + tailHeight;
  const strokeWidth = 5;

  // Tail position
  const tailX = width / 2;
  const tailWidth = 60;

  // Animation time
  const time = frame / fps;

  // Generate jagged line between two points
  const jaggedLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    segments: number,
    jagAmount: number,
    timeOffset: number
  ) => {
    const points: string[] = [];
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;

    // Perpendicular direction for jag
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / len;
    const perpY = dx / len;

    for (let i = 0; i <= segments; i++) {
      const baseX = x1 + dx * i;
      const baseY = y1 + dy * i;

      // Animated jag offset
      const jagPhase = i * Math.PI + time * 4 + timeOffset;
      const jag =
        i === 0 || i === segments ? 0 : Math.sin(jagPhase) * jagAmount * (i % 2 === 0 ? 1 : -1);

      const x = baseX + perpX * jag;
      const y = baseY + perpY * jag;

      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return points.join(' ');
  };

  // Build jagged bubble path
  const jagAmount = 4;
  const cornerRadius = 25;

  // Top edge
  const topLine = jaggedLine(
    cornerRadius,
    strokeWidth,
    width - cornerRadius,
    strokeWidth,
    20,
    jagAmount,
    0
  );
  // Right edge
  const rightLine = jaggedLine(
    width - strokeWidth,
    cornerRadius,
    width - strokeWidth,
    height - cornerRadius,
    8,
    jagAmount,
    1
  );
  // Bottom right to tail
  const bottomRight = jaggedLine(
    width - cornerRadius,
    height - strokeWidth,
    tailX + tailWidth / 2,
    height - strokeWidth,
    10,
    jagAmount,
    2
  );
  // Tail
  const tailPath = `L ${tailX} ${totalHeight - strokeWidth} L ${tailX - tailWidth / 2} ${height - strokeWidth}`;
  // Bottom left
  const bottomLeft = jaggedLine(
    tailX - tailWidth / 2,
    height - strokeWidth,
    cornerRadius,
    height - strokeWidth,
    10,
    jagAmount,
    3
  );
  // Left edge
  const leftLine = jaggedLine(
    strokeWidth,
    height - cornerRadius,
    strokeWidth,
    cornerRadius,
    8,
    jagAmount,
    4
  );

  // Combine path
  const path = `
    ${topLine}
    Q ${width - strokeWidth} ${strokeWidth} ${width - strokeWidth} ${cornerRadius}
    ${rightLine.replace(/^M [^ ]+ [^ ]+/, '')}
    Q ${width - strokeWidth} ${height - strokeWidth} ${width - cornerRadius} ${height - strokeWidth}
    ${bottomRight.replace(/^M [^ ]+ [^ ]+/, '')}
    ${tailPath}
    ${bottomLeft.replace(/^M [^ ]+ [^ ]+/, '')}
    Q ${strokeWidth} ${height - strokeWidth} ${strokeWidth} ${height - cornerRadius}
    ${leftLine.replace(/^M [^ ]+ [^ ]+/, '')}
    Q ${strokeWidth} ${strokeWidth} ${cornerRadius} ${strokeWidth}
    Z
  `;

  // Breathing scale animation
  const breathe = 1 + Math.sin(time * 1.5 * Math.PI * 2) * 0.005;

  // Pop-in animation
  const popScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  return (
    <div
      style={{
        position: 'relative',
        width: width,
        height: totalHeight,
        transform: `scale(${popScale * breathe})`,
        transformOrigin: 'center center',
      }}
    >
      <svg
        width={width}
        height={totalHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
        }}
      >
        {/* White fill */}
        <path d={path} fill="#FFFFFF" />
        {/* Black stroke */}
        <path d={path} fill="none" stroke="#333" strokeWidth={strokeWidth} strokeLinejoin="round" />
      </svg>

      {/* Content container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 50,
          right: 50,
          bottom: tailHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// Phase 1: Listen - 듣기 + 전체 빈칸 표시
// =============================================================================

const Phase1Listen: React.FC<{
  audioFile: AudioFile;
  introAudioFile?: AudioFile;
  introDuration: number;
  sentence: Sentence;
  nativeLanguage: string;
  primaryColor: string;
  channelId?: string;
}> = ({
  audioFile,
  introAudioFile,
  introDuration,
  sentence,
  nativeLanguage,
  primaryColor,
  channelId,
}) => {
  const frame = useCurrentFrame();

  // BGM 패딩 적용: 앞 0.5초 후에 TTS 시작
  const ttsStartFrame = INTRO_BGM_PADDING_BEFORE;
  // 빈칸 표시 타이밍: 앞패딩 + introDuration + 뒤패딩
  const blanksStartFrame = INTRO_BGM_PADDING_BEFORE + introDuration + INTRO_BGM_PADDING_AFTER;

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // intro 끝나면 빈칸 문장 표시
  const showBlanks = frame >= blanksStartFrame;
  const blanksOpacity = interpolate(frame, [blanksStartFrame, blanksStartFrame + 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const listenText =
    nativeLanguage === 'Korean'
      ? '🎧 이 영어가 들리세요?'
      : nativeLanguage === 'Japanese'
        ? '🎧 聞こえますか？'
        : '🎧 Can you hear this?';

  const words = sentence.target.split(' ');
  const fontSize = getDynamicFontSize(sentence.target);

  // 인트로 BGM 경로
  const introBgmPath = channelId
    ? `assets/${channelId}/shorts_ending.mp3`
    : 'assets/common/shorts_ending.mp3';

  // BGM fade out: 마지막 0.5초 동안 볼륨 감소
  const fadeOutStart = blanksStartFrame - FPS * 0.5;
  const bgmVolume = interpolate(frame, [0, fadeOutStart, blanksStartFrame], [0.15, 0.15, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      {/* 인트로 BGM - fade out 적용 */}
      {!showBlanks && <Audio src={staticFile(introBgmPath)} volume={bgmVolume} />}

      {/* Audio - 앞 패딩 후에 시작 */}
      <Sequence from={ttsStartFrame}>
        {introAudioFile?.path && <Audio src={staticFile(introAudioFile.path)} volume={1} />}
        {!introAudioFile && <Audio src={staticFile('shortIntro.mp3')} volume={1} />}
      </Sequence>
      <Sequence from={blanksStartFrame}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* Listen text - 처음에만 표시 */}
      {!showBlanks && (
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#333',
            textAlign: 'center',
            opacity: fadeIn,
            fontFamily: 'Pretendard, -apple-system, sans-serif',
          }}
        >
          {listenText}
        </div>
      )}

      {/* 전체 빈칸 문장 - intro 끝나면 표시 (WordSlot 사용) */}
      {showBlanks && (
        <div
          style={{
            fontSize,
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.8,
            opacity: blanksOpacity,
          }}
        >
          {words.map((word, i) => (
            <WordSlot key={i} word={word} isRevealed={false} primaryColor={primaryColor} />
          ))}
        </div>
      )}

      {/* 한글 자리 확보 (투명) */}
      <div
        style={{
          marginTop: 24,
          fontSize: 29,
          color: '#666',
          textAlign: 'center',
          opacity: 0,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {sentence.native}
      </div>
    </div>
  );
};

// =============================================================================
// Phase 2: 1차 힌트 (1/4 공개)
// =============================================================================

const Phase2Hint1: React.FC<{
  sentence: Sentence;
  audioFile: AudioFile;
  primaryColor: string;
}> = ({ sentence, audioFile, primaryColor }) => {
  const frame = useCurrentFrame();

  const words = sentence.target.split(' ');
  const hintIndices = getHintIndices(words.length, sentence.id);
  const fontSize = getDynamicFontSize(sentence.target);

  // 힌트 단어 나타나는 타이밍
  const HINT_DELAY = 15; // 0.5초 후 힌트 공개
  const showHints = frame >= HINT_DELAY;

  const hintOpacity = interpolate(frame, [HINT_DELAY, HINT_DELAY + 10], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const hintY = interpolate(frame, [HINT_DELAY, HINT_DELAY + 10], [-8, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Audio */}
      <Sequence from={TRANSITION_DURATION}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* 빈칸은 그대로, 힌트 단어만 애니메이션으로 나타남 */}
      <div
        style={{
          fontSize,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.8,
        }}
      >
        {words.map((word, i) => {
          const isHint = hintIndices.has(i);
          const isRevealed = isHint && showHints;

          return (
            <WordSlot
              key={i}
              word={word}
              isRevealed={isRevealed}
              primaryColor={primaryColor}
              opacity={isHint ? hintOpacity : 1}
              translateY={isHint ? hintY : 0}
            />
          );
        })}
      </div>

      {/* 한글 자리 확보 (투명) */}
      <div
        style={{
          marginTop: 24,
          fontSize: 29,
          color: '#666',
          textAlign: 'center',
          opacity: 0,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {sentence.native}
      </div>
    </div>
  );
};

// =============================================================================
// Phase 3: 2차 힌트 (1/2 공개)
// =============================================================================

const Phase3Hint2: React.FC<{
  sentence: Sentence;
  audioFile: AudioFile;
  primaryColor: string;
}> = ({ sentence, audioFile, primaryColor }) => {
  const frame = useCurrentFrame();

  const words = sentence.target.split(' ');
  const firstHintIndices = getHintIndices(words.length, sentence.id);
  const secondHintIndices = getSecondHintIndices(words.length, sentence.id);
  const fontSize = getDynamicFontSize(sentence.target);

  // 2차 힌트 단어 나타나는 타이밍
  const HINT_DELAY = 15;
  const showHints = frame >= HINT_DELAY;

  const hintOpacity = interpolate(frame, [HINT_DELAY, HINT_DELAY + 10], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const hintY = interpolate(frame, [HINT_DELAY, HINT_DELAY + 10], [-8, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Audio */}
      <Sequence from={TRANSITION_DURATION}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* 1차 힌트는 그대로, 2차 힌트만 애니메이션으로 나타남 */}
      <div
        style={{
          fontSize,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.8,
        }}
      >
        {words.map((word, i) => {
          const isFirstHint = firstHintIndices.has(i);
          const isSecondHint = secondHintIndices.has(i) && !isFirstHint;
          const isRevealed = isFirstHint || (isSecondHint && showHints);

          return (
            <WordSlot
              key={i}
              word={word}
              isRevealed={isRevealed}
              primaryColor={primaryColor}
              opacity={isSecondHint ? hintOpacity : 1}
              translateY={isSecondHint ? hintY : 0}
            />
          );
        })}
      </div>

      {/* 한글 자리 확보 (투명) */}
      <div
        style={{
          marginTop: 24,
          fontSize: 29,
          color: '#666',
          textAlign: 'center',
          opacity: 0,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {sentence.native}
      </div>
    </div>
  );
};

// =============================================================================
// Phase 4: 전체 정답 공개
// =============================================================================

const Phase4Reveal: React.FC<{
  sentence: Sentence;
  audioFile: AudioFile;
  primaryColor: string;
  channelId?: string;
}> = ({ sentence, audioFile, primaryColor }) => {
  const frame = useCurrentFrame();

  const words = sentence.target.split(' ');
  const secondHintIndices = getSecondHintIndices(words.length, sentence.id);
  const fontSize = getDynamicFontSize(sentence.target);

  // 정답 공개 타이밍
  const REVEAL_DELAY = 15; // 0.5초 후 나머지 정답 공개
  const KOREAN_DELAY = REVEAL_DELAY + 30; // 정답 후 1초 뒤 한글

  const showRemaining = frame >= REVEAL_DELAY;
  const showKorean = frame >= KOREAN_DELAY;

  const answerOpacity = interpolate(frame, [REVEAL_DELAY, REVEAL_DELAY + 10], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const answerY = interpolate(frame, [REVEAL_DELAY, REVEAL_DELAY + 10], [-8, 0], {
    extrapolateRight: 'clamp',
  });
  const koreanOpacity = interpolate(frame, [KOREAN_DELAY, KOREAN_DELAY + 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Audio */}
      <Sequence from={TRANSITION_DURATION}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* 2차 힌트는 그대로, 나머지만 애니메이션으로 공개 */}
      <div
        style={{
          fontSize,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.8,
        }}
      >
        {words.map((word, i) => {
          const isAlreadyRevealed = secondHintIndices.has(i);
          // 이미 공개된 건 그대로, 나머지는 REVEAL_DELAY 후 공개
          const isRevealed = isAlreadyRevealed || showRemaining;

          return (
            <WordSlot
              key={i}
              word={word}
              isRevealed={isRevealed}
              primaryColor={primaryColor}
              // 이미 공개된 건 애니메이션 없이, 나머지만 스륵 올라오기
              opacity={isAlreadyRevealed ? 1 : answerOpacity}
              translateY={isAlreadyRevealed ? 0 : answerY}
            />
          );
        })}
      </div>

      {/* Native translation - 정답 공개 후 */}
      <div
        style={{
          marginTop: 24,
          fontSize: 29,
          color: '#666',
          textAlign: 'center',
          opacity: showKorean ? koreanOpacity : 0,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {sentence.native}
      </div>
    </div>
  );
};

// =============================================================================
// Phase 5: CTA
// =============================================================================

const Phase5CTA: React.FC<{
  nativeLanguage: string;
  primaryColor: string;
  channelId?: string;
}> = ({ nativeLanguage, channelId }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const bounceY = interpolate((frame - 20) % 40, [0, 20, 40], [0, 8, 0], {
    extrapolateLeft: 'clamp',
  });

  const questionText =
    nativeLanguage === 'Korean'
      ? '모두 맞추셨나요?'
      : nativeLanguage === 'Japanese'
        ? '全部正解できましたか？'
        : 'Did you get them all?';

  const ctaText =
    nativeLanguage === 'Korean'
      ? '👇 프로필에서 풀버전 확인!'
      : nativeLanguage === 'Japanese'
        ? '👇 プロフィールで確認！'
        : '👇 Full version in profile!';

  // 채널별 엔딩 오디오, 없으면 common fallback
  const endingAudioPath = channelId
    ? `assets/${channelId}/shorts_ending.mp3`
    : 'assets/common/shorts_ending.mp3';

  // BGM fade out: 마지막 1초 동안 볼륨 감소
  const fadeOutStart = durationInFrames - FPS;
  const bgmVolume = interpolate(frame, [0, fadeOutStart, durationInFrames], [0.2, 0.2, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        gap: 28,
      }}
    >
      {/* 엔딩 오디오 - fade out 적용 */}
      <Audio src={staticFile(endingAudioPath)} volume={bgmVolume} />

      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: '#333',
          textAlign: 'center',
          opacity: fadeIn,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {questionText}
      </div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#FF3B30',
          textAlign: 'center',
          opacity: fadeIn,
          transform: `scale(${scale}) translateY(${frame > 20 ? bounceY : 0}px)`,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {ctaText}
      </div>
    </div>
  );
};
