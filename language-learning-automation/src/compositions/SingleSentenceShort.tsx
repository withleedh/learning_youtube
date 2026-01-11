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

// =============================================================================
// Duration Calculator
// =============================================================================

export function calculateSingleSentenceShortDuration(
  audioFile: AudioFile,
  introAudioFile?: AudioFile
): number {
  const audioDurationFrames = Math.ceil(audioFile.duration * FPS);
  const introDuration = introAudioFile ? Math.ceil(introAudioFile.duration * FPS) : INTRO_DURATION;

  const phase1 = introDuration + audioDurationFrames + FPS;
  const phase2 = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;
  const phase3 = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;
  const phase4 = FPS * 2;

  return phase1 + phase2 + phase3 + phase4;
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
  totalSentences,
  episodeTitle,
  channelName,
}) => {
  const audioDurationFrames = Math.ceil(audioFile.duration * FPS);
  const introDuration = introAudioFile ? Math.ceil(introAudioFile.duration * FPS) : INTRO_DURATION;

  const phase1Start = 0;
  const phase1Duration = introDuration + audioDurationFrames + FPS;

  const phase2Start = phase1Duration;
  const phase2Duration = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;

  const phase3Start = phase2Start + phase2Duration;
  const phase3Duration = TRANSITION_DURATION + audioDurationFrames + THINK_TIME;

  const phase4Start = phase3Start + phase3Duration;
  const phase4Duration = FPS * 2;

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
          justifyContent: 'center',
          gap: 16,
          paddingTop: 180,
        }}
      >
        {/* 영어 듣기 능력 시험 - 빨간색 */}
        <div
          style={{
            fontSize: 108,
            fontWeight: 900,
            color: '#FF3B30',
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            textShadow: '0 0 20px rgba(255, 59, 48, 0.5)',
            letterSpacing: 4,
          }}
        >
          영어 듣기 능력 시험
        </div>
        {/* 채널명 - 하얀색 */}
        <div
          style={{
            fontSize: 54,
            fontWeight: 600,
            color: '#FFFFFF',
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            opacity: 0.9,
          }}
        >
          {channelName || config.meta.name}
        </div>
      </div>

      {/* Bottom Image Area (16:9, 1080x608) - 100px above bottom */}
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
            }}
          />
        )}
      </div>

      {/* Bottom padding area (black) */}
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
            <Audio src={staticFile('assets/common/ding-dong.mp3')} volume={0.3} />
            <Phase1Listen
              audioFile={audioFile}
              introAudioFile={introAudioFile}
              introDuration={introDuration}
              nativeLanguage={config.meta.nativeLanguage}
            />
          </Sequence>

          <Sequence from={phase2Start} durationInFrames={phase2Duration}>
            <Audio src={staticFile('assets/common/ding-dong.mp3')} volume={0.3} />
            <Phase2Quiz
              sentence={sentence}
              audioFile={audioFile}
              primaryColor={primaryColor}
              nativeLanguage={config.meta.nativeLanguage}
            />
          </Sequence>

          <Sequence from={phase3Start} durationInFrames={phase3Duration}>
            <Audio src={staticFile('assets/common/ding-dong.mp3')} volume={0.3} />
            <Phase3Reveal sentence={sentence} audioFile={audioFile} primaryColor={primaryColor} />
          </Sequence>

          <Sequence from={phase4Start} durationInFrames={phase4Duration}>
            <Phase4CTA
              nativeLanguage={config.meta.nativeLanguage}
              primaryColor={primaryColor}
              sentenceIndex={sentenceIndex}
              totalSentences={totalSentences}
              episodeTitle={episodeTitle}
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
// Phase 1: Listen
// =============================================================================

const Phase1Listen: React.FC<{
  audioFile: AudioFile;
  introAudioFile?: AudioFile;
  introDuration: number;
  nativeLanguage: string;
}> = ({ audioFile, introAudioFile, introDuration, nativeLanguage }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const listenText =
    nativeLanguage === 'Korean'
      ? '🎧 이 영어가 들리세요?'
      : nativeLanguage === 'Japanese'
        ? '🎧 聞こえますか？'
        : '🎧 Can you hear this?';

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
      {introAudioFile?.path && <Audio src={staticFile(introAudioFile.path)} volume={1} />}
      {!introAudioFile && <Audio src={staticFile('shortIntro.mp3')} volume={1} />}
      <Sequence from={introDuration}>
        {audioFile.path && <Audio src={staticFile(audioFile.path)} volume={1} />}
      </Sequence>

      {/* Listen text - dark for white bubble */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: '#333',
          textAlign: 'center',
          opacity: fadeIn,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {listenText}
      </div>
    </div>
  );
};

