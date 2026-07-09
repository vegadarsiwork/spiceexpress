const clean = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

export const numberOrZero = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

export const nullableDate = (value) => (value ? new Date(value) : null);

export const dateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const currentFinancialYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
};

export function normalizeStatus(status) {
  const value = clean(status).toUpperCase();
  if (!value) return 'Booked';
  if (['DELIVERED', 'POD', 'D'].includes(value)) return 'Delivered';
  if (['CANCELLED', 'CANCELED', 'C'].includes(value)) return 'Cancelled';
  if (['IN TRANSIT', 'TRANSIT', 'DISPATCHED', 'OUT FOR DELIVERY'].includes(value)) return 'In Transit';
  return clean(status) || 'Booked';
}

export function legacyStatus(status) {
  const value = clean(status).toLowerCase();
  if (value === 'delivered') return 'DELIVERED';
  if (value === 'cancelled' || value === 'canceled') return 'CANCELLED';
  if (value === 'in transit') return 'IN TRANSIT';
  return status || 'BOOKED';
}

export function mapCustomer(row, rates = []) {
  if (!row) return null;
  const id = String(row.ACCT_KEY_ID);
  const address = [row.STREET, row.STREET2, row.STREET3].map(clean).filter(Boolean).join(', ');
  const firstRate = rates[0] || {};
  return {
    id,
    _id: id,
    legacyAcctKeyId: row.ACCT_KEY_ID,
    code: clean(row.ACCT_CODE) || id,
    name: clean(row.ACCT_NAME),
    company: clean(row.ACCT_NAME),
    address,
    state: clean(row.STATE),
    city: clean(row.CITY),
    pin: clean(row.PIN_CODE),
    phone: clean(row.PHONE),
    fax: clean(row.FAX),
    email: clean(row.EMAIL),
    hsnCode: clean(row.HSN_CODE),
    cftRatio: clean(row.CFT_RATIO),
    gst1: clean(row.GSTIN),
    gstin: clean(row.GSTIN),
    pan: clean(row.PAN_NO),
    bankName: clean(row.BANK_NAME),
    accountNo: clean(row.BANK_ACCT_NO),
    micr: clean(row.MICR_CODE),
    ifsc: clean(row.IFSC_CODE),
    rate: firstRate.RATE_PER_KG ?? firstRate.RATE_PER_PACKAGE ?? null,
    defaultCharges: {
      ratePerKg: numberOrZero(firstRate.RATE_PER_KG),
      ratePerPackage: numberOrZero(firstRate.RATE_PER_PACKAGE),
    },
    rates,
    createdAt: nullableDate(row.CREATED_DATE),
    updatedAt: nullableDate(row.LAST_EDITED_DATE || row.CREATED_DATE),
  };
}

export function mapUser(row) {
  if (!row) return null;
  const id = String(row.USERID);
  const roleName = clean(row.ROLE_NAME || row.ROLENAME || row.ROLE_CODE).toLowerCase();
  const role = roleName.includes('admin') || Number(row.ROLE_ID) === 1 ? 'admin' : 'user';
  return {
    id,
    _id: id,
    legacyUserId: row.USERID,
    name: clean(row.FULLNAME) || clean(row.USERNAME) || clean(row.EMAIL),
    username: clean(row.USERNAME) || clean(row.USERCODE),
    email: clean(row.EMAIL) || clean(row.USERNAME),
    passwordHash: row.PASSWORD,
    role,
    phone: clean(row.PHONE),
    company: clean(row.COMPANY_CODE) || undefined,
    address: clean(row.ADDRESS),
    avatar: clean(row.AVATAR),
    isActive: row.ISACTIVE === undefined ? true : Boolean(row.ISACTIVE),
  };
}

export function mapTrackingEvent(row) {
  if (!row) return null;
  const id = String(row.TBLROWID ?? `${row.ORDER_ID}-${row.STATUS_DATETIME}`);
  return {
    id,
    _id: id,
    legacyTblRowId: row.TBLROWID,
    lrId: String(row.ORDER_ID),
    status: normalizeStatus(row.STATUS_DESCR || row.STATUS_CODE),
    location: clean(row.STATUS_CODE),
    description: clean(row.STATUS_DESCR),
    timestamp: nullableDate(row.STATUS_DATETIME),
    attachment: clean(row.ATTACHMENT),
  };
}

