/**
 * Application constants - stock data, colors, configuration
 */
import type { Stock } from "~src/types"

/** Base stock definitions with realistic market data */
export const STOCK_DATABASE: Omit<Stock, "historicalData" | "lastUpdated">[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 189.84, previousClose: 188.01, open: 188.50, high: 191.05, low: 187.67, change: 1.83, changePercent: 0.97, volume: 52340000, avgVolume: 58200000, marketCap: 2940000000000, pe: 31.2, eps: 6.08, week52High: 199.62, week52Low: 164.08 },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", price: 415.20, previousClose: 413.64, open: 414.00, high: 417.88, low: 412.90, change: 1.56, changePercent: 0.38, volume: 21600000, avgVolume: 24100000, marketCap: 3080000000000, pe: 36.5, eps: 11.37, week52High: 430.82, week52Low: 309.45 },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", price: 141.80, previousClose: 140.59, open: 141.00, high: 143.20, low: 140.10, change: 1.21, changePercent: 0.86, volume: 24500000, avgVolume: 26800000, marketCap: 1780000000000, pe: 24.8, eps: 5.72, week52High: 153.78, week52Low: 115.83 },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer", price: 178.25, previousClose: 176.94, open: 177.50, high: 179.80, low: 176.20, change: 1.31, changePercent: 0.74, volume: 45200000, avgVolume: 51400000, marketCap: 1850000000000, pe: 58.7, eps: 3.04, week52High: 189.50, week52Low: 118.35 },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", price: 875.30, previousClose: 867.20, open: 870.00, high: 882.50, low: 865.40, change: 8.10, changePercent: 0.93, volume: 38100000, avgVolume: 42500000, marketCap: 2160000000000, pe: 68.4, eps: 12.80, week52High: 974.00, week52Low: 373.56 },
  { symbol: "META", name: "Meta Platforms", sector: "Technology", price: 493.50, previousClose: 489.80, open: 491.00, high: 496.30, low: 488.40, change: 3.70, changePercent: 0.76, volume: 16800000, avgVolume: 18900000, marketCap: 1260000000000, pe: 27.3, eps: 18.08, week52High: 531.49, week52Low: 274.38 },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Automotive", price: 245.60, previousClose: 248.42, open: 247.00, high: 250.20, low: 243.80, change: -2.82, changePercent: -1.13, volume: 98700000, avgVolume: 112000000, marketCap: 782000000000, pe: 62.5, eps: 3.93, week52High: 299.29, week52Low: 138.80 },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Finance", price: 198.40, previousClose: 196.90, open: 197.50, high: 199.80, low: 196.10, change: 1.50, changePercent: 0.76, volume: 8900000, avgVolume: 9800000, marketCap: 571000000000, pe: 11.8, eps: 16.81, week52High: 205.78, week52Low: 143.64 },
  { symbol: "V", name: "Visa Inc.", sector: "Finance", price: 281.35, previousClose: 280.10, open: 280.50, high: 283.10, low: 279.60, change: 1.25, changePercent: 0.45, volume: 6200000, avgVolume: 7100000, marketCap: 578000000000, pe: 31.4, eps: 8.96, week52High: 290.96, week52Low: 227.68 },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer", price: 165.20, previousClose: 164.85, open: 165.00, high: 166.40, low: 164.30, change: 0.35, changePercent: 0.21, volume: 7800000, avgVolume: 8500000, marketCap: 445000000000, pe: 28.6, eps: 5.78, week52High: 170.50, week52Low: 147.55 },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", price: 527.80, previousClose: 531.40, open: 530.00, high: 533.20, low: 525.60, change: -3.60, changePercent: -0.68, volume: 3400000, avgVolume: 3800000, marketCap: 487000000000, pe: 22.1, eps: 23.88, week52High: 554.70, week52Low: 436.38 },
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Entertainment", price: 112.45, previousClose: 113.80, open: 113.20, high: 114.00, low: 111.80, change: -1.35, changePercent: -1.19, volume: 11200000, avgVolume: 12500000, marketCap: 206000000000, pe: 72.3, eps: 1.56, week52High: 123.74, week52Low: 78.73 },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Entertainment", price: 628.90, previousClose: 624.50, open: 626.00, high: 632.40, low: 623.10, change: 4.40, changePercent: 0.70, volume: 5600000, avgVolume: 6200000, marketCap: 273000000000, pe: 47.8, eps: 13.16, week52High: 639.00, week52Low: 344.73 },
  { symbol: "AMD", name: "AMD Inc.", sector: "Technology", price: 174.80, previousClose: 172.30, open: 173.00, high: 176.50, low: 171.80, change: 2.50, changePercent: 1.45, volume: 52300000, avgVolume: 58700000, marketCap: 282000000000, pe: 280.0, eps: 0.62, week52High: 184.92, week52Low: 93.12 },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology", price: 272.40, previousClose: 270.80, open: 271.50, high: 274.60, low: 270.00, change: 1.60, changePercent: 0.59, volume: 5100000, avgVolume: 5800000, marketCap: 264000000000, pe: 54.5, eps: 5.00, week52High: 282.29, week52Low: 196.00 },
  { symbol: "BA", name: "Boeing Co.", sector: "Aerospace", price: 215.60, previousClose: 218.40, open: 217.00, high: 219.50, low: 214.20, change: -2.80, changePercent: -1.28, volume: 6700000, avgVolume: 7400000, marketCap: 130000000000, pe: -15.2, eps: -14.18, week52High: 267.54, week52Low: 159.70 },
  { symbol: "INTC", name: "Intel Corp.", sector: "Technology", price: 43.25, previousClose: 42.80, open: 43.00, high: 44.10, low: 42.60, change: 0.45, changePercent: 1.05, volume: 32100000, avgVolume: 36200000, marketCap: 182000000000, pe: 108.1, eps: 0.40, week52High: 51.28, week52Low: 26.86 },
  { symbol: "PYPL", name: "PayPal Holdings", sector: "Finance", price: 63.40, previousClose: 64.20, open: 63.80, high: 64.80, low: 62.90, change: -0.80, changePercent: -1.25, volume: 14500000, avgVolume: 16100000, marketCap: 68000000000, pe: 17.2, eps: 3.69, week52High: 76.54, week52Low: 50.25 },
  { symbol: "COIN", name: "Coinbase Global", sector: "Finance", price: 178.90, previousClose: 174.60, open: 176.00, high: 182.40, low: 173.50, change: 4.30, changePercent: 2.46, volume: 18200000, avgVolume: 20500000, marketCap: 43000000000, pe: 33.5, eps: 5.34, week52High: 203.86, week52Low: 78.05 },
  { symbol: "SQ", name: "Block Inc.", sector: "Finance", price: 78.60, previousClose: 77.40, open: 77.80, high: 79.90, low: 76.80, change: 1.20, changePercent: 1.55, volume: 9800000, avgVolume: 11200000, marketCap: 47000000000, pe: 52.4, eps: 1.50, week52High: 89.84, week52Low: 39.38 },
  // Expanded Seeds
  { symbol: "COST", name: "Costco Wholesale", sector: "Consumer", price: 724.15, previousClose: 716.00, open: 720.00, high: 728.00, low: 718.00, change: 8.15, changePercent: 1.12, volume: 2100000, avgVolume: 2400000, marketCap: 321000000000, pe: 48.2, eps: 15.02, week52High: 780.00, week52Low: 465.00 },
  { symbol: "TM", name: "Toyota Motor Corp.", sector: "Automotive", price: 232.10, previousClose: 229.80, open: 230.50, high: 234.00, low: 229.00, change: 2.30, changePercent: 1.00, volume: 1500000, avgVolume: 1800000, marketCap: 318000000000, pe: 12.4, eps: 18.50, week52High: 255.00, week52Low: 135.00 },
  { symbol: "LCID", name: "Lucid Group", sector: "Automotive", price: 2.65, previousClose: 2.78, open: 2.75, high: 2.80, low: 2.60, change: -0.13, changePercent: -4.68, volume: 22000000, avgVolume: 28000000, marketCap: 6000000000, pe: -1.2, eps: -1.15, week52High: 8.35, week52Low: 2.50 },
  { symbol: "RIVN", name: "Rivian Automotive", sector: "Automotive", price: 10.45, previousClose: 10.90, open: 10.85, high: 11.20, low: 10.30, change: -0.45, changePercent: -4.13, volume: 32000000, avgVolume: 38000000, marketCap: 10200000000, pe: -2.4, eps: -5.12, week52High: 28.50, week52Low: 8.24 },
  { symbol: "LLY", name: "Eli Lilly & Co.", sector: "Healthcare", price: 768.10, previousClose: 745.20, open: 750.00, high: 772.00, low: 748.00, change: 22.90, changePercent: 3.07, volume: 3100000, avgVolume: 2800000, marketCap: 724000000000, pe: 118.4, eps: 6.48, week52High: 800.00, week52Low: 340.00 },
  { symbol: "MA", name: "Mastercard Inc.", sector: "Finance", price: 458.12, previousClose: 454.00, open: 456.00, high: 460.00, low: 455.00, change: 4.12, changePercent: 0.91, volume: 2800000, avgVolume: 3200000, marketCap: 425000000000, pe: 38.5, eps: 12.15, week52High: 490.00, week52Low: 358.00 },
  { symbol: "GE", name: "GE Aerospace", sector: "Aerospace", price: 158.40, previousClose: 153.20, open: 154.00, high: 160.00, low: 153.50, change: 5.20, changePercent: 3.39, volume: 6200000, avgVolume: 7400000, marketCap: 172000000000, pe: 92.4, eps: 1.72, week52High: 165.00, week52Low: 88.00 },
  { symbol: "TSM", name: "Taiwan Semi", sector: "Semicons", price: 148.42, previousClose: 144.10, open: 145.00, high: 150.00, low: 144.50, change: 4.32, changePercent: 3.00, volume: 12400000, avgVolume: 14200000, marketCap: 770000000000, pe: 28.4, eps: 5.20, week52High: 160.00, week52Low: 82.00 },
  { symbol: "ASML", name: "ASML Holding", sector: "Semicons", price: 984.10, previousClose: 964.00, open: 970.00, high: 992.00, low: 968.00, change: 20.10, changePercent: 2.08, volume: 1200000, avgVolume: 1500000, marketCap: 380000000000, pe: 42.5, eps: 21.40, week52High: 1040.00, week52Low: 580.00 },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", price: 118.42, previousClose: 117.10, open: 117.50, high: 119.50, low: 117.00, change: 1.32, changePercent: 1.13, volume: 14200000, avgVolume: 16800000, marketCap: 472000000000, pe: 12.4, eps: 9.50, week52High: 125.00, week52Low: 98.00 },
]

