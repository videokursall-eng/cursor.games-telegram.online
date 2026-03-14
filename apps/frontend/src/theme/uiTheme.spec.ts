import { describe, it, expect } from 'vitest';
import { getUiTheme } from './uiTheme';

describe('uiTheme resolver', () => {
  it('returns brand theme by default', () => {
    const theme = getUiTheme();
    expect(theme.id).toBe('brand');
    expect(theme.pendingIndicator).toBeDefined();
  });

  it('returns specific theme when id is provided', () => {
    const defaultTheme = getUiTheme('default');
    const brandTheme = getUiTheme('brand');
    expect(defaultTheme.id).toBe('default');
    expect(brandTheme.id).toBe('brand');
    expect(defaultTheme.pendingIndicator.colors.inline).not.toBe(
      brandTheme.pendingIndicator.colors.inline,
    );
    expect(defaultTheme.actionButton.primary.base).toBeDefined();
    expect(defaultTheme.actionButton.secondary.base).toBeDefined();
    expect(defaultTheme.actionButton.danger.base).toBeDefined();
  });
});

