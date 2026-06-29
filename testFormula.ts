function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

type HistoricalDataPoint = any;

function generateHistoricalData(basePrice: number, days: number = 365): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  let price = basePrice * (1 - randomInRange(0.05, 0.25));
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const volatility = randomInRange(0.008, 0.035);
    const trend = randomInRange(-0.002, 0.003);
    const change = price * (trend + randomInRange(-volatility, volatility));
    price = Math.max(price + change, 1);

    const open = price + randomInRange(-price * 0.01, price * 0.01);

    // Ensure day high and low bounds are mathematically valid
    const dayHigh = Math.max(open, price) * (1 + randomInRange(0.001, 0.015));
    let dayLow = Math.min(open, price) * (1 - randomInRange(0.001, 0.015));
    // Prevent zero or negative prices
    dayLow = Math.max(dayLow, 0.01);

    const volume = Math.floor(randomInRange(5000000, 80000000));

    data.push({
      date: date.toISOString().split("T")[0],
      timestamp: date.getTime(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(dayHigh.toFixed(2)),
      low: parseFloat(dayLow.toFixed(2)),
      close: parseFloat(price.toFixed(2)),
      volume,
    });
  }

  return data;
}

function runAutomatedFormulaTest() {
  const iterationsPerClass = 500; // 500 tests per asset class = 1,500 total scenarios
  const assetClasses = [
    { name: "Low Value (Penny Stock)", price: 1.5 },
    { name: "Medium Value (Standard Stock)", price: 150 },
    { name: "High Value (Crypto/Premium)", price: 65000 }
  ];

  const summary = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    reasons: { invalidCandlestick: 0, zeroOrNegativePrice: 0, extremeDrift: 0 }
  };

  for (const asset of assetClasses) {
    for (let i = 0; i < iterationsPerClass; i++) {
      summary.totalTests++;
      const data = generateHistoricalData(asset.price);

      console.log("asset.price: ", asset.price)
      let scenarioFailed = false;

      let initialPrice = data[0].close;
      let finalPrice = data[data.length - 1].close;

      for (let day = 0; day < data.length; day++) {
        const d = data[day];

        // Test 1: Check for impossible candlestick math
        if (d.low > d.open || d.low > d.close || d.high < d.open || d.high < d.close) {
          summary.reasons.invalidCandlestick++;
          scenarioFailed = true;
          break;
        }

        // Test 2: Check for bankruptcy / negative numbers
        if (d.open <= 0 || d.high <= 0 || d.low <= 0 || d.close <= 0) {
          summary.reasons.zeroOrNegativePrice++;
          scenarioFailed = true;
          break;
        }
      }

      // Test 3: Check for runaway compounding mathematical drift
      const driftMultiplier = finalPrice / initialPrice;
      if (driftMultiplier > 1000 || driftMultiplier < 0.001) {
        summary.reasons.extremeDrift++;
        scenarioFailed = true;
      }

      if (scenarioFailed) {
        summary.failed++;
      } else {
        summary.passed++;
      }
    }
  }

  console.log("=========================================");
  console.log("📊 AUTOMATED MATHEMATICAL FORMULA REPORT");
  console.log("=========================================");
  console.log(`Total Scenarios Tested : ${summary.totalTests}`);
  console.log(`Passed Scenarios       : 🎉 ${summary.passed} (${((summary.passed / summary.totalTests) * 100).toFixed(2)}%)`);
  console.log(`Failed Scenarios       : ❌ ${summary.failed}`);

  if (summary.failed > 0) {
    console.log("\n--- Breakdown of Failures ---");
    console.log(`- Broken Candlesticks (e.g. Low > Open) : ${summary.reasons.invalidCandlestick}`);
    console.log(`- Price Hit Zero or Negative            : ${summary.reasons.zeroOrNegativePrice}`);
    console.log(`- Exploding/Imploding Math Drift       : ${summary.reasons.extremeDrift}`);
  }
  console.log("=========================================");
}

runAutomatedFormulaTest();
