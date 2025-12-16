import express from 'express';
import { getCustomerMIS, exportCustomerMISExcel, exportCustomerMISPdf } from '../controllers/misController.js';

const router = express.Router();

router.get('/summary/:customerId', getCustomerMIS);
router.get('/export/:customerId/excel', exportCustomerMISExcel);
router.get('/export/:customerId/pdf', exportCustomerMISPdf);

export default router;
