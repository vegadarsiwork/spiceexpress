import express from 'express';
import { getAllCustomers, createCustomer, getCustomerSummary, getCustomerById, updateCustomer, deleteCustomer } from '../controllers/customerController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getAllCustomers);
router.post('/', requireAuth, requireRole(['admin']), createCustomer);
router.get('/:id', requireAuth, getCustomerById);
router.put('/:id', requireAuth, requireRole(['admin']), updateCustomer);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteCustomer);
router.get('/:id/summary', requireAuth, getCustomerSummary);

export default router;
