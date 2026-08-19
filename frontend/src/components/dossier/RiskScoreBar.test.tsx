import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskScoreBar } from './RiskScoreBar';

describe('RiskScoreBar', () => {
  it('labels a low score (<=30) as Low', () => {
    render(<RiskScoreBar score={5} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('labels a mid score (31-70) as Moderate', () => {
    render(<RiskScoreBar score={50} />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('labels a high score (>70) as High', () => {
    render(<RiskScoreBar score={85} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('treats the boundary values correctly (30 is Low, 70 is Moderate)', () => {
    const { rerender } = render(<RiskScoreBar score={30} />);
    expect(screen.getByText('Low')).toBeInTheDocument();

    rerender(<RiskScoreBar score={70} />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();

    rerender(<RiskScoreBar score={71} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});
