"use strict";

/**
 * calculator.js - Mathematical Domain Logic & Utility
 * Exposes a structured class containing pure, sanitized carbon estimation calculations.
 * Protects variables from overflow and invalid numeric formats using deep validation.
 */

/**
 * Coefficient emission factors in kg CO2 per unit.
 * Frozen deeply at startup to guarantee immutability.
 * @type {object}
 */
export const EMISSION_FACTORS = Object.freeze({
  transport: Object.freeze({
    gasoline: 0.404,     // kg CO2 per mile (US EPA standard gas vehicle)
    hybrid: 0.200,       // kg CO2 per mile (Efficient hybrid)
    electric: 0.150,     // kg CO2 per mile (Average grid charging footprint)
    transit: 0.089,      // kg CO2 per passenger mile (Public transit average)
    none: 0.0            // Walking/biking
  }),
  energy: Object.freeze({
    electricity: 0.370   // kg CO2 per kWh (US average grid mix)
  }),
  diet: Object.freeze({
    vegan: 700,          // kg CO2 per year
    vegetarian: 1100,    // kg CO2 per year
    lowMeat: 1500,       // kg CO2 per year
    mediumMeat: 2000,    // kg CO2 per year
    heavyMeat: 2990      // kg CO2 per year
  })
});

/**
 * Maximum and minimum validation boundaries to protect against overflow or NaN.
 * Frozen deeply at startup to guarantee immutability.
 * @type {object}
 */
export const BOUNDARIES = Object.freeze({
  miles: Object.freeze({ min: 0, max: 100000, default: 12000 }),
  kwh: Object.freeze({ min: 0, max: 50000, default: 4500 })
});

/**
 * CarbonCalculator Class
 * Pure static mathematical calculator class executing CO2 estimations.
 */
export class CarbonCalculator {
  
  /**
   * Sanitizes a numeric input to ensure it is finite and falls within defined boundaries.
   * Wraps calculations in try-catch to guarantee zero unhandled runtime crashes.
   * @param {any} value - The input value to sanitize.
   * @param {number} min - Minimum allowed boundary.
   * @param {number} max - Maximum allowed boundary.
   * @param {number} defaultValue - Fallback value if input is invalid.
   * @returns {number} The sanitized, boundary-clamped number.
   */
  static sanitizeNumber(value, min, max, defaultValue) {
    try {
      const parsed = parseFloat(value);
      if (typeof parsed !== "number" || !Number.isFinite(parsed) || Number.isNaN(parsed)) {
        return defaultValue;
      }
      return Math.max(min, Math.min(parsed, max));
    } catch (error) {
      console.error("Sanitization failed, applying default fallback:", error);
      return defaultValue;
    }
  }

  /**
   * Calculates annual transport carbon emissions based on miles and vehicle type.
   * @param {any} miles - Annual miles traveled.
   * @param {string} vehicleType - Type of vehicle (gasoline, hybrid, electric, transit, none).
   * @returns {number} Carbon footprint in kg CO2 per year.
   */
  static calculateTransport(miles, vehicleType) {
    try {
      const sanitizedMiles = CarbonCalculator.sanitizeNumber(
        miles, 
        BOUNDARIES.miles.min, 
        BOUNDARIES.miles.max, 
        BOUNDARIES.miles.default
      );
      
      const factor = EMISSION_FACTORS.transport[vehicleType] !== undefined 
        ? EMISSION_FACTORS.transport[vehicleType] 
        : EMISSION_FACTORS.transport.none;

      return sanitizedMiles * factor;
    } catch (error) {
      console.error("Transport footprint calculation failed, returning 0:", error);
      return 0.0;
    }
  }

  /**
   * Calculates annual energy carbon emissions based on electricity kWh consumption.
   * @param {any} kwh - Annual electricity consumption in kWh.
   * @returns {number} Carbon footprint in kg CO2 per year.
   */
  static calculateEnergy(kwh) {
    try {
      const sanitizedKwh = CarbonCalculator.sanitizeNumber(
        kwh, 
        BOUNDARIES.kwh.min, 
        BOUNDARIES.kwh.max, 
        BOUNDARIES.kwh.default
      );

      return sanitizedKwh * EMISSION_FACTORS.energy.electricity;
    } catch (error) {
      console.error("Energy footprint calculation failed, returning 0:", error);
      return 0.0;
    }
  }

  /**
   * Retrieves the annual carbon footprint based on diet tier.
   * @param {string} dietType - Diet category (vegan, vegetarian, lowMeat, mediumMeat, heavyMeat).
   * @returns {number} Carbon footprint in kg CO2 per year.
   */
  static calculateDiet(dietType) {
    try {
      const factor = EMISSION_FACTORS.diet[dietType] !== undefined 
        ? EMISSION_FACTORS.diet[dietType] 
        : EMISSION_FACTORS.diet.mediumMeat;
      
      return parseFloat(factor);
    } catch (error) {
      console.error("Dietary footprint lookup failed, returning default mediumMeat factor:", error);
      return parseFloat(EMISSION_FACTORS.diet.mediumMeat);
    }
  }

  /**
   * Sums individual components to return total annual carbon footprint.
   * @param {any} transport - Transport carbon in kg.
   * @param {any} energy - Energy carbon in kg.
   * @param {any} diet - Diet carbon in kg.
   * @returns {number} Total carbon footprint in kg CO2 per year.
   */
  static calculateTotal(transport, energy, diet) {
    try {
      const t = CarbonCalculator.sanitizeNumber(transport, 0, 1000000, 0);
      const e = CarbonCalculator.sanitizeNumber(energy, 0, 1000000, 0);
      const d = CarbonCalculator.sanitizeNumber(diet, 0, 1000000, 0);
      return t + e + d;
    } catch (error) {
      console.error("Total footprint summing failed, returning 0:", error);
      return 0.0;
    }
  }

  /**
   * Converts total carbon footprint into an easily understandable index/score from 0 to 100.
   * @param {any} totalCarbon - Carbon emissions in kg CO2 per year.
   * @returns {number} Score from 0 (poor) to 100 (excellent).
   */
  static calculateEcoScore(totalCarbon) {
    try {
      const sanitizedCarbon = CarbonCalculator.sanitizeNumber(totalCarbon, 0, 1000000, 0);
      const maxBenchmark = 16000; // Benchmark for high emissions (kg CO2/year)
      const score = (1.0 - (sanitizedCarbon / maxBenchmark)) * 100.0;
      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      console.error("Eco Score calculation failed, returning default 50:", error);
      return 50;
    }
  }
}
