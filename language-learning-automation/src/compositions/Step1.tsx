import React from 'react';
import { AbsoluteFill, Audio, Sequence, Img, staticFile } from 'remotion';
import type { AudioFile } from '../tts/types';

export interface Step1Props {
  backgroundImage?: string;
  audioFiles: AudioFile[];
  title?: string;
}

export const Step1: React.FC<Step1Props> = ({ backgroundImage, audioFiles, title }) => {
  // Filter to only 1.0x speed audio files for Step 1
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');

  // Calculate cumulative start times for each audio
  let cumulativeFrame = 0;
  const audioSequences = normalSpeedAudios.map((audio, index) => {
    const startFrame = cumulativeFrame;
    const durationFrames = Math.ceil(audio.duration * 30); // 30fps
    cumulativeFrame += durationFrames + 15; // Add small gap between sentences
    return { audio, startFrame, durationFrames };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Background Image */}
      {backgroundImage && (
        <AbsoluteFill>
          <Img
            src={staticFile(backgroundImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      )}

      {/* Title Overlay */}
      {title && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 48,
            fontWeight: 600,
            color: '#FFFFFF',
            textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {title}
        </div>
      )}

      {/* Step Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '12px 24px',
          borderRadius: 8,
          fontSize: 24,
          color: '#FFFFFF',
          fontWeight: 600,
          fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        Step 1: 자막 없이 듣기
      </div>

      {/* Audio Sequences */}
      {audioSequences.map(({ audio, startFrame, durationFrames }, idx) => (
        <Sequence key={idx} from={startFrame} durationInFrames={durationFrames}>
          <Audio src={audio.path} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Calculate total duration for Step 1
export function calculateStep1Duration(audioFiles: AudioFile[]): number {
  const normalSpeedAudios = audioFiles.filter((af) => af.speed === '1.0x');
  const totalDuration = normalSpeedAudios.reduce((sum, af) => sum + af.duration, 0);
  const gaps = (normalSpeedAudios.length - 1) * 0.5; // 0.5 second gaps
  return Math.ceil((totalDuration + gaps) * 30); // Convert to frames at 30fps
}
