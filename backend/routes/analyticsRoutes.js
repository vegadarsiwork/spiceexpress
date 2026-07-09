import express from 'express';
import { getBusinessComparison } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/comparison', requireAuth, getBusinessComparison);

export default router;
