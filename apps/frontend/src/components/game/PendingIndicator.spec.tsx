import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PendingIndicator } from './PendingIndicator';

describe('PendingIndicator', () => {
  it('renders three bouncing dots with correct test id', () => {
    render(<PendingIndicator size="sm" variant="status" />);

    const indicator = screen.getByTestId('pending-indicator');
    expect(indicator).toBeInTheDocument();

    const dots = indicator.querySelectorAll('span');
    expect(dots.length).toBe(3);
  });

  it('supports button and status variants styling without layout break', () => {
    render(
      <div className="flex gap-2">
        <PendingIndicator size="sm" variant="button" />
        <PendingIndicator size="sm" variant="status" />
      </div>,
    );
    const indicators = screen.getAllByTestId('pending-indicator');
    expect(indicators.length).toBe(2);
  });
});

