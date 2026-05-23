/**
 * Advanced Rate Limit Manager (Sliding Window)
 */
export class RateLimitManager {
  private requests: number[] = [];

  constructor(
    private limitPerHour: number = 60,
    private limitPerMinute: number = 5
  ) {}

  public async throttle(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Filter old requests
    this.requests = this.requests.filter(timestamp => timestamp > oneHourAgo);
    
    const minuteCount = this.requests.filter(t => t > oneMinuteAgo).length;
    const hourCount = this.requests.length;

    if (minuteCount >= this.limitPerMinute || hourCount >= this.limitPerHour) {
      // Wait for the oldest request to expire
      const oldestInMinute = this.requests.filter(t => t > oneMinuteAgo)[0];
      const waitTime = oldestInMinute ? (oldestInMinute + 60001 - now) : 1000;
      
      await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 100)));
      return this.throttle(); // Recursively check
    }

    this.requests.push(now);
  }

  public getCounts() {
    return {
      hour: this.requests.length,
      minute: this.requests.filter(t => t > (Date.now() - 60000)).length
    };
  }
}
