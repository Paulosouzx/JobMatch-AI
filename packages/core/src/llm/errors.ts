export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class DailyLimitReachedError extends Error {
  constructor() {
    super('Daily LLM call limit reached');
    this.name = 'DailyLimitReachedError';
  }
}

export class LLMParseError extends Error {
  constructor(
    message: string,
    readonly rawOutput: string,
  ) {
    super(message);
    this.name = 'LLMParseError';
  }
}

export class LLMRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'LLMRequestError';
  }
}
