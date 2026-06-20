/**
 * app.js - Main Orchestrator & DOM Engine
 * Strictly manages state, safe rendering (zero innerHTML), and offline AI assistant streaming.
 */

import { 
  calculateTransportCarbon, 
  calculateEnergyCarbon, 
  calculateDietCarbon, 
  calculateTotalCarbon, 
  calculateEcoScore 
} from './calculator.js';

import { 
  getState, 
  saveState, 
  clearState 
} from './storage.js';

// Pre-defined knowledge base mapping keywords to eco-friendly advice
const AI_RESPONSES = [
  {
    keywords: ["transport", "vehicle", "car", "commute", "drive", "miles", "carpool"],
    response: "Transportation is a massive source of emissions! Consider: 1) Transitioning to an Electric Vehicle (EV) to cut emissions by over 60%. 2) Carpooling or biking to reduce miles driven. 3) Public transit produces ~78% less CO2 per mile compared to single-passenger gas vehicles."
  },
  {
    keywords: ["electric", "solar", "power", "kwh", "grid", "energy", "vampire", "unplug"],
    response: "Household energy efficiency makes a major impact! You can: 1) Transition to solar or purchase certified clean grid energy. 2) Install a smart thermostat to lower climate power usage. 3) Unplug standby electronics ('vampire loads') which account for up to 10% of standard household power consumption."
  },
  {
    keywords: ["diet", "food", "meat", "vegan", "vegetarian", "beef", "waste"],
    response: "Food choices are highly carbon-intensive. Switching from a heavy meat diet to vegetarian offsets ~1,890 kg of CO2/year. Going fully vegan offsets ~2,290 kg of CO2/year! Cutting food waste to zero also saves landfill methane production."
  },
  {
    keywords: ["score", "index", "average", "target", "green", "carbon"],
    response: "The Eco Score rates your sustainability from 0 to 100. 100 indicates carbon-neutrality (0 kg CO2/year). The average household generates ~8,000 kg. Aiming for a score of 80+ requires lowering transport miles, switching to plant-rich meals, and keeping habits checked!"
  },
  {
    keywords: ["offset", "habit", "action", "tree", "offsetting"],
    response: "Offsetting is great, but reduction should always come first! In our Habit Tracker, avoiding plastics, carpooling, managing temperature, and preventing food waste can combinedly offset up to 1,600 kg of CO2 per year."
  }
];

const DEFAULT_AI_RESPONSE = "I'm here to help! Try asking about: 'How do I lower transport emissions?', 'Is a vegan diet better?', 'Tell me about energy saving', or 'What is a good Eco Score?'.";

// Habit carbon reduction coefficients in kg CO2/year (aligned with index.html)
const HABIT_OFFSETS = {
  useBags: 100,
  carpool: 800,
  energySave: 150,
  lowerThermostat: 350,
  reduceWaste: 200
};

// Global App State Reference
let appState = {};

// Reference DOM elements
const inputMiles = document.getElementById("input-miles");
const selectVehicle = document.getElementById("select-vehicle");
const inputKwh = document.getElementById("input-kwh");
const selectDiet = document.getElementById("select-diet");
const calcForm = document.getElementById("calculator-form");
const btnResetForm = document.getElementById("btn-reset-form");

const scoreRing = document.getElementById("score-ring");
const scoreDisplay = document.getElementById("score-percentage-display");
const totalEmissionsDisplay = document.getElementById("total-emissions-display");
const transportBreakdownText = document.getElementById("transport-breakdown-text");
const energyBreakdownText = document.getElementById("energy-breakdown-text");
const dietBreakdownText = document.getElementById("diet-breakdown-text");

const transportProgressBar = document.getElementById("transport-progress-bar");
const energyProgressBar = document.getElementById("energy-progress-bar");
const dietProgressBar = document.getElementById("diet-progress-bar");

const toggleContrastBtn = document.getElementById("toggle-contrast");
const toggleTextScaleBtn = document.getElementById("toggle-text-scale");
const announcementZone = document.getElementById("announcement-zone");

const chatMessageList = document.getElementById("chat-message-list");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

/**
 * Initializes the application state, syncs accessibility, triggers first render
 */
function init() {
  // Load saved state or defaults
  appState = getState();

  // Populate form inputs from loaded state
  if (inputMiles) inputMiles.value = appState.miles;
  if (selectVehicle) selectVehicle.value = appState.vehicleType;
  if (inputKwh) inputKwh.value = appState.kwh;
  if (selectDiet) selectDiet.value = appState.dietType;

  // Sync checkboxes
  Object.keys(appState.habits).forEach(key => {
    const el = document.getElementById(`habit-${key}`);
    if (el) {
      el.checked = appState.habits[key];
    }
  });

  // Apply visual settings (contrast & scale)
  applyVisualSettings();

  // Draw chat history
  renderChatMessages();

  // First rendering and calculations
  recalculateAndRender();

  // Listeners
  bindEvents();
}

