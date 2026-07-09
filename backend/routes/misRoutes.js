import express from 'express';
import { getCustomerMIS, exportCustomerMISExcel, exportCustomerMISPdf } from '../controllers/misController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary/:customerId', requireAuth, getCustomerMIS);
router.get('/export/:customerId/excel', requireAuth, exportCustomerMISExcel);
router.get('/export/:customerId/pdf', requireAuth, exportCustomerMISPdf);

export default router;
