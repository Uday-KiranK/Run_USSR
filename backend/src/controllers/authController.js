const { generateOTP } = require("../utils/helpers");
const OtpToken = require("../models/OtpToken");
const jwt = require("jsonwebtoken");


// SEND OTP
exports.sendOTP = async (req, res) => {
  try {

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const otp = generateOTP();

    await OtpToken.create({
      phone,
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    console.log(`Generated OTP for ${phone} → ${otp}`);

    res.json({
      message: "OTP sent successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// VERIFY OTP
exports.verifyOTP = async (req, res) => {
  try {

    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP required" });
    }

    const record = await OtpToken.findOne({ phone, otp });

    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const user = {
      _id: record._id,
      phone: phone,
      role: "user"
    };

    const token = jwt.sign(
      user,
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1h" }
    );

    res.json({
      message: "OTP verified",
      token,
      user
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};