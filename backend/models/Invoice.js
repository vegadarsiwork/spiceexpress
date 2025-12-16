import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  invoiceNo: String,
  companyCode: { type: String, enum: ['11', '12'], default: '11' }, // 11=SPICE, 12=ASIAN
  customerCode: String,
  lrList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LR' }],
  date: Date,
  invoiceDate: Date,
  dueDate: Date,
  billingOU: String,
  supplierName: String,
  supplierGstin: String,
  billingAddress: String,
  poNumber: String,
  hsn: String,
  pincode: String,
  contactDetails: String,
  freightValue: Number,
  cgst: Number,
  sgst: Number,
  igst: Number,
  gstPercent: Number,
  amountInWords: String,
  totalAmount: Number,
  status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
