import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminAuditLogSection } from './AdminAuditLogSection';
import type { AdminAuditLogRow } from '../api/adminAudit';

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-token' }),
}));

const fetchAdminAuditLogs = vi.fn();

vi.mock('../api/adminAudit', () => ({
  fetchAdminAuditLogs: (...args: unknown[]) => fetchAdminAuditLogs(...args),
}));

function renderSection() {
  return render(
    <MemoryRouter>
      <AdminAuditLogSection />
    </MemoryRouter>,
  );
}

const baseRow: AdminAuditLogRow = {
  id: 'log1',
  createdAt: new Date(0).toISOString(),
  adminUserId: 'admin1',
  action: 'inventory_grant',
  targetType: 'PlayerCosmeticItem',
  targetId: 'card_back_red',
  success: true,
  reason: 'manual_grant',
  payload: {
    userId: 'u1',
    itemId: 'card_back_red',
    reason: 'manual_grant',
  },
};

describe('AdminAuditLogSection', () => {
  it('renders audit log entries with compact summary', async () => {
    fetchAdminAuditLogs.mockResolvedValue([baseRow]);

    renderSection();

    await waitFor(() => expect(fetchAdminAuditLogs).toHaveBeenCalled());

    expect(await screen.findByText('Audit log')).toBeInTheDocument();
    expect(screen.getByText(/inventory_grant/i)).toBeInTheDocument();
    expect(screen.getByText(/Granted cosmetic card_back_red to u1/)).toBeInTheDocument();
  });

  it('filters by admin and target', async () => {
    fetchAdminAuditLogs.mockResolvedValue([baseRow]);

    renderSection();
    await waitFor(() => expect(fetchAdminAuditLogs).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Admin userId'), {
      target: { value: 'other_admin' },
    });

    expect(
      screen.queryByText(/Granted cosmetic card_back_red to u1/),
    ).not.toBeInTheDocument();
  });

  it('shows details view with full payload JSON', async () => {
    fetchAdminAuditLogs.mockResolvedValue([baseRow]);

    renderSection();
    await waitFor(() => expect(fetchAdminAuditLogs).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Детали'));

    expect(
      await screen.findByText(/"itemId": "card_back_red"/),
    ).toBeInTheDocument();
  });
});

