import LR from '../models/LR.js';
import mongoose from 'mongoose';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

export const createLR = async (req, res) => {
  try {
    // Parse and map nested fields for new schema
    const body = req.body;
    // Consignor (Sender) - use nested structure from frontend
    const consignor = {
      name: body.consignor?.name || '',
      address: body.consignor?.address || '',
      state: body.consignor?.state || '',
      city: body.consignor?.city || '',
      pin: body.consignor?.pin || '',
      phone: body.consignor?.phone || '',
      email: body.consignor?.email || '',
      gstin: body.consignor?.gstin || ''
    };
    // Consignee (Receiver) - use nested structure from frontend
    const consignee = {
      name: body.consignee?.name || '',
      address: body.consignee?.address || '',
      state: body.consignee?.state || '',
      city: body.consignee?.city || '',
      pin: body.consignee?.pin || '',
      phone: body.consignee?.phone || '',
      email: body.consignee?.email || '',
      gstin: body.consignee?.gstin || ''
    };
    // Shipment Details - read from nested structure sent by frontend
    const shipmentDetails = {
      numberOfArticles: body.shipmentDetails?.numberOfArticles ?? body.numberOfArticles,
      actualWeight: body.shipmentDetails?.actualWeight ?? body.actualWeight,
      chargedWeight: body.shipmentDetails?.chargedWeight ?? body.chargedWeight,
      descriptionOfGoods: body.shipmentDetails?.descriptionOfGoods ?? body.descriptionOfGoods
    };
    // Charges
    const charges = {
      paymentType: body.charges?.paymentType,
      freight: body.charges?.freight,
      docketCharge: body.charges?.docketCharge,
      doorDeliveryCharge: body.charges?.doorDeliveryCharge,
      handlingCharge: body.charges?.handlingCharge,
      pickupCharge: body.charges?.pickupCharge,
      transhipmentCharge: body.charges?.transhipmentCharge,
      insurance: body.charges?.insurance,
      fuelSurcharge: body.charges?.fuelSurcharge,
      commission: body.charges?.commission,
      other: body.charges?.other,
      carrierRisk: body.charges?.carrierRisk,
      ownerRisk: body.charges?.ownerRisk,
      gstCharge: body.charges?.gstCharge,
      total: body.charges?.total
    };
    // Customer Invoice
    const customerInvoice = {
      number: body.invoiceNumber,
      date: body.invoiceDate,
      value: body.invoiceValue
    };

    // Generate LR number if not provided
    let lrNumber = body.lrNumber;
    if (!lrNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const count = await LR.countDocuments({
        bookingDate: {
          $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        }
      });
      lrNumber = `${year}${month}${day}${String(count + 1).padStart(2, '0')}`;
    }

    // Compose LR object
    const lrData = {
      lrNumber,
      bookingDate: body.bookingDate || new Date(),
      status: body.status || 'Booked',
      customer: body.customer,
      dispatchBranch: body.dispatchBranch,
      vehicleNumber: body.vehicleNumber,
      driverName: body.driverName,
      consignor,
      consignee,
      shipmentDetails,
      charges,
      ewayBillNumber: body.ewayBillNumber,
      customerInvoice,
      podDocumentUrl: body.podDocumentUrl,
      company: req.user && req.user.company ? req.user.company : undefined
    };

    const lr = await LR.create(lrData);
    res.status(201).json(lr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create LR', details: error.message });
  }
};

export const getLRs = async (req, res) => {
  try {
    const { customerCode, fromDate, toDate } = req.query;
    const filter = {};
    // Only admins can see all LRs. Users see only their company's LRs.
    if (req.user && req.user.role !== 'admin') {
      if (req.user.company) {
        filter['company'] = req.user.company;
      } else {
        return res.status(403).json({ error: 'No company assigned to user' });
      }
    }
    if (customerCode) filter.customerCode = customerCode;
    if (fromDate && toDate) {
      filter.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const lrs = await LR.find(filter).sort({ date: -1 });
    res.json(lrs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get LRs', details: error.message });
  }
};

export const getLRById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'LR id is required' });
    }

    const lr = await LR.findById(id).lean();
    if (!lr) {
      return res.status(404).json({ error: 'LR not found' });
    }

    return res.json(lr);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get LR', details: error.message });
  }
};

