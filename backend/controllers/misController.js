import Customer from '../models/Customer.js';
import LR from '../models/LR.js';
import Invoice from '../models/Invoice.js';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GET /api/mis/summary/:customerId
export const getCustomerMIS = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) return res.status(400).json({ error: 'Customer id is required' });
    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // LRs - search by customer ObjectId reference
    const lrs = await LR.find({ customer: customerId }).sort({ bookingDate: -1 }).lean();
    // Invoices
    const invoices = await Invoice.find({ customerCode: customer.code }).sort({ date: -1 }).lean();

    // Summary
    const totalOrders = lrs.length;
    const totalSpent = lrs.reduce((sum, lr) => sum + (lr.charges?.total || 0), 0);
    const lastOrderDate = lrs[0]?.bookingDate || null;
    const delivered = lrs.filter(lr => lr.status === 'Delivered').length;
    const pending = lrs.filter(lr => lr.status === 'Booked').length;
    const inTransit = lrs.filter(lr => lr.status === 'In Transit').length;
    const cancelled = lrs.filter(lr => lr.status === 'Cancelled').length;

    res.json({
      customer,
      totalOrders,
      totalSpent,
      lastOrderDate,
      delivered,
      pending,
      inTransit,
      cancelled,
      lrs,
      invoices
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load MIS', details: err.message });
  }
};

