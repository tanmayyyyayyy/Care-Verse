// backend/routes/patientRoutes.js
const express = require('express');
const {
  getAllPatients, getPatient, createPatient,
  updatePatient, deletePatient, recordVitals, getVitals,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect); // All patient routes require login

router.route('/')
  .get(getAllPatients)
  .post(authorize('admin', 'doctor'), createPatient);

router.route('/:id')
  .get(getPatient)
  .patch(authorize('admin', 'doctor'), updatePatient)
  .delete(authorize('admin'), deletePatient);

router.route('/:id/vitals')
  .get(getVitals)
  .post(recordVitals); // All logged-in staff can record vitals

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────

// backend/routes/transferRoutes.js  (inline export below)
