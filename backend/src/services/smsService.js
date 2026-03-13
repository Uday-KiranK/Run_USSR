const axios = require("axios");

const sendSMS = async (phone, otp) => {
  try {
    const response = await axios({
      method: "POST",
      url: "https://www.fast2sms.com/dev/bulkV2",
      headers: {
        authorization: "FE8g60zBHocMmIvLhZu53JfNTksR7Xjlp4yP9wGQei2CYUKraDl5oH7k4SYz0n8vbtTyjAQ2B1mF6Kiq",
        "Content-Type": "application/json"
      },
      data: {
        route: "q",
        message: `Your Cloakbe OTP is ${otp}`,
        numbers: phone
      }
    });

    console.log("SMS sent:", response.data);

  } catch (error) {
    console.error("SMS error:", error.response?.data || error.message);
  }
};

module.exports = sendSMS;