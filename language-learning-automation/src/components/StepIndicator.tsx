import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export interface StepIndicatorProps {
  steps: string[];
  currentStep?: number;
  primaryColor?: string;
  textColor?: string;
  fontSize?: number;
  animationDuration?: number; // frames per step
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  primaryColor = '#87CEEB',
  textColor = '#FFFFFF',
  fontSize = 32,
  animationDuration = 30 * 7, // 7 seconds per step at 30fps
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 30,
        padding: 40,
      }}
      data-testid="step-indicator"
    >
      {steps.map((step, index) => {
        // Calculate animation progress for this step
        const stepStartFrame = index * animationDuration;
        const opacity = interpolate(frame, [stepStartFrame, stepStartFrame + 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const isActive = currentStep === index + 1;
        const isPast = currentStep !== undefined && currentStep > index + 1;

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              opacity: currentStep !== undefined ? 1 : opacity,
            }}
            data-testid={`step-${index + 1}`}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: isActive || isPast ? primaryColor : 'rgba(255,255,255,0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: isActive || isPast ? '#000' : textColor,
              }}
            >
              {index + 1}
            </div>
            <div
              style={{
                fontSize,
                color: isActive ? primaryColor : textColor,
                fontWeight: isActive ? 700 : 400,
                fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              }}
            >
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Static step list without animation
export const StaticStepList: React.FC<{
  steps: string[];
  textColor?: string;
  fontSize?: number;
}> = ({ steps, textColor = '#FFFFFF', fontSize = 28 }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
      data-testid="static-step-list"
    >
      {steps.map((step, index) => (
        <div
          key={index}
          style={{
            fontSize,
            color: textColor,
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          Step {index + 1}: {step}
        </div>
      ))}
    </div>
  );
};