/**
 * Applies visual theme preferences saved in State directly to the DOM
 */
function applyVisualSettings() {
  if (appState.highContrast) {
    document.body.classList.add("high-contrast");
    toggleContrastBtn.classList.add("bg-white", "text-black");
    toggleContrastBtn.classList.remove("text-[var(--text-secondary)]");
  } else {
    document.body.classList.remove("high-contrast");
    toggleContrastBtn.classList.remove("bg-white", "text-black");
    toggleContrastBtn.classList.add("text-[var(--text-secondary)]");
  }

  if (appState.textScale === "large") {
    document.body.classList.add("text-scale-large");
    toggleTextScaleBtn.classList.add("bg-white", "text-black");
    toggleTextScaleBtn.classList.remove("text-[var(--text-secondary)]");
  } else {
    document.body.classList.remove("text-scale-large");
    toggleTextScaleBtn.classList.remove("bg-white", "text-black");
    toggleTextScaleBtn.classList.add("text-[var(--text-secondary)]");
  }
}

/**
 * Binds DOM event listeners safely
 */
function bindEvents() {
  // Form submission
  if (calcForm) {
    calcForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      appState.miles = Number(inputMiles.value);
      appState.vehicleType = selectVehicle.value;
      appState.kwh = Number(inputKwh.value);
      appState.dietType = selectDiet.value;
      
      saveState(appState);
      recalculateAndRender();
      announce("State updated. Your carbon footprint has been recalculated.");
    });
  }

  // Reset form
  if (btnResetForm) {
    btnResetForm.addEventListener("click", () => {
      clearState();
      appState = getState();
      
      // Update fields
      inputMiles.value = appState.miles;
      selectVehicle.value = appState.vehicleType;
      inputKwh.value = appState.kwh;
      selectDiet.value = appState.dietType;
      
      // Update checkmarks
      Object.keys(appState.habits).forEach(key => {
        const el = document.getElementById(`habit-${key}`);
        if (el) el.checked = appState.habits[key];
      });

      recalculateAndRender();
      announce("Calculator has been reset to baseline defaults.");
    });
  }

  // Habits checkboxes change listeners
  Object.keys(appState.habits).forEach(key => {
    const el = document.getElementById(`habit-${key}`);
    if (el) {
      el.addEventListener("change", (e) => {
        appState.habits[key] = e.target.checked;
        saveState(appState);
        recalculateAndRender();
        
        const changeWord = e.target.checked ? "activated" : "deactivated";
        announce(`Habit ${key} ${changeWord}. Real-time score adjusted.`);
      });
    }
  });

  // Theme control listeners
  if (toggleContrastBtn) {
    toggleContrastBtn.addEventListener("click", () => {
      appState.highContrast = !appState.highContrast;
      saveState(appState);
      applyVisualSettings();
      announce(`High contrast mode ${appState.highContrast ? "enabled" : "disabled"}.`);
    });
  }

  if (toggleTextScaleBtn) {
    toggleTextScaleBtn.addEventListener("click", () => {
      appState.textScale = appState.textScale === "large" ? "normal" : "large";
      saveState(appState);
      applyVisualSettings();
      announce(`Text scaling changed to ${appState.textScale}.`);
    });
  }

  // AI Chat Submission
  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleChatSubmission();
    });
  }

  // Quick suggestion chips
  document.querySelectorAll(".chat-suggest").forEach(button => {
    button.addEventListener("click", (e) => {
      if (chatInput) {
        chatInput.value = e.target.textContent.trim();
        handleChatSubmission();
      }
    });
  });

  // Diagnostics re-run listener
  const btnRunTests = document.getElementById("btn-run-tests");
  if (btnRunTests) {
    btnRunTests.addEventListener("click", () => {
      if (window.runUnitTests) {
        window.runUnitTests();
        announce("Diagnostics executed. Test matrix updated.");
      }
    });
  }
}

/**
 * Runs calculations and safely renders the UI state changes (No innerHTML)
 */
