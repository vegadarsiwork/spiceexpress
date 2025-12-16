// Get all invoices (not just unpaid)
export const getAllInvoices = async (req, res) => {
  let filter = {};
  if (req.user && req.user.role !== 'admin') {
    const lrs = await LR.find({ company: req.user.company }).select('_id');
    const lrIds = lrs.map(lr => lr._id);
    filter.lrList = { $in: lrIds };
  }
  const invoices = await Invoice.find(filter).populate('lrList');
  res.json(invoices);
};

// Get invoice by ID (details)
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Invoice id is required' });
    }
    let invoice = await Invoice.findById(id).populate('lrList').lean();
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    // If user, restrict access to their company only
    if (req.user && req.user.role !== 'admin') {
      const lrs = await LR.find({ company: req.user.company }).select('_id');
      const lrIds = lrs.map(lr => lr._id.toString());
      const invoiceLrIds = (invoice.lrList || []).map(lr => lr._id?.toString());
      const hasAccess = invoiceLrIds.some(id => lrIds.includes(id));
      if (!hasAccess) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    res.json(invoice);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get invoice', details: error.message });
  }
};
import Invoice from '../models/Invoice.js';
import LR from '../models/LR.js';
import Customer from '../models/Customer.js';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';

// Export Invoice Annexure as Excel with LR breakdown
export const exportInvoiceAnnexure = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Invoice id is required' });
    }

    const invoice = await Invoice.findById(id).populate('lrList').lean();
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const customer = await Customer.findOne({ code: invoice.customerCode }).lean();
    const lrs = invoice.lrList || [];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Invoice Annexure');

    // Define columns matching the reference format
    const columns = [
      { header: 'Sr. No', key: 'srNo', width: 8 },
      { header: 'Blkg Date', key: 'blkgDate', width: 12 },
      { header: 'LR Number', key: 'lrNumber', width: 18 },
      { header: 'LR Type', key: 'lrType', width: 10 },
      { header: 'Source', key: 'source', width: 12 },
      { header: 'Destination', key: 'destination', width: 12 },
      { header: 'Consignor Name', key: 'consignorName', width: 20 },
      { header: 'Consignee Name', key: 'consigneeName', width: 20 },
      { header: 'No of Packages', key: 'packages', width: 12 },
      { header: 'Actual Weight', key: 'actualWeight', width: 12 },
      { header: 'Charge Weight', key: 'chargeWeight', width: 12 },
      { header: 'Customer Invoice', key: 'customerInvoice', width: 15 },
      { header: 'Declared Customer Invoice Value', key: 'invoiceValue', width: 18 },
      { header: 'Rate Per Kg', key: 'ratePerKg', width: 12 },
      { header: 'Base Freight', key: 'baseFreight', width: 12 },
      { header: 'Docket Charge', key: 'docketCharge', width: 12 },
      { header: 'Pickup Charges', key: 'pickupCharges', width: 12 },
      { header: 'Door Delivery', key: 'doorDelivery', width: 12 },
      { header: 'OPA / ODA', key: 'opaOda', width: 10 },
      { header: 'Handling Charges', key: 'handlingCharges', width: 14 },
      { header: 'Liability (Owner/Carrier Risk)', key: 'liability', width: 18 },
      { header: 'Other Charges', key: 'otherCharges', width: 12 },
      { header: 'Pre Tax Billing Amount', key: 'preTaxAmount', width: 18 },
      { header: 'GST Amount', key: 'gstAmount', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
    ];
    sheet.columns = columns;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    headerRow.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

    // Add data rows
    let srNo = 1;
    for (const lr of lrs) {
      const charges = lr.charges || {};
      const shipment = lr.shipmentDetails || {};
      const chargedWeight = shipment.chargedWeight || 0;
      const freight = charges.freight || 0;
      const ratePerKg = chargedWeight > 0 ? +(freight / chargedWeight).toFixed(2) : 0;
      const liability = (charges.carrierRisk || 0) + (charges.ownerRisk || 0);
      const otherCharges = (charges.insurance || 0) + (charges.fuelSurcharge || 0) + (charges.commission || 0) + (charges.other || 0);
      const preTaxAmount = freight + (charges.docketCharge || 0) + (charges.pickupCharge || 0) +
        (charges.doorDeliveryCharge || 0) + (charges.handlingCharge || 0) +
        (charges.transhipmentCharge || 0) + liability + otherCharges;
      const gstAmount = charges.gstCharge || 0;
      const total = charges.total || (preTaxAmount + gstAmount);

      sheet.addRow({
        srNo: srNo++,
        blkgDate: lr.bookingDate ? new Date(lr.bookingDate).toLocaleDateString('en-IN') : '',
        lrNumber: lr.lrNumber || '',
        lrType: 'TBB (M)', // Default type
        source: lr.consignor?.city || '',
        destination: lr.consignee?.city || '',
        consignorName: lr.consignor?.name || '',
        consigneeName: lr.consignee?.name || '',
        packages: shipment.numberOfArticles || 1,
        actualWeight: shipment.actualWeight || 0,
        chargeWeight: chargedWeight,
        customerInvoice: lr.customerInvoice?.number || '',
        invoiceValue: lr.customerInvoice?.value || 0,
        ratePerKg,
        baseFreight: freight,
        docketCharge: charges.docketCharge || 0,
        pickupCharges: charges.pickupCharge || 0,
        doorDelivery: charges.doorDeliveryCharge || 0,
        opaOda: charges.transhipmentCharge || 0,
        handlingCharges: charges.handlingCharge || 0,
        liability,
        otherCharges,
        preTaxAmount,
        gstAmount,
        total,
      });
    }

    // Add totals row
    const totalsRow = sheet.addRow({
      srNo: 'Total',
      packages: lrs.reduce((sum, lr) => sum + (lr.shipmentDetails?.numberOfArticles || 1), 0),
      actualWeight: lrs.reduce((sum, lr) => sum + (lr.shipmentDetails?.actualWeight || 0), 0),
      chargeWeight: lrs.reduce((sum, lr) => sum + (lr.shipmentDetails?.chargedWeight || 0), 0),
      invoiceValue: lrs.reduce((sum, lr) => sum + (lr.customerInvoice?.value || 0), 0),
      baseFreight: lrs.reduce((sum, lr) => sum + (lr.charges?.freight || 0), 0),
      docketCharge: lrs.reduce((sum, lr) => sum + (lr.charges?.docketCharge || 0), 0),
      pickupCharges: lrs.reduce((sum, lr) => sum + (lr.charges?.pickupCharge || 0), 0),
      doorDelivery: lrs.reduce((sum, lr) => sum + (lr.charges?.doorDeliveryCharge || 0), 0),
      opaOda: lrs.reduce((sum, lr) => sum + (lr.charges?.transhipmentCharge || 0), 0),
      handlingCharges: lrs.reduce((sum, lr) => sum + (lr.charges?.handlingCharge || 0), 0),
      liability: lrs.reduce((sum, lr) => sum + (lr.charges?.carrierRisk || 0) + (lr.charges?.ownerRisk || 0), 0),
      otherCharges: lrs.reduce((sum, lr) => sum + (lr.charges?.insurance || 0) + (lr.charges?.fuelSurcharge || 0) + (lr.charges?.commission || 0) + (lr.charges?.other || 0), 0),
      preTaxAmount: lrs.reduce((sum, lr) => {
        const c = lr.charges || {};
        return sum + (c.freight || 0) + (c.docketCharge || 0) + (c.pickupCharge || 0) +
          (c.doorDeliveryCharge || 0) + (c.handlingCharge || 0) + (c.transhipmentCharge || 0) +
          (c.carrierRisk || 0) + (c.ownerRisk || 0) + (c.insurance || 0) + (c.fuelSurcharge || 0) + (c.commission || 0) + (c.other || 0);
      }, 0),
      gstAmount: lrs.reduce((sum, lr) => sum + (lr.charges?.gstCharge || 0), 0),
      total: lrs.reduce((sum, lr) => sum + (lr.charges?.total || 0), 0),
    });
    totalsRow.font = { bold: true };
    totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const customerName = customer?.company || invoice.customerCode || 'Customer';
    const fileName = `Invoice_Annexure_${invoice.invoiceNumber}_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to export invoice annexure', details: error.message });
  }
};

export const createInvoice = async (req, res) => {
  const {
    customerCode,
    lrList,
    invoiceNo,
    invoiceDate,
    dueDate,
    billingOU,
    companyCode, // 11=SPICE, 12=ASIAN
    poNumber,
    hsn,
    freightValue,
    gstPercent
  } = req.body;

  if (!customerCode || !String(customerCode).trim()) {
    return res.status(400).json({ error: 'customerCode is required' });
  }
  if (!Array.isArray(lrList) || lrList.length === 0) {
    return res.status(400).json({ error: 'lrList is required and must contain at least one LR id' });
  }

  // Get company details based on companyCode
  const { getCompany } = await import('../config/companies.js');
  const company = getCompany(companyCode || '11');

  const lrs = await LR.find({ _id: { $in: lrList } });

  // Sum LR charges.total for invoice
  const totalLrAmount = lrs.reduce((sum, lr) => sum + (lr.charges?.total || 0), 0);
  const freight = Number(freightValue || 0);
  const gst = Number(gstPercent || 0);
  // split GST equally into CGST and SGST for domestic
  const gstAmount = +(freight * (gst / 100));
  const cgst = +(gstAmount / 2);
  const sgst = +(gstAmount / 2);
  const totalAmount = +(totalLrAmount + freight + gstAmount);

  const invoice = await Invoice.create({
    invoiceNumber: `INV-${Date.now()}`,
    invoiceNo,
    companyCode: companyCode || '11',
    customerCode,
    lrList,
    invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
    dueDate: dueDate ? new Date(dueDate) : undefined,
    billingOU,
    supplierName: company.name,
    supplierGstin: company.gstin,
    billingAddress: company.address,
    poNumber,
    hsn: hsn || company.hsnCode,
    freightValue: freight,
    cgst,
    sgst,
    totalAmount,
    date: new Date()
  });

  res.status(201).json(invoice);
};

export const getUnpaidInvoices = async (req, res) => {
  let filter = { status: 'unpaid' };
  // Only admins see all invoices; users see only their company's invoices
  if (req.user && req.user.role !== 'admin') {
    // Find all LRs for this company
    const lrs = await LR.find({ company: req.user.company }).select('_id');
    const lrIds = lrs.map(lr => lr._id);
    filter.lrList = { $in: lrIds };
  }
  const invoices = await Invoice.find(filter).populate('lrList');
  res.json(invoices);
};

export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Invoice id is required' });
    }

    const invoice = await Invoice.findById(id).populate('lrList').lean();
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const customer = await Customer.findOne({ code: invoice.customerCode }).lean();

    // Get company based on stored companyCode
    const { getCompany } = await import('../config/companies.js');
    const company = getCompany(invoice.companyCode || '11');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.resolve(__dirname, '../views/invoice-template.ejs');

    // Read logo and convert to base64 for embedding in PDF
    const fs = await import('fs');
    let logoBase64 = '';
    try {
      // Remove leading slash from logoPath to make it relative
      const relativeLogoPath = company.logoPath.replace(/^\//, '');
      const logoPath = path.resolve(__dirname, '../public', relativeLogoPath);
      const logoBuffer = fs.readFileSync(logoPath);
      const ext = company.logoPath.endsWith('.jpg') ? 'jpeg' : 'png';
      logoBase64 = `data:image/${ext};base64,${logoBuffer.toString('base64')}`;
    } catch (e) {
      console.warn('Could not load logo:', e.message);
    }

    const html = await ejs.renderFile(templatePath, {
      invoice,
      customer: customer || {},
      lrs: invoice.lrList || [],
      company,
      logoBase64,
    });

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceNumber || id}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate invoice PDF', details: error.message });
  }
};
