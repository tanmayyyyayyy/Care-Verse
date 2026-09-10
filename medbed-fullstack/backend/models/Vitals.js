// backend/models/Vitals.js
// Time-series vitals readings per patient

const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    heartRate:    { type: Number, required: true },   // bpm
    spo2:         { type: Number, required: true },   // %
    bpSystolic:   { type: Number, required: true },   // mmHg
    bpDiastolic:  { type: Number, required: true },   // mmHg
    temperature:  { type: Number, default: 37.0 },    // °C
    respiratoryRate: { type: Number, default: 16 },   // breaths/min

    // AI-generated alert flags set after prediction
    aiFlags: {
      hrAlert:   { type: Boolean, default: false },
      spo2Alert: { type: Boolean, default: false },
      bpAlert:   { type: Boolean, default: false },
    },

    // Predicted risk from AI at time of this reading
    predictedRisk: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },

    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Who or what recorded the vitals
    source: {
      type: String,
      enum: ['manual', 'sensor', 'simulation'],
      default: 'sensor',
    },
  },
  { timestamps: false } // recordedAt handles timing
);

// Keep only last 30 days of vitals per patient (TTL index)
vitalsSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Vitals', vitalsSchema);
