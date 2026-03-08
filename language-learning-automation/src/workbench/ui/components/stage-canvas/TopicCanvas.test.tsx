import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopicCanvas } from './TopicCanvas';

describe('TopicCanvas', () => {
  it('lets the user choose a topic candidate before approval', () => {
    const onSelectTopic = vi.fn();

    render(
      <TopicCanvas
        currentArtifact={{
          generatedAt: '2026-03-08T00:00:00.000Z',
          category: 'conversation',
          candidates: ['Coffee date', 'Missed the train'],
          recommendedTopic: 'Missed the train',
        }}
        approvedArtifact={null}
        approvalText=""
        isBusy={false}
        onSelectTopic={onSelectTopic}
      />
    );

    expect(screen.getByText('Selected topic: Missed the train')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Coffee date/i }));

    expect(onSelectTopic).toHaveBeenCalledWith('Coffee date');
  });
});
