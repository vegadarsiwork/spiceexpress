# Spice Express LR (Lorry Receipt) System

## Overview
This system handles the generation and management of Lorry Receipts (LRs) for Spice Express logistics operations. The LR format matches the company's standard business document structure.

## LR Structure

### Required Fields
- **lrNumber**: Unique LR number (auto-generated if not provided)
- **date**: LR date (defaults to current date)
- **senderName**: Sender's company name
- **senderAddress**: Complete sender address
- **senderCity**: Sender's city
- **senderCode**: Sender's customer code
- **receiverName**: Receiver's company name
- **receiverAddress**: Complete receiver address
- **receiverCity**: Receiver's city
- **receiverCode**: Receiver's customer code
- **origin**: Origin city (e.g., "NAGPUR")
- **destination**: Destination city (e.g., "INDORE")
- **actualWeight**: Actual weight in KG (e.g., 5.000)
- **chargedWeight**: Charged weight in KG (e.g., 50.000)
- **contents**: Contents description or ID
- **declaredValue**: Declared value in INR
- **customerCode**: Customer reference code

### Optional Fields
- **packages**: Number of packages (default: 1)
- **mode**: Transport mode (default: "ROAD")
- **bookingBasis**: Booking basis (e.g., "FULL TRUCK LOAD")
- **contractNo**: Contract number
- **rate**: Rate per KG
- **amount**: Total amount
- **status**: LR status (pending, in-transit, delivered, cancelled)

## API Endpoints

### Create LR
```http
POST /api/lr
Content-Type: application/json

{
  "senderName": "TATA HITACHI CONSTRUCTIONS PRIVATE IND",
  "senderAddress": "TATA HITACHI CENTRAL WEARHOUSE, SHWETAL LOGISTICS DHANBAD ROAD MANIKON",
  "senderCity": "NAGPUR",
  "senderCode": "100001",
  "receiverName": "ES INFRASERVE PVT LTD",
  "receiverAddress": "Ring Road, Scheme No.94, EB-24",
  "receiverCity": "Indore",
  "receiverCode": "100154",
  "origin": "NAGPUR",
  "destination": "INDORE",
  "actualWeight": 5.000,
  "chargedWeight": 50.000,
  "contents": "39127379",
  "declaredValue": 4030.00,
  "customerCode": "100001"
}
```

### Get All LRs
```http
GET /api/lr
GET /api/lr?customerCode=100001
GET /api/lr?fromDate=2025-07-01&toDate=2025-07-31
```

### Get LR by ID
```http
GET /api/lr/:id
```

### Download LR PDF
```http
GET /api/lr/:id/download
```

### Get LR Count
```http
GET /api/lr/count?customerId=100001&startDate=2025-07-01&endDate=2025-07-31
```

## LR Number Generation

LR numbers are automatically generated in the format: `YYYYMMDDXX` where:
- `YYYY`: 4-digit year
- `MM`: 2-digit month
- `DD`: 2-digit day
- `XX`: 2-digit sequence number for that day

Example: `2025071502` (July 15, 2025, LR #02)

## PDF Generation

The system generates PDFs using Puppeteer with the following features:
- Professional layout matching company standards
- Company logo placeholder (red circle)
- All required business information
- Proper formatting for weights, amounts, and dates
- Signature sections for sender and receiver
- Declaration and acknowledgment sections

## Business Rules

1. **LR Numbers**: Must be unique across the system
2. **Weights**: Actual and charged weights must be positive numbers
3. **Dates**: Cannot be in the future (unless specifically allowed)
4. **Amounts**: Declared values must be positive numbers
5. **Status**: Defaults to "pending", can be updated to "in-transit", "delivered", or "cancelled"

## Data Validation

The system validates:
- Required fields are present
- Numeric fields are positive
- Date formats are correct
- LR numbers are unique
- Customer codes exist in the system

## Error Handling

The system provides detailed error messages for:
- Missing required fields
- Invalid data formats
- Duplicate LR numbers
- Non-existent customers
- PDF generation failures

## Testing

Use the provided test data in `test-data.js` to test the system:
- Sample LR data matching the image structure
- Sample customer data
- Helper functions for validation and calculation

## Integration

The LR system integrates with:
- Customer management (referenced by customerCode)
- Invoice generation (LRs can be included in invoices)
- Analytics (business metrics and reporting)
- Annexure system (documentation tracking)
