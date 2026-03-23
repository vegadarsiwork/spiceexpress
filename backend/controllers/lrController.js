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
      descriptionOfGoods: body.shipmentDetails?.descriptionOfGoods ?? body.descriptionOfGoods,
      declaredValue: body.shipmentDetails?.declaredValue ?? body.declaredValue, /* New Field */
      expectedDeliveryDate: body.shipmentDetails?.expectedDeliveryDate ?? body.expectedDeliveryDate /* New Field */
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

      // Determine prefix based on company code (11=SE, 12=ATL)
      const companyCode = body.companyCode || '11';
      const prefix = companyCode === '12' ? 'ATL' : 'SE';

      // Count LRs for this company in the current year
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year + 1, 0, 1);
      const count = await LR.countDocuments({
        lrNumber: { $regex: `^${prefix}${year}` }
      });

      // Format: PREFIX + YEAR + 3-digit sequence (e.g., SE2025001, ATL2025002)
      lrNumber = `${prefix}${year}${String(count + 1).padStart(3, '0')}`;
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

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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

    const isAsian = lr.lrNumber && lr.lrNumber.startsWith('ATL');
    const companyCode = isAsian ? '12' : '11';
    const { getCompany } = await import('../config/companies.js');
    const company = getCompany(companyCode);
    const companyName = company.name;
    const logoFormat = isAsian ? 'JPEG' : 'PNG';

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    let logoPath;
    if (isAsian) {
      logoPath = path.resolve(__dirname, `../public/uploads/logos/asian-logo.jpg`);
    } else {
      logoPath = path.resolve(__dirname, `../temp/spice-logo-bg.png`);
    }

    let logoDataUrl = null;
    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataUrl = `data:image/${logoFormat.toLowerCase()};base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Could not load logo:', e.message);
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // --- Helper function to draw an LR box ---
    const drawLRBox = (startY, isCopy = false) => {
      const boxHeight = 125; // Fixed height for each half-page box
      const contentWidth = pageWidth - (margin * 2);

      // Header Texts (above the box)
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const trackWebsite = company.website ? `TRACK @ ${company.website}` : `TRACK @ www.spiceexpress.in`;
      const headerEmail = company.email || 'info@spiceexpress.co.in';
      doc.text(trackWebsite, margin, startY - 2);
      doc.text(`Email - ${headerEmail}`, pageWidth - margin, startY - 2, { align: "right" });

      // --- Main Box Boundary ---
      doc.setDrawColor(0); // Black
      doc.setLineWidth(0.5);
      doc.rect(margin, startY, contentWidth, boxHeight);

      // --- 1. Top Section (Logo, GST, LR Number, Origin/Dest) ---
      const topSectionHeight = 35;
      doc.line(margin, startY + topSectionHeight, pageWidth - margin, startY + topSectionHeight); // Bottom of top section

      // Vertical divider for Top Section
      const topDividerX = margin + 105;
      doc.line(topDividerX, startY, topDividerX, startY + topSectionHeight);

      // Logo & Company Address
      const logoStartY = startY + 2;
      if (logoDataUrl) {
        const base64Data = logoDataUrl.split(',')[1];
        if (base64Data) {
          try {
            const imgProps = doc.getImageProperties(logoDataUrl);
            
            // --- LOGO SIZING PARAMETERS ---
            // 1. `targetWidth` controls how wide (in mm) the logo will try to stretch inside the 105mm left column.
            const targetWidth = 50; 
            
            const ratio = imgProps.width / imgProps.height;
            let desiredWidth = targetWidth;
            let desiredHeight = targetWidth / ratio;

            // 2. `maxHeight` caps the height (in mm) so a tall logo doesn't bleed into the text paragraphs below it.
            const maxHeight = 16;
            if (desiredHeight > maxHeight) {
              desiredHeight = maxHeight;
              desiredWidth = desiredHeight * ratio;
            }

            doc.addImage(base64Data, logoFormat, margin + 4, logoStartY, desiredWidth, desiredHeight);
          } catch (e) {
            doc.addImage(base64Data, logoFormat, margin + 4, logoStartY, 50, 15);
          }
        }
      } else {
        // Fallback text if logo fails
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 0, 0);
        doc.text("SPICE EXPRESS", margin + 4, logoStartY + 6);
        doc.setTextColor(0);
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, margin + 4, startY + 27);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(company.address || 'Block D, Plot No. D 464, Martin nagar, Mankapur, Nagpur 440002', margin + 4, startY + 31, { maxWidth: 98 });

      // GST No
      doc.setFont("helvetica", "normal");
      doc.text(`GST No.:${company.gstin || '27AEMFS2408G1ZY'}`, topDividerX - 2, startY + 8, { align: "right" });

      // Right side of Top Section: LR Num, Origin, Dest
      // Horizontal dividers
      const rowHeight = topSectionHeight / 3;
      doc.line(topDividerX, startY + rowHeight, pageWidth - margin, startY + rowHeight);
      doc.line(topDividerX, startY + (rowHeight * 2), pageWidth - margin, startY + (rowHeight * 2));

      // LR Number (Centered in its box)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(lr.lrNumber || 'N/A', topDividerX + ((pageWidth - margin - topDividerX) / 2), startY + 8, { align: "center" });

      // Origin
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Origin: ", topDividerX + 2, startY + rowHeight + 7);
      doc.setFont("helvetica", "normal");
      doc.text(`${lr.consignor?.city || ''} , ${lr.consignor?.state || 'Maharashtra'}`, topDividerX + 15, startY + rowHeight + 7);

      // Destination
      doc.setFont("helvetica", "bold");
      doc.text("Destination: ", topDividerX + 2, startY + (rowHeight * 2) + 7);
      doc.setFont("helvetica", "normal");
      doc.text(`${lr.consignee?.city || ''} , ${lr.consignee?.state || 'Maharashtra'}`, topDividerX + 22, startY + (rowHeight * 2) + 7);


      // --- 2. Middle Section (Sender, Receiver, Dates) ---
      const middleSectionHeight = 25;
      const middleStartY = startY + topSectionHeight;
      doc.line(margin, middleStartY + middleSectionHeight, pageWidth - margin, middleStartY + middleSectionHeight);

      // Vertical dividers
      const col1Middle = margin + 85;
      const col2Middle = margin + 165;
      doc.line(col1Middle, middleStartY, col1Middle, middleStartY + middleSectionHeight);
      doc.line(col2Middle, middleStartY, col2Middle, middleStartY + middleSectionHeight);

      // Sender Details
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Sender's Name:", margin + 2, middleStartY + 5);
      doc.setFont("helvetica", "normal");
      const senderCodeStr = lr.consignor?.code ? lr.consignor.code + " - " : "";
      doc.text(`${senderCodeStr}${lr.consignor?.name || ''}`, margin + 2, middleStartY + 9, { maxWidth: 81 });
      doc.text(`${lr.consignor?.city || ''}`, margin + 2, middleStartY + 13, { maxWidth: 81 });
      doc.text(`${lr.consignor?.address || ''}`, margin + 2, middleStartY + 17, { maxWidth: 81 });

      // Receiver Details
      doc.setFont("helvetica", "bold");
      doc.text("Receiver's Name:", col1Middle + 2, middleStartY + 5);
      doc.setFont("helvetica", "normal");
      const receiverCodeStr = lr.consignee?.code ? lr.consignee.code + " - " : "";
      doc.text(`${receiverCodeStr}${lr.consignee?.name || ''}`, col1Middle + 2, middleStartY + 9, { maxWidth: 78 });
      doc.text(`${lr.consignee?.city || ''} ${lr.consignee?.address || ''}`, col1Middle + 2, middleStartY + 13, { maxWidth: 78 });

      // Dt and Packages
      const dtPackBoxHeight = middleSectionHeight / 2;
      doc.line(col2Middle, middleStartY + dtPackBoxHeight, pageWidth - margin, middleStartY + dtPackBoxHeight);

      doc.setFont("helvetica", "bold");
      doc.text("Dt: ", col2Middle + 2, middleStartY + 8);
      doc.text(`${lr.bookingDate ? new Date(lr.bookingDate).toLocaleDateString() : ''}`, col2Middle + 8, middleStartY + 8);

      doc.text("Packages: ", col2Middle + 2, middleStartY + dtPackBoxHeight + 8);
      doc.text(`${lr.shipmentDetails?.numberOfArticles || ''}`, col2Middle + 17, middleStartY + dtPackBoxHeight + 8);

      // --- 3. Table Section ---
      const tableStartY = middleStartY + middleSectionHeight;
      const tableHeaderHeight = 6;
      const tableRowHeight = 30; // height of the items

      // Black header background (only cols 1 to n-1)
      doc.setFillColor(0); // Black
      doc.rect(margin, tableStartY, col2Middle - margin, tableHeaderHeight, 'F');

      // Table Columns X positions
      const colContents = margin + 75;
      const colDecValue = margin + 105;
      const colActWt = margin + 125;
      const colChgWt = margin + 149;

      // Table Headers (White Text)
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("CONTENTS", margin + (75 / 2), tableStartY + 4, { align: "center" });
      doc.text("DECLARED VALUE", colContents + 15, tableStartY + 4, { align: "center" });
      doc.text("ACTUAL WT.", colDecValue + 10, tableStartY + 4, { align: "center" });
      doc.text("CHARGED WT.", colActWt + 12, tableStartY + 4, { align: "center" });
      doc.text("MODE", colChgWt + 8, tableStartY + 4, { align: "center" });

      // Restore black text and drawing
      doc.setTextColor(0);

      // Column Divider Lines (go down to tableRowHeight)
      const tableBottomY = tableStartY + tableHeaderHeight + tableRowHeight;
      doc.line(colContents, tableStartY + tableHeaderHeight, colContents, tableBottomY);
      doc.line(colDecValue, tableStartY + tableHeaderHeight, colDecValue, tableBottomY);
      doc.line(colActWt, tableStartY + tableHeaderHeight, colActWt, tableBottomY);
      doc.line(colChgWt, tableStartY + tableHeaderHeight, colChgWt, tableBottomY);
      doc.line(col2Middle, tableStartY + tableHeaderHeight, col2Middle, tableBottomY); // This continues down

      // Data texts in Table
      const actWt = lr.shipmentDetails?.actualWeight ? Number(lr.shipmentDetails.actualWeight).toFixed(3) : '13.000';
      const chgWt = lr.shipmentDetails?.chargedWeight ? Number(lr.shipmentDetails.chargedWeight).toFixed(3) : '50.000';

      doc.text(lr.shipmentDetails?.descriptionOfGoods || '', margin + 5, tableStartY + tableHeaderHeight + 6, { maxWidth: 65 });
      doc.text(lr.customerInvoice?.value || '12776.00', colContents + 15, tableStartY + tableHeaderHeight + 15, { align: "center" });
      doc.text(actWt, colDecValue + 10, tableStartY + tableHeaderHeight + 15, { align: "center" });
      doc.text(chgWt, colActWt + 12, tableStartY + tableHeaderHeight + 15, { align: "center" });
      doc.text(lr.transportType || 'ROAD', colChgWt + 8, tableStartY + tableHeaderHeight + 15, { align: "center" });

      // KG / GMS box (Rightmost column)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("KG", col2Middle + 5, tableStartY + 5);
      doc.text("GMS", col2Middle + 14, tableStartY + 5);
      doc.line(col2Middle + 2, tableStartY + 7, col2Middle + 11, tableStartY + 7); // Underline KG
      doc.line(col2Middle + 13, tableStartY + 7, col2Middle + 25, tableStartY + 7); // Underline GMS

      doc.setFontSize(16);
      doc.text(chgWt, col2Middle + ((pageWidth - margin - col2Middle) / 2), tableStartY + 25, { align: "center" });

      // Bottom Table Line
      doc.line(margin, tableBottomY, pageWidth - margin, tableBottomY);

      // --- 4. Footer Section ---
      const footerCol1 = margin + 95;
      const footerCol2 = margin + 150;

      // Vertical dividers in footer
      doc.line(footerCol1, tableBottomY, footerCol1, startY + boxHeight);
      doc.line(footerCol2, tableBottomY, footerCol2, startY + boxHeight);

      // Terms
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const terms = "I/We declare that this consignment does not contain personal mail,cash,contraband,illegal drugs,any prohibited items and commodities which can cause safety hazards while transported by air and surface.\nNon-Negotiable Consignment Note/Subject to Nagpur Jurisdiction.Please refer to all the terms & conditions printed overleaf of this consignment note.";
      doc.text(terms, margin + 4, tableBottomY + 5, { maxWidth: 88, lineHeightFactor: 1.1 });

      doc.setFontSize(9);
      doc.text("SENDER'S SIGN:........................................", margin + 4, startY + boxHeight - 5);

      // Received block
      doc.setFontSize(8);
      doc.text("RECEIVED IN GOOD CONDITION", footerCol1 + 4, tableBottomY + 5);
      doc.setFontSize(7);
      doc.text("Sign & Seal ............................", footerCol1 + 4, tableBottomY + 12);
      doc.text("Name..........................................", footerCol1 + 4, tableBottomY + 16);
      doc.text("Relation.....................................", footerCol1 + 4, tableBottomY + 20);
      doc.text("Mobile No :................................", footerCol1 + 4, tableBottomY + 24);
      doc.text("I.D. No.:....................................", footerCol1 + 4, tableBottomY + 28);

      // Signature block
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`For, ${companyName}`, pageWidth - margin - 4, tableBottomY + 5, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Booking Branch / FR Code", pageWidth - margin - 4, tableBottomY + 9, { align: 'right' });

      doc.text("Dt:.......          Sign:...........", pageWidth - margin - 4, startY + boxHeight - 5, { align: 'right' });
    };

    // Draw top box (Original)
    drawLRBox(margin + 5, false); // startY adjusted slightly for the header texts

    // Middle Scissors Line 
    const middleY = margin + 5 + 125 + 5; // End of box + margin
    doc.setLineDash([2, 2], 0);
    doc.line(margin, middleY, pageWidth - margin, middleY);
    doc.setLineDash([]);

    // Draw bottom box (Copy)
    // Offset standardly
    drawLRBox(middleY + 10, true);

    const pdfBuffer = doc.output('arraybuffer');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="lr-${lr.lrNumber || id}.pdf"`
    );
    // Send standard Buffer in Node.js
    return res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('pdfmake generation error:', error);
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
    if (body.declaredValue !== undefined) {
      lr.shipmentDetails = { ...(lr.shipmentDetails || {}), declaredValue: body.declaredValue };
    }
    if (body.expectedDeliveryDate !== undefined) {
      lr.shipmentDetails = { ...(lr.shipmentDetails || {}), expectedDeliveryDate: body.expectedDeliveryDate };
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
    // Customer is only required for TBB (credit billing) mode
    const paymentType = lr.charges?.paymentType;
    if (paymentType === 'TBB' && !lr.customer) {
      return res.status(400).json({ error: 'Missing required field: customer (required for TBB billing)' });
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
