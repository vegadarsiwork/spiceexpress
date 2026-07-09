import { query, sql, txRequest, withTransaction } from '../sqlServer.js';
import { currentFinancialYear, dateOnly, legacyStatus, mapLR, mapTrackingEvent, numberOrZero } from './legacyMappers.js';

async function trackingFor(orderId) {
  const result = await query(
    'SELECT * FROM dbo.ORDER_DELIVERY WHERE ORDER_ID = @id ORDER BY STATUS_DATETIME DESC, TBLROWID DESC',
    { id: { type: sql.Int, value: Number(orderId) } },
  );
  return result.recordset.map(mapTrackingEvent);
}

export async function listLRs({ customerCode, fromDate, toDate, user, page, limit } = {}) {
  const where = [];
  const params = {};
  if (user?.role !== 'admin' && user?.company) {
    where.push('COMPANY_CODE = @company');
    params.company = { type: sql.NVarChar(20), value: user.company };
  }
  if (customerCode) {
    where.push('(CAST(S_ACCT_KEY_ID AS NVARCHAR(50)) = @customer OR CAST(R_ACCT_KEY_ID AS NVARCHAR(50)) = @customer)');
    params.customer = { type: sql.NVarChar(50), value: String(customerCode) };
  }
  if (fromDate) {
    where.push('ORDER_DATE >= @fromDate');
    params.fromDate = { type: sql.DateTime, value: dateOnly(fromDate) };
  }
  if (toDate) {
    where.push('ORDER_DATE <= @toDate');
    params.toDate = { type: sql.DateTime, value: dateOnly(toDate) };
  }
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(Number(limit) || 500, 1000);
  const offset = (pageNum - 1) * pageSize;
  params.offset = { type: sql.Int, value: offset };
  params.pageSize = { type: sql.Int, value: pageSize };
  const result = await query(`
    SELECT * FROM dbo.ORDER_HEADER
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ORDER_DATE DESC, ORDER_ID DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `, params);
  return result.recordset.map((row) => mapLR(row));
}

export async function findLRByIdOrNumber(idOrNumber, includeTracking = true) {
  const result = await query(`
    SELECT TOP 1 oh.*, tax.TAX_VALUE
    FROM dbo.ORDER_HEADER oh
    OUTER APPLY (SELECT SUM(TAX_VALUE) AS TAX_VALUE FROM dbo.ORDER_TAXES WHERE ORDER_ID = oh.ORDER_ID) tax
    WHERE oh.ORDER_ID = TRY_CONVERT(INT, @id) OR oh.ORDER_NO = @id
  `, { id: { type: sql.NVarChar(100), value: String(idOrNumber) } });
  const row = result.recordset[0];
  if (!row) return null;
  return mapLR(row, includeTracking ? await trackingFor(row.ORDER_ID) : []);
}

