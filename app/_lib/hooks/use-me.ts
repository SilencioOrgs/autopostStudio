"use client";

import useSWR from "swr";
import type { ApiResponse } from "@/app/_lib/errors";

export interface MeData {
  user: {
    id: string;
    email?: string;
    emailConfirmed: boolean;
  };
  profile: {
    daily_post_cap: number;
    username?: string | null;
    email: string;
  };
  pages: Array<{
    id: string;
    page_id: string;
    page_name: string;
    followers_count: number;
    token_status: string;
    is_default: boolean;
  }>;
  imageProvider: string;
  counts: {
    prompts: number;
    generating: number;
    ready: number;
    backlog?: number;
    scheduled: number;
    boardTotal?: number;
    published: number;
  };
}

const fetcher = async (url: string): Promise<MeData> => {
  const response = await fetch(url, { credentials: "same-origin" });
  const json: ApiResponse<MeData> = await response.json();

  if (!response.ok || !json.ok) {
    throw new Error(json.ok ? "Failed to load account data." : json.error.message);
  }

  return json.data;
};

export function useMe() {
  const { data, isLoading, error, mutate } = useSWR<MeData>("/api/me", fetcher, {
    dedupingInterval: 5_000,
  });

  return { data, isLoading, error, mutate };
}
