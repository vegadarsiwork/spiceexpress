import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Import models
import User from './models/User.js';
import Customer from './models/Customer.js';
import LR from './models/LR.js';
import Invoice from './models/Invoice.js';
import Annexure from './models/Annexure.js';

dotenv.config();

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Customer.deleteMany({});
        await LR.deleteMany({});
        await Invoice.deleteMany({});
        await Annexure.deleteMany({});
        console.log('✅ Cleared all existing data');

        // ============================================
        // 1. CREATE USERS
        // ============================================
        const passwordHash = await bcrypt.hash('password123', 10);
        const users = await User.insertMany([
            {
                name: 'Admin User',
                email: 'admin@spiceexpress.com',
                passwordHash,
                role: 'admin',
                phone: '+91-9876543210'
            },
            {
                name: 'Staff User',
                email: 'staff@spiceexpress.com',
                passwordHash,
                role: 'user',
                phone: '+91-9876543211'
            }
        ]);
        console.log(`✅ Created ${users.length} users`);

        // ============================================
        // 2. CREATE CUSTOMERS (5 customers)
        // ============================================
        const customers = await Customer.insertMany([
            {
                code: 'CUST001',
                name: 'Tata Hitachi Construction Machinery',
                company: 'Tata Hitachi',
                address: 'Shwetal Logistics, Dhanbad Road, Maniksar',
                state: 'Maharashtra',
                city: 'Nagpur',
                pin: '440001',
                phone: '+91-712-1234567',
                email: 'logistics@tatahitachi.com',
                gstin: '27AEMFS2408G1ZY',
                pan: 'AEMFS2408G',
                hsnCode: '996511',
                cftRatio: '1:6'
            },
            {
                code: 'CUST002',
                name: 'Mahindra Logistics Ltd',
                company: 'Mahindra Group',
                address: 'Plot 45, Industrial Area, Pithampur',
                state: 'Madhya Pradesh',
                city: 'Indore',
                pin: '452001',
                phone: '+91-731-9876543',
                email: 'shipping@mahindra.com',
                gstin: '23BXYYZ1234A1ZP',
                pan: 'BXYYZ1234A',
                hsnCode: '996511',
                cftRatio: '1:5'
            },
            {
                code: 'CUST003',
                name: 'Reliance Industries Limited',
                company: 'Reliance',
                address: 'Maker Chambers IV, Nariman Point',
                state: 'Maharashtra',
                city: 'Mumbai',
                pin: '400021',
                phone: '+91-22-44789000',
                email: 'freight@ril.com',
                gstin: '27AAACR5055K1ZK',
                pan: 'AAACR5055K',
                hsnCode: '996511',
                cftRatio: '1:6'
            },
            {
                code: 'CUST004',
                name: 'Larsen & Toubro Limited',
                company: 'L&T',
                address: 'L&T House, Ballard Estate',
                state: 'Maharashtra',
                city: 'Mumbai',
                pin: '400001',
                phone: '+91-22-67525656',
                email: 'logistics@larsentoubro.com',
                gstin: '27AAACL1503E1ZM',
                pan: 'AAACL1503E',
                hsnCode: '996511',
                cftRatio: '1:5'
            },
            {
                code: 'CUST005',
                name: 'Adani Ports & Special Economic Zone',
                company: 'Adani Group',
                address: 'Adani Corporate House, Shantigram',
                state: 'Gujarat',
                city: 'Ahmedabad',
                pin: '382421',
                phone: '+91-79-25555555',
                email: 'cargo@adani.com',
                gstin: '24AABCA1234D1ZE',
                pan: 'AABCA1234D',
                hsnCode: '996511',
                cftRatio: '1:6'
            }
        ]);
        console.log(`✅ Created ${customers.length} customers`);

        // ============================================
        // 3. CREATE LRs (10 LRs with different statuses and companies)
        // ============================================
        const statuses = ['Booked', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'];
        const paymentTypes = ['To Pay', 'Paid', 'Billed'];

        const lrs = await LR.insertMany([
            // LR 1 - SPICE EXPRESS - Booked
            {
                lrNumber: 'SE2025001',
                bookingDate: new Date('2025-12-01'),
                status: 'Booked',
                customer: customers[0]._id,
                company: '11',
                dispatchBranch: 'Nagpur',
                vehicleNumber: 'MH31AB1234',
                driverName: 'Ramesh Kumar',
                consignor: {
                    name: 'Tata Hitachi Construction',
                    address: 'Nagpur Central Warehouse',
                    state: 'Maharashtra',
                    city: 'Nagpur',
                    pin: '440001',
                    phone: '+91-9876543210',
                    email: 'warehouse@tatahitachi.com',
                    gstin: '27AEMFS2408G1ZY'
                },
                consignee: {
                    name: 'ES Infraserve Pvt Ltd',
                    address: 'Ring Road, Scheme No.94, EB-24',
                    state: 'Madhya Pradesh',
                    city: 'Indore',
                    pin: '452001',
                    phone: '+91-731-9876543',
                    email: 'receiving@esinfra.com',
                    gstin: '23AEMFS2408G1ZX'
                },
                shipmentDetails: {
                    numberOfArticles: 5,
                    actualWeight: 500,
                    chargedWeight: 550,
                    descriptionOfGoods: 'Excavator Parts - Hydraulic Cylinders'
                },
                charges: {
                    paymentType: 'Billed',
                    freight: 12000,
                    docketCharge: 100,
                    doorDeliveryCharge: 500,
                    gstCharge: 2268,
                    total: 14868
                },
                ewayBillNumber: 'EWB271234567890',
                customerInvoice: { number: 'TH/INV/2025/1234', date: new Date('2025-12-01'), value: 450000 }
            },

            // LR 2 - SPICE EXPRESS - In Transit
            {
                lrNumber: 'SE2025002',
                bookingDate: new Date('2025-12-05'),
                status: 'In Transit',
                customer: customers[1]._id,
                company: '11',
                dispatchBranch: 'Indore',
                vehicleNumber: 'MP09CD5678',
                driverName: 'Suresh Yadav',
                consignor: {
                    name: 'Mahindra Logistics Ltd',
                    address: 'Industrial Area, Pithampur',
                    state: 'Madhya Pradesh',
                    city: 'Indore',
                    pin: '452001',
                    phone: '+91-731-1234567',
                    email: 'dispatch@mahindra.com',
                    gstin: '23BXYYZ1234A1ZP'
                },
                consignee: {
                    name: 'ABC Motors Pvt Ltd',
                    address: 'Sector 15, Industrial Zone',
                    state: 'Haryana',
                    city: 'Gurgaon',
                    pin: '122001',
                    phone: '+91-124-4567890',
                    email: 'parts@abcmotors.com',
                    gstin: '06ABCDE1234F1ZQ'
                },
                shipmentDetails: {
                    numberOfArticles: 10,
                    actualWeight: 1200,
                    chargedWeight: 1250,
                    descriptionOfGoods: 'Automotive Components - Gearbox Assembly'
                },
                charges: {
                    paymentType: 'To Pay',
                    freight: 25000,
                    docketCharge: 150,
                    insurance: 500,
                    handlingCharge: 300,
                    gstCharge: 4671,
                    total: 30621
                },
                ewayBillNumber: 'EWB239876543210'
            },

            // LR 3 - ASIAN TRADES LINK - Delivered
            {
                lrNumber: 'ATL2025001',
                bookingDate: new Date('2025-12-03'),
                status: 'Delivered',
                customer: customers[2]._id,
                company: '12',
                dispatchBranch: 'Mumbai',
                vehicleNumber: 'MH04EF9012',
                driverName: 'Prakash Sharma',
                consignor: {
                    name: 'Reliance Industries Limited',
                    address: 'Navi Mumbai Refinery Complex',
                    state: 'Maharashtra',
                    city: 'Mumbai',
                    pin: '400701',
                    phone: '+91-22-44789000',
                    email: 'dispatch@ril.com',
                    gstin: '27AAACR5055K1ZK'
                },
                consignee: {
                    name: 'Gujarat Petrochemicals Ltd',
                    address: 'Block A, Ankleshwar GIDC',
                    state: 'Gujarat',
                    city: 'Ankleshwar',
                    pin: '393001',
                    phone: '+91-2646-123456',
                    email: 'receiving@gujpetro.com',
                    gstin: '24AABCG1234H1ZR'
                },
                shipmentDetails: {
                    numberOfArticles: 2,
                    actualWeight: 8000,
                    chargedWeight: 8000,
                    descriptionOfGoods: 'Chemical Drums - Industrial Solvents'
                },
                charges: {
                    paymentType: 'Paid',
                    freight: 45000,
                    docketCharge: 200,
                    handlingCharge: 1000,
                    carrierRisk: 500,
                    gstCharge: 8406,
                    total: 55106
                },
                ewayBillNumber: 'EWB274567890123',
                customerInvoice: { number: 'RIL/EXP/2025/5678', date: new Date('2025-12-03'), value: 1250000 }
            },

            // LR 4 - SPICE EXPRESS - Out for Delivery
            {
                lrNumber: 'SE2025003',
                bookingDate: new Date('2025-12-08'),
                status: 'Out for Delivery',
                customer: customers[3]._id,
                company: '11',
                dispatchBranch: 'Mumbai',
                vehicleNumber: 'MH02GH3456',
                driverName: 'Vijay Patil',
                consignor: {
                    name: 'Larsen & Toubro Limited',
                    address: 'L&T House, Ballard Estate',
                    state: 'Maharashtra',
                    city: 'Mumbai',
                    pin: '400001',
                    phone: '+91-22-67525656',
                    email: 'shipping@lt.com',
                    gstin: '27AAACL1503E1ZM'
                },
                consignee: {
                    name: 'Metro Rail Corporation',
                    address: 'Phase 2 Construction Site, Magadi Road',
                    state: 'Karnataka',
                    city: 'Bangalore',
                    pin: '560023',
                    phone: '+91-80-22222222',
                    email: 'projects@metrorail.com',
                    gstin: '29AABCM5555N1ZT'
                },
                shipmentDetails: {
                    numberOfArticles: 15,
                    actualWeight: 3500,
                    chargedWeight: 3600,
                    descriptionOfGoods: 'Steel Fabrication Parts - Metro Coaches'
                },
                charges: {
                    paymentType: 'Billed',
                    freight: 72000,
                    docketCharge: 250,
                    insurance: 1500,
                    transhipmentCharge: 2000,
                    gstCharge: 13635,
                    total: 89385
                },
                ewayBillNumber: 'EWB271111222233'
            },

            // LR 5 - ASIAN TRADES LINK - In Transit
            {
                lrNumber: 'ATL2025002',
                bookingDate: new Date('2025-12-10'),
                status: 'In Transit',
                customer: customers[4]._id,
                company: '12',
                dispatchBranch: 'Ahmedabad',
                vehicleNumber: 'GJ01JK7890',
                driverName: 'Arjun Patel',
                consignor: {
                    name: 'Adani Ports & SEZ',
                    address: 'Mundra Port, Special Economic Zone',
                    state: 'Gujarat',
                    city: 'Kutch',
                    pin: '370421',
                    phone: '+91-2838-123456',
                    email: 'exports@adaniports.com',
                    gstin: '24AABCA1234D1ZE'
                },
                consignee: {
                    name: 'Chennai Container Terminal',
                    address: 'Ambattur Industrial Estate',
                    state: 'Tamil Nadu',
                    city: 'Chennai',
                    pin: '600058',
                    phone: '+91-44-42424242',
                    email: 'imports@cct.com',
                    gstin: '33AABCC6789E1ZF'
                },
                shipmentDetails: {
                    numberOfArticles: 8,
                    actualWeight: 12000,
                    chargedWeight: 12000,
                    descriptionOfGoods: 'Container Cargo - Mixed Goods'
                },
                charges: {
                    paymentType: 'To Pay',
                    freight: 95000,
                    docketCharge: 300,
                    handlingCharge: 2000,
                    fuelSurcharge: 3000,
                    gstCharge: 18054,
                    total: 118354
                },
                ewayBillNumber: 'EWB243333444455'
            },

            // LR 6 - SPICE EXPRESS - Booked
            {
                lrNumber: 'SE2025004',
                bookingDate: new Date('2025-12-12'),
                status: 'Booked',
                customer: customers[0]._id,
                company: '11',
                dispatchBranch: 'Nagpur',
                vehicleNumber: 'MH31LM2345',
                driverName: 'Deepak Verma',
                consignor: {
                    name: 'Tata Hitachi Construction',
                    address: 'Nagpur Assembly Plant',
                    state: 'Maharashtra',
                    city: 'Nagpur',
                    pin: '440035',
                    phone: '+91-712-2345678',
                    email: 'plant@tatahitachi.com',
                    gstin: '27AEMFS2408G1ZY'
                },
                consignee: {
                    name: 'Infrastructure Ltd',
                    address: 'Plot 78, MIDC Area',
                    state: 'Maharashtra',
                    city: 'Pune',
                    pin: '411057',
                    phone: '+91-20-12345678',
                    email: 'procurement@infra.com',
                    gstin: '27AABCI5678F1ZG'
                },
                shipmentDetails: {
                    numberOfArticles: 3,
                    actualWeight: 750,
                    chargedWeight: 800,
                    descriptionOfGoods: 'Crane Components - Wire Ropes'
                },
                charges: {
                    paymentType: 'Billed',
                    freight: 16000,
                    docketCharge: 100,
                    pickupCharge: 400,
                    gstCharge: 2970,
                    total: 19470
                },
                ewayBillNumber: 'EWB275555666677'
            },

            // LR 7 - ASIAN TRADES LINK - Cancelled
            {
                lrNumber: 'ATL2025003',
                bookingDate: new Date('2025-12-06'),
                status: 'Cancelled',
                customer: customers[2]._id,
                company: '12',
                dispatchBranch: 'Mumbai',
                vehicleNumber: 'MH04NO8901',
                driverName: 'Kiran Deshmukh',
                consignor: {
                    name: 'Reliance Industries Limited',
                    address: 'Jamnagar Refinery',
                    state: 'Gujarat',
                    city: 'Jamnagar',
                    pin: '361140',
                    phone: '+91-288-1234567',
                    email: 'refinery@ril.com',
                    gstin: '24AAACR5055K1ZK'
                },
                consignee: {
                    name: 'Hazira Petrochemical',
                    address: 'ONGC Colony, Hazira',
                    state: 'Gujarat',
                    city: 'Surat',
                    pin: '394510',
                    phone: '+91-261-9876543',
                    email: 'ops@hazira.com',
                    gstin: '24AABCH4567G1ZH'
                },
                shipmentDetails: {
                    numberOfArticles: 4,
                    actualWeight: 5000,
                    chargedWeight: 5000,
                    descriptionOfGoods: 'Petroleum Products - Cancelled Order'
                },
                charges: {
                    paymentType: 'Billed',
                    freight: 0,
                    total: 0
                }
            },

            // LR 8 - SPICE EXPRESS - Delivered
            {
                lrNumber: 'SE2025005',
                bookingDate: new Date('2025-11-28'),
                status: 'Delivered',
                customer: customers[1]._id,
                company: '11',
                dispatchBranch: 'Indore',
                vehicleNumber: 'MP09PQ1234',
                driverName: 'Anil Mishra',
                consignor: {
                    name: 'Mahindra Logistics Ltd',
                    address: 'Dewas Road Warehouse',
                    state: 'Madhya Pradesh',
                    city: 'Indore',
                    pin: '453555',
                    phone: '+91-731-5555555',
                    email: 'warehouse@mahindra.com',
                    gstin: '23BXYYZ1234A1ZP'
                },
                consignee: {
                    name: 'Hyundai Motors India',
                    address: 'Sriperumbudur Plant',
                    state: 'Tamil Nadu',
                    city: 'Sriperumbudur',
                    pin: '602105',
                    phone: '+91-44-67890123',
                    email: 'supply@hyundai.com',
                    gstin: '33AABCH1234I1ZI'
                },
                shipmentDetails: {
                    numberOfArticles: 20,
                    actualWeight: 2800,
                    chargedWeight: 3000,
                    descriptionOfGoods: 'Dashboard Assemblies - Car Interior Parts'
                },
                charges: {
                    paymentType: 'Paid',
                    freight: 58000,
                    docketCharge: 200,
                    insurance: 800,
                    doorDeliveryCharge: 1000,
                    gstCharge: 10800,
                    total: 70800
                },
                ewayBillNumber: 'EWB237777888899',
                customerInvoice: { number: 'ML/2025/9876', date: new Date('2025-11-28'), value: 890000 }
            },

            // LR 9 - ASIAN TRADES LINK - Booked
            {
                lrNumber: 'ATL2025004',
                bookingDate: new Date('2025-12-14'),
                status: 'Booked',
                customer: customers[3]._id,
                company: '12',
                dispatchBranch: 'Mumbai',
                vehicleNumber: 'MH04RS5678',
                driverName: 'Santosh Jadhav',
                consignor: {
                    name: 'Larsen & Toubro Limited',
                    address: 'Powai Engineering Complex',
                    state: 'Maharashtra',
                    city: 'Mumbai',
                    pin: '400076',
                    phone: '+91-22-67526756',
                    email: 'powai@lt.com',
                    gstin: '27AAACL1503E1ZM'
                },
                consignee: {
                    name: 'Delhi Metro Rail Corp',
                    address: 'Depot Site, Noida Sector 52',
                    state: 'Uttar Pradesh',
                    city: 'Noida',
                    pin: '201301',
                    phone: '+91-120-4444444',
                    email: 'procurement@dmrc.com',
                    gstin: '09AABCD9999J1ZJ'
                },
                shipmentDetails: {
                    numberOfArticles: 6,
                    actualWeight: 4200,
                    chargedWeight: 4500,
                    descriptionOfGoods: 'Electrical Panels - Metro Power Systems'
                },
                charges: {
                    paymentType: 'Billed',
                    freight: 85000,
                    docketCharge: 250,
                    handlingCharge: 1500,
                    insurance: 2000,
                    gstCharge: 15975,
                    total: 104725
                },
                ewayBillNumber: 'EWB279999000011'
            },

            // LR 10 - SPICE EXPRESS - In Transit
            {
                lrNumber: 'SE2025006',
                bookingDate: new Date('2025-12-13'),
                status: 'In Transit',
                customer: customers[4]._id,
                company: '11',
                dispatchBranch: 'Ahmedabad',
                vehicleNumber: 'GJ01TU9012',
                driverName: 'Bharat Shah',
                consignor: {
                    name: 'Adani Ports & SEZ',
                    address: 'Adani House, Ahmedabad',
                    state: 'Gujarat',
                    city: 'Ahmedabad',
                    pin: '382421',
                    phone: '+91-79-25556666',
                    email: 'logistics@adani.com',
                    gstin: '24AABCA1234D1ZE'
                },
                consignee: {
                    name: 'Vizag Steel Plant',
                    address: 'Visakhapatnam Steel Complex',
                    state: 'Andhra Pradesh',
                    city: 'Visakhapatnam',
                    pin: '530031',
                    phone: '+91-891-1234567',
                    email: 'stores@vizagsteel.com',
                    gstin: '37AABCV7890K1ZK'
                },
                shipmentDetails: {
                    numberOfArticles: 12,
                    actualWeight: 9500,
                    chargedWeight: 10000,
                    descriptionOfGoods: 'Mining Equipment - Conveyor Belt Rollers'
                },
                charges: {
                    paymentType: 'To Pay',
                    freight: 120000,
                    docketCharge: 350,
                    handlingCharge: 2500,
                    fuelSurcharge: 4000,
                    ownerRisk: 1000,
                    gstCharge: 23013,
                    total: 150863
                },
                ewayBillNumber: 'EWB241234509876'
            }
        ]);
        console.log(`✅ Created ${lrs.length} LRs`);

        // ============================================
        // 4. CREATE INVOICES (6 invoices - mix of both companies)
        // ============================================
        const invoices = await Invoice.insertMany([
            // Invoice 1 - SPICE EXPRESS - Unpaid
            {
                invoiceNumber: 'INV-SE-2025-001',
                invoiceNo: 'SE/DEC/2025/001',
                companyCode: '11',
                customerCode: 'CUST001',
                lrList: [lrs[0]._id, lrs[5]._id], // SE2025001, SE2025004
                date: new Date('2025-12-15'),
                invoiceDate: new Date('2025-12-15'),
                dueDate: new Date('2026-01-14'),
                billingOU: 'SPICE EXPRESS',
                supplierName: 'SPICE EXPRESS',
                supplierGstin: '27AAPCS1234A1ZA',
                billingAddress: 'Tata Hitachi Construction, Nagpur Central Warehouse, Nagpur - 440001',
                hsn: '996511',
                pincode: '440001',
                contactDetails: '+91-712-1234567',
                freightValue: 28000,
                cgst: 2520,
                sgst: 2520,
                igst: 0,
                gstPercent: 18,
                totalAmount: 34338,
                amountInWords: 'Thirty Four Thousand Three Hundred Thirty Eight Only',
                status: 'unpaid'
            },

            // Invoice 2 - SPICE EXPRESS - Paid
            {
                invoiceNumber: 'INV-SE-2025-002',
                invoiceNo: 'SE/DEC/2025/002',
                companyCode: '11',
                customerCode: 'CUST002',
                lrList: [lrs[7]._id], // SE2025005
                date: new Date('2025-12-01'),
                invoiceDate: new Date('2025-12-01'),
                dueDate: new Date('2025-12-31'),
                billingOU: 'SPICE EXPRESS',
                supplierName: 'SPICE EXPRESS',
                supplierGstin: '27AAPCS1234A1ZA',
                billingAddress: 'Mahindra Logistics Ltd, Industrial Area, Indore - 452001',
                hsn: '996511',
                pincode: '452001',
                contactDetails: '+91-731-9876543',
                freightValue: 60000,
                cgst: 0,
                sgst: 0,
                igst: 10800,
                gstPercent: 18,
                totalAmount: 70800,
                amountInWords: 'Seventy Thousand Eight Hundred Only',
                status: 'paid'
            },

            // Invoice 3 - SPICE EXPRESS - Unpaid
            {
                invoiceNumber: 'INV-SE-2025-003',
                invoiceNo: 'SE/DEC/2025/003',
                companyCode: '11',
                customerCode: 'CUST004',
                lrList: [lrs[3]._id], // SE2025003
                date: new Date('2025-12-14'),
                invoiceDate: new Date('2025-12-14'),
                dueDate: new Date('2026-01-13'),
                billingOU: 'SPICE EXPRESS',
                supplierName: 'SPICE EXPRESS',
                supplierGstin: '27AAPCS1234A1ZA',
                billingAddress: 'Larsen & Toubro Limited, L&T House, Mumbai - 400001',
                hsn: '996511',
                pincode: '400001',
                contactDetails: '+91-22-67525656',
                freightValue: 75750,
                cgst: 0,
                sgst: 0,
                igst: 13635,
                gstPercent: 18,
                totalAmount: 89385,
                amountInWords: 'Eighty Nine Thousand Three Hundred Eighty Five Only',
                status: 'unpaid'
            },

            // Invoice 4 - ASIAN TRADES LINK - Paid
            {
                invoiceNumber: 'INV-ATL-2025-001',
                invoiceNo: 'ATL/DEC/2025/001',
                companyCode: '12',
                customerCode: 'CUST003',
                lrList: [lrs[2]._id], // ATL2025001
                date: new Date('2025-12-05'),
                invoiceDate: new Date('2025-12-05'),
                dueDate: new Date('2026-01-04'),
                billingOU: 'ASIAN TRADES LINK',
                supplierName: 'ASIAN TRADES LINK',
                supplierGstin: '27AATCS5678B1ZB',
                billingAddress: 'Reliance Industries Limited, Navi Mumbai Refinery Complex - 400701',
                hsn: '996511',
                pincode: '400701',
                contactDetails: '+91-22-44789000',
                freightValue: 46700,
                cgst: 4203,
                sgst: 4203,
                igst: 0,
                gstPercent: 18,
                totalAmount: 55106,
                amountInWords: 'Fifty Five Thousand One Hundred Six Only',
                status: 'paid'
            },

            // Invoice 5 - ASIAN TRADES LINK - Unpaid
            {
                invoiceNumber: 'INV-ATL-2025-002',
                invoiceNo: 'ATL/DEC/2025/002',
                companyCode: '12',
                customerCode: 'CUST005',
                lrList: [lrs[4]._id], // ATL2025002
                date: new Date('2025-12-14'),
                invoiceDate: new Date('2025-12-14'),
                dueDate: new Date('2026-01-13'),
                billingOU: 'ASIAN TRADES LINK',
                supplierName: 'ASIAN TRADES LINK',
                supplierGstin: '27AATCS5678B1ZB',
                billingAddress: 'Adani Ports & Special Economic Zone, Mundra Port - 370421',
                hsn: '996511',
                pincode: '370421',
                contactDetails: '+91-2838-123456',
                freightValue: 100300,
                cgst: 0,
                sgst: 0,
                igst: 18054,
                gstPercent: 18,
                totalAmount: 118354,
                amountInWords: 'One Lakh Eighteen Thousand Three Hundred Fifty Four Only',
                status: 'unpaid'
            },

            // Invoice 6 - ASIAN TRADES LINK - Unpaid
            {
                invoiceNumber: 'INV-ATL-2025-003',
                invoiceNo: 'ATL/DEC/2025/003',
                companyCode: '12',
                customerCode: 'CUST004',
                lrList: [lrs[8]._id], // ATL2025004
                date: new Date('2025-12-15'),
                invoiceDate: new Date('2025-12-15'),
                dueDate: new Date('2026-01-14'),
                billingOU: 'ASIAN TRADES LINK',
                supplierName: 'ASIAN TRADES LINK',
                supplierGstin: '27AATCS5678B1ZB',
                billingAddress: 'Larsen & Toubro Limited, Powai Engineering Complex, Mumbai - 400076',
                hsn: '996511',
                pincode: '400076',
                contactDetails: '+91-22-67526756',
                freightValue: 88750,
                cgst: 0,
                sgst: 0,
                igst: 15975,
                gstPercent: 18,
                totalAmount: 104725,
                amountInWords: 'One Lakh Four Thousand Seven Hundred Twenty Five Only',
                status: 'unpaid'
            }
        ]);
        console.log(`✅ Created ${invoices.length} invoices`);

        // ============================================
        // SUMMARY
        // ============================================
        console.log('\n══════════════════════════════════════════════════════════');
        console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
        console.log('══════════════════════════════════════════════════════════');
        console.log('\n📊 SUMMARY:');
        console.log(`   • Users:     ${users.length}`);
        console.log(`   • Customers: ${customers.length}`);
        console.log(`   • LRs:       ${lrs.length}`);
        console.log(`   • Invoices:  ${invoices.length}`);

        console.log('\n📦 LR BREAKDOWN:');
        console.log('   SPICE EXPRESS (Company 11):');
        console.log('     - SE2025001 → Booked');
        console.log('     - SE2025002 → In Transit');
        console.log('     - SE2025003 → Out for Delivery');
        console.log('     - SE2025004 → Booked');
        console.log('     - SE2025005 → Delivered');
        console.log('     - SE2025006 → In Transit');
        console.log('   ASIAN TRADES LINK (Company 12):');
        console.log('     - ATL2025001 → Delivered');
        console.log('     - ATL2025002 → In Transit');
        console.log('     - ATL2025003 → Cancelled');
        console.log('     - ATL2025004 → Booked');

        console.log('\n📋 TEST CREDENTIALS:');
        console.log('   Admin:  admin@spiceexpress.com / password123');
        console.log('   Staff:  staff@spiceexpress.com / password123');
        console.log('   (Both accounts can manage SPICE EXPRESS and ASIAN TRADES LINK)');
        console.log('══════════════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();