async function nextOrderNo(transaction, companyCode) {
  const prefix = companyCode === '12' ? 'ATL' : 'SE';
  const year = new Date().getFullYear();
  const result = await txRequest(transaction, {
    prefix: { type: sql.NVarChar(20), value: `${prefix}${year}%` },
  }).query(`
    SELECT TOP 1 ORDER_NO FROM dbo.ORDER_HEADER WITH (UPDLOCK, HOLDLOCK)
    WHERE ORDER_NO LIKE @prefix
    ORDER BY ORDER_NO DESC
  `);
  const match = String(result.recordset[0]?.ORDER_NO || '').match(/(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `${prefix}${year}${String(next).padStart(3, '0')}`;
}

function normalizeLRInput(body, user) {
  const companyCode = body.companyCode || user?.company || '11';
  const consignor = body.consignor || {};
  const consignee = body.consignee || {};
  const shipment = body.shipmentDetails || {};
  const charges = body.charges || {};
  const invoice = body.customerInvoice || {};
  return {
    companyCode,
    bookingDate: dateOnly(body.bookingDate) || new Date(),
    status: legacyStatus(body.status),
    customerId: body.customer || body.customerId || null,
    dispatchBranch: body.dispatchBranch || null,
    transportType: body.transportType || body.modeOfTransport || 'ROAD',
    consignor,
    consignee,
    shipment: {
      numberOfArticles: shipment.numberOfArticles ?? body.numberOfArticles ?? 0,
      actualWeight: shipment.actualWeight ?? body.actualWeight ?? 0,
      chargedWeight: shipment.chargedWeight ?? body.chargedWeight ?? 0,
      descriptionOfGoods: shipment.descriptionOfGoods ?? body.descriptionOfGoods ?? '',
      declaredValue: shipment.declaredValue ?? body.declaredValue ?? invoice.value ?? body.invoiceValue ?? 0,
      expectedDeliveryDate: dateOnly(shipment.expectedDeliveryDate ?? body.expectedDeliveryDate),
    },
    charges: {
      paymentType: charges.paymentType || body.paymentType || 'TBB',
      freight: numberOrZero(charges.freight),
      rate: numberOrZero(charges.rate || body.rate),
      docketCharge: numberOrZero(charges.docketCharge),
      pickupCharge: numberOrZero(charges.pickupCharge),
      doorDeliveryCharge: numberOrZero(charges.doorDeliveryCharge),
      insurance: numberOrZero(charges.insurance),
      fuelSurcharge: numberOrZero(charges.fuelSurcharge),
      other: numberOrZero(charges.other),
      total: numberOrZero(charges.total || charges.grandTotal),
      gstCharge: numberOrZero(charges.gstCharge),
    },
    invoice: {
      number: invoice.number || body.invoiceNumber || '',
      date: dateOnly(invoice.date || body.invoiceDate),
      value: numberOrZero(invoice.value || body.invoiceValue),
    },
    remarks: body.remarks || '',
  };
}

export async function createLR(body, user) {
  const orderId = await withTransaction(async (transaction) => {
    const next = await txRequest(transaction).query(
      'SELECT ISNULL(MAX(ORDER_ID), 0) + 1 AS nextId FROM dbo.ORDER_HEADER WITH (UPDLOCK, HOLDLOCK)',
    );
    const orderId = next.recordset[0].nextId;
    const normalized = normalizeLRInput(body, user);
    const orderNo = body.lrNumber || await nextOrderNo(transaction, normalized.companyCode);
    const total = normalized.charges.total || normalized.charges.freight + normalized.charges.gstCharge;

    await txRequest(transaction, {
      id: { type: sql.Int, value: orderId },
      orderNo: { type: sql.NVarChar(50), value: orderNo },
      orderDate: { type: sql.DateTime, value: normalized.bookingDate },
      status: { type: sql.NVarChar(50), value: normalized.status },
      company: { type: sql.NVarChar(20), value: normalized.companyCode },
      financialYear: { type: sql.NChar(7), value: currentFinancialYear() },
      cashCredit: { type: sql.NVarChar(20), value: normalized.charges.paymentType },
      mode: { type: sql.NVarChar(50), value: normalized.transportType },
      hub: { type: sql.Int, value: Number(normalized.dispatchBranch) || null },
      billTo: { type: sql.NVarChar(1), value: 'S' },
      customerId: { type: sql.Int, value: normalized.customerId ? Number(normalized.customerId) : null },
      sName: { type: sql.NVarChar(255), value: normalized.consignor.name || '' },
      sAddress: { type: sql.NVarChar(500), value: normalized.consignor.address || '' },
      sCity: { type: sql.NVarChar(100), value: normalized.consignor.city || '' },
      sState: { type: sql.NVarChar(100), value: normalized.consignor.state || '' },
      sPin: { type: sql.NVarChar(20), value: normalized.consignor.pin || '' },
      sPhone: { type: sql.NVarChar(50), value: normalized.consignor.phone || '' },
      sEmail: { type: sql.NVarChar(255), value: normalized.consignor.email || '' },
      sGstin: { type: sql.NVarChar(50), value: normalized.consignor.gstin || '' },
      rName: { type: sql.NVarChar(255), value: normalized.consignee.name || '' },
      rAddress: { type: sql.NVarChar(500), value: normalized.consignee.address || '' },
      rCity: { type: sql.NVarChar(100), value: normalized.consignee.city || '' },
      rState: { type: sql.NVarChar(100), value: normalized.consignee.state || '' },
      rPin: { type: sql.NVarChar(20), value: normalized.consignee.pin || '' },
      rPhone: { type: sql.NVarChar(50), value: normalized.consignee.phone || '' },
      rEmail: { type: sql.NVarChar(255), value: normalized.consignee.email || '' },
      rGstin: { type: sql.NVarChar(50), value: normalized.consignee.gstin || '' },
      qty: { type: sql.Int, value: Math.round(Number(normalized.shipment.numberOfArticles) || 0) },
      weight: { type: sql.Decimal(18, 3), value: normalized.shipment.actualWeight },
      chargeWeight: { type: sql.Decimal(18, 3), value: normalized.shipment.chargedWeight },
      rate: { type: sql.Decimal(18, 2), value: normalized.charges.rate },
      specs: { type: sql.NVarChar(500), value: normalized.shipment.descriptionOfGoods },
      declared: { type: sql.Decimal(18, 2), value: normalized.shipment.declaredValue },
      deliveryDate: { type: sql.DateTime, value: normalized.shipment.expectedDeliveryDate },
      freight: { type: sql.Decimal(18, 2), value: normalized.charges.freight },
      pickup: { type: sql.Decimal(18, 2), value: normalized.charges.pickupCharge },
      docket: { type: sql.Decimal(18, 2), value: normalized.charges.docketCharge },
      unloading: { type: sql.Decimal(18, 2), value: normalized.charges.doorDeliveryCharge },
      insurance: { type: sql.Decimal(18, 2), value: normalized.charges.insurance },
      fuel: { type: sql.Decimal(18, 2), value: normalized.charges.fuelSurcharge },
      extra: { type: sql.Decimal(18, 2), value: normalized.charges.other },
      subtotal: { type: sql.Decimal(18, 2), value: normalized.charges.freight },
      total: { type: sql.Decimal(18, 2), value: total },
      remarks: { type: sql.NVarChar(500), value: normalized.remarks },
      createdBy: { type: sql.NVarChar(50), value: user?.username || user?.email || 'api' },
      now: { type: sql.DateTime, value: new Date() },
    }).query(`
      INSERT INTO dbo.ORDER_HEADER
        (ORDER_ID, ORDER_NO, ORDER_DATE, CASH_CREDIT, MODE_OF_TRANSPORT, HUB_ID, BILL_TO,
         S_ACCT_KEY_ID, S_ACCT_NAME, S_STREET, S_CITY, S_STATE, S_PIN_CODE, S_PHONE, S_EMAIL, S_GSTIN,
         R_ACCT_KEY_ID, R_ACCT_NAME, R_STREET, R_CITY, R_STATE, R_PIN_CODE, R_PHONE, R_EMAIL, R_GSTIN,
         ORDER_QTY, ORDER_WEIGHT, CHARGE_WEIGHT, ORDER_RATE, SPECIFICATIONS, SHIPMENT_VALUE, DELIVERY_DATE,
         FREIGHT_AMOUNT, PICKUP_CHARGES, DOCKET_CHARGES, UN_LOADING_CHARGES, INSURANCE_AMOUNT,
         FUEL_SURCHARGE_AMOUNT, EXTRA_AMOUNT, ORDER_SUB_TOTAL, ORDER_VALUE, ORDER_STATUS, REMARKS,
         CREATED_BY, CREATED_DATE, COMPANY_CODE, FINANCIAL_YEAR)
      VALUES
        (@id, @orderNo, @orderDate, @cashCredit, @mode, @hub, @billTo,
         @customerId, @sName, @sAddress, @sCity, @sState, @sPin, @sPhone, @sEmail, @sGstin,
         NULL, @rName, @rAddress, @rCity, @rState, @rPin, @rPhone, @rEmail, @rGstin,
         @qty, @weight, @chargeWeight, @rate, @specs, @declared, @deliveryDate,
         @freight, @pickup, @docket, @unloading, @insurance,
         @fuel, @extra, @subtotal, @total, @status, @remarks,
         @createdBy, @now, @company, @financialYear)
    `);

    if (normalized.charges.gstCharge) {
      const tax = await txRequest(transaction).query('SELECT ISNULL(MAX(TAX_ID), 0) + 1 AS nextId FROM dbo.ORDER_TAXES WITH (UPDLOCK, HOLDLOCK)');
      await txRequest(transaction, {
        taxId: { type: sql.Int, value: tax.recordset[0].nextId },
        orderId: { type: sql.Int, value: orderId },
        percentage: { type: sql.Decimal(18, 2), value: 0 },
        value: { type: sql.Decimal(18, 2), value: normalized.charges.gstCharge },
      }).query('INSERT INTO dbo.ORDER_TAXES (TAX_ID, ORDER_ID, TAX_PERCENTAGE, TAX_VALUE) VALUES (@taxId, @orderId, @percentage, @value)');
    }

    return orderId;
  });
  return findLRByIdOrNumber(orderId);
}

export async function updateLR(id, body, user) {
  const existing = await findLRByIdOrNumber(id);
  if (!existing) return null;
  const normalized = normalizeLRInput({ ...existing, ...body }, user);
  const result = await query(`
    UPDATE dbo.ORDER_HEADER
    SET ORDER_STATUS = @status,
        S_ACCT_NAME = @sName, S_STREET = @sAddress, S_CITY = @sCity, S_STATE = @sState, S_PIN_CODE = @sPin, S_PHONE = @sPhone,
        R_ACCT_NAME = @rName, R_STREET = @rAddress, R_CITY = @rCity, R_STATE = @rState, R_PIN_CODE = @rPin, R_PHONE = @rPhone,
        ORDER_QTY = @qty, ORDER_WEIGHT = @weight, CHARGE_WEIGHT = @chargeWeight, SPECIFICATIONS = @specs,
        FREIGHT_AMOUNT = @freight, ORDER_VALUE = @total, LAST_EDITED_BY = @editedBy, LAST_EDITED_DATE = @now
    WHERE ORDER_ID = @id
  `, {
    id: { type: sql.Int, value: Number(existing.id) },
    status: { type: sql.NVarChar(50), value: normalized.status },
    sName: { type: sql.NVarChar(255), value: normalized.consignor.name || existing.consignor?.name || '' },
    sAddress: { type: sql.NVarChar(500), value: normalized.consignor.address || existing.consignor?.address || '' },
    sCity: { type: sql.NVarChar(100), value: normalized.consignor.city || existing.consignor?.city || '' },
    sState: { type: sql.NVarChar(100), value: normalized.consignor.state || existing.consignor?.state || '' },
    sPin: { type: sql.NVarChar(20), value: normalized.consignor.pin || existing.consignor?.pin || '' },
    sPhone: { type: sql.NVarChar(50), value: normalized.consignor.phone || existing.consignor?.phone || '' },
    rName: { type: sql.NVarChar(255), value: normalized.consignee.name || existing.consignee?.name || '' },
    rAddress: { type: sql.NVarChar(500), value: normalized.consignee.address || existing.consignee?.address || '' },
    rCity: { type: sql.NVarChar(100), value: normalized.consignee.city || existing.consignee?.city || '' },
    rState: { type: sql.NVarChar(100), value: normalized.consignee.state || existing.consignee?.state || '' },
    rPin: { type: sql.NVarChar(20), value: normalized.consignee.pin || existing.consignee?.pin || '' },
    rPhone: { type: sql.NVarChar(50), value: normalized.consignee.phone || existing.consignee?.phone || '' },
    qty: { type: sql.Int, value: Math.round(Number(normalized.shipment.numberOfArticles) || 0) },
    weight: { type: sql.Decimal(18, 3), value: normalized.shipment.actualWeight },
    chargeWeight: { type: sql.Decimal(18, 3), value: normalized.shipment.chargedWeight },
    specs: { type: sql.NVarChar(500), value: normalized.shipment.descriptionOfGoods },
    freight: { type: sql.Decimal(18, 2), value: normalized.charges.freight },
    total: { type: sql.Decimal(18, 2), value: normalized.charges.total || normalized.charges.freight },
    editedBy: { type: sql.NVarChar(50), value: user?.username || user?.email || 'api' },
    now: { type: sql.DateTime, value: new Date() },
  });
  if (!result.rowsAffected[0]) return null;
  return findLRByIdOrNumber(existing.id);
}

export async function countLRs({ customerId, startDate, endDate } = {}) {
  const where = [];
  const params = {};
  if (customerId) {
    where.push('(S_ACCT_KEY_ID = @customerId OR R_ACCT_KEY_ID = @customerId)');
    params.customerId = { type: sql.Int, value: Number(customerId) };
  }
  if (startDate) {
    where.push('ORDER_DATE >= @startDate');
    params.startDate = { type: sql.DateTime, value: dateOnly(startDate) };
  }
  if (endDate) {
    where.push('ORDER_DATE <= @endDate');
    params.endDate = { type: sql.DateTime, value: dateOnly(endDate) };
  }
  const result = await query(`SELECT COUNT(*) AS count FROM dbo.ORDER_HEADER ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`, params);
  return Number(result.recordset[0]?.count || 0);
}

export async function cancelLR(id, user) {
  const existing = await findLRByIdOrNumber(id, false);
  if (!existing) return false;
  const result = await query(`
    UPDATE dbo.ORDER_HEADER
    SET ORDER_STATUS = 'CANCELLED', LAST_EDITED_BY = @editedBy, LAST_EDITED_DATE = @now
    WHERE ORDER_ID = @id
  `, {
    id: { type: sql.Int, value: Number(existing.id) },
    editedBy: { type: sql.NVarChar(50), value: user?.username || user?.email || 'api' },
    now: { type: sql.DateTime, value: new Date() },
  });
  return Boolean(result.rowsAffected[0]);
}