function recalculateAndRender() {
  // 1. Math computations using domain logic
  const transportCO2 = calculateTransportCarbon(appState.miles, appState.vehicleType);
  const energyCO2 = calculateEnergyCarbon(appState.kwh);
  const dietCO2 = calculateDietCarbon(appState.dietType);
  
  const baseTotal = calculateTotalCarbon(transportCO2, energyCO2, dietCO2);
  
  // 2. Sum offsets from checked habits
  let offsets = 0;
  Object.keys(appState.habits).forEach(key => {
    if (appState.habits[key]) {
      offsets += HABIT_OFFSETS[key] || 0;
    }
  });

  const finalTotal = Math.max(0, baseTotal - offsets);
  const ecoScore = calculateEcoScore(finalTotal);

  // 3. Render Dashboard displays safely
  if (scoreDisplay) {
    scoreDisplay.textContent = `${ecoScore}`;
  }
  if (totalEmissionsDisplay) {
    totalEmissionsDisplay.textContent = `${Math.round(finalTotal).toLocaleString()} kg`;
  }
  
  if (transportBreakdownText) transportBreakdownText.textContent = `${Math.round(transportCO2).toLocaleString()} kg`;
  if (energyBreakdownText) energyBreakdownText.textContent = `${Math.round(energyCO2).toLocaleString()} kg`;
  if (dietBreakdownText) dietBreakdownText.textContent = `${Math.round(dietCO2).toLocaleString()} kg`;

  // 4. Render layout-shift free Progress Bars (as percentages of a 10,000 kg cap)
  const barCap = 10000;
  const transportPct = Math.min(100, (transportCO2 / barCap) * 100);
  const energyPct = Math.min(100, (energyCO2 / barCap) * 100);
  const dietPct = Math.min(100, (dietCO2 / barCap) * 100);

  if (transportProgressBar) transportProgressBar.style.width = `${transportPct}%`;
  if (energyProgressBar) energyProgressBar.style.width = `${energyPct}%`;
  if (dietProgressBar) dietProgressBar.style.width = `${dietPct}%`;

  // 5. Update SVG score ring (stroke-dashoffset transition)
  if (scoreRing) {
    const circumference = 326.72; // 2 * PI * 52
    const offset = circumference - (ecoScore / 100) * circumference;
    scoreRing.style.strokeDashoffset = offset;
  }
}

/**
 * Handles posting of user messages and initiates streaming simulated AI replies
 */
function handleChatSubmission() {
  if (!chatInput) return;
  const query = chatInput.value.trim();
  if (!query) return;

  // Add User Message to state & clear input
  const userMsg = {
    sender: "user",
    text: query,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  
  appState.chatHistory.push(userMsg);
  saveState(appState);
  renderChatMessages();
  chatInput.value = "";

  // Analyze query for matching advice
  const queryLower = query.toLowerCase();
  let aiAnswer = "";
  
  for (const item of AI_RESPONSES) {
    const matched = item.keywords.some(keyword => queryLower.includes(keyword));
    if (matched) {
      aiAnswer = item.response;
      break;
    }
  }
  
  if (!aiAnswer) {
    aiAnswer = DEFAULT_AI_RESPONSE;
  }

  // Create stream target in state
  const assistantMsg = {
    sender: "assistant",
    text: "",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  
  appState.chatHistory.push(assistantMsg);
  const msgIndex = appState.chatHistory.length - 1;

  // Stream text response to simulate network delays
  let charIndex = 0;
  const timer = setInterval(() => {
    if (charIndex < aiAnswer.length) {
      // Stream next character
      appState.chatHistory[msgIndex].text += aiAnswer.charAt(charIndex);
      charIndex++;
      renderChatMessages();
    } else {
      clearInterval(timer);
      saveState(appState);
      announce("Eco-Assistant response complete.");
    }
  }, 12); // fast fluid typewriter effect
}

/**
 * Renders the chat message log safely using createElement (XSS immune)
 */
function renderChatMessages() {
  if (!chatMessageList) return;
  
  // Clear the container safely
  chatMessageList.textContent = "";

  appState.chatHistory.forEach(msg => {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `flex flex-col max-w-[85%] rounded-xl p-3.5 message-bubble ${
      msg.sender === "user" 
        ? "bg-slate-900 border border-[var(--border-light)] self-end" 
        : "bg-[var(--bg-card-hover)] border border-[var(--border-light)] self-start"
    }`;

    // Sender Label
    const senderSpan = document.createElement("span");
    senderSpan.className = "text-[10px] uppercase font-bold tracking-wider mb-1 " + 
      (msg.sender === "user" ? "text-[var(--accent-mint)]" : "text-[var(--accent-gold)]");
    senderSpan.textContent = msg.sender === "user" ? "You" : "Eco-Assistant";

    // Text Content
    const textSpan = document.createElement("span");
    textSpan.className = "leading-relaxed break-words text-white";
    textSpan.textContent = msg.text;

    // Time stamp
    const timeSpan = document.createElement("span");
    timeSpan.className = "text-[9px] text-[var(--text-muted)] mt-1.5 self-end";
    timeSpan.textContent = msg.time;

    messageWrapper.appendChild(senderSpan);
    messageWrapper.appendChild(textSpan);
    messageWrapper.appendChild(timeSpan);
    chatMessageList.appendChild(messageWrapper);
  });

  // Scroll to bottom
  chatMessageList.scrollTop = chatMessageList.scrollHeight;
}

/**
 * Pushes string messages to the aria-live polite region for auditory access
 * @param {string} text - Message announcement
 */
function announce(text) {
  if (announcementZone) {
    announcementZone.textContent = text;
  }
}

// Bootstrap app on DOM load
window.addEventListener("DOMContentLoaded", init);
