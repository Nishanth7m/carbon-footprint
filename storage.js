/**
 * storage.js - State Persistence Layer
 * Interacts safely with LocalStorage with full error handling and in-memory fallback.
 */

// Default blueprint for application state
export const DEFAULT_STATE = {
  miles: 12000,
  vehicleType: "gasoline",
  kwh: 4500,
  dietType: "mediumMeat",
  habits: {
    useBags: false,
    carpool: false,
    energySave: false,
    lowerThermostat: false,
    reduceWaste: false
  },
  chatHistory: [
    {
      sender: "assistant",
      text: "Hello! I am your AI Eco-Assistant. Ask me anything about reducing your carbon footprint!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ],
  highContrast: false,
  textScale: "normal"
};

/**
 * Returns a deep copy of the DEFAULT_STATE to prevent shared reference mutations.
 * @returns {object} Decoupled default state.
 */
export function getClonedDefaultState() {
  return {
    miles: DEFAULT_STATE.miles,
    vehicleType: DEFAULT_STATE.vehicleType,
    kwh: DEFAULT_STATE.kwh,
    dietType: DEFAULT_STATE.dietType,
    habits: { ...DEFAULT_STATE.habits },
    chatHistory: DEFAULT_STATE.chatHistory.map(msg => ({ ...msg })),
    highContrast: DEFAULT_STATE.highContrast,
    textScale: DEFAULT_STATE.textScale
  };
}

const STORAGE_KEY = "carbon_footprint_tracker_state";

// In-memory transient fallback state for session lifecycle if localStorage fails
let memoryState = null;

/**
 * Validates the loaded state object shape to protect against corrupted or outdated schemas.
 * @param {any} state - The object retrieved from storage.
 * @returns {object} The validated state conforming to the schema.
 */
function validateStateSchema(state) {
  if (!state || typeof state !== "object") {
    return getClonedDefaultState();
  }

  // Build validated state based on defaults
  const validated = getClonedDefaultState();

  // Numeric inputs
  if (typeof state.miles === "number" && Number.isFinite(state.miles)) {
    validated.miles = state.miles;
  }
  if (typeof state.vehicleType === "string") {
    validated.vehicleType = state.vehicleType;
  }
  if (typeof state.kwh === "number" && Number.isFinite(state.kwh)) {
    validated.kwh = state.kwh;
  }
  if (typeof state.dietType === "string") {
    validated.dietType = state.dietType;
  }

  // Habits object validation
  if (state.habits && typeof state.habits === "object") {
    validated.habits = {};
    Object.keys(DEFAULT_STATE.habits).forEach(key => {
      validated.habits[key] = Boolean(state.habits[key]);
    });
  }

  // Chat history validation
  if (Array.isArray(state.chatHistory)) {
    validated.chatHistory = state.chatHistory.filter(msg => {
      return msg && typeof msg === "object" && typeof msg.sender === "string" && typeof msg.text === "string";
    });
  }

  // Visual options
  validated.highContrast = Boolean(state.highContrast);
  if (["normal", "large"].includes(state.textScale)) {
    validated.textScale = state.textScale;
  }

  return validated;
}

/**
 * Safely fetches the application state from localStorage.
 * Cascades to in-memory fallback on fail, guaranteeing zero crash failures.
 * @returns {object} The application state.
 */
export function getState() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized === null) {
      // Initialize memory fallback too
      if (!memoryState) {
        memoryState = getClonedDefaultState();
      }
      return memoryState;
    }
    
    const parsed = JSON.parse(serialized);
    const validated = validateStateSchema(parsed);
    
    // Ensure memoryState is kept in sync
    memoryState = validated;
    return validated;
  } catch (error) {
    console.error("Storage error during getState, falling back to in-memory state:", error);
    if (!memoryState) {
      memoryState = getClonedDefaultState();
    }
    return memoryState;
  }
}

/**
 * Safely persists the application state to localStorage.
 * Updates in-memory store in parallel.
 * @param {object} state - The application state to save.
 * @returns {boolean} True if successfully stored in localStorage, false if in-memory only.
 */
export function saveState(state) {
  const validated = validateStateSchema(state);
  memoryState = validated;
  
  try {
    const serialized = JSON.stringify(validated);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.error("Storage error during saveState, using memory store:", error);
    return false;
  }
}

/**
 * Resets the application state to the default blueprint.
 */
export function clearState() {
  memoryState = getClonedDefaultState();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Storage error during clearState:", error);
  }
}
