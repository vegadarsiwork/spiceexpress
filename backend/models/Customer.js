import mongoose from 'mongoose';


const laneRateSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  ratePerKg: { type: Number, required: true }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String }, // Optional - will default to company if not provided
  company: String,
  address: String,
  state: String,
  city: String,
  pin: String,
  phone: String,
  fax: String,
  email: String,
  hsnCode: String,
  cftRatio: String,
  gst1: String,
  gstin: String,
  pan: String,
  bankName: String,
  accountNo: String,
  micr: String,
  ifsc: String,
  rate: {
    type: Map,
    of: laneRateSchema,
    default: {}
  }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
