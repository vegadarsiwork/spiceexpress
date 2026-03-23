// Company configuration for multi-company support
// Code 11 = SPICE EXPRESS, Code 12 = ASIAN TRADES LINK

const companies = {
    '11': {
        code: '11',
        name: 'SPICE EXPRESS',
        tagline: 'On Time Every Time',
        address: 'Block D, Plot No. D 464, Martin nagar, Mankapur, Nagpur - 440002',
        gstin: '27AEMFS2408G1ZY',
        pan: 'AEMFS2408G',
        email: 'info@spiceexpress.co.in',
        website: 'www.spiceexpress.in',
        phone: '',
        hsnCode: '9969',
        bankName: 'ICICI Bank Ltd',
        accountName: 'SPICE EXPRESS',
        accountNo: '202705002621',
        ifsc: 'ICIC0002027',
        micr: '440229017',
        stateCode: '27',
        state: 'Maharashtra',
        logoPath: '/uploads/logos/spice-logo.png'
    },
    '12': {
        code: '12',
        name: 'ASIAN TRADES LINK',
        tagline: '',
        address: 'Block D, Plot No. D 464, Martin Nagar, Jaripatka, Nagpur 440014',
        gstin: '27AMFPC7111F2ZI',
        pan: 'AMFPC7111F',
        email: 'railcargo@atls.org.in',
        website: 'www.spiceexpress.in',
        phone: '',
        hsnCode: '9969',
        bankName: 'KOTAK MAHINDRA BANK',
        accountName: 'ASIAN TRADES LINK',
        accountNo: '0948644922',
        ifsc: 'KKBK0001851',
        micr: '',
        stateCode: '27',
        state: 'Maharashtra',
        logoPath: '/uploads/logos/asian-logo.jpg'
    }
};

// Default to SPICE EXPRESS
const defaultCompanyCode = '11';

export function getCompany(code) {
    return companies[code] || companies[defaultCompanyCode];
}

export function getCompanyByLR(lr) {
    // Get company from LR's companyCode field, fallback to default
    const code = lr?.companyCode || defaultCompanyCode;
    return getCompany(code);
}

export default companies;
