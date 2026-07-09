import express from 'express';
import { createAnnexure, getAnnexures } from '../controllers/annexureController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, createAnnexure);
router.get('/', requireAuth, getAnnexures);

export default router;
