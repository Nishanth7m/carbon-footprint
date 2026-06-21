"use strict";

/**
 * storage.js - State Persistence Layer
 * Encapsulates LocalStorage data management inside a robust, schema-validated class structure.
 * Employs extensive deep-cloning and error boundary catch handlers to guarantee zero runtime crash events.
 */

/**
 * Baseline state definition blueprint.
 * Frozen deeply at startup to ensure immutability.
 * @type {object}
 */
export const DEFAULT_STATE = Object.freeze({
  miles: 12000,
  vehicleType: "gasoline",
  kwh: 4500,
  dietType: "mediumMeat",
  habits: Object.freeze({
    useBags: false,
    carpool: false,
    energySave: false,
    lowerThermostat: false,
    reduceWaste: false
  }),
  chatHistory: Object.freeze([
    Object.freeze({
      sender: "assistant",
      text: "Hello! I am your AI Eco-Assistant. Ask me anything about reducing your carbon footprint!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  ]),
  highContrast: false,
  textScale: "normal"
});

/**
 * Unique key identifier used in LocalStorage.
 * @type {string}
 */
const STORAGE_KEY = "carbon_footprint_tracker_state";

/**
 * Transient in-memory state fallback lifecycle storage.
 * @type {object|null}
 */
let memoryState = null;

/**
 * CarbonStorageManager Class
 * Static data orchestration wrapper handling LocalStorage queries and system default loading.
 */
export class CarbonStorageManager {

  /**
   * Generates a fully decoupled deep clone of the default state template.
   * Eliminates object reference pollution across memory resets.
   * @returns {object} The deep-cloned state instance.
   */
  static getClonedDefaultState() {
    try {
      return {
        miles: parseInt(DEFAULT_STATE.miles, 10),
        vehicleType: String(DEFAULT_STATE.vehicleType),
        kwh: parseInt(DEFAULT_STATE.kwh, 10),
        dietType: String(DEFAULT_STATE.dietType),
        habits: { ...DEFAULT_STATE.habits },
        chatHistory: DEFAULT_STATE.chatHistory.map(msg => ({
          sender: String(msg.sender),
          text: String(msg.text),
          time: String(msg.time)
        })),
        highContrast: Boolean(DEFAULT_STATE.highContrast),
        textScale: String(DEFAULT_STATE.textScale)
      };
    } catch (error) {
      console.error("Critical error during default state cloning, recovering with fallback values:", error);
      return {
        miles: 12000,
        vehicleType: "gasoline",
        kwh: 4500,
        dietType: "mediumMeat",
        habits: { useBags: false, carpool: false, energySave: false, lowerThermostat: false, reduceWaste: false },
        chatHistory: [{ sender: "assistant", text: "Hello! I am your AI Eco-Assistant.", time: "12:00 PM" }],
        highContrast: false,
        textScale: "normal"
      };
    }
  }

  /**
   * Evaluates and sanitizes dynamic objects to verify conformity against the default state schema.
   * Wraps calculations in try-catch to prevent validation crashes.
   * @param {any} state - The object retrieved from external storage.
   * @returns {object} A sanitized state conforming exactly to the expected blueprint.
   */
  static validateStateSchema(state) {
    try {
      if (!state || typeof state !== "object") {
        return CarbonStorageManager.getClonedDefaultState();
      }

      const validated = CarbonStorageManager.getClonedDefaultState();

      // Validate miles
      if (state.miles !== undefined && state.miles !== null) {
        const parsedMiles = parseInt(state.miles, 10);
        if (Number.isFinite(parsedMiles) && !Number.isNaN(parsedMiles)) {
          validated.miles = Math.max(0, parsedMiles);
        }
      }
      
      // Validate vehicle type
      if (typeof state.vehicleType === "string") {
        validated.vehicleType = state.vehicleType;
      }
      
      // Validate energy kWh
      if (state.kwh !== undefined && state.kwh !== null) {
        const parsedKwh = parseInt(state.kwh, 10);
        if (Number.isFinite(parsedKwh) && !Number.isNaN(parsedKwh)) {
          validated.kwh = Math.max(0, parsedKwh);
        }
      }
      
      // Validate diet tier
      if (typeof state.dietType === "string") {
        validated.dietType = state.dietType;
      }

      // Validate checklist habits
      if (state.habits && typeof state.habits === "object") {
        validated.habits = {};
        Object.keys(DEFAULT_STATE.habits).forEach(key => {
          validated.habits[key] = Boolean(state.habits[key]);
        });
      }

      // Validate chat history arrays
      if (Array.isArray(state.chatHistory)) {
        validated.chatHistory = state.chatHistory.filter(msg => {
          return msg && 
                 typeof msg === "object" && 
                 typeof msg.sender === "string" && 
                 typeof msg.text === "string";
        }).map(msg => {
          return {
            sender: String(msg.sender),
            text: String(msg.text),
            time: typeof msg.time === "string" ? String(msg.time) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });
      }

      // Validate visual configurations
      validated.highContrast = Boolean(state.highContrast);
      if (["normal", "large"].includes(state.textScale)) {
        validated.textScale = String(state.textScale);
      }

      return validated;
    } catch (error) {
      console.error("Schema validation failed, reverting to absolute defaults:", error);
      return CarbonStorageManager.getClonedDefaultState();
    }
  }

  /**
   * Fetches state from LocalStorage safely, cascading to memory fallback on system restriction.
   * @returns {object} The verified application state.
   */
  static getState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized === null) {
        if (!memoryState) {
          memoryState = CarbonStorageManager.getClonedDefaultState();
        }
        return memoryState;
      }
      
      const parsed = JSON.parse(serialized);
      const validated = CarbonStorageManager.validateStateSchema(parsed);
      
      memoryState = validated;
      return validated;
    } catch (error) {
      console.error("Local storage read failed, reverting to in-memory runtime transient state:", error);
      if (!memoryState) {
        memoryState = CarbonStorageManager.getClonedDefaultState();
      }
      return memoryState;
    }
  }

  /**
   * Persists state to LocalStorage, keeping the memory mirror in sync.
   * @param {object} state - The state shape to save.
   * @returns {boolean} True if successfully committed to LocalStorage, false if transient only.
   */
  static saveState(state) {
    try {
      const validated = CarbonStorageManager.validateStateSchema(state);
      memoryState = validated;
      
      const serialized = JSON.stringify(validated);
      localStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (error) {
      console.error("Local storage save failed, updating local memory context only:", error);
      return false;
    }
  }

  /**
   * Clear state from storage and reset back to defaults.
   */
  static clearState() {
    try {
      memoryState = CarbonStorageManager.getClonedDefaultState();
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Storage reset failed, clearing local memory context instead:", error);
      memoryState = CarbonStorageManager.getClonedDefaultState();
    }
  }
}
