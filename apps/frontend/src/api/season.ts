import { api } from './client';
import type { SeasonWithTrackDto } from 'shared';

export async function fetchMySeason(token: string | null) {
  return api<SeasonWithTrackDto>('/me/season', { token });
}

export async function claimSeasonReward(level: number, token: string | null) {
  return api<SeasonWithTrackDto>('/me/season/claim', {
    method: 'POST',
    body: JSON.stringify({ level }),
    token,
  });
}