// =============================================================================
// Phase 2: Quiz with Blank
// =============================================================================

const Phase2Quiz: React.FC<{
  sentence: Sentence;
  audioFile: AudioFile;
  primaryColor: string;
  nativeLanguage: string;
}> = ({ sentence, audioFile, primaryColor, nativeLanguage }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const blinkOpacity = interpolate(frame % 45, [0, 22, 45], [0.4, 1, 0.4]);

  const parts = sentence.targetBlank.split('_______');

  const hintLabel =
    nativeLanguage === 'Korean' ? '💡 ' : nativeLanguage === 'Japanese' ? '💡 ' : '💡 ';

  const hintMeaning =
    sentence.words.find((w) => w.word.toLowerCase() === sentence.blankAnswer.toLowerCase())
      ?.meaning || '';

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

      {/* Quiz sentence with blank - dark text for white bubble */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 600,
          color: '#333',
          textAlign: 'center',
          lineHeight: 1.5,
          opacity: fadeIn,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span
                style={{
                  display: 'inline-block',
                  minWidth: 100,
                  borderBottom: `3px solid ${primaryColor}`,
                  marginLeft: 6,
                  marginRight: 6,
                  opacity: blinkOpacity,
                  backgroundColor: `${primaryColor}20`,
                  borderRadius: 4,
                  padding: '0 12px',
                }}
              >
                {'   '}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Hint */}
      {hintMeaning && (
        <div
          style={{
            marginTop: 24,
            fontSize: 36,
            color: '#666',
            textAlign: 'center',
            opacity: fadeIn,
            fontFamily: 'Pretendard, -apple-system, sans-serif',
          }}
        >
          {hintLabel}
          {hintMeaning}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Phase 3: Reveal Answer
// =============================================================================

const Phase3Reveal: React.FC<{
  sentence: Sentence;
  audioFile: AudioFile;
  primaryColor: string;
}> = ({ sentence, audioFile, primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const answerScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 10, stiffness: 180 },
  });
  const translateFade = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });

  // Highlight answer word
  const renderSentence = () => {
    const regex = new RegExp(`(${sentence.blankAnswer})`, 'i');
    const parts = sentence.target.split(regex);

    return parts.map((part, i) => {
      if (part.toLowerCase() === sentence.blankAnswer.toLowerCase()) {
        return (
          <span
            key={i}
            style={{
              color: primaryColor,
              fontWeight: 800,
              transform: `scale(${Math.max(0, answerScale)})`,
              display: 'inline-block',
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

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

      {/* Full sentence with highlighted answer - dark text */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 600,
          color: '#333',
          textAlign: 'center',
          lineHeight: 1.5,
          opacity: fadeIn,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {renderSentence()}
      </div>

      {/* Native translation */}
      <div
        style={{
          marginTop: 24,
          fontSize: 36,
          color: '#666',
          textAlign: 'center',
          opacity: translateFade,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        {sentence.native}
      </div>
    </div>
  );
};

// =============================================================================
// Phase 4: CTA
// =============================================================================

const Phase4CTA: React.FC<{
  nativeLanguage: string;
  primaryColor: string;
  sentenceIndex?: number;
  totalSentences?: number;
  episodeTitle?: string;
}> = ({ nativeLanguage, primaryColor, sentenceIndex, totalSentences, episodeTitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const bounceY = interpolate((frame - 20) % 40, [0, 20, 40], [0, 8, 0], {
    extrapolateLeft: 'clamp',
  });

  const ctaText =
    nativeLanguage === 'Korean'
      ? '프로필에서 풀버전 확인!'
      : nativeLanguage === 'Japanese'
        ? 'プロフィールで確認！'
        : 'Full version in profile!';

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
      {episodeTitle && (
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: '#333',
            textAlign: 'center',
            opacity: fadeIn,
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            marginBottom: 16,
          }}
        >
          📺 {episodeTitle}
        </div>
      )}

      {sentenceIndex && totalSentences && (
        <div
          style={{
            fontSize: 32,
            color: '#666',
            textAlign: 'center',
            opacity: fadeIn,
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            marginBottom: 24,
          }}
        >
          {sentenceIndex} / {totalSentences}
        </div>
      )}

      <div
        style={{
          fontSize: 48,
          fontWeight: 900,
          color: primaryColor,
          textAlign: 'center',
          opacity: fadeIn,
          transform: `scale(${scale}) translateY(${frame > 20 ? bounceY : 0}px)`,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}
      >
        👇 {ctaText}
      </div>
    </div>
  );
};
