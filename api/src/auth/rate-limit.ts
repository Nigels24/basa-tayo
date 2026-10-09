import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * In-memory limiter for failed attempts per key (IP, username…) in a sliding
 * window. Enough for one Render instance; the counts reset on a restart.
 */
export class AttemptLimiter {
  private hits = new Map<string, number[]>();

  constructor(private max: number, private windowMs: number) {}

  /** Throws 429 when the key already used up its attempts in the window. */
  check(key: string, message: string) {
    if (this.recent(key).length >= this.max) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }

  fail(key: string) {
    const list = this.recent(key);
    list.push(Date.now());
    this.hits.set(key, list);
    if (this.hits.size > 10000) this.sweep();
  }

  reset(key: string) {
    this.hits.delete(key);
  }

  private recent(key: string) {
    const since = Date.now() - this.windowMs;
    return (this.hits.get(key) ?? []).filter((t) => t > since);
  }

  private sweep() {
    for (const key of [...this.hits.keys()]) {
      const list = this.recent(key);
      if (list.length) this.hits.set(key, list);
      else this.hits.delete(key);
    }
  }
}
