import { DailyLimitReachedError, RateLimitError } from './errors';

export interface QueueOptions {
  concurrency: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  reserve?: () => Promise<boolean>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class LLMQueue {
  private active = 0;
  private waiting: (() => void)[] = [];
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private limitReached = false;

  constructor(private readonly options: QueueOptions) {
    this.maxRetries = options.maxRetries ?? 4;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 60_000;
    this.sleep = options.sleep ?? defaultSleep;
  }

  get exhausted(): boolean {
    return this.limitReached;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await this.execute(task);
    } finally {
      this.release();
    }
  }

  private async execute<T>(task: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      if (this.limitReached) throw new DailyLimitReachedError();
      if (this.options.reserve && !(await this.options.reserve())) {
        this.limitReached = true;
        throw new DailyLimitReachedError();
      }
      try {
        return await task();
      } catch (error) {
        if (!(error instanceof RateLimitError) || attempt >= this.maxRetries) throw error;
        const backoff = Math.min(this.baseDelayMs * 2 ** attempt, this.maxDelayMs);
        await this.sleep(error.retryAfterMs ?? backoff);
      }
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.options.concurrency) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}
