"use strict";

/**
 * app.js - Main Orchestrator & DOM Engine
 * Strictly manages application state, safe rendering (zero innerHTML),
 * and typing streaming offline AI Eco-Assistant.
 * Encapsulated within modular OOP Classes with rigorous error boundary checks.
 */

import { CarbonCalculator } from './calculator.js';
import { CarbonStorageManager } from './storage.js';

/**
 * AI Response Library containing pre-programmed environmental advice.
 * Deeply frozen at startup to block runtime manipulation.
 * @type {object}
 */
const AI_RESPONSES = Object.freeze([
  Object.freeze({
    keywords: Object.freeze(["transport", "vehicle", "car", "commute", "drive", "miles", "carpool"]),
    response: "Transportation is a massive source of emissions! Consider: 1) Transitioning to an Electric Vehicle (EV) to cut emissions by over 60%. 2) Carpooling or biking to reduce miles driven. 3) Public transit produces ~78% less CO2 per mile compared to single-passenger gas vehicles."
  }),
  Object.freeze({
    keywords: Object.freeze(["electric", "solar", "power", "kwh", "grid", "energy", "vampire", "unplug"]),
    response: "Household energy efficiency makes a major impact! You can: 1) Transition to solar or purchase certified clean grid energy. 2) Install a smart thermostat to lower climate power usage. 3) Unplug standby electronics ('vampire loads') which account for up to 10% of standard household power consumption."
  }),
  Object.freeze({
    keywords: Object.freeze(["diet", "food", "meat", "vegan", "vegetarian", "beef", "waste"]),
    response: "Food choices are highly carbon-intensive. Switching from a heavy meat diet to vegetarian offsets ~1,890 kg of CO2/year. Going fully vegan offsets ~2,290 kg of CO2/year! Cutting food waste to zero also saves landfill methane production."
  }),
  Object.freeze({
    keywords: Object.freeze(["score", "index", "average", "target", "green", "carbon"]),
    response: "The Eco Score rates your sustainability from 0 to 100. 100 indicates carbon-neutrality (0 kg CO2/year). The average household generates ~8,000 kg. Aiming for a score of 80+ requires lowering transport miles, switching to plant-rich meals, and keeping habits checked!"
  }),
  Object.freeze({
    keywords: Object.freeze(["offset", "habit", "action", "tree", "offsetting"]),
    response: "Offsetting is great, but reduction should always come first! In our Habit Tracker, avoiding plastics, carpooling, managing temperature, and preventing food waste can combinedly offset up to 1,600 kg of CO2 per year."
  })
]);

const DEFAULT_AI_RESPONSE = "I'm here to help! Try asking about: 'How do I lower transport emissions?', 'Is a vegan diet better?', 'Tell me about energy saving', or 'What is a good Eco Score?'.";

/**
 * Habit carbon reduction coefficients in kg CO2/year.
 * Frozen deeply at startup to prevent modifications.
 * @type {object}
 */
const HABIT_OFFSETS = Object.freeze({
  useBags: 100,
  carpool: 800,
  energySave: 150,
  lowerThermostat: 350,
  reduceWaste: 200
});

/**
 * AppState Class
 * Manages the core application state, saving triggers, and unidirectional update dispatches.
 */
export class AppState {
  
  /**
   * AppState Constructor
   * Initializes the internal state data.
   */
  constructor() {
    try {
      this.data = CarbonStorageManager.getState();
    } catch (error) {
      console.error("State initialization failed, loading defaults:", error);
      this.data = CarbonStorageManager.getClonedDefaultState();
    }
  }

  /**
   * Updates core calculator numeric variables.
   * Runs type-casting and boundary checks prior to storage.
   * @param {any} miles - Annual miles traveled.
   * @param {any} vehicleType - Vehicle efficiency selection.
   * @param {any} kwh - Annual household electricity in kWh.
   * @param {any} dietType - Diet tier category.
   */
  updateCalculatorInputs(miles, vehicleType, kwh, dietType) {
    try {
      let parsedMiles = parseFloat(miles);
      let parsedKwh = parseFloat(kwh);
      
      if (!Number.isFinite(parsedMiles) || parsedMiles < 0) {
        parsedMiles = 0.0;
      }
      if (!Number.isFinite(parsedKwh) || parsedKwh < 0) {
        parsedKwh = 0.0;
      }

      this.data.miles = CarbonCalculator.sanitizeNumber(parsedMiles, 0, 100000, 12000);
      this.data.vehicleType = String(vehicleType);
      this.data.kwh = CarbonCalculator.sanitizeNumber(parsedKwh, 0, 50000, 4500);
      this.data.dietType = String(dietType);
      
      this.persist();
    } catch (error) {
      console.error("Error setting calculator values:", error);
    }
  }

