import {
  createCustomer as createCustomerRecord,
  disableCustomer,
  findCustomerById,
  getCustomerSummary as getCustomerSummaryRecord,
  listCustomers,
  updateCustomer as updateCustomerRecord,
} from '../lib/repositories/customersRepository.js';

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await findCustomerById(id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('Fetch customer error:', err);
    res.status(400).json({ error: 'Failed to fetch customer' });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await updateCustomerRecord(id, req.body || {});
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(400).json({ error: 'Failed to update customer' });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    res.json(await listCustomers());
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { company, name, code } = req.body || {};
    if (!company && !name) {
      return res.status(400).json({ error: 'Company or name is required' });
    }
    const customer = await createCustomerRecord(req.body || {});
    res.status(201).json(customer);
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(400).json({ error: 'Failed to add customer' });
  }
};

export const getCustomerSummary = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Customer id is required' });
    }

    const summary = await getCustomerSummaryRecord(id);
    if (!summary) return res.status(404).json({ error: 'Customer not found' });

    return res.json(summary);
  } catch (error) {
    console.error('Customer summary error:', error);
    return res.status(500).json({ error: 'Failed to get customer summary' });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await disableCustomer(id);
    if (!deleted) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer disabled successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(400).json({ error: 'Failed to delete customer' });
  }
};
