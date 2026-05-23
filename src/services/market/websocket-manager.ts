/**
 * Real-Time WebSocket Streaming Manager (Finnhub)
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  constructor(private apiKey: string) {}

  public connect() {
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

    this.ws.onopen = () => {
      console.log("WebSocket Bridge Connected");
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      // Resubscribe to all existing symbols
      this.subscribers.forEach((_, symbol) => this.subscribeInternal(symbol));
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "trade") {
        msg.data.forEach((trade: any) => {
          const handler = this.subscribers.get(trade.s);
          if (handler) handler(trade);
        });
      }
    };

    this.ws.onclose = () => {
      console.warn("WebSocket Disconnected");
      this.ws = null;
      this.attemptReconnect();
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      this.ws?.close();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      setTimeout(() => this.connect(), delay);
    }
  }

  public subscribe(symbol: string, callback: (data: any) => void) {
    this.subscribers.set(symbol, callback);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.subscribeInternal(symbol);
    } else {
      this.connect();
    }
  }

  private subscribeInternal(symbol: string) {
    this.ws?.send(JSON.stringify({ type: "subscribe", symbol: symbol.toUpperCase() }));
  }

  public unsubscribe(symbol: string) {
    this.subscribers.delete(symbol);
    this.ws?.send(JSON.stringify({ type: "unsubscribe", symbol: symbol.toUpperCase() }));
  }

  public disconnect() {
    this.ws?.close();
    this.subscribers.clear();
  }
}