  /**
   * Toggles the checked configuration of an ecological habit.
   * @param {string} habitKey - Name of the habit.
   * @param {boolean} isChecked - Checked toggle setting.
   */
  updateHabit(habitKey, isChecked) {
    try {
      if (this.data.habits[habitKey] !== undefined) {
        this.data.habits[habitKey] = Boolean(isChecked);
        this.persist();
      }
    } catch (error) {
      console.error(`Error toggling habit ${habitKey}:`, error);
    }
  }

  /**
   * Toggles high contrast visual theme parameters.
   * @returns {boolean} The new state configuration.
   */
  toggleContrast() {
    try {
      this.data.highContrast = !this.data.highContrast;
      this.persist();
      return this.data.highContrast;
    } catch (error) {
      console.error("Error setting contrast state:", error);
      return false;
    }
  }

  /**
   * Toggles text scaling parameters between normal and large.
   * @returns {string} The new state configuration setting.
   */
  toggleTextScale() {
    try {
      this.data.textScale = this.data.textScale === "large" ? "normal" : "large";
      this.persist();
      return this.data.textScale;
    } catch (error) {
      console.error("Error setting text scale state:", error);
      return "normal";
    }
  }

  /**
   * Push a message object to local assistant chat memory logs.
   * @param {string} sender - "user" or "assistant".
   * @param {string} text - Message text context.
   * @param {string} time - String stamp representation.
   */
  addChatMessage(sender, text, time) {
    try {
      this.data.chatHistory.push({
        sender: String(sender),
        text: String(text),
        time: String(time)
      });
      this.persist();
    } catch (error) {
      console.error("Error updating chat message lists:", error);
    }
  }

  /**
   * Persists current state properties into local storage managers.
   */
  persist() {
    try {
      CarbonStorageManager.saveState(this.data);
    } catch (error) {
      console.error("State serialization persistence failed:", error);
    }
  }

  /**
   * Reverts application state variables back to original values.
   */
  resetState() {
    try {
      CarbonStorageManager.clearState();
      this.data = CarbonStorageManager.getState();
    } catch (error) {
      console.error("Resetting state operations failed:", error);
    }
  }
}

/**
 * DOMRenderer Class
 * Orchestrates DOM query requests and safe updates (zero innerHTML).
 * Wrapped in try-catch structures to ensure zero runtime exceptions are thrown if nodes are missing.
 */
export class DOMRenderer {

