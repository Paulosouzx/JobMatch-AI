import type { CollectedJob } from '../normalize';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CollectResult {
  jobs: CollectedJob[];
  errors: string[];
}

export interface Collector<C> {
  id: string;
  collect(config: C, fetchFn: FetchLike): Promise<CollectResult>;
}
