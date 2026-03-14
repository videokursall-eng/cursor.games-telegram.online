import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionPanel } from './ActionPanel';
import { getUiTheme } from '../../theme/uiTheme';

describe('ActionPanel pending indicator', () => {
  it('shows spinner only on pending action button and disables it', () => {
    const onAttack = vi.fn();

    render(
      <ActionPanel
        canAttack
        canDefend={false}
        canThrowIn={false}
        canTransfer={false}
        canTake={false}
        canFinish={false}
        pendingAction="attack"
        onAttack={onAttack}
        onDefend={() => {}}
        onThrowIn={() => {}}
        onTransfer={() => {}}
        onTake={() => {}}
        onFinish={() => {}}
      />,
    );

    const attackButton = screen.getByText('Атаковать').closest('button') as HTMLButtonElement;
    expect(attackButton.disabled).toBe(true);
    expect(attackButton.querySelector('[data-testid="pending-indicator"]')).not.toBeNull();

    const defendButton = screen.getByText('Защититься').closest('button') as HTMLButtonElement;
    expect(defendButton.disabled).toBe(true);
    expect(defendButton.querySelector('[data-testid="pending-indicator"]')).toBeNull();

    fireEvent.click(attackButton);
    expect(onAttack).not.toHaveBeenCalled();
  });

  it('applies theme-based classes for active and disabled buttons', () => {
    const theme = getUiTheme();

    render(
      <ActionPanel
        canAttack
        canDefend={false}
        canThrowIn={false}
        canTransfer={false}
        canTake={false}
        canFinish={false}
        pendingAction={null}
        onAttack={() => {}}
        onDefend={() => {}}
        onThrowIn={() => {}}
        onTransfer={() => {}}
        onTake={() => {}}
        onFinish={() => {}}
      />,
    );

    const attackButton = screen.getByText('Атаковать').closest('button') as HTMLButtonElement;
    const defendButton = screen.getByText('Защититься').closest('button') as HTMLButtonElement;

    const primaryBaseToken = theme.actionButton.primary.base.split(' ')[0];
    const primaryDisabledToken = theme.actionButton.primary.disabled.split(' ')[0];

    expect(attackButton.className).toContain(primaryBaseToken);
    expect(defendButton.className).toContain(primaryDisabledToken);
  });
});

