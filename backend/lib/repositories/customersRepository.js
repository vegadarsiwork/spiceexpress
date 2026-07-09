import { query, sql, txRequest, withTransaction } from '../sqlServer.js';
import { mapCustomer, mapLR } from './legacyMappers.js';

const fit = (value, length) => String(value || '').slice(0, length);

const CUSTOMER_SELECT = `
  SELECT
    a.ACCT_KEY_ID, a.ACCT_CODE, a.ACCT_NAME, a.STATE_NAME,
    COALESCE(ad.STREET, '') AS STREET,
    COALESCE(ad.STREET2, '') AS STREET2,
    ad.CITY,
    COALESCE(ad.STATE, a.STATE_NAME) AS STATE,
    COALESCE(ad.PIN, a.PIN_CODE) AS PIN_CODE,
    COALESCE(ad.EMAIL, '') AS EMAIL,
    COALESCE(ad.PHONE_ONE, '') AS PHONE,
    COALESCE(ad.FAX, '') AS FAX,
    ad.HSNCODE AS HSN_CODE,
    ad.CFT_RATIO,
    COALESCE(ad.GSTIN, a.GSTIN) AS GSTIN,
    COALESCE(ad.PAN_NO, a.PAN_NO) AS PAN_NO,
    b.BANK_NAME,
    b.ACCOUNT_NO AS BANK_ACCT_NO,
    b.MICR AS MICR_CODE,
    b.IFSC AS IFSC_CODE,
    a.CREATED_DATE,
    a.LAST_EDITED_DATE
  FROM dbo.ACCOUNT_MST a
  LEFT JOIN dbo.CRDR_ADDINFO ad ON ad.ACCT_KEY_ID = a.ACCT_KEY_ID
  LEFT JOIN dbo.CRDR_BANKINFO b ON b.ACCT_KEY_ID = a.ACCT_KEY_ID
`;

async function getRates(accountId) {
  const result = await query('SELECT * FROM dbo.CRDR_RATE WHERE ACCT_KEY_ID = @id ORDER BY RATE_ID DESC', {
    id: { type: sql.Int, value: Number(accountId) },
  });
  return result.recordset;
}

export async function listCustomers({ page = 1, limit = 200 } = {}) {
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
  const result = await query(`
    ${CUSTOMER_SELECT}
    ORDER BY a.CREATED_DATE DESC, a.ACCT_KEY_ID DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `, {
    offset: { type: sql.Int, value: offset },
    limit: { type: sql.Int, value: Math.min(Number(limit), 500) },
  });
  const accountIds = result.recordset.map(r => r.ACCT_KEY_ID);
  let ratesMap = {};
  if (accountIds.length) {
    const ratesResult = await query(
      `SELECT * FROM dbo.CRDR_RATE WHERE ACCT_KEY_ID IN (${accountIds.map((_, i) => `@rid${i}`).join(',')}) ORDER BY RATE_ID DESC`,
      Object.fromEntries(accountIds.map((id, i) => [`rid${i}`, { type: sql.Int, value: id }])),
    );
    for (const rate of ratesResult.recordset) {
      (ratesMap[rate.ACCT_KEY_ID] ??= []).push(rate);
    }
  }
  return result.recordset.map((row) => mapCustomer(row, ratesMap[row.ACCT_KEY_ID] || []));
}

export async function findCustomerById(id) {
  const result = await query(`${CUSTOMER_SELECT} WHERE a.ACCT_KEY_ID = @id`, {
    id: { type: sql.Int, value: Number(id) },
  });
  const row = result.recordset[0];
  return row ? mapCustomer(row, await getRates(row.ACCT_KEY_ID)) : null;
}

export async function findCustomerByCode(code) {
  const result = await query(`${CUSTOMER_SELECT} WHERE a.ACCT_CODE = @code OR CAST(a.ACCT_KEY_ID AS NVARCHAR(50)) = @code`, {
    code: { type: sql.NVarChar(50), value: String(code) },
  });
  const row = result.recordset[0];
  return row ? mapCustomer(row, await getRates(row.ACCT_KEY_ID)) : null;
}