export function mapLR(row, trackingEvents = []) {
  if (!row) return null;
  const id = String(row.ORDER_ID);
  const paymentType = clean(row.CASH_CREDIT || row.PREPAID_COD || row.RATE_TYPE) || 'TBB';
  const gstCharge = numberOrZero(row.TAX_VALUE);
  const freight = numberOrZero(row.FREIGHT_AMOUNT || row.BASIC_VALUE);
  const subtotal = numberOrZero(row.ORDER_SUB_TOTAL) || freight;
  const total = numberOrZero(row.ORDER_VALUE) || subtotal + gstCharge;
  const consignor = {
    id: row.S_ACCT_KEY_ID ? String(row.S_ACCT_KEY_ID) : undefined,
    code: clean(row.S_ACCT_CODE),
    name: clean(row.S_ACCT_NAME),
    address: clean(row.S_STREET),
    state: clean(row.S_STATE),
    city: clean(row.S_CITY),
    pin: clean(row.S_PIN_CODE),
    phone: clean(row.S_PHONE),
    email: clean(row.S_EMAIL),
    gstin: clean(row.S_GSTIN),
  };
  const consignee = {
    id: row.R_ACCT_KEY_ID ? String(row.R_ACCT_KEY_ID) : undefined,
    code: clean(row.R_ACCT_CODE),
    name: clean(row.R_ACCT_NAME),
    address: clean(row.R_STREET),
    state: clean(row.R_STATE),
    city: clean(row.R_CITY),
    pin: clean(row.R_PIN_CODE),
    phone: clean(row.R_PHONE),
    email: clean(row.R_EMAIL),
    gstin: clean(row.R_GSTIN),
  };
  const customerId = row.BILL_TO === 'R' ? row.R_ACCT_KEY_ID : row.S_ACCT_KEY_ID;
  return {
    id,
    _id: id,
    legacyOrderId: row.ORDER_ID,
    lrNumber: clean(row.ORDER_NO) || id,
    bookingDate: nullableDate(row.ORDER_DATE),
    status: normalizeStatus(row.ORDER_STATUS),
    customerId: customerId ? String(customerId) : undefined,
    customer: customerId ? String(customerId) : undefined,
    company: clean(row.COMPANY_CODE),
    dispatchBranch: clean(row.HUB_ID),
    vehicleNumber: clean(row.VEHICLE_NO),
    driverName: clean(row.DRIVER_NAME),
    transportType: clean(row.MODE_OF_TRANSPORT) || 'ROAD',
    consignor,
    consignee,
    shipmentDetails: {
      numberOfArticles: numberOrZero(row.ORDER_QTY),
      actualWeight: numberOrZero(row.ORDER_WEIGHT),
      chargedWeight: numberOrZero(row.CHARGE_WEIGHT),
      descriptionOfGoods: clean(row.SPECIFICATIONS),
      declaredValue: numberOrZero(row.SHIPMENT_VALUE),
      expectedDeliveryDate: nullableDate(row.DELIVERY_DATE),
      actualDeliveryDate: nullableDate(row.ACTUAL_DELIVERY_DATE),
    },
    charges: {
      paymentType,
      freight,
      rate: numberOrZero(row.ORDER_RATE),
      docketCharge: numberOrZero(row.DOCKET_CHARGES),
      pickupCharge: numberOrZero(row.PICKUP_CHARGES),
      doorDeliveryCharge: numberOrZero(row.UN_LOADING_CHARGES),
      handlingCharge: 0,
      transhipmentCharge: numberOrZero(row.CESS_AMOUNT),
      insurance: numberOrZero(row.INSURANCE_AMOUNT),
      fuelSurcharge: numberOrZero(row.FUEL_SURCHARGE_AMOUNT),
      commission: 0,
      other: numberOrZero(row.EXTRA_AMOUNT),
      carrierRisk: 0,
      ownerRisk: 0,
      gstCharge,
      subtotal,
      total,
      grandTotal: total,
    },
    ewayBillNumber: clean(row.EWAY_BILL_NO),
    customerInvoice: {
      number: clean(row.CUSTOMER_INVOICE_NO),
      date: nullableDate(row.CUSTOMER_INVOICE_DATE),
      value: numberOrZero(row.SHIPMENT_VALUE),
    },
    podDocumentUrl: clean(row.ATTACHMENT),
    trackingEvents,
    remarks: clean(row.REMARKS),
    createdAt: nullableDate(row.CREATED_DATE),
    updatedAt: nullableDate(row.LAST_EDITED_DATE || row.CREATED_DATE),
  };
}

export function mapInvoice(row, lrList = []) {
  if (!row) return null;
  const id = String(row.INVOICE_ID);
  const gstAmount = numberOrZero(row.GST_AMOUNT);
  const gstPercent = numberOrZero(row.GST_PERCENTAGE);
  const cgst = gstAmount ? gstAmount / 2 : 0;
  const totalAmount = numberOrZero(row.INVOICE_VALUE);
  return {
    id,
    _id: id,
    legacyInvoiceId: row.INVOICE_ID,
    invoiceNumber: clean(row.INVOICE_NO) || id,
    invoiceNo: clean(row.INVOICE_NO) || id,
    customerCode: clean(row.ACCT_CODE) || String(row.ACCT_KEY_ID || ''),
    customerId: row.ACCT_KEY_ID ? String(row.ACCT_KEY_ID) : undefined,
    customerName: clean(row.ACCT_NAME),
    companyCode: clean(row.COMPANY_CODE),
    invoiceDate: nullableDate(row.INVOICE_DATE),
    date: nullableDate(row.INVOICE_DATE),
    dueDate: nullableDate(row.DUE_DATE),
    billingOU: clean(row.HUB_ID),
    supplierName: clean(row.SUPPLIER_NAME),
    billingAddress: clean(row.BILLING_ADDRESS),
    poNumber: clean(row.PO_NUMBER),
    hsn: clean(row.HSN_CODE),
    freightValue: numberOrZero(row.FREIGHT_AMOUNT || row.BASIC_VALUE),
    gstPercent,
    cgst,
    sgst: cgst,
    igst: 0,
    gstAmount,
    totalAmount,
    status: clean(row.INVOICE_STATUS).toLowerCase() || 'unpaid',
    remarks: clean(row.REMARKS),
    lrList,
    createdAt: nullableDate(row.CREATED_DATE),
    updatedAt: nullableDate(row.LAST_EDITED_DATE || row.CREATED_DATE),
  };
}
