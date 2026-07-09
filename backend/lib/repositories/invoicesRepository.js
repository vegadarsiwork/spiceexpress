import { query, sql, txRequest, withTransaction } from '../sqlServer.js';
import { currentFinancialYear, dateOnly, mapInvoice, mapLR, numberOrZero } from './legacyMappers.js';
import { findCustomerByCode } from './customersRepository.js';
import { findLRByIdOrNumber } from './lrsRepository.js';

async function lrsForInvoice(invoiceId) {
  const result = await query(`
    SELECT oh.*, d.SEQUENCE
    FROM dbo.INVOICE_DETAIL d
    INNER JOIN dbo.ORDER_HEADER oh ON oh.ORDER_ID = d.ORDER_ID
    WHERE d.INVOICE_ID = @id
    ORDER BY d.SEQUENCE, d.DETAIL_ID
  `, { id: { type: sql.Int, value: Number(invoiceId) } });
  return result.recordset.map(mapLR);
}

async function mapInvoiceWithLrs(row) {
  return row ? mapInvoice(row, await lrsForInvoice(row.INVOICE_ID)) : null;
}

export async function listInvoices({ unpaidOnly = false, customerCode, user } = {}) {
  const where = [];
  const params = {};
  if (unpaidOnly) where.push("ISNULL(ih.INVOICE_STATUS, 'unpaid') <> 'paid'");
  if (customerCode) {
    where.push('(a.ACCT_CODE = @customerCode OR CAST(ih.ACCT_KEY_ID AS NVARCHAR(50)) = @customerCode)');
    params.customerCode = { type: sql.NVarChar(50), value: String(customerCode) };
  }
  if (user?.role !== 'admin' && user?.company) {
    where.push('EXISTS (SELECT 1 FROM dbo.INVOICE_DETAIL d INNER JOIN dbo.ORDER_HEADER oh ON oh.ORDER_ID = d.ORDER_ID WHERE d.INVOICE_ID = ih.INVOICE_ID AND oh.COMPANY_CODE = @company)');
    params.company = { type: sql.NVarChar(20), value: user.company };
  }
  const result = await query(`
    SELECT ih.*, a.ACCT_CODE
    FROM dbo.INVOICE_HEADER ih
    LEFT JOIN dbo.ACCOUNT_MST a ON a.ACCT_KEY_ID = ih.ACCT_KEY_ID
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ih.INVOICE_DATE DESC, ih.INVOICE_ID DESC
  `, params);
  return Promise.all(result.recordset.map(mapInvoiceWithLrs));
}

export async function findInvoiceById(id) {
  const result = await query(`
    SELECT TOP 1 ih.*, a.ACCT_CODE
    FROM dbo.INVOICE_HEADER ih
    LEFT JOIN dbo.ACCOUNT_MST a ON a.ACCT_KEY_ID = ih.ACCT_KEY_ID
    WHERE ih.INVOICE_ID = TRY_CONVERT(INT, @id) OR ih.INVOICE_NO = @id
  `, { id: { type: sql.NVarChar(100), value: String(id) } });
  return mapInvoiceWithLrs(result.recordset[0]);
}