export async function createCustomer(body) {
  const customerId = await withTransaction(async (transaction) => {
    const next = await txRequest(transaction).query(
      'SELECT ISNULL(MAX(ACCT_KEY_ID), 0) + 1 AS nextId FROM dbo.ACCOUNT_MST WITH (UPDLOCK, HOLDLOCK)',
    );
    const id = next.recordset[0].nextId;
    const code = fit(body.code || `C${String(id).padStart(9, '0')}`, 10);
    const name = fit(body.name || body.company || code, 75);
    const now = new Date();
    await txRequest(transaction, {
      id: { type: sql.Int, value: id },
      code: { type: sql.NVarChar(10), value: code },
      name: { type: sql.NVarChar(75), value: name },
      state: { type: sql.NVarChar(50), value: fit(body.state, 50) },
      pin: { type: sql.NChar(6), value: fit(body.pin, 6) },
      gstin: { type: sql.NVarChar(30), value: fit(body.gstin || body.gst1, 30) },
      pan: { type: sql.NChar(10), value: fit(body.pan, 10) },
      financialYear: { type: sql.NChar(7), value: '2026-27' },
      createdBy: { type: sql.NVarChar(50), value: 'api' },
      now: { type: sql.DateTime, value: now },
    }).query(`
      INSERT INTO dbo.ACCOUNT_MST
        (ACCT_KEY_ID, PARENT_KEY_ID, GROUP_NATURE, GROUP_CODE, ACCT_CODE, ACCT_NAME, ACCT_ALIAS, ACCT_LEVEL,
         UNDER_GROUP, STATE_NAME, GSTIN, PIN_CODE, PAN_NO, SALE_TAX_NO, DEBIT, CREDIT, OPENING, OPENING_TYPE,
         ACCT_TYPE, CREDIT_LIMIT, CAN_MODIFY, IS_ACTIVE, DATE_OF_JOIN, CREATED_BY, CREATED_DATE,
         LAST_EDITED_BY, LAST_EDITED_DATE, FINANCIAL_YEAR)
      VALUES
        (@id, 10, NULL, 1100, @code, @name, @name, 4,
         NULL, @state, @gstin, @pin, @pan, NULL, 0, 0, 0, N'Cr',
         N'L', 0, 1, 1, @now, @createdBy, @now,
         @createdBy, @now, @financialYear)
    `);

    await upsertAuxiliary(transaction, id, body);
    return id;
  });
  return findCustomerById(customerId);
}

async function upsertAuxiliary(transaction, id, body) {
  const rowId = await txRequest(transaction).query(
    'SELECT ISNULL(MAX(TBLROWID), 0) + 1 AS nextId FROM dbo.CRDR_ADDINFO WITH (UPDLOCK, HOLDLOCK)',
  );
  await txRequest(transaction, {
    rowId: { type: sql.Int, value: rowId.recordset[0].nextId },
    id: { type: sql.Int, value: id },
    address: { type: sql.NVarChar(120), value: fit(body.address, 120) },
    city: { type: sql.NVarChar(50), value: fit(body.city, 50) },
    state: { type: sql.NVarChar(50), value: fit(body.state, 50) },
    pin: { type: sql.NVarChar(20), value: fit(body.pin, 20) },
    email: { type: sql.NVarChar(150), value: fit(body.email, 150) },
    phone: { type: sql.NVarChar(10), value: fit(body.phone, 10) },
    fax: { type: sql.NVarChar(10), value: fit(body.fax, 10) },
    hsn: { type: sql.NVarChar(50), value: fit(body.hsnCode, 50) },
    cft: { type: sql.Int, value: body.cftRatio ? Number(body.cftRatio) : null },
    gstin: { type: sql.NVarChar(30), value: fit(body.gstin || body.gst1, 30) },
    pan: { type: sql.NVarChar(20), value: fit(body.pan, 20) },
    user: { type: sql.NVarChar(50), value: 'api' },
    now: { type: sql.DateTime, value: new Date() },
  }).query(`
    MERGE dbo.CRDR_ADDINFO AS target
    USING (SELECT @id AS ACCT_KEY_ID) AS source ON target.ACCT_KEY_ID = source.ACCT_KEY_ID
    WHEN MATCHED THEN UPDATE SET STREET = @address, CITY = @city, STATE = @state, PIN = @pin,
      EMAIL = @email, PHONE_ONE = @phone, FAX = @fax, HSNCODE = @hsn, CFT_RATIO = @cft,
      GSTIN = @gstin, PAN_NO = @pan, LAST_EDITED_BY = @user, LAST_EDITED_DATE = @now
    WHEN NOT MATCHED THEN INSERT
      (TBLROWID, ACCT_KEY_ID, ADDRESS_TYPE, STREET, CITY, STATE, PIN, EMAIL, PHONE_ONE, FAX,
       HSNCODE, CFT_RATIO, GSTIN, PAN_NO, CREATED_BY, CREATED_DATE, LAST_EDITED_BY, LAST_EDITED_DATE)
      VALUES
      (@rowId, @id, N'Billing', @address, @city, @state, @pin, @email, @phone, @fax,
       @hsn, @cft, @gstin, @pan, @user, @now, @user, @now);
  `);

  await txRequest(transaction, {
    id: { type: sql.Int, value: id },
    bank: { type: sql.NVarChar(100), value: fit(body.bankName, 100) },
    account: { type: sql.NVarChar(20), value: fit(body.accountNo, 20) },
    micr: { type: sql.NVarChar(20), value: fit(body.micr, 20) },
    ifsc: { type: sql.NVarChar(20), value: fit(body.ifsc, 20) },
  }).query(`
    MERGE dbo.CRDR_BANKINFO AS target
    USING (SELECT @id AS ACCT_KEY_ID) AS source ON target.ACCT_KEY_ID = source.ACCT_KEY_ID
    WHEN MATCHED THEN UPDATE SET BANK_NAME = @bank, ACCOUNT_NO = @account, MICR = @micr, IFSC = @ifsc
    WHEN NOT MATCHED THEN INSERT (ACCT_KEY_ID, BANK_NAME, ACCOUNT_NO, MICR, IFSC) VALUES (@id, @bank, @account, @micr, @ifsc);
  `);
}