export const downloadLR = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'LR id is required' });
    }

    const lr = await LR.findById(id).lean();
    if (!lr) {
      return res.status(404).json({ error: 'LR not found' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.resolve(__dirname, '../views/lr-template.ejs');

    // Read logo and convert to base64 for embedding
    const fs = await import('fs');
    const logoPath = path.resolve(__dirname, '../public/uploads/logos/spice-logo.png');
    let logoBase64 = '';
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (e) {
      console.warn('Could not load logo:', e.message);
    }

    const html = await ejs.renderFile(templatePath, {
      lr,
      logoBase64,
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="lr-${lr.lrNumber || id}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate LR PDF', details: error.message });
  }
};

export const getLrCount = async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.query;
    const filter = {};

    if (customerId) {
      filter.customerCode = customerId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const count = await LR.countDocuments(filter);
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get LR count', details: error.message });
  }
};

export const updateLR = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'LR id is required' });
    }
    const lr = await LR.findById(id);
    if (!lr) {
      return res.status(404).json({ error: 'LR not found' });
    }

    // Support updates coming either as nested objects (consignor/consignee)
    // or legacy flat fields like senderName/receiverName. Merge them into
    // the LR document so later validation uses the nested schema.
    const body = req.body || {};

    // Merge nested consignor/consignee objects if provided
    if (body.consignor && typeof body.consignor === 'object') {
      lr.consignor = { ...(lr.consignor ? lr.consignor.toObject ? lr.consignor.toObject() : lr.consignor : {}), ...body.consignor };
    }
    if (body.consignee && typeof body.consignee === 'object') {
      lr.consignee = { ...(lr.consignee ? lr.consignee.toObject ? lr.consignee.toObject() : lr.consignee : {}), ...body.consignee };
    }

    // Map legacy flat fields into nested objects
    if (body.senderName) lr.consignor = { ...(lr.consignor || {}), name: body.senderName };
    if (body.senderAddress) lr.consignor = { ...(lr.consignor || {}), address: body.senderAddress };
    if (body.senderCity) lr.consignor = { ...(lr.consignor || {}), city: body.senderCity };
    if (body.senderPin) lr.consignor = { ...(lr.consignor || {}), pin: body.senderPin };
    if (body.senderPhone) lr.consignor = { ...(lr.consignor || {}), phone: body.senderPhone };

    if (body.receiverName) lr.consignee = { ...(lr.consignee || {}), name: body.receiverName };
    if (body.receiverAddress) lr.consignee = { ...(lr.consignee || {}), address: body.receiverAddress };
    if (body.receiverCity) lr.consignee = { ...(lr.consignee || {}), city: body.receiverCity };
    if (body.receiverPin) lr.consignee = { ...(lr.consignee || {}), pin: body.receiverPin };
    if (body.receiverPhone) lr.consignee = { ...(lr.consignee || {}), phone: body.receiverPhone };

    // Map other updatable fields that exist on the new schema
    if (body.status !== undefined) lr.status = body.status;
    if (body.customer !== undefined) lr.customer = body.customer;
    if (body.dispatchBranch !== undefined) lr.dispatchBranch = body.dispatchBranch;
    if (body.vehicleNumber !== undefined) lr.vehicleNumber = body.vehicleNumber;
    if (body.driverName !== undefined) lr.driverName = body.driverName;

    // Shipment details
    if (body.shipmentDetails && typeof body.shipmentDetails === 'object') {
      lr.shipmentDetails = { ...(lr.shipmentDetails ? lr.shipmentDetails.toObject ? lr.shipmentDetails.toObject() : lr.shipmentDetails : {}), ...body.shipmentDetails };
    }
    if (body.actualWeight !== undefined) {
      lr.shipmentDetails = { ...(lr.shipmentDetails || {}), actualWeight: body.actualWeight };
    }
    if (body.chargedWeight !== undefined) {
      lr.shipmentDetails = { ...(lr.shipmentDetails || {}), chargedWeight: body.chargedWeight };
    }
    if (body.descriptionOfGoods !== undefined) {
      lr.shipmentDetails = { ...(lr.shipmentDetails || {}), descriptionOfGoods: body.descriptionOfGoods };
    }

    // Charges and invoice (merge if present)
    if (body.charges && typeof body.charges === 'object') {
      lr.charges = { ...(lr.charges ? lr.charges.toObject ? lr.charges.toObject() : lr.charges : {}), ...body.charges };
    }
    if (body.customerInvoice && typeof body.customerInvoice === 'object') {
      lr.customerInvoice = { ...(lr.customerInvoice ? lr.customerInvoice.toObject ? lr.customerInvoice.toObject() : lr.customerInvoice : {}), ...body.customerInvoice };
    }

    // Auto-calculate amount if not provided but rate/chargedWeight are present
    const amt = lr.charges && lr.charges.grandTotal !== undefined ? lr.charges.grandTotal : undefined;
    const chargedWeight = lr.shipmentDetails && lr.shipmentDetails.chargedWeight !== undefined ? Number(lr.shipmentDetails.chargedWeight) : NaN;
    const rate = lr.charges && lr.charges.rate !== undefined ? Number(lr.charges.rate) : NaN;
    if ((amt === undefined || isNaN(Number(amt))) && !isNaN(chargedWeight) && !isNaN(rate) && rate > 0) {
      lr.charges = { ...(lr.charges || {}), grandTotal: chargedWeight * rate };
    }

    // Validate required fields against the new schema
    if (!lr.consignor || !lr.consignor.name) {
      return res.status(400).json({ error: 'Missing required field: consignor.name' });
    }
    if (!lr.consignee || !lr.consignee.name) {
      return res.status(400).json({ error: 'Missing required field: consignee.name' });
    }
    if (!lr.customer) {
      return res.status(400).json({ error: 'Missing required field: customer' });
    }
    // Weight validations if present
    if (lr.shipmentDetails && lr.shipmentDetails.actualWeight !== undefined && lr.shipmentDetails.actualWeight < 0) {
      return res.status(400).json({ error: 'Weight values must be positive' });
    }
    if (lr.shipmentDetails && lr.shipmentDetails.chargedWeight !== undefined && lr.shipmentDetails.chargedWeight < 0) {
      return res.status(400).json({ error: 'Weight values must be positive' });
    }

    await lr.save();
    return res.json(lr);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update LR', details: error.message });
  }
};

export const deleteLR = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'LR id is required' });
    }
    const lr = await LR.findById(id);
    if (!lr) {
      return res.status(404).json({ error: 'LR not found' });
    }
    await lr.deleteOne();
    return res.json({ message: 'LR deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete LR', details: error.message });
  }
};
