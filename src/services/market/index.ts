import { ProviderManager } from "./provider-manager";
import { WebSocketManager } from "./websocket-manager";

// Singleton instance for the entire application
class MarketService {
  private manager: ProviderManager | null = null;
  private ws: WebSocketManager | null = null;

  public initialize(keys: { finnhub: string; fmp: string; alpha: string }) {
    if (!this.manager) {
      this.manager = new ProviderManager(keys);
    }
    if (!this.ws && keys.finnhub) {
      this.ws = new WebSocketManager(keys.finnhub);
    }
  }

  public get engine() {
    if (!this.manager) {
      // Lazy init with empty keys if not already initialized
      this.initialize({ finnhub: "", fmp: "", alpha: "" });
    }
    return this.manager!;
  }

  public get streaming() {
    if (!this.ws) {
      this.initialize({ finnhub: "", fmp: "", alpha: "" });
    }
    return this.ws!;
  }
}

export const marketService = new MarketService();
export * from "./types";