export async function updateCustomer(id, body) {
  const updated = await withTransaction(async (transaction) => {
    const result = await txRequest(transaction, {
      id: { type: sql.Int, value: Number(id) },
      code: { type: sql.NVarChar(10), value: fit(body.code, 10) },
      name: { type: sql.NVarChar(75), value: fit(body.name || body.company, 75) },
      state: { type: sql.NVarChar(50), value: fit(body.state, 50) },
      pin: { type: sql.NChar(6), value: fit(body.pin, 6) },
      gstin: { type: sql.NVarChar(30), value: fit(body.gstin || body.gst1, 30) },
      pan: { type: sql.NChar(10), value: fit(body.pan, 10) },
      now: { type: sql.DateTime, value: new Date() },
    }).query(`
      UPDATE dbo.ACCOUNT_MST
      SET ACCT_CODE = COALESCE(NULLIF(@code, ''), ACCT_CODE),
          ACCT_NAME = COALESCE(NULLIF(@name, ''), ACCT_NAME),
          ACCT_ALIAS = COALESCE(NULLIF(@name, ''), ACCT_ALIAS),
          STATE_NAME = COALESCE(NULLIF(@state, ''), STATE_NAME),
          PIN_CODE = COALESCE(NULLIF(@pin, ''), PIN_CODE),
          GSTIN = COALESCE(NULLIF(@gstin, ''), GSTIN),
          PAN_NO = COALESCE(NULLIF(@pan, ''), PAN_NO),
          LAST_EDITED_BY = N'api',
          LAST_EDITED_DATE = @now
      WHERE ACCT_KEY_ID = @id
    `);
    if (!result.rowsAffected[0]) return null;
    await upsertAuxiliary(transaction, Number(id), body);
    return true;
  });
  return updated ? findCustomerById(id) : null;
}

export async function disableCustomer(id) {
  const result = await query('UPDATE dbo.ACCOUNT_MST SET IS_ACTIVE = 0 WHERE ACCT_KEY_ID = @id', {
    id: { type: sql.Int, value: Number(id) },
  });
  return Boolean(result.rowsAffected[0]);
}

export async function getCustomerSummary(id) {
  const customer = await findCustomerById(id);
  if (!customer) return null;
  const [lrResult, invoiceResult, recentResult] = await Promise.all([
    query('SELECT COUNT(*) AS lrCount, ISNULL(SUM(ORDER_VALUE), 0) AS totalBusiness FROM dbo.ORDER_HEADER WHERE S_ACCT_KEY_ID = @id OR R_ACCT_KEY_ID = @id', {
      id: { type: sql.Int, value: Number(id) },
    }),
    query(`SELECT ISNULL(SUM(INVOICE_VALUE), 0) AS totalUnpaid FROM dbo.INVOICE_HEADER WHERE ACCT_KEY_ID = @id AND ISNULL(INVOICE_STATUS, '') <> @paid`, {
      id: { type: sql.Int, value: Number(id) },
      paid: { type: sql.NVarChar(20), value: 'paid' },
    }),
    query(`
      SELECT TOP 5 * FROM dbo.ORDER_HEADER
      WHERE S_ACCT_KEY_ID = @id OR R_ACCT_KEY_ID = @id
      ORDER BY ORDER_DATE DESC, ORDER_ID DESC
    `, { id: { type: sql.Int, value: Number(id) } }),
  ]);
  return {
    customer,
    totalBusiness: Number(lrResult.recordset[0]?.totalBusiness || 0),
    lrCount: Number(lrResult.recordset[0]?.lrCount || 0),
    totalUnpaid: Number(invoiceResult.recordset[0]?.totalUnpaid || 0),
    recentLRs: recentResult.recordset.map((row) => mapLR(row)),
  };
}
