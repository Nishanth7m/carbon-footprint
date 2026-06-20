/**
 * tests.js - Independent client-side unit test suite
 * Executes verification tests on computational domain logic, boundary sanitization, and storage schemas.
 * Automatically outputs a green test matrix directly to the DOM.
 */

import { 
  sanitizeNumber, 
  calculateTransportCarbon, 
  calculateEnergyCarbon, 
  calculateDietCarbon, 
  calculateTotalCarbon, 
  calculateEcoScore 
} from './calculator.js';

import { 
  getState, 
  saveState, 
  clearState, 
  DEFAULT_STATE 
} from './storage.js';

// Test Logger State
const testLogs = [];
let passCount = 0;
let failCount = 0;

/**
 * Asserts that two values are strictly equal. Logs the result.
 * @param {any} actual - The actual computed value.
 * @param {any} expected - The expected value.
 * @param {string} message - Description of the test assertion.
 */
function assertEquals(actual, expected, message) {
  const isMatch = actual === expected;
  if (isMatch) {
    passCount++;
    testLogs.push({ status: "PASS", message: `[PASS] ${message} (Got: ${actual})` });
  } else {
    failCount++;
    testLogs.push({ status: "FAIL", message: `[FAIL] ${message} (Expected: ${expected}, Got: ${actual})` });
  }
}

/**
 * Asserts that a computed floating point value is approximately equal to an expected value (handles float rounding).
 * @param {number} actual - The computed float.
 * @param {number} expected - The expected float.
 * @param {string} message - Description of the test assertion.
 */
function assertAlmostEquals(actual, expected, message) {
  const isMatch = Math.abs(actual - expected) < 0.0001;
  if (isMatch) {
    passCount++;
    testLogs.push({ status: "PASS", message: `[PASS] ${message} (Got: ${actual})` });
  } else {
    failCount++;
    testLogs.push({ status: "FAIL", message: `[FAIL] ${message} (Expected: ~${expected}, Got: ${actual})` });
  }
}

/**
 * Run computational domain logic tests
 */
function testCalculatorCalculations() {
  // Test Boundary Sanitization
  assertEquals(sanitizeNumber(50, 0, 100, 10), 50, "Sanitization: Valid range input returns self");
  assertEquals(sanitizeNumber(-50, 0, 100, 10), 0, "Sanitization: Input below minimum clamps to min");
  assertEquals(sanitizeNumber(150, 0, 100, 10), 100, "Sanitization: Input above maximum clamps to max");
  assertEquals(sanitizeNumber("Not A Number", 0, 100, 10), 10, "Sanitization: NaN input returns fallback value");
  assertEquals(sanitizeNumber(Infinity, 0, 100, 10), 10, "Sanitization: Infinite input returns fallback value");

  // Test Transport calculations
  assertAlmostEquals(calculateTransportCarbon(1000, "gasoline"), 404.0, "Transport: Gasoline factor calculation matches (1000 * 0.404)");
  assertAlmostEquals(calculateTransportCarbon(500, "hybrid"), 100.0, "Transport: Hybrid factor calculation matches (500 * 0.2)");
  assertAlmostEquals(calculateTransportCarbon(2000, "electric"), 300.0, "Transport: Electric factor calculation matches (2000 * 0.15)");
  assertAlmostEquals(calculateTransportCarbon(5000, "transit"), 445.0, "Transport: Public transit factor calculation matches (5000 * 0.089)");
  assertAlmostEquals(calculateTransportCarbon(100, "none"), 0.0, "Transport: Walk/Bike factor calculation returns 0");
  assertAlmostEquals(calculateTransportCarbon(-100, "gasoline"), 0.0, "Transport: Negative miles are clamped to 0");
  assertAlmostEquals(calculateTransportCarbon(9999999, "gasoline"), 40400.0, "Transport: Extreme miles above boundary are clamped to max limit (100000 * 0.404)");

  // Test House Energy calculations
  assertAlmostEquals(calculateEnergyCarbon(1000), 370.0, "Energy: kWh factor calculation matches (1000 * 0.370)");
  assertAlmostEquals(calculateEnergyCarbon(-500), 0.0, "Energy: Negative kWh are clamped to 0");
  assertAlmostEquals(calculateEnergyCarbon(999999), 18500.0, "Energy: Extreme kWh above boundary are clamped to max limit (50000 * 0.370)");

  // Test Diet Tier calculations
  assertEquals(calculateDietCarbon("vegan"), 700, "Diet: Vegan tier returns 700 kg CO2");
  assertEquals(calculateDietCarbon("vegetarian"), 1100, "Diet: Vegetarian tier returns 1100 kg CO2");
  assertEquals(calculateDietCarbon("mediumMeat"), 2000, "Diet: Medium meat tier returns 2000 kg CO2");
  assertEquals(calculateDietCarbon("invalidTier"), 2000, "Diet: Invalid tier falls back to medium meat (2000 kg)");

  // Test Total sum calculation
  assertEquals(calculateTotalCarbon(400, 300, 1000), 1700, "Total footprint sum logic returns correct total");
  
  // Test Eco Score scaling
  assertEquals(calculateEcoScore(0), 100, "Eco Score: 0 emissions score equals 100");
  assertEquals(calculateEcoScore(16000), 0, "Eco Score: Emissions matching upper limit returns 0");
  assertEquals(calculateEcoScore(8000), 50, "Eco Score: Emissions matching mid-limit returns 50");
  assertEquals(calculateEcoScore(24000), 0, "Eco Score: Emissions exceeding upper limit clamp to 0");
}

