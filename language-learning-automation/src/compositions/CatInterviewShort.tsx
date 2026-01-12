/**
 * CatInterviewShort Component
 *
 * 고양이 인터뷰 영어 학습 쇼츠 (9:16 세로)
 *
 * Layout (1080x1920):
 * - 상단 420px: 검정 영역 + 첫 대답(흰색) + 질문(노란색)
 * - 중간: Veo 영상 (16:9 = 1080x608)
 * - 영상 위에 질문/답변 오버레이
 * - 하단 350px: 검정 영역 + 채널명
 */

import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from 'remotion';

// =============================================================================
// Types
// =============================================================================

export interface CatInterviewDialogue {
  question: string; // 한국어 질문 (e.g., "눈이 와요"는?)
  answer: string; // 영어 답변 (e.g., "It's snowing!")
  gesture?: string;
}

export interface CatInterviewShortProps {
  dialogues: CatInterviewDialogue[];
  videoPath: string; // Veo 생성 영상 경로
  theme: string;
  outfit?: string;
  channelName?: string;
}

// =============================================================================
// Layout Constants (1080x1920 for 9:16)
// =============================================================================

const WIDTH = 1080;
const HEIGHT = 1920;
const TOP_BLACK_HEIGHT = 420; // 상단 검정 영역
const BOTTOM_PADDING = 350; // 하단 데드존
const VIDEO_HEIGHT = 1080; // 영상 영역 (1:1 = 1080x1080)
const MIDDLE_HEIGHT = HEIGHT - TOP_BLACK_HEIGHT - VIDEO_HEIGHT - BOTTOM_PADDING; // 중간 여백 (70px)

// =============================================================================
// Timing Constants (30fps)
// =============================================================================

const FPS = 30;
const QUESTION_DURATION = 2 * FPS; // 질문 표시 2초
const ANSWER_DURATION = 3 * FPS; // 답변 표시 3초
const TRANSITION_DURATION = 0.5 * FPS; // 전환 0.5초

// =============================================================================
// Duration Calculator
// =============================================================================

export function calculateCatInterviewDuration(dialogueCount: number): number {
  const perDialogue = QUESTION_DURATION + ANSWER_DURATION + TRANSITION_DURATION;
  return dialogueCount * perDialogue + FPS;
}

// =============================================================================
// Main Component
// =============================================================================

export const CatInterviewShort: React.FC<CatInterviewShortProps> = ({
  dialogues,
  videoPath,
  channelName = '나비의 영어교실',
}) => {
  const perDialogue = QUESTION_DURATION + ANSWER_DURATION + TRANSITION_DURATION;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* 상단 검정 영역 (420px) - 타이틀 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: TOP_BLACK_HEIGHT,
          backgroundColor: '#000',
        }}
      >
        <TopTitleArea dialogues={dialogues} />
      </div>

      {/* 중간 영상 영역 (16:9 = 1080x608) */}
      <div
        style={{
          position: 'absolute',
          top: TOP_BLACK_HEIGHT,
          left: 0,
          right: 0,
          height: VIDEO_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <OffthreadVideo
          src={staticFile(videoPath)}
          style={{
            width: WIDTH,
            height: VIDEO_HEIGHT,
            objectFit: 'cover',
          }}
        />
        {/* 영상 위에 질문/답변 오버레이 */}
        <CenterOverlay dialogues={dialogues} perDialogue={perDialogue} />
      </div>

      {/* 하단 검정 영역 (350px) - 채널명 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: BOTTOM_PADDING,
          backgroundColor: '#000',
        }}
      >
        <ChannelNameArea channelName={channelName} />
      </div>
    </AbsoluteFill>
  );
};

// =============================================================================
// Top Title Area - 첫 대답(흰색) + 질문(노란색)
// =============================================================================

const TopTitleArea: React.FC<{
  dialogues: CatInterviewDialogue[];
}> = ({ dialogues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const firstDialogue = dialogues[0];
  if (!firstDialogue) return null;

  // 질문에서 따옴표와 "는?" 제거하고 "영어로?" 추가
  // e.g., "눈사람 만들자"는? → 눈사람 만들자 영어로?
  const questionText =
    firstDialogue.question
      .replace(/^"/, '') // 앞 따옴표 제거
      .replace(/"는\?$/, '') // 뒤 "는? 제거
      .trim() + ' 영어로?';

  // 페이드인 애니메이션
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 120,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {/* 첫 줄: 영어 답변 (흰색) */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#FFFFFF',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          textShadow: '0 4px 12px rgba(0,0,0,0.8)',
        }}
      >
        {firstDialogue.answer}
      </div>

      {/* 둘째 줄: 한국어 질문 (노란색) */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: '#FFD700',
          textAlign: 'center',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}
      >
        {questionText}
      </div>
    </div>
  );
};

// =============================================================================
// Center Overlay - 영상 중앙에 질문/답변
// =============================================================================

const CenterOverlay: React.FC<{
  dialogues: CatInterviewDialogue[];
  perDialogue: number;
}> = ({ dialogues, perDialogue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 현재 대화 인덱스
  const currentIndex = Math.min(Math.floor(frame / perDialogue), dialogues.length - 1);
  const localFrame = frame - currentIndex * perDialogue;

  const currentDialogue = dialogues[currentIndex];
  if (!currentDialogue) return null;

  // 질문 표시 타이밍
  const questionOpacity = interpolate(
    localFrame,
    [0, 15, QUESTION_DURATION - 10, QUESTION_DURATION],
    [0, 1, 1, 0.3],
    { extrapolateRight: 'clamp' }
  );

  // 답변 표시 타이밍
  const answerStartFrame = QUESTION_DURATION;
  const showAnswer = localFrame >= answerStartFrame;
  const answerLocalFrame = localFrame - answerStartFrame;

  const answerOpacity = interpolate(
    answerLocalFrame,
    [0, 15, ANSWER_DURATION - 15, ANSWER_DURATION],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );

  // Pop animation
  const questionScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const answerScale = spring({
    frame: Math.max(0, answerLocalFrame),
    fps,
    config: { damping: 10, stiffness: 180 },
  });

  // 영상 영역 내에서 중앙 + 15% 아래
  const positionY = VIDEO_HEIGHT * 0.5 + VIDEO_HEIGHT * 0.15;

  return (
    <div
      style={{
        position: 'absolute',
        top: positionY,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        transform: 'translateY(-50%)',
      }}
    >
      {/* 질문 (한국어) */}
      <div
        style={{
          fontSize: 44,
          fontWeight: 700,
          color: '#FFD700',
          textAlign: 'center',
          opacity: questionOpacity,
          transform: `scale(${questionScale})`,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          padding: '0 40px',
        }}
      >
        {currentDialogue.question}
      </div>

      {/* 답변 (영어) */}
      {showAnswer && (
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: '#00FF88',
            textAlign: 'center',
            opacity: answerOpacity,
            transform: `scale(${answerScale})`,
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            textShadow: '0 4px 16px rgba(0,0,0,0.9)',
            padding: '0 40px',
          }}
        >
          {currentDialogue.answer}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Channel Name Area - 하단 검정 영역 상단에 위치
// =============================================================================

const ChannelNameArea: React.FC<{
  channelName: string;
}> = ({ channelName }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: 50,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: '#FFD700',
          fontFamily: 'Pretendard, -apple-system, sans-serif',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        🐱 {channelName}
      </div>
    </div>
  );
};

export default CatInterviewShort;
