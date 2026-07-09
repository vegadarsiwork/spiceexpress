import express from 'express';
import { createLR, getLRs, getLrCount, getLRById, trackLR, downloadLR, updateLR, deleteLR } from '../controllers/lrController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import upload from '../middleware/uploadImage.js';

const router = express.Router();

// Public tracking route - limited data only
router.get('/track/:id', trackLR);

// Specific named routes MUST come before parameterized /:id routes
router.get('/count', requireAuth, getLrCount);

// All other LR routes require authentication
router.post('/', requireAuth, upload.fields([
  { name: 'senderProfileImage', maxCount: 1 },
  { name: 'receiverProfileImage', maxCount: 1 }
]), createLR);
router.get('/', requireAuth, getLRs);
router.get('/:id/download', requireAuth, downloadLR);
router.get('/:id', requireAuth, getLRById);
router.put('/:id', requireAuth, updateLR);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteLR);

export default router;