// GET /api/mis/export/:customerId/excel
export const exportCustomerMISExcel = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) return res.status(400).json({ error: 'Customer id is required' });

    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const lrs = await LR.find({ customer: customerId }).sort({ bookingDate: -1 }).lean();

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Spice Express';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Client MIS');

    // Yellow header styling (matching reference)
    const headerStyle = {
      font: { bold: true, size: 9 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Define all columns matching reference format
    const columns = [
      { header: 'Sr. No', key: 'srNo', width: 6 },
      { header: 'Blkg Date', key: 'bookingDate', width: 12 },
      { header: 'LR Number', key: 'lrNumber', width: 18 },
      { header: 'LR Type', key: 'lrType', width: 10 },
      { header: 'Source', key: 'source', width: 12 },
      { header: 'Destination', key: 'destination', width: 12 },
      { header: 'Consignor Name', key: 'consignorName', width: 20 },
      { header: 'Consignee Name', key: 'consigneeName', width: 20 },
      { header: 'No of Packages', key: 'packages', width: 10 },
      { header: 'Actual Weight', key: 'actualWeight', width: 10 },
      { header: 'Charge Weight', key: 'chargedWeight', width: 10 },
      { header: 'Customer Invoice', key: 'customerInvoice', width: 12 },
      { header: 'Declared Customer Invoice Value', key: 'declaredInvoiceValue', width: 14 },
      { header: 'Rate Per Kg', key: 'ratePerKg', width: 10 },
      { header: 'Base Freight', key: 'freight', width: 12 },
      { header: 'Docket Charge', key: 'docketCharge', width: 10 },
      { header: 'Pickup Charges', key: 'pickupCharge', width: 10 },
      { header: 'Door Delivery', key: 'doorDelivery', width: 10 },
      { header: 'OPA / ODA', key: 'opaOda', width: 10 },
      { header: 'Handling Charges', key: 'handlingCharge', width: 10 },
      { header: 'Liability (Owner/ Carrier Risk)', key: 'riskCharges', width: 12 },
      { header: 'Other Charges', key: 'otherCharges', width: 10 },
      { header: 'Pre Tax Billing Amount', key: 'preTaxAmount', width: 14 },
      { header: 'GST Amount', key: 'gstAmount', width: 10 },
      { header: 'Charge Total', key: 'total', width: 12 },
      { header: 'Delivery Status', key: 'status', width: 12 },
      { header: 'EWayBill No', key: 'ewayBillNumber', width: 18 },
      { header: 'Delivery Remarks', key: 'remarks', width: 15 },
    ];

    worksheet.columns = columns;

    // Add header row at row 1
    const headerRow = worksheet.getRow(1);
    headerRow.values = columns.map(c => c.header);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });

    // Data row styling
    const dataStyle = {
      font: { size: 9 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Add data rows
    let totalPackages = 0, totalActualWeight = 0, totalChargedWeight = 0;
    let totalFreight = 0, totalDocket = 0, totalPickup = 0, totalDoorDelivery = 0;
    let totalHandling = 0, totalRisk = 0, totalOther = 0, totalPreTax = 0, totalGst = 0, totalAmount = 0;

    lrs.forEach((lr, index) => {
      const freight = lr.charges?.freight || 0;
      const docketCharge = lr.charges?.docketCharge || 0;
      const pickupCharge = lr.charges?.pickupCharge || 0;
      const doorDelivery = lr.charges?.doorDeliveryCharge || 0;
      const handlingCharge = lr.charges?.handlingCharge || 0;
      const riskCharges = (lr.charges?.carrierRisk || 0) + (lr.charges?.ownerRisk || 0);
      const otherCharges = (lr.charges?.other || 0) + (lr.charges?.transhipmentCharge || 0) + (lr.charges?.fuelSurcharge || 0) + (lr.charges?.insurance || 0);
      const gstAmount = lr.charges?.gstCharge || 0;
      const preTaxAmount = freight + docketCharge + pickupCharge + doorDelivery + handlingCharge + riskCharges + otherCharges;
      const total = lr.charges?.total || (preTaxAmount + gstAmount);
      const packages = lr.shipmentDetails?.numberOfArticles || 0;
      const actualWeight = lr.shipmentDetails?.actualWeight || 0;
      const chargedWeight = lr.shipmentDetails?.chargedWeight || 0;

      // Accumulate totals
      totalPackages += packages;
      totalActualWeight += actualWeight;
      totalChargedWeight += chargedWeight;
      totalFreight += freight;
      totalDocket += docketCharge;
      totalPickup += pickupCharge;
      totalDoorDelivery += doorDelivery;
      totalHandling += handlingCharge;
      totalRisk += riskCharges;
      totalOther += otherCharges;
      totalPreTax += preTaxAmount;
      totalGst += gstAmount;
      totalAmount += total;

      const row = worksheet.addRow({
        srNo: index + 1,
        bookingDate: lr.bookingDate ? new Date(lr.bookingDate).toLocaleDateString('en-IN') : '',
        lrNumber: lr.lrNumber || '',
        lrType: lr.charges?.paymentType || 'TBD',
        source: lr.consignor?.city || '',
        destination: lr.consignee?.city || '',
        consignorName: lr.consignor?.name || '',
        consigneeName: lr.consignee?.name || '',
        packages: packages,
        actualWeight: actualWeight,
        chargedWeight: chargedWeight,
        customerInvoice: lr.customerInvoice?.number || '',
        declaredInvoiceValue: lr.customerInvoice?.value || 0,
        ratePerKg: chargedWeight > 0 ? (freight / chargedWeight).toFixed(2) : 0,
        freight: freight,
        docketCharge: docketCharge,
        pickupCharge: pickupCharge,
        doorDelivery: doorDelivery,
        opaOda: 0,
        handlingCharge: handlingCharge,
        riskCharges: riskCharges,
        otherCharges: otherCharges,
        preTaxAmount: preTaxAmount,
        gstAmount: gstAmount,
        total: total,
        status: lr.status || '',
        ewayBillNumber: lr.ewayBillNumber || '',
        remarks: '',
      });

      row.eachCell((cell) => {
        cell.font = dataStyle.font;
        cell.alignment = dataStyle.alignment;
        cell.border = dataStyle.border;
      });
    });

    // Add totals row with yellow background
    const totalsRow = worksheet.addRow({
      srNo: '',
      bookingDate: 'Total',
      lrNumber: '',
      lrType: '',
      source: '',
      destination: '',
      consignorName: '',
      consigneeName: '',
      packages: totalPackages,
      actualWeight: totalActualWeight,
      chargedWeight: totalChargedWeight,
      customerInvoice: '',
      declaredInvoiceValue: '',
      ratePerKg: '',
      freight: totalFreight,
      docketCharge: totalDocket,
      pickupCharge: totalPickup,
      doorDelivery: totalDoorDelivery,
      opaOda: 0,
      handlingCharge: totalHandling,
      riskCharges: totalRisk,
      otherCharges: totalOther,
      preTaxAmount: totalPreTax,
      gstAmount: totalGst,
      total: totalAmount,
      status: '',
      ewayBillNumber: '',
      remarks: '',
    });
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true, size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MIS_${customer.code || customerId}_${new Date().toISOString().slice(0, 10)}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export Excel', details: err.message });
  }
};

// GET /api/mis/export/:customerId/pdf
export const exportCustomerMISPdf = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) return res.status(400).json({ error: 'Customer id is required' });

    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const lrs = await LR.find({ customer: customerId }).sort({ bookingDate: -1 }).lean();
    const invoices = await Invoice.find({ customerCode: customer.code }).sort({ date: -1 }).lean();

    // Calculate totals
    const totalOrders = lrs.length;
    const totalFreight = lrs.reduce((sum, lr) => sum + (lr.charges?.freight || 0), 0);
    const totalAmount = lrs.reduce((sum, lr) => sum + (lr.charges?.total || 0), 0);

    const templatePath = path.resolve(__dirname, '../views/mis-template.ejs');
    const html = await ejs.renderFile(templatePath, {
      customer,
      lrs,
      invoices,
      totalOrders,
      totalFreight,
      totalAmount,
      generatedDate: new Date().toLocaleDateString('en-IN'),
    });

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MIS_${customer.code || customerId}_${new Date().toISOString().slice(0, 10)}.pdf"`);
    return res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Failed to export PDF', details: err.message });
  }
};
