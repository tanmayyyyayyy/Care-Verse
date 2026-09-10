// backend/models/Approval.js
// Management approval decisions for transfer requests

const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema(
  {
    transfer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending',
    },
    remarks: { type: String, default: '' },
    reviewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────

// backend/models/Alert.js
const alertSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    transfer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transfer',
      default: null,
    },
    type: {
      type: String,
      enum: ['hr_high', 'spo2_low', 'bp_high', 'fall_risk', 'battery_low', 'route_change', 'checklist_incomplete', 'other'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      required: true,
    },
    message:  { type: String, required: true },
    isAcknowledged: { type: Boolean, default: false },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acknowledgedAt: { type: Date, default: null },
    isDismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────

// backend/models/Hospital.js
const hospitalSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, unique: true },
    city:    { type: String, required: true },
    state:   { type: String, default: '' },
    phone:   { type: String, default: '' },
    email:   { type: String, default: '' },
    isActive:{ type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = {
  Approval: mongoose.model('Approval', approvalSchema),
  Alert:    mongoose.model('Alert',    alertSchema),
  Hospital: mongoose.model('Hospital', hospitalSchema),
};