/** Default favorite stocks for new users */
export const DEFAULT_FAVORITES = ["MMM", "AOS", "ABT", "ABBV", "ACN", "ADBE", "AMD", "AES", "AFL", "A", "APD", "ABNB", "AKAM", "ALB", "ARE", "ALGN", "ALLE", "LNT", "ALL", "GOOGL", "GOOG", "MO", "AMZN", "AMCR", "AEE", "AEP", "AXP", "AIG", "AMT", "AWK", "AMP", "AME", "AMGN", "APH", "ADI", "AON", "APA", "APO", "AAPL", "AMAT", "APP", "APTV", "ACGL", "ADM", "ARES", "ANET", "AJG", "AIZ", "T", "ATO", "ADSK", "ADP", "AZO", "AVB", "AVY", "AXON", "BKR", "BALL", "BAC", "BAX", "BDX", "BRK.B", "BBY", "TECH", "BIIB", "BLK", "BX", "XYZ", "BNY", "BA", "BKNG", "BSX", "BMY", "AVGO", "BR", "BRO", "BF.B", "BLDR", "BG", "BXP", "CHRW", "CDNS", "CPT", "CPB", "COF", "CAH", "CCL", "CARR", "CVNA", "CASY", "CAT", "CBOE", "CBRE", "CDW", "COR", "CNC", "CNP", "CF", "CRL", "SCHW", "CHTR", "CVX", "CMG", "CB", "CHD", "CIEN", "CI", "CINF", "CTAS", "CSCO", "C", "CFG", "CLX", "CME", "CMS", "KO", "CTSH", "COHR", "COIN", "CL", "CMCSA", "FIX", "CAG", "COP", "ED", "STZ", "CEG", "COO", "CPRT", "GLW", "CPAY", "CTVA", "CSGP", "COST", "CRH", "CRWD", "CCI", "CSX", "CMI", "CVS", "DHR", "DRI", "DDOG", "DVA", "DECK", "DE", "DELL", "DAL", "DVN", "DXCM", "FANG", "DLR", "DG", "DLTR", "D", "DPZ", "DASH", "DOV", "DOW", "DHI", "DTE", "DUK", "DD", "ETN", "EBAY", "SATS", "ECL", "EIX", "EW", "EA", "ELV", "EME", "EMR", "ETR", "EOG", "EQT", "EFX", "EQIX", "EQR", "ERIE", "ESS", "EL", "EG", "EVRG", "ES", "EXC", "EXE", "EXPE", "EXPD", "EXR", "XOM", "FFIV", "FDS", "FICO", "FAST", "FRT", "FDX", "FDXF", "FIS", "FITB", "FSLR", "FE", "FISV", "F", "FTNT", "FTV", "FOXA", "FOX", "BEN", "FCX", "GRMN", "IT", "GE", "GEHC", "GEV", "GEN", "GNRC", "GD", "GIS", "GM", "GPC", "GILD", "GPN", "GL", "GDDY", "GS", "HAL", "HIG", "HAS", "HCA", "DOC", "HSIC", "HSY", "HPE", "HLT", "HD", "HON", "HRL", "HST", "HWM", "HPQ", "HUBB", "HUM", "HBAN", "HII", "IBM", "IEX", "IDXX", "ITW", "INCY", "IR", "PODD", "INTC", "IBKR", "ICE", "IFF", "IP", "INTU", "ISRG", "IVZ", "INVH", "IQV", "IRM", "JBHT", "JBL", "JKHY", "J", "JNJ", "JCI", "JPM", "KVUE", "KDP", "KEY", "KEYS", "KMB", "KIM", "KMI", "KKR", "KLAC", "KHC", "KR", "LHX", "LH", "LRCX", "LVS", "LDOS", "LEN", "LII", "LLY", "LIN", "LYV", "LMT", "L", "LOW", "LULU", "LITE", "LYB", "MTB", "MPC", "MAR", "MRSH", "MLM", "MAS", "MA", "MKC", "MCD", "MCK", "MDT", "MRK", "META", "MET", "MTD", "MGM", "MCHP", "MU", "MSFT", "MAA", "MRNA", "TAP", "MDLZ", "MPWR", "MNST", "MCO", "MS", "MOS", "MSI", "MSCI", "NDAQ", "NTAP", "NFLX", "NEM", "NWSA", "NWS", "NEE", "NKE", "NI", "NDSN", "NSC", "NTRS", "NOC", "NCLH", "NRG", "NUE", "NVDA", "NVR", "NXPI", "ORLY", "OXY", "ODFL", "OMC", "ON", "OKE", "ORCL", "OTIS", "PCAR", "PKG", "PLTR", "PANW", "PSKY", "PH", "PAYX", "PYPL", "PNR", "PEP", "PFE", "PCG", "PM", "PSX", "PNW", "PNC", "POOL", "PPG", "PPL", "PFG", "PG", "PGR", "PLD", "PRU", "PEG", "PTC", "PSA", "PHM", "PWR", "QCOM", "DGX", "Q", "RL", "RJF", "RTX", "O", "REG", "REGN", "RF", "RSG", "RMD", "RVTY", "HOOD", "ROK", "ROL", "ROP", "ROST", "RCL", "SPGI", "CRM", "SNDK", "SBAC", "SLB", "STX", "SRE", "NOW", "SHW", "SPG", "SWKS", "SJM", "SW", "SNA", "SOLV", "SO", "LUV", "SWK", "SBUX", "STT", "STLD", "STE", "SYK", "SMCI", "SYF", "SNPS", "SYY", "TMUS", "TROW", "TTWO", "TPR", "TRGP", "TGT", "TEL", "TDY", "TER", "TSLA", "TXN", "TPL", "TXT", "TMO", "TJX", "TKO", "TTD", "TSCO", "TT", "TDG", "TRV", "TRMB", "TFC", "TYL", "TSN", "USB", "UBER", "UDR", "ULTA", "UNP", "UAL", "UPS", "URI", "UNH", "UHS", "VLO", "VEEV", "VTR", "VLTO", "VRSN", "VRSK", "VZ", "VRTX", "VRT", "VTRS", "VICI", "V", "VST", "VMC", "WRB", "GWW", "WAB", "WMT", "DIS", "WBD", "WM", "WAT", "WEC", "WFC", "WELL", "WST", "WDC", "WY", "WSM", "WMB", "WTW", "WDAY", "WYNN", "XEL", "XYL", "YUM"]

/** Sector colors for charts */
export const SECTOR_COLORS: Record<string, string> = {
  Technology: "#6366f1",
  Finance: "#3b82f6",
  Consumer: "#10b981",
  Healthcare: "#f43f5e",
  Automotive: "#f59e0b",
  Entertainment: "#8b5cf6",
  Aerospace: "#06b6d4",
}

/** Update intervals */
export const UPDATE_INTERVALS = {
  REALTIME: 2000,      // 2s for real-time price updates
  PREDICTIONS: 30000,  // 30s for AI predictions
  ALERTS: 5000,        // 5s for alert checking
  CHARTS: 10000,       // 10s for chart updates
}

/** Recommendation colors */
export const RECOMMENDATION_COLORS: Record<string, string> = {
  "strong-buy": "#22c55e",
  "buy": "#4ade80",
  "hold": "#f59e0b",
  "sell": "#f87171",
  "strong-sell": "#ef4444",
  "neural": "#06b6d4"
}

/** Risk level colors */
export const RISK_COLORS: Record<string, string> = {
  "low": "#22c55e",
  "medium": "#f59e0b",
  "high": "#f87171",
  "very-high": "#ef4444",
}
