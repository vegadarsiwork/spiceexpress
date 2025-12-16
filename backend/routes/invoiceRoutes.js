import express from 'express';
import { createInvoice, getUnpaidInvoices, downloadInvoice, getAllInvoices, getInvoiceById, exportInvoiceAnnexure } from '../controllers/invoiceController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, createInvoice);
router.get('/unpaid', requireAuth, getUnpaidInvoices);
router.get('/', requireAuth, getAllInvoices);
router.get('/:id', requireAuth, getInvoiceById);
router.get('/:id/download', requireAuth, downloadInvoice);
router.get('/:id/annexure', requireAuth, exportInvoiceAnnexure);

export default router;
