/**
 * calculator.js - Mathematical Domain Logic & Utility
 * Exposes pure, sanitized carbon estimation calculations.
 */

// Emission Factors (EF) in kg CO2 per unit
export const EMISSION_FACTORS = {
  transport: {
    gasoline: 0.404,     // kg CO2 per mile (US EPA standard gas vehicle)
    hybrid: 0.200,       // kg CO2 per mile (Efficient hybrid)
    electric: 0.150,     // kg CO2 per mile (Average grid charging footprint)
    transit: 0.089,      // kg CO2 per passenger mile (Public bus/train average)
    none: 0.0            // Walking/biking
  },
  energy: {
    electricity: 0.370   // kg CO2 per kWh (US average grid mix)
  },
  diet: {
    vegan: 700,          // kg CO2 per year
    vegetarian: 1100,    // kg CO2 per year
    lowMeat: 1500,       // kg CO2 per year
    mediumMeat: 2000,    // kg CO2 per year
    heavyMeat: 2990      // kg CO2 per year
  }
};

// Maximum and minimum validation boundaries to protect against overflow or NaN
export const BOUNDARIES = {
  miles: { min: 0, max: 100000, default: 0 },
  kwh: { min: 0, max: 50000, default: 0 }
};

/**
 * Sanitizes a numeric input to ensure it is finite and falls within defined boundaries.
 * @param {any} value - The input to sanitize.
 * @param {number} min - Minimum allowed boundary.
 * @param {number} max - Maximum allowed boundary.
 * @param {number} defaultValue - Fallback value if input is invalid.
 * @returns {number} The sanitized number.
 */
export function sanitizeNumber(value, min, max, defaultValue) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(parsed, max));
}

/**
 * Calculates monthly or annual transport carbon emissions.
 * For transparency, inputs represent annual miles driven.
 * @param {number} miles - Annual miles traveled.
 * @param {string} vehicleType - Type of vehicle (gasoline, hybrid, electric, transit, none).
 * @returns {number} Carbon footprint in kg CO2 per year.
 */
export function calculateTransportCarbon(miles, vehicleType) {
  const sanitizedMiles = sanitizeNumber(
    miles, 
    BOUNDARIES.miles.min, 
    BOUNDARIES.miles.max, 
    BOUNDARIES.miles.default
  );
  
  const factor = EMISSION_FACTORS.transport[vehicleType] !== undefined 
    ? EMISSION_FACTORS.transport[vehicleType] 
    : EMISSION_FACTORS.transport.none;

  return sanitizedMiles * factor;
}

/**
 * Calculates annual energy carbon emissions.
 * @param {number} kwh - Annual electricity consumption in kWh.
 * @returns {number} Carbon footprint in kg CO2 per year.
 */
export function calculateEnergyCarbon(kwh) {
  const sanitizedKwh = sanitizeNumber(
    kwh, 
    BOUNDARIES.kwh.min, 
    BOUNDARIES.kwh.max, 
    BOUNDARIES.kwh.default
  );

  return sanitizedKwh * EMISSION_FACTORS.energy.electricity;
}

/**
 * Retrieves the annual carbon footprint based on diet tier.
 * @param {string} dietType - Diet category (vegan, vegetarian, lowMeat, mediumMeat, heavyMeat).
 * @returns {number} Carbon footprint in kg CO2 per year.
 */
export function calculateDietCarbon(dietType) {
  const factor = EMISSION_FACTORS.diet[dietType] !== undefined 
    ? EMISSION_FACTORS.diet[dietType] 
    : EMISSION_FACTORS.diet.mediumMeat;
  
  return factor;
}

/**
 * Sums individual components to return total annual carbon footprint.
 * @param {number} transport - Transport carbon in kg.
 * @param {number} energy - Energy carbon in kg.
 * @param {number} diet - Diet carbon in kg.
 * @returns {number} Total carbon footprint in kg CO2 per year.
 */
export function calculateTotalCarbon(transport, energy, diet) {
  const t = sanitizeNumber(transport, 0, 1000000, 0);
  const e = sanitizeNumber(energy, 0, 1000000, 0);
  const d = sanitizeNumber(diet, 0, 1000000, 0);
  return t + e + d;
}

/**
 * Converts total carbon footprint into an easily understandable index/score.
 * Score is 100 for zero emissions, and scales down to 0 for 16,000 kg CO2 or more.
 * @param {number} totalCarbon - Carbon emissions in kg CO2 per year.
 * @returns {number} Score from 0 to 100.
 */
export function calculateEcoScore(totalCarbon) {
  const sanitizedCarbon = sanitizeNumber(totalCarbon, 0, 1000000, 0);
  const maxBenchmark = 16000; // Benchmark for high emissions (kg CO2/year)
  const score = (1 - (sanitizedCarbon / maxBenchmark)) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}
