const axios = require("axios");

// Normalize to 10-digit Indian mobile number (strip +91 / 91 prefix)
const normalizePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

const sendSMS = async (phone, otp) => {
  const number = normalizePhone(phone);
  console.log(`[SMS] Sending OTP to ${number}`);

  const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
    params: {
      authorization: process.env.FAST2SMS_API_KEY,
      route: 'q',
      message: `${otp} is your Cloakbe OTP. Do not share it with anyone.`,
      language: 'english',
      flash: 0,
      numbers: number,
    },
  });

  console.log('[SMS] Fast2SMS response:', response.data);

  if (!response.data?.return) {
    throw new Error(response.data?.message || 'SMS delivery failed');
  }
};

module.exports = sendSMS;