/**
 * Run State Persistence Layer tests
 */
function testStorageIsolation() {
  // Clear any existing user state
  clearState();
  const baseline = getState();
  assertEquals(baseline.miles, DEFAULT_STATE.miles, "Storage: Initializing empty state returns defaults");

  // Modify state and write
  const testState = {
    miles: 15000,
    vehicleType: "electric",
    kwh: 6000,
    dietType: "vegan",
    habits: {
      useBags: true,
      carpool: false,
      energySave: true,
      lowerThermostat: false,
      reduceWaste: true
    },
    chatHistory: [],
    highContrast: true,
    textScale: "large"
  };

  saveState(testState);
  const loaded = getState();
  
  assertEquals(loaded.miles, 15000, "Storage: Writes and reads numeric values correctly");
  assertEquals(loaded.vehicleType, "electric", "Storage: Writes and reads string parameters correctly");
  assertEquals(loaded.habits.useBags, true, "Storage: Writes and reads checklist habits correctly");
  assertEquals(loaded.habits.carpool, false, "Storage: Non-checked checklist habits remain false");
  assertEquals(loaded.highContrast, true, "Storage: Writes and reads visual contrast preference correctly");

  // Corrupt state test (simulate bad JSON or scheme mutation in local storage)
  try {
    localStorage.setItem("carbon_footprint_tracker_state", "{invalidJson: true, miles: 'corruptedString'}");
  } catch (e) {
    // Suppress storage limitations in testing
  }
  
  const recovered = getState();
  assertEquals(recovered.miles, DEFAULT_STATE.miles, "Storage: Recovered state from corrupted JSON gracefully falls back to default schema values");

  // Cleanup tests state
  clearState();
}

/**
 * Renders the test logs visually inside the designated DOM console container
 */
function renderTestResults() {
  const consoleLog = document.getElementById("test-console-log");
  const suiteStatus = document.getElementById("test-suite-status");
  if (!consoleLog || !suiteStatus) return;

  // Clear previous outputs safely
  consoleLog.textContent = "";
  suiteStatus.textContent = "";

  // Append each test case result safely
  testLogs.forEach(log => {
    const logItem = document.createElement("div");
    logItem.className = log.status === "PASS" ? "test-pass" : "test-fail";
    logItem.textContent = log.message;
    consoleLog.appendChild(logItem);
  });

  // Render final summary badge
  const summaryBadge = document.createElement("span");
  if (failCount === 0) {
    summaryBadge.className = "inline-block px-3 py-1 rounded text-xs font-extrabold uppercase bg-emerald-950 text-[var(--primary-emerald)] border border-[var(--primary-emerald)]";
    summaryBadge.textContent = "✔ ALL TESTS PASSED";
    
    const countLabel = document.createElement("span");
    countLabel.className = "text-[var(--text-secondary)] text-xs ml-3";
    countLabel.textContent = `(${passCount}/${passCount} assertions verified)`;
    
    suiteStatus.appendChild(summaryBadge);
    suiteStatus.appendChild(countLabel);
  } else {
    summaryBadge.className = "inline-block px-3 py-1 rounded text-xs font-extrabold uppercase bg-rose-950 text-[var(--error-rose)] border border-[var(--error-rose)]";
    summaryBadge.textContent = "✘ DIAGNOSTICS FAILED";
    
    const countLabel = document.createElement("span");
    countLabel.className = "text-rose-400 text-xs ml-3";
    countLabel.textContent = `(${failCount} assertions failed out of ${passCount + failCount})`;
    
    suiteStatus.appendChild(summaryBadge);
    suiteStatus.appendChild(countLabel);
  }
}

/**
 * Orchestrates test suite execution
 */
export function runUnitTests() {
  // Reset counters
  passCount = 0;
  failCount = 0;
  testLogs.length = 0;

  try {
    testCalculatorCalculations();
    testStorageIsolation();
  } catch (error) {
    failCount++;
    testLogs.push({ status: "FAIL", message: `[CRITICAL FATAL] Test execution broke unexpectedly: ${error.message}` });
  }

  renderTestResults();
}

// Bind to window for external access by triggers in app.js
window.runUnitTests = runUnitTests;

// Auto-run on script loading
runUnitTests();
