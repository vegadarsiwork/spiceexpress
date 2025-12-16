import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { lrApi, customerApi } from '../lib/api';
import type { Customer } from '../lib/api';

const customerTypes = ["Credit", "Cash", "To Pay"];
const shipmentTypes = ["Prepaid", "Collect"];
const transportTypes = ["Road", "Air", "Rail", "Sea"];
const rateTypes = ["By Package", "By Weight", "Flat Rate"];

const indianStates = [
	"Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export default function CreateLR({ editMode = false }: { editMode?: boolean }) {
	// Charges/fare fields
	const [paymentType, setPaymentType] = useState('Billed');
	const [freight, setFreight] = useState(0);
	const [docketCharge, setDocketCharge] = useState(0);
	const [doorDeliveryCharge, setDoorDeliveryCharge] = useState(0);
	const [handlingCharge, setHandlingCharge] = useState(0);
	const [pickupCharge, setPickupCharge] = useState(0);
	const [transhipmentCharge, setTranshipmentCharge] = useState(0);
	const [insurance, setInsurance] = useState(0);
	const [fuelSurcharge, setFuelSurcharge] = useState(0);
	const [commission, setCommission] = useState(0);
	const [other, setOther] = useState(0);
	const [carrierRisk, setCarrierRisk] = useState(0);
	const [ownerRisk, setOwnerRisk] = useState(0);
	const [gstCharge, setGstCharge] = useState(0);
	const [total, setTotal] = useState(0);
	const { lrId } = useParams();

	useEffect(() => {
		if (editMode && lrId) {
			// Fetch LR data and populate form for editing
			lrApi.getById(lrId).then(lr => {
				if (!lr) return;
				setAwbNumber(lr.lrNumber || "");
				setDate(lr.bookingDate || "");
				setCustomer(lr.customer || "");
				setSenderName(lr.consignor?.name || "");
				setSenderAddress(lr.consignor?.address || "");
				setSenderCity(lr.consignor?.city || "");
				setSenderState(lr.consignor?.state || "");
				setSenderPin(lr.consignor?.pin || "");
				setSenderPhone(lr.consignor?.phone || "");
				setSenderEmail(lr.consignor?.email || "");
				setSenderGstin(lr.consignor?.gstin || "");
				setReceiverName(lr.consignee?.name || "");
				setReceiverAddress(lr.consignee?.address || "");
				setReceiverCity(lr.consignee?.city || "");
				setReceiverState(lr.consignee?.state || "");
				setReceiverPin(lr.consignee?.pin || "");
				setReceiverPhone(lr.consignee?.phone || "");
				setReceiverEmail(lr.consignee?.email || "");
				setReceiverGstin(lr.consignee?.gstin || "");
				setNumPackages(lr.shipmentDetails?.numberOfArticles?.toString() || "1");
				setActualWeight(lr.shipmentDetails?.actualWeight?.toString() || "");
				setChargedWeight(lr.shipmentDetails?.chargedWeight?.toString() || "");
				setShipmentDescription(lr.shipmentDetails?.descriptionOfGoods || "");
				// Charges
				setPaymentType(lr.charges?.paymentType || 'Billed');
				setFreight(lr.charges?.freight || 0);
				setDocketCharge(lr.charges?.docketCharge || 0);
				setDoorDeliveryCharge(lr.charges?.doorDeliveryCharge || 0);
				setHandlingCharge(lr.charges?.handlingCharge || 0);
				setPickupCharge(lr.charges?.pickupCharge || 0);
				setTranshipmentCharge(lr.charges?.transhipmentCharge || 0);
				setInsurance(lr.charges?.insurance || 0);
				setFuelSurcharge(lr.charges?.fuelSurcharge || 0);
				setCommission(lr.charges?.commission || 0);
				setOther(lr.charges?.other || 0);
				setCarrierRisk(lr.charges?.carrierRisk || 0);
				setOwnerRisk(lr.charges?.ownerRisk || 0);
				setGstCharge(lr.charges?.gstCharge || 0);
				setTotal(lr.charges?.total || 0);
			});
		}
	}, [editMode, lrId]);
	// Shipment Info state (not yet connected to backend)
	const [expectedDelivery, setExpectedDelivery] = useState("");
	const [shipmentValue, setShipmentValue] = useState("");
	const [shipmentDescription, setShipmentDescription] = useState("");
	// const [attachment, setAttachment] = useState<File | null>(null); // unused for now
	const [numPackages, setNumPackages] = useState("1");
	const [actualWeight, setActualWeight] = useState("");
	const [chargedWeight, setChargedWeight] = useState("");
	const [awbNumber, setAwbNumber] = useState("");
	const [code, setCode] = useState("");
	const [date, setDate] = useState("");
	const [time, setTime] = useState("");
	const [customerType, setCustomerType] = useState(customerTypes[0]);
	const [shipmentType, setShipmentType] = useState(shipmentTypes[0]);
	const [transportType, setTransportType] = useState(transportTypes[0]);
	const [rateType, setRateType] = useState(rateTypes[0]);
	// Add sender/receiver state
	const [senderState, setSenderState] = useState("");
	const [receiverState, setReceiverState] = useState("");
	const [senderName, setSenderName] = useState("");
	const [receiverName, setReceiverName] = useState("");
	const [senderAddress, setSenderAddress] = useState("");
	const [senderCity, setSenderCity] = useState("");
	const [senderPin, setSenderPin] = useState("");
	const [senderPhone, setSenderPhone] = useState("");
	const [senderEmail, setSenderEmail] = useState("");
	const [senderGstin, setSenderGstin] = useState("");
	const [receiverAddress, setReceiverAddress] = useState("");
	const [receiverCity, setReceiverCity] = useState("");
	const [receiverPin, setReceiverPin] = useState("");
	const [receiverPhone, setReceiverPhone] = useState("");
	const [receiverEmail, setReceiverEmail] = useState("");
	const [receiverGstin, setReceiverGstin] = useState("");
	const [customer, setCustomer] = useState(""); // This should be the customer ObjectId
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [loadingCustomers, setLoadingCustomers] = useState(false);
	const [senderCustomerId, setSenderCustomerId] = useState("");
	const [receiverCustomerId, setReceiverCustomerId] = useState("");
	const [errors, setErrors] = useState<{ [key: string]: string }>({});

	const navigate = useNavigate();

	// Fetch customers for dropdowns
	useEffect(() => {
		setLoadingCustomers(true);
		customerApi.getAll()
			.then(data => setCustomers(data))
			.catch(() => setCustomers([]))
			.finally(() => setLoadingCustomers(false));
	}, []);

	// Autofill sender details when senderCustomerId changes and set main customer
	useEffect(() => {
		if (!senderCustomerId) return;
		const c = customers.find(c => c._id === senderCustomerId);
		if (c) {
			setSenderName(c.company);
			setSenderAddress(c.address || "");
			setSenderCity(c.city || "");
			setSenderState(c.state || "");
			setSenderPin(c.pin || "");
			setSenderPhone(c.phone || "");
			setSenderEmail(c.email || "");
			setSenderGstin(c.gstin || "");
			setCustomer(c._id); // Set main customer to sender
		}
	}, [senderCustomerId, customers]);

	// Autofill receiver details when receiverCustomerId changes
	useEffect(() => {
		if (!receiverCustomerId) return;
		const c = customers.find(c => c._id === receiverCustomerId);
		if (c) {
			setReceiverName(c.company);
			setReceiverAddress(c.address || "");
			setReceiverCity(c.city || "");
			setReceiverState(c.state || "");
			setReceiverPin(c.pin || "");
			setReceiverPhone(c.phone || "");
			setReceiverEmail(c.email || "");
			setReceiverGstin(c.gstin || "");
		}
	}, [receiverCustomerId, customers]);

	// Add navigation and form logic
	const handleSave = async (e: React.FormEvent) => {
		console.log('Edit mode:', editMode, 'LR ID:', lrId);
		console.log('Form submitted');
		e.preventDefault();
		// Minimal validation for required fields
		const newErrors: { [key: string]: string } = {};
		if (!awbNumber) newErrors.awbNumber = "AWB Number is required";
		if (!date) newErrors.date = "Date is required";
		if (!customerType) newErrors.customerType = "Customer Type is required";
		if (!shipmentType) newErrors.shipmentType = "Shipment Type is required";
		if (!senderState) newErrors.senderState = "Sender State is required";
		if (!receiverState) newErrors.receiverState = "Receiver State is required";
		if (!senderName) newErrors.senderName = "Sender Name is required";
		if (!receiverName) newErrors.receiverName = "Receiver Name is required";
		if (!customer) newErrors.customer = "Customer is required";
		// Add more required field checks as needed
		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}
		setErrors({});
		// Compose backend payload with required fields
		const data = {
			lrNumber: awbNumber,
			bookingDate: date,
			status: 'Booked' as 'Booked', // fix type for backend
			customer,
			consignor: {
				name: senderName,
				address: senderAddress,
				city: senderCity,
				state: senderState,
				pin: senderPin,
				phone: senderPhone,
				email: senderEmail,
				gstin: senderGstin,
			},
			consignee: {
				name: receiverName,
				address: receiverAddress,
				city: receiverCity,
				state: receiverState,
				pin: receiverPin,
				phone: receiverPhone,
				email: receiverEmail,
				gstin: receiverGstin,
			},
			shipmentDetails: {
				numberOfArticles: Number(numPackages),
				actualWeight: Number(actualWeight),
				chargedWeight: Number(chargedWeight),
				descriptionOfGoods: shipmentDescription
			},
			charges: {
				paymentType,
				freight,
				docketCharge,
				doorDeliveryCharge,
				handlingCharge,
				pickupCharge,
				transhipmentCharge,
				insurance,
				fuelSurcharge,
				commission,
				other,
				carrierRisk,
				ownerRisk,
				gstCharge,
				total,
			},
			// add other fields as needed
		};
		try {
			console.log('Submitting LR', { editMode, lrId, data });
			if (editMode && lrId) {
				await lrApi.update(lrId, data);
				alert('LR updated successfully!');
			} else {
				await lrApi.create(data);
				alert('LR created successfully!');
			}
			navigate(`/lrs/${lrId}`);
		} catch (err: any) {
			alert('Failed to create LR: ' + (err && err.message ? err.message : err));
		}
	};
	const handleBack = () => {
		navigate('/lrs');
	};

	return (
		<form className="p-6 bg-gray-50 min-h-screen dark:bg-gray-900" onSubmit={handleSave}>
			{/* Date And Time Section */}
			<div className="mb-6 p-6 rounded shadow bg-white dark:bg-gray-800">
				<h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Date And Time</h2>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
					<div>
						<label htmlFor="awbNumber" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
							AWB Number <span className="text-xs text-red-500">Leave blank for auto generate</span>
						</label>
						<input
							id="awbNumber"
							type="text"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							placeholder="Auto Generate AWB Number"
							value={awbNumber}
							onChange={e => setAwbNumber(e.target.value)}
						/>
						{errors.awbNumber && <div className="text-red-500 text-xs mt-1">{errors.awbNumber}</div>}
					</div>
					<div>
						<label htmlFor="code" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
							Code<span className="text-xs text-gray-500 ml-1">(11-SPICE,12-ASIAN)</span>
						</label>
						<input
							id="code"
							type="text"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							placeholder="Code"
							value={code}
							onChange={e => setCode(e.target.value)}
						/>
					</div>
					<div>
						<label htmlFor="date" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Date</label>
						<input
							id="date"
							type="date"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							value={date}
							onChange={e => setDate(e.target.value)}
						/>
						{errors.date && <div className="text-red-500 text-xs mt-1">{errors.date}</div>}
					</div>
					<div>
						<label htmlFor="time" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Time</label>
						<input
							id="time"
							type="time"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							value={time}
							onChange={e => setTime(e.target.value)}
						/>
					</div>
				</div>
			</div>

			{/* Shipment Type Section */}
			<div className="bg-white dark:bg-gray-800 rounded shadow p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Shipment Type</h2>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Customer Type</label>
						<select
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							value={customerType}
							onChange={e => setCustomerType(e.target.value)}
						>
							{customerTypes.map(type => (
								<option key={type} value={type}>{type}</option>
							))}
						</select>
						{errors.customerType && <div className="text-red-500 text-xs mt-1">{errors.customerType}</div>}
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Shipment Type</label>
						<select
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							value={shipmentType}
							onChange={e => setShipmentType(e.target.value)}
						>
							{shipmentTypes.map(type => (
								<option key={type} value={type}>{type}</option>
							))}
						</select>
						{errors.shipmentType && <div className="text-red-500 text-xs mt-1">{errors.shipmentType}</div>}
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Transport Type</label>
						<select
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							value={transportType}
							onChange={e => setTransportType(e.target.value)}
						>
							{transportTypes.map(type => (
								<option key={type} value={type}>{type}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Rate Type</label>
						<select
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							value={rateType}
							onChange={e => setRateType(e.target.value)}
						>
							{rateTypes.map(type => (
								<option key={type} value={type}>{type}</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Sender and Receiver Information Section */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				{/* Sender's Information */}
				<div className="bg-white dark:bg-gray-800 rounded shadow p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sender's Information</h2>
						<div className="relative">
							<input
								type="text"
								className="border rounded px-4 py-1 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
								placeholder="Search sender by name, code, or ID"
								value={senderName}
								onChange={e => {
									setSenderName(e.target.value);
									setSenderCustomerId("");
								}}
								autoComplete="off"
								disabled={loadingCustomers}
							/>
							{senderName && !senderCustomerId && (
								<div className="absolute z-10 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow mt-1 max-h-40 overflow-y-auto">
									{customers.filter(c =>
										c.company.toLowerCase().includes(senderName.toLowerCase()) ||
										c.code.toLowerCase().includes(senderName.toLowerCase()) ||
										c._id.toLowerCase().includes(senderName.toLowerCase())
									).map(c => (
										<div
											key={c._id}
											className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
											onClick={() => {
												setSenderCustomerId(c._id);
												setSenderName(c.company);
												setSenderAddress(c.address || "");
												setSenderCity(c.city || "");
												setSenderState(c.state || "");
												setSenderPin(c.pin || "");
												setSenderPhone(c.phone || "");
												setSenderEmail(c.email || "");
												setSenderGstin(c.gstin || "");
											}}
										>
											{c.company} ({c.code})
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					<div className="space-y-3">
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Name *</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Name" value={senderName} onChange={e => setSenderName(e.target.value)} />
							{errors.senderName && <div className="text-red-500 text-xs mt-1">{errors.senderName}</div>}
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Address</label>
							<textarea className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Enter a location" rows={2} value={senderAddress} onChange={e => setSenderAddress(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">State *</label>
							<select className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={senderState} onChange={e => setSenderState(e.target.value)}>
								<option value="">--- Select Here ---</option>
								{indianStates.map(state => (
									<option key={state} value={state}>{state}</option>
								))}
							</select>
							{errors.senderState && <div className="text-red-500 text-xs mt-1">{errors.senderState}</div>}
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">City *</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="NAGPUR" value={senderCity} onChange={e => setSenderCity(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Pin Code</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Pin Code" value={senderPin} onChange={e => setSenderPin(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Mobile</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Phone" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Email</label>
							<input type="email" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">GST No.</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="GST No." value={senderGstin} onChange={e => setSenderGstin(e.target.value)} />
						</div>
					</div>
				</div>

				{/* Receiver's Information */}
				<div className="bg-white dark:bg-gray-800 rounded shadow p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Receiver's Information</h2>
						<div className="relative">
							<input
								type="text"
								className="border rounded px-4 py-1 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
								placeholder="Search receiver by name, code, or ID"
								value={receiverName}
								onChange={e => {
									setReceiverName(e.target.value);
									setReceiverCustomerId("");
								}}
								autoComplete="off"
								disabled={loadingCustomers}
							/>
							{receiverName && !receiverCustomerId && (
								<div className="absolute z-10 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow mt-1 max-h-40 overflow-y-auto">
									{customers.filter(c =>
										c.company.toLowerCase().includes(receiverName.toLowerCase()) ||
										c.code.toLowerCase().includes(receiverName.toLowerCase()) ||
										c._id.toLowerCase().includes(receiverName.toLowerCase())
									).map(c => (
										<div
											key={c._id}
											className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
											onClick={() => {
												setReceiverCustomerId(c._id);
												setReceiverName(c.company);
												setReceiverAddress(c.address || "");
												setReceiverCity(c.city || "");
												setReceiverState(c.state || "");
												setReceiverPin(c.pin || "");
												setReceiverPhone(c.phone || "");
												setReceiverEmail(c.email || "");
												setReceiverGstin(c.gstin || "");
											}}
										>
											{c.company} ({c.code})
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					<div className="space-y-3">
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Name *</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Name" value={receiverName} onChange={e => setReceiverName(e.target.value)} />
							{errors.receiverName && <div className="text-red-500 text-xs mt-1">{errors.receiverName}</div>}
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Address</label>
							<textarea className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Enter a location" rows={2} value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">State *</label>
							<select className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={receiverState} onChange={e => setReceiverState(e.target.value)}>
								<option value="">--- Select Here ---</option>
								{indianStates.map(state => (
									<option key={state} value={state}>{state}</option>
								))}
							</select>
							{errors.receiverState && <div className="text-red-500 text-xs mt-1">{errors.receiverState}</div>}
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">City *</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="NAGPUR" value={receiverCity} onChange={e => setReceiverCity(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Pin Code</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Pin Code" value={receiverPin} onChange={e => setReceiverPin(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Mobile</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Phone" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Email</label>
							<input type="email" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="Email" value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} />
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">GST No.</label>
							<input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" placeholder="GST No." value={receiverGstin} onChange={e => setReceiverGstin(e.target.value)} />
						</div>
					</div>
				</div>
			</div>

			{/* Bill To Section */}
			<div className="bg-white dark:bg-gray-800 rounded shadow p-4 mb-6 flex items-center gap-6">
				<span className="text-sm font-medium text-gray-900 dark:text-gray-100">Bill To:</span>
				<label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
					<input type="radio" name="billTo" value="sender" defaultChecked className="accent-primary" /> Sender
				</label>
				<label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-200">
					<input type="radio" name="billTo" value="receiver" className="accent-primary" /> Receiver
				</label>
			</div>

			{/* Shipment Info Section */}
			<div className="bg-white dark:bg-gray-800 rounded shadow p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Shipment Info</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Expected Delivery Date</label>
						<input
							type="date"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							value={expectedDelivery}
							onChange={e => setExpectedDelivery(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Shipment Value</label>
						<input
							type="text"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							placeholder="Total value of the shipment(s)"
							value={shipmentValue}
							onChange={e => setShipmentValue(e.target.value)}
						/>
					</div>
				</div>
				<div className="mb-4">
					<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Shipment Description</label>
					<textarea
						className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
						placeholder="What's inside the shipment i.e. Mobile, Laptop, Clothes etc."
						rows={2}
						value={shipmentDescription}
						onChange={e => setShipmentDescription(e.target.value)}
					/>
				</div>
				<div className="mb-4">
					<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Attachment(Invoice Copy etc.)</label>
					<input
						type="file"
						className="block border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
						onChange={() => {/* file attachment not implemented yet */ }}
					/>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">No. of Packages</label>
						<input
							type="number"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							value={numPackages}
							onChange={e => setNumPackages(e.target.value)}
							min={1}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Actual Weight (Kgs)</label>
						<input
							type="number"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							placeholder="Weight in Kgs"
							value={actualWeight}
							onChange={e => setActualWeight(e.target.value)}
							min={0}
							step="any"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Charged Weight (Kgs)</label>
						<input
							type="number"
							className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
							placeholder="Weight in Kgs"
							value={chargedWeight}
							onChange={e => setChargedWeight(e.target.value)}
							min={0}
							step="any"
						/>
					</div>
				</div>
			</div>

			{/* Taxes & Duties Section */}
			<div className="bg-white dark:bg-gray-800 rounded shadow p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Taxes & Duties</h2>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Freight</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={freight} onChange={e => setFreight(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Docket Charge</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={docketCharge} onChange={e => setDocketCharge(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Door Dly.Charge</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={doorDeliveryCharge} onChange={e => setDoorDeliveryCharge(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Handling Charge</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={handlingCharge} onChange={e => setHandlingCharge(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Pickup Charge</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={pickupCharge} onChange={e => setPickupCharge(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Transhipment Charge</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={transhipmentCharge} onChange={e => setTranshipmentCharge(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Insurance</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={insurance} onChange={e => setInsurance(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Fuel Surcharge</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={fuelSurcharge} onChange={e => setFuelSurcharge(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Commission</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={commission} onChange={e => setCommission(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Other</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={other} onChange={e => setOther(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Carrier Risk</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={carrierRisk} onChange={e => setCarrierRisk(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Owner Risk</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={ownerRisk} onChange={e => setOwnerRisk(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">GST Charge</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={gstCharge} onChange={e => setGstCharge(Number(e.target.value))} />
					</div>
					<div>
						<label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Total</label>
						<input type="number" className="w-full border rounded px-3 py-2 text-sm font-bold bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={total} onChange={e => setTotal(Number(e.target.value))} />
					</div>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-between items-center mt-6">
				<button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">Save</button>
				<div className="flex gap-2">
					<button type="button" className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700" onClick={handleBack}>Back to Shipments</button>
				</div>
			</div>
		</form>
	);
}
