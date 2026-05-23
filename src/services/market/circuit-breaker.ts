/**
 * Enterprise Circuit Breaker Pattern
 */
export class CircuitBreaker {
  private failures = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private lastFailureTime = 0;
  private nextRetryTime = 0;

  constructor(
    private threshold: number = 5,
    private cooldownMs: number = 30000, // 30 seconds
    private halfOpenLimit: number = 2
  ) {}

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextRetryTime) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
      this.nextRetryTime = Date.now() + this.cooldownMs;
    }
  }

  public getState() { return this.state; }
  public getFailures() { return this.failures; }
}
