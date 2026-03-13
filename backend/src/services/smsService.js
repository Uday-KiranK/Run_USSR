const axios = require("axios");

const sendSMS = async (phone, otp) => {
  try {
    const response = await axios.get(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        params: {
          authorization: "FE8g60zBHocMmIvLhZu53JfNTksR7Xjlp4yP9wGQei2CYUKraDl5oH7k4SYz0n8vbtTyjAQ2B1mF6Kiq",
          route: "v3",
          message: `Your Cloakbe OTP is ${otp}`,
          numbers: phone
        }
      }
    );

    console.log("SMS sent:", response.data);

  } catch (error) {
    console.error("SMS error:", error.response?.data || error.message);
  }
};

module.exports = sendSMS;