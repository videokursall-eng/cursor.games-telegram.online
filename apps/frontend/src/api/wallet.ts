import type { WalletDto } from 'shared';
import { api } from './client';

export async function fetchMyWallet(token: string | null) {
  return api<WalletDto>('/me/wallet', { token });
}