  /**
   * Safe helper querying elements on the DOM, returning null rather than crashing on missing nodes.
   * @param {string} selector - CSS selector query.
   * @returns {HTMLElement|null} Found element or null.
   */
  static getElement(selector) {
    try {
      return document.getElementById(selector.replace(/^#/, "")) || document.querySelector(selector);
    } catch (error) {
      console.error(`DOM Selector failure querying '${selector}':`, error);
      return null;
    }
  }

  /**
   * Updates textContent properties of elements safely.
   * @param {string} selector - CSS selector.
   * @param {string|number} value - Target value.
   */
  static safeSetText(selector, value) {
    try {
      const el = DOMRenderer.getElement(selector);
      if (el) {
        el.textContent = String(value);
      }
    } catch (error) {
      console.error(`Failed setting text for '${selector}':`, error);
    }
  }

  /**
   * Pushes announcement text to the aria-live polite region.
   * @param {string} message - Announcement string.
   */
  static announce(message) {
    try {
      DOMRenderer.safeSetText("#announcement-zone", message);
    } catch (error) {
      console.error("Polite screen reader announcement failed:", error);
    }
  }

  /**
   * Evaluates math metrics from AppState and renders to progress rings/bars/breakdowns.
   * Updates interactive slider accessibility aria attributes dynamically.
   * @param {AppState} appStateInstance - The unified state model instance.
   */
  static renderDashboard(appStateInstance) {
    try {
      const state = appStateInstance.data;

      // 1. Calculations
      const transportCO2 = CarbonCalculator.calculateTransport(state.miles, state.vehicleType);
      const energyCO2 = CarbonCalculator.calculateEnergy(state.kwh);
      const dietCO2 = CarbonCalculator.calculateDiet(state.dietType);
      const baseTotal = CarbonCalculator.calculateTotal(transportCO2, energyCO2, dietCO2);

      // Sum offsets
      let offsets = 0.0;
      Object.keys(state.habits).forEach(key => {
        if (state.habits[key]) {
          offsets += parseFloat(HABIT_OFFSETS[key] || "0");
        }
      });

      const finalTotal = Math.max(0, baseTotal - offsets);
      const ecoScore = CarbonCalculator.calculateEcoScore(finalTotal);

      // 2. DOM text updates
      DOMRenderer.safeSetText("#score-percentage-display", ecoScore);
      DOMRenderer.safeSetText("#total-emissions-display", `${Math.round(finalTotal).toLocaleString()} kg`);
      
      DOMRenderer.safeSetText("#transport-breakdown-text", `${Math.round(transportCO2).toLocaleString()} kg`);
      DOMRenderer.safeSetText("#energy-breakdown-text", `${Math.round(energyCO2).toLocaleString()} kg`);
      DOMRenderer.safeSetText("#diet-breakdown-text", `${Math.round(dietCO2).toLocaleString()} kg`);

      // Sync slider text indicator readouts
      DOMRenderer.safeSetText("#miles-val-indicator", Math.round(state.miles).toLocaleString());
      DOMRenderer.safeSetText("#kwh-val-indicator", Math.round(state.kwh).toLocaleString());

      // 3. Render category progress bars (Cap benchmark at 10,000 kg)
      const barCap = 10000;
      const transportPct = Math.min(100, (transportCO2 / barCap) * 100);
      const energyPct = Math.min(100, (energyCO2 / barCap) * 100);
      const dietPct = Math.min(100, (dietCO2 / barCap) * 100);

      const transBar = DOMRenderer.getElement("#transport-progress-bar");
      if (transBar) {
        transBar.style.width = `${transportPct}%`;
        transBar.setAttribute("aria-valuenow", String(Math.round(transportPct)));
      }
      
      const energyBar = DOMRenderer.getElement("#energy-progress-bar");
      if (energyBar) {
        energyBar.style.width = `${energyPct}%`;
        energyBar.setAttribute("aria-valuenow", String(Math.round(energyPct)));
      }

      const dietBar = DOMRenderer.getElement("#diet-progress-bar");
      if (dietBar) {
        dietBar.style.width = `${dietPct}%`;
        dietBar.setAttribute("aria-valuenow", String(Math.round(dietPct)));
      }

      // Sync slider interactive state accessibility tags
      const milesSlider = DOMRenderer.getElement("#input-miles");
      if (milesSlider) {
        milesSlider.value = state.miles;
        milesSlider.setAttribute("aria-valuenow", String(state.miles));
      }
      
      const kwhSlider = DOMRenderer.getElement("#input-kwh");
      if (kwhSlider) {
        kwhSlider.value = state.kwh;
        kwhSlider.setAttribute("aria-valuenow", String(state.kwh));
      }

      // 4. Circular SVG meter animation (Circumference = 326.72)
      const scoreRing = DOMRenderer.getElement("#score-ring");
      if (scoreRing) {
        const circumference = 326.72;
        const offset = circumference - (ecoScore / 100.0) * circumference;
        scoreRing.style.strokeDashoffset = String(offset);
      }
    } catch (error) {
      console.error("Dashboard render pipeline encountered an exception:", error);
    }
  }

  /**
   * Applies visual layout configurations (Contrast / Scale) to the body.
   * @param {AppState} appStateInstance - The unified state model instance.
   */
  static renderVisualPreferences(appStateInstance) {
    try {
      const state = appStateInstance.data;
      const body = document.body;
      const contrastBtn = DOMRenderer.getElement("#toggle-contrast");
      const scaleBtn = DOMRenderer.getElement("#toggle-text-scale");

      if (state.highContrast) {
        body.classList.add("high-contrast");
        if (contrastBtn) {
          contrastBtn.classList.add("bg-white", "text-black");
          contrastBtn.classList.remove("text-[var(--text-secondary)]");
        }
      } else {
        body.classList.remove("high-contrast");
        if (contrastBtn) {
          contrastBtn.classList.remove("bg-white", "text-black");
          contrastBtn.classList.add("text-[var(--text-secondary)]");
        }
      }

      if (state.textScale === "large") {
        body.classList.add("text-scale-large");
        if (scaleBtn) {
          scaleBtn.classList.add("bg-white", "text-black");
          scaleBtn.classList.remove("text-[var(--text-secondary)]");
        }
      } else {
        body.classList.remove("text-scale-large");
        if (scaleBtn) {
          scaleBtn.classList.remove("bg-white", "text-black");
          scaleBtn.classList.add("text-[var(--text-secondary)]");
        }
      }
    } catch (error) {
      console.error("Visual styling application failed:", error);
    }
  }

  /**
   * Renders the chat dialogue transcript list safely using XSS-immune element builders.
   * Appends streamed characters strictly through textNodes.
   * @param {AppState} appStateInstance - The unified state model instance.
   */
  static renderChatLogs(appStateInstance) {
    try {
      const chatContainer = DOMRenderer.getElement("#chat-message-list");
      if (!chatContainer) return;

      chatContainer.textContent = "";

      appStateInstance.data.chatHistory.forEach(msg => {
        const bubble = document.createElement("div");
        bubble.className = `flex flex-col max-w-[85%] rounded-xl p-3.5 message-bubble ${
          msg.sender === "user" 
            ? "bg-slate-900 border border-[var(--border-light)] self-end" 
            : "bg-[var(--bg-card-hover)] border border-[var(--border-light)] self-start"
        }`;

        const senderSpan = document.createElement("span");
        senderSpan.className = "text-[10px] uppercase font-bold tracking-wider mb-1 " + 
          (msg.sender === "user" ? "text-[var(--accent-mint)]" : "text-[var(--accent-gold)]");
        senderSpan.appendChild(document.createTextNode(msg.sender === "user" ? "You" : "Eco-Assistant"));

        const textSpan = document.createElement("span");
        textSpan.className = "leading-relaxed break-words text-white";
        // Ironclad XSS defense: append text exclusively using textNode
        textSpan.appendChild(document.createTextNode(msg.text));

        const timeSpan = document.createElement("span");
        timeSpan.className = "text-[9px] text-[var(--text-muted)] mt-1.5 self-end";
        timeSpan.appendChild(document.createTextNode(msg.time));

        bubble.appendChild(senderSpan);
        bubble.appendChild(textSpan);
        bubble.appendChild(timeSpan);
        chatContainer.appendChild(bubble);
      });

      chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (error) {
      console.error("Chat transcript log rendering failed:", error);
    }
  }
}

/**
 * AIEcoAssistant Class
 * Analyzes query inputs and drives simulated character-by-character typewriter streaming outputs.
 */
export class AIEcoAssistant {

  /**
   * Searches keyword databases and streams structured responses.
   * Streams text safely through TextNode appends.
   * @param {string} userQuery - The message text entered by the user.
   * @param {AppState} appStateInstance - The unified state model instance.
   * @param {Function} onStreamCallback - Callback executed at each streamed character step.
   */
  static generateResponse(userQuery, appStateInstance, onStreamCallback) {
    try {
      const queryLower = String(userQuery).toLowerCase().trim();
      let aiAnswer = DEFAULT_AI_RESPONSE;

      for (const item of AI_RESPONSES) {
        const matched = item.keywords.some(keyword => queryLower.includes(keyword));
        if (matched) {
          aiAnswer = item.response;
          break;
        }
      }

      // Add a blank placeholder assistant message to history
      const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      appStateInstance.addChatMessage("assistant", "", timeStamp);

      const msgIndex = appStateInstance.data.chatHistory.length - 1;
      let charIndex = 0;

      const timer = setInterval(() => {
        try {
          if (charIndex < aiAnswer.length) {
            appStateInstance.data.chatHistory[msgIndex].text += aiAnswer.charAt(charIndex);
            charIndex++;
            onStreamCallback();
          } else {
            clearInterval(timer);
            appStateInstance.persist();
            DOMRenderer.announce("Eco-Assistant response complete.");
          }
        } catch (intervalError) {
          clearInterval(timer);
          console.error("Typewriter character streaming interrupted:", intervalError);
        }
      }, 8);
    } catch (error) {
      console.error("AI response processing failed:", error);
    }
  }
}

/**
 * CarbonCalculatorApp Class
 * Wraps the entire application orchestrator and event lifecycle inside an ES6 module class.
 */
export class CarbonCalculatorApp {
  
  /**
   * Constructor initializes state and renders initial visual templates.
   */
  constructor() {
    try {
      this.state = new AppState();
    } catch (error) {
      console.error("Failed to construct AppState inside main orchestrator:", error);
    }
  }

  /**
   * Bootstraps initial renders and registers system events.
   */
  init() {
    try {
      // Sync UI sliders and visual templates
      DOMRenderer.renderVisualPreferences(this.state);
      DOMRenderer.renderChatLogs(this.state);
      DOMRenderer.renderDashboard(this.state);

      this.bindEvents();
    } catch (error) {
      console.error("CarbonCalculatorApp bootstrapping failed:", error);
    }
  }

  /**
   * Registers DOM event listeners with extensive type safety boundaries.
   */
  bindEvents() {
    try {
      const calcForm = DOMRenderer.getElement("#calculator-form");
      const btnReset = DOMRenderer.getElement("#btn-reset-form");
      const contrastBtn = DOMRenderer.getElement("#toggle-contrast");
      const scaleBtn = DOMRenderer.getElement("#toggle-text-scale");
      const chatForm = DOMRenderer.getElement("#chat-form");
      const chatInput = DOMRenderer.getElement("#chat-input");
      
      const milesSlider = DOMRenderer.getElement("#input-miles");
      const kwhSlider = DOMRenderer.getElement("#input-kwh");

      // Dynamic slider value change listeners (update state and indicators on drag)
      if (milesSlider) {
        milesSlider.addEventListener("input", (e) => {
          try {
            const milesVal = parseFloat(e.target.value);
            DOMRenderer.safeSetText("#miles-val-indicator", Math.round(milesVal).toLocaleString());
            milesSlider.setAttribute("aria-valuenow", String(milesVal));
          } catch (sliderErr) {
            console.error("Miles slider drag event failed:", sliderErr);
          }
        });
      }

      if (kwhSlider) {
        kwhSlider.addEventListener("input", (e) => {
          try {
            const kwhVal = parseFloat(e.target.value);
            DOMRenderer.safeSetText("#kwh-val-indicator", Math.round(kwhVal).toLocaleString());
            kwhSlider.setAttribute("aria-valuenow", String(kwhVal));
          } catch (sliderErr) {
            console.error("kWh slider drag event failed:", sliderErr);
          }
        });
      }

      // Form Submit (Recalculate)
      if (calcForm) {
        calcForm.addEventListener("submit", (e) => {
          try {
            e.preventDefault();
            // Pre-calculation input sanitization: force parseFloat, finiteness and range checks immediately
            let milesVal = parseFloat(DOMRenderer.getElement("#input-miles")?.value || "0");
            let kwhVal = parseFloat(DOMRenderer.getElement("#input-kwh")?.value || "0");
            const vehicleVal = String(DOMRenderer.getElement("#select-vehicle")?.value || "gasoline");
            const dietVal = String(DOMRenderer.getElement("#select-diet")?.value || "mediumMeat");

            if (!Number.isFinite(milesVal) || milesVal < 0) {
              milesVal = 0.0;
            }
            if (!Number.isFinite(kwhVal) || kwhVal < 0) {
              kwhVal = 0.0;
            }

            this.state.updateCalculatorInputs(milesVal, vehicleVal, kwhVal, dietVal);
            DOMRenderer.renderDashboard(this.state);
            DOMRenderer.announce("Recalculation finished successfully.");
          } catch (submitError) {
            console.error("Form submit binding error:", submitError);
          }
        });
      }

      // Reset Button
      if (btnReset) {
        btnReset.addEventListener("click", () => {
          try {
            this.state.resetState();
            
            const milesVal = this.state.data.miles;
            const kwhVal = this.state.data.kwh;

            if (milesSlider) {
              milesSlider.value = milesVal;
              milesSlider.setAttribute("aria-valuenow", String(milesVal));
            }
            if (kwhSlider) {
              kwhSlider.value = kwhVal;
              kwhSlider.setAttribute("aria-valuenow", String(kwhVal));
            }

            DOMRenderer.safeSetText("#miles-val-indicator", Math.round(milesVal).toLocaleString());
            DOMRenderer.safeSetText("#kwh-val-indicator", Math.round(kwhVal).toLocaleString());

            const vehicleSelect = DOMRenderer.getElement("#select-vehicle");
            if (vehicleSelect) vehicleSelect.value = this.state.data.vehicleType;
            
            const dietSelect = DOMRenderer.getElement("#select-diet");
            if (dietSelect) dietSelect.value = this.state.data.dietType;

            Object.keys(this.state.data.habits).forEach(key => {
              const cb = DOMRenderer.getElement(`#habit-${key}`);
              if (cb) cb.checked = this.state.data.habits[key];
            });

            DOMRenderer.renderDashboard(this.state);
            DOMRenderer.announce("Baseline defaults reloaded.");
          } catch (resetError) {
            console.error("Reset button binding error:", resetError);
          }
        });
      }

      // Habit checkboxes
      Object.keys(this.state.data.habits).forEach(key => {
        const cb = DOMRenderer.getElement(`#habit-${key}`);
        if (cb) {
          cb.addEventListener("change", (e) => {
            try {
              this.state.updateHabit(key, e.target.checked);
              DOMRenderer.renderDashboard(this.state);
              DOMRenderer.announce(`Habit preference adjusted: ${key} is now ${e.target.checked ? 'active' : 'inactive'}.`);
            } catch (habitError) {
              console.error("Habit checkbox change binding error:", habitError);
            }
          });
        }
      });

      // Visual Contrast Settings
      if (contrastBtn) {
        contrastBtn.addEventListener("click", () => {
          try {
            const contrast = this.state.toggleContrast();
            DOMRenderer.renderVisualPreferences(this.state);
            DOMRenderer.announce(`High contrast settings toggled: ${contrast ? 'ON' : 'OFF'}.`);
          } catch (contrastError) {
            console.error("Contrast button binding error:", contrastError);
          }
        });
      }

      // Text Scale settings
      if (scaleBtn) {
        scaleBtn.addEventListener("click", () => {
          try {
            const scale = this.state.toggleTextScale();
            DOMRenderer.renderVisualPreferences(this.state);
            DOMRenderer.announce(`Text scale settings modified: ${scale} size active.`);
          } catch (scaleError) {
            console.error("Text scale button binding error:", scaleError);
          }
        });
      }

      // Chat submission
      if (chatForm && chatInput) {
        chatForm.addEventListener("submit", (e) => {
          try {
            e.preventDefault();
            const query = chatInput.value.trim();
            if (!query) return;

            const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.state.addChatMessage("user", query, timeStamp);
            DOMRenderer.renderChatLogs(this.state);
            chatInput.value = "";

            AIEcoAssistant.generateResponse(query, this.state, () => {
              DOMRenderer.renderChatLogs(this.state);
            });
          } catch (chatError) {
            console.error("Chat submit binding error:", chatError);
          }
        });
      }

      // Suggestion chips
      document.querySelectorAll(".chat-suggest").forEach(chip => {
        chip.addEventListener("click", (e) => {
          try {
            if (chatInput) {
              chatInput.value = e.target.textContent.trim();
              chatForm.dispatchEvent(new Event("submit"));
            }
          } catch (chipError) {
            console.error("Suggestion chip click binding error:", chipError);
          }
        });
      });

      // Diagnostic Trigger
      const testTrigger = DOMRenderer.getElement("#btn-run-tests");
      if (testTrigger) {
        testTrigger.addEventListener("click", () => {
          try {
            if (window.runUnitTests) {
              window.runUnitTests();
              DOMRenderer.announce("Unit tests diagnostics executed successfully.");
            }
          } catch (testError) {
            console.error("Diagnostic button click binding error:", testError);
          }
        });
      }
    } catch (error) {
      console.error("Global event binding failed:", error);
    }
  }
}

// Bootstrap application safely
window.addEventListener("DOMContentLoaded", () => {
  try {
    const app = new CarbonCalculatorApp();
    app.init();
  } catch (bootstrapError) {
    console.error("CarbonCalculatorApp failed to bootstrap on DOM load:", bootstrapError);
  }
});
