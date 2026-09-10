// backend/controllers/patientController.js
// Full CRUD for patients + vitals recording + AI risk trigger

const Patient    = require('../models/Patient');
const Vitals     = require('../models/Vitals');
const { Alert }  = require('../models/index');
const { AppError } = require('../middleware/errorHandler');
const aiService  = require('../services/aiService');

// ── GET /api/patients ────────────────────────────────────────────────────────
exports.getAllPatients = async (req, res, next) => {
  try {
    const { risk, condition, ward, search } = req.query;
    const filter = { isActive: true };

    if (risk)      filter.riskLevel  = risk;
    if (condition) filter.condition  = condition;
    if (ward)      filter.ward       = ward;
    if (search)    filter.name       = { $regex: search, $options: 'i' };

    const patients = await Patient.find(filter)
      .populate('assignedDoctor', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: patients.length, data: patients });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/patients/:id ────────────────────────────────────────────────────
exports.getPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedDoctor', 'name email role');
    if (!patient) return next(new AppError('Patient not found.', 404));
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/patients ───────────────────────────────────────────────────────
exports.createPatient = async (req, res, next) => {
  try {
    const patient = await Patient.create(req.body);
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/patients/:id ──────────────────────────────────────────────────
exports.updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!patient) return next(new AppError('Patient not found.', 404));
    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/patients/:id — soft delete ───────────────────────────────────
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!patient) return next(new AppError('Patient not found.', 404));
    res.status(200).json({ success: true, message: 'Patient deactivated.' });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/patients/:id/vitals ────────────────────────────────────────────
// Records new vitals reading, calls AI for risk prediction, fires alerts
exports.recordVitals = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new AppError('Patient not found.', 404));

    // Call AI microservice for risk prediction
    let predictedRisk = 'low';
    let aiFlags       = {};
    try {
      const aiResult = await aiService.predictRisk({
        heartRate:       req.body.heartRate,
        spo2:            req.body.spo2,
        bpSystolic:      req.body.bpSystolic,
        bpDiastolic:     req.body.bpDiastolic,
        age:             patient.age,
        condition:       patient.condition,
        isPostSurgery:   patient.isPostSurgery,
      });
      predictedRisk = aiResult.risk;
      aiFlags       = aiResult.flags;
    } catch (aiError) {
      // AI service failure should NOT block vitals recording
      console.warn('AI service unavailable, using rule-based fallback:', aiError.message);
      // Rule-based fallback
      if (req.body.heartRate > 115 || req.body.spo2 < 90) predictedRisk = 'high';
      else if (req.body.heartRate > 100 || req.body.spo2 < 94) predictedRisk = 'medium';
      aiFlags = {
        hrAlert:   req.body.heartRate > 100,
        spo2Alert: req.body.spo2 < 94,
        bpAlert:   req.body.bpSystolic > 140,
      };
    }

    // Persist vitals
    const vitals = await Vitals.create({
      patient:       patient._id,
      predictedRisk,
      aiFlags,
      ...req.body,
    });

    // Update patient risk level
    await Patient.findByIdAndUpdate(patient._id, {
      riskLevel:  predictedRisk,
      riskScore:  vitals.heartRate, // simplified proxy
    });

    // Auto-create alerts for critical flags
    const alertsToCreate = [];
    if (aiFlags.hrAlert) {
      alertsToCreate.push({
        patient:  patient._id,
        type:     'hr_high',
        severity: req.body.heartRate > 115 ? 'critical' : 'warning',
        message:  `Heart rate at ${req.body.heartRate} bpm — above safe threshold.`,
      });
    }
    if (aiFlags.spo2Alert) {
      alertsToCreate.push({
        patient:  patient._id,
        type:     'spo2_low',
        severity: req.body.spo2 < 90 ? 'critical' : 'warning',
        message:  `SpO₂ at ${req.body.spo2}% — oxygen support may be required.`,
      });
    }
    if (alertsToCreate.length) await Alert.insertMany(alertsToCreate);

    // Emit to connected sockets (done via global io injected in server.js)
    const io = req.app.get('io');
    if (io) {
      io.emit('vitals:update', { patientId: patient._id, vitals, predictedRisk, aiFlags });
      alertsToCreate.forEach(a => io.emit('alert:new', a));
    }

    res.status(201).json({ success: true, data: vitals, predictedRisk, aiFlags });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/patients/:id/vitals ─────────────────────────────────────────────
exports.getVitals = async (req, res, next) => {
  try {
    const limit   = parseInt(req.query.limit) || 50;
    const vitals  = await Vitals.find({ patient: req.params.id })
      .sort({ recordedAt: -1 })
      .limit(limit);
    res.status(200).json({ success: true, count: vitals.length, data: vitals });
  } catch (error) {
    next(error);
  }
};