async function nextInvoiceNo(transaction, companyCode) {
  const prefix = companyCode === '12' ? 'ATL-INV' : 'INV';
  const result = await txRequest(transaction, {
    prefix: { type: sql.NVarChar(30), value: `${prefix}-%` },
  }).query(`
    SELECT TOP 1 INVOICE_NO FROM dbo.INVOICE_HEADER WITH (UPDLOCK, HOLDLOCK)
    WHERE INVOICE_NO LIKE @prefix
    ORDER BY INVOICE_ID DESC
  `);
  const match = String(result.recordset[0]?.INVOICE_NO || '').match(/(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `${prefix}-${String(next).padStart(6, '0')}`;
}

export async function createInvoice(body, user) {
  const lrIds = Array.isArray(body.lrList) ? body.lrList : [];
  const lrs = (await Promise.all(lrIds.map((id) => findLRByIdOrNumber(id, false)))).filter(Boolean);
  if (!lrs.length) throw new Error('No matching LRs found for invoice');

  const customer = await findCustomerByCode(body.customerCode);
  const invoiceId = await withTransaction(async (transaction) => {
    const next = await txRequest(transaction).query(
      'SELECT ISNULL(MAX(INVOICE_ID), 0) + 1 AS nextId FROM dbo.INVOICE_HEADER WITH (UPDLOCK, HOLDLOCK)',
    );
    const invoiceId = next.recordset[0].nextId;
    const companyCode = body.companyCode || lrs[0]?.company || user?.company || '11';
    const invoiceNo = body.invoiceNo || await nextInvoiceNo(transaction, companyCode);
    const freight = numberOrZero(body.freightValue) || lrs.reduce((sum, lr) => sum + numberOrZero(lr.charges?.freight), 0);
    const gstPercent = numberOrZero(body.gstPercent);
    const gstAmount = +(freight * (gstPercent / 100)).toFixed(2);
    const totalAmount = +(freight + gstAmount).toFixed(2);
    const totalQty = lrs.reduce((sum, lr) => sum + numberOrZero(lr.shipmentDetails?.numberOfArticles), 0);

    await txRequest(transaction, {
      id: { type: sql.Int, value: invoiceId },
      invoiceNo: { type: sql.NVarChar(50), value: invoiceNo },
      invoiceDate: { type: sql.DateTime, value: dateOnly(body.invoiceDate) || new Date() },
      hub: { type: sql.Int, value: Number(body.billingOU) || null },
      customerId: { type: sql.Int, value: customer?.legacyAcctKeyId ? Number(customer.legacyAcctKeyId) : null },
      customerName: { type: sql.NVarChar(255), value: customer?.company || customer?.name || body.customerCode },
      street: { type: sql.NVarChar(500), value: customer?.address || '' },
      city: { type: sql.NVarChar(100), value: customer?.city || '' },
      state: { type: sql.NVarChar(100), value: customer?.state || '' },
      pin: { type: sql.NVarChar(20), value: customer?.pin || '' },
      phone: { type: sql.NVarChar(50), value: customer?.phone || '' },
      email: { type: sql.NVarChar(255), value: customer?.email || '' },
      gstin: { type: sql.NVarChar(50), value: customer?.gstin || '' },
      qty: { type: sql.Int, value: Math.round(totalQty || 0) },
      freight: { type: sql.Decimal(18, 2), value: freight },
      subtotal: { type: sql.Decimal(18, 2), value: freight },
      gstPercent: { type: sql.Decimal(18, 2), value: gstPercent },
      gstAmount: { type: sql.Decimal(18, 2), value: gstAmount },
      total: { type: sql.Decimal(18, 2), value: totalAmount },
      status: { type: sql.NVarChar(30), value: 'unpaid' },
      remarks: { type: sql.NVarChar(500), value: body.remarks || '' },
      createdBy: { type: sql.NVarChar(50), value: user?.username || user?.email || 'api' },
      now: { type: sql.DateTime, value: new Date() },
      company: { type: sql.NVarChar(20), value: companyCode },
      financialYear: { type: sql.NChar(7), value: currentFinancialYear() },
    }).query(`
      INSERT INTO dbo.INVOICE_HEADER
        (INVOICE_ID, INVOICE_NO, INVOICE_DATE, HUB_ID, ACCT_KEY_ID, ACCT_NAME, STREET, CITY, STATE, PIN_CODE, PHONE, EMAIL, GSTIN,
         INVOICE_QTY, FREIGHT_AMOUNT, BASIC_VALUE, INVOICE_SUB_TOTAL, GST_PERCENTAGE, GST_AMOUNT, INVOICE_VALUE, INVOICE_STATUS,
         REMARKS, CREATED_BY, CREATED_DATE, COMPANY_CODE, FINANCIAL_YEAR)
      VALUES
        (@id, @invoiceNo, @invoiceDate, @hub, @customerId, @customerName, @street, @city, @state, @pin, @phone, @email, @gstin,
         @qty, @freight, @freight, @subtotal, @gstPercent, @gstAmount, @total, @status,
         @remarks, @createdBy, @now, @company, @financialYear)
    `);

    const detailNext = await txRequest(transaction).query(
      'SELECT ISNULL(MAX(DETAIL_ID), 0) + 1 AS nextId FROM dbo.INVOICE_DETAIL WITH (UPDLOCK, HOLDLOCK)',
    );
    let detailId = detailNext.recordset[0].nextId;
    for (const [index, lr] of lrs.entries()) {
      await txRequest(transaction, {
        detailId: { type: sql.Int, value: detailId++ },
        sequence: { type: sql.Int, value: index + 1 },
        invoiceId: { type: sql.Int, value: invoiceId },
        orderId: { type: sql.Int, value: Number(lr.id) },
      }).query(`
        INSERT INTO dbo.INVOICE_DETAIL (DETAIL_ID, SEQUENCE, INVOICE_ID, ORDER_ID)
        VALUES (@detailId, @sequence, @invoiceId, @orderId)
      `);
    }

    return invoiceId;
  });
  return findInvoiceById(invoiceId);
}
