// backend/controllers/alertController.js

const { Alert }   = require('../models/index');
const { AppError } = require('../middleware/errorHandler');

// ── GET /api/alerts ──────────────────────────────────────────────────────────
exports.getAllAlerts = async (req, res, next) => {
  try {
    const { severity, type, acknowledged } = req.query;
    const filter = {};
    if (severity)     filter.severity         = severity;
    if (type)         filter.type             = type;
    if (acknowledged) filter.isAcknowledged   = acknowledged === 'true';

    const alerts = await Alert.find(filter)
      .populate('patient',  'name patientId')
      .populate('transfer', 'transferId fromWard toWard')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/alerts/:id/acknowledge ────────────────────────────────────────
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isAcknowledged: true, acknowledgedBy: req.user._id, acknowledgedAt: new Date() },
      { new: true }
    );
    if (!alert) return next(new AppError('Alert not found.', 404));

    const io = req.app.get('io');
    if (io) io.emit('alert:acknowledged', { alertId: alert._id });

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/alerts/:id/dismiss ────────────────────────────────────────────
exports.dismissAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isDismissed: true },
      { new: true }
    );
    if (!alert) return next(new AppError('Alert not found.', 404));
    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/alerts/summary ──────────────────────────────────────────────────
exports.getAlertSummary = async (req, res, next) => {
  try {
    const [critical, warning, info, resolved] = await Promise.all([
      Alert.countDocuments({ severity: 'critical', isDismissed: false }),
      Alert.countDocuments({ severity: 'warning',  isDismissed: false }),
      Alert.countDocuments({ severity: 'info',     isDismissed: false }),
      Alert.countDocuments({ isAcknowledged: true }),
    ]);
    res.status(200).json({ success: true, data: { critical, warning, info, resolved } });
  } catch (error) {
    next(error);
  }
};
