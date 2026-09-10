// backend/services/aiService.js
// Bridges Node backend → Python AI microservice
// Falls back to rule-based logic if Python service is unavailable

const axios = require('axios');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ── predictRisk ──────────────────────────────────────────────────────────────
// Sends vitals + patient context to Python API, returns { risk, flags, score }
const predictRisk = async (data) => {
  const response = await axios.post(`${AI_URL}/predict`, data, { timeout: 3000 });
  return response.data; // { risk: 'medium', score: 0.62, flags: { hrAlert, spo2Alert, bpAlert } }
};

// ── getConditionProtocol ─────────────────────────────────────────────────────
// Returns handling instructions for a given condition (replicated from AI model)
const getConditionProtocol = (condition) => {
  const protocols = {
    hydrocephalus: {
      instructions: 'Avoid neck movement. Keep head elevated at 30°. Monitor for nausea or altered consciousness.',
      restrictions: ['no_sudden_movement', 'head_elevated'],
    },
    cardiac: {
      instructions: 'Continuous ECG monitoring required. Do not exceed 0.5 m/s speed. Defibrillator must be accessible.',
      restrictions: ['ecg_required', 'slow_speed', 'defibrillator_nearby'],
    },
    icu: {
      instructions: 'Minimum 2 trained staff. All life-support equipment must remain connected. Alert receiving team 5 min before.',
      restrictions: ['two_staff_minimum', 'life_support_connected'],
    },
    respiratory: {
      instructions: 'Maintain oxygen supply. Avoid supine position for more than 2 minutes. Keep suction device ready.',
      restrictions: ['oxygen_required', 'position_monitored'],
    },
    general: {
      instructions: 'Standard transfer protocol applies.',
      restrictions: [],
    },
  };
  return protocols[condition] || protocols.general;
};

// ── suggestRoute ─────────────────────────────────────────────────────────────
// Asks Python AI for optimal route (elevator, corridor) avoiding crowd zones
const suggestRoute = async ({ fromWard, toWard, hospitalFloors }) => {
  try {
    const response = await axios.post(
      `${AI_URL}/route`,
      { fromWard, toWard, hospitalFloors },
      { timeout: 3000 }
    );
    return response.data; // { route: 'Corridor B → Elevator B → Floor 4', estimatedMinutes: 12 }
  } catch {
    return { route: `${fromWard} → Main Corridor → ${toWard}`, estimatedMinutes: 15 };
  }
};

module.exports = { predictRisk, getConditionProtocol, suggestRoute };
