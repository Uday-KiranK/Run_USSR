const sendSMS = require("../services/smsService");
const { generateOTP } = require("../utils/helpers");
const OtpToken = require("../models/OtpToken");
const Order = require("../models/Order");
const jwt = require("jsonwebtoken");


// SEND OTP
exports.sendOTP = async (req, res) => {
  try {

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const otp = generateOTP();

    // Save OTP in database (using teammate schema fields)
    await OtpToken.create({
      phoneNumber: phone,
      token: otp,
      expiryTime: Date.now() + 5 * 60 * 1000,
      flow: "LOGIN_SMS_OTP",
      channel: "SMS_ME"
    });

    // Send OTP via SMS
    await sendSMS(phone, otp);

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

    const record = await OtpToken.findOne({
      phoneNumber: phone,
      token: otp
    });

    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiryTime < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Mark OTP verified
    record.verified = true;
    await record.save();

    // Find or create a persistent User record so the same phone always gets the same userId
    let userRecord = await User.findOne({ phoneNumber: phone });
    const isNewUser = !userRecord;
    if (!userRecord) {
      userRecord = await User.create({ phoneNumber: phone, verified: true });
    }

    // For existing users only: migrate historical orders that have a stale/wrong userId
    // (created before the persistent-userId fix). New users have no legitimate orders yet,
    // so skipping the migration prevents them from accidentally inheriting orphaned orders.
    if (!isNewUser) {
      await Order.updateMany(
        { phoneNumber: phone, userId: { $ne: userRecord._id } },
        { $set: { userId: userRecord._id } }
      );
    }

    const tokenPayload = {
      userId: userRecord._id,
      phone: phone,
      role: "user"
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" }
    );

    res.json({
      message: "OTP verified",
      token,
      user: tokenPayload
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ADMIN LOGIN
exports.adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password)
      return res.status(400).json({ message: 'Phone and password required' });

    const user = await User.findOne({ phoneNumber: phone, role: 'ADMIN' });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, role: user.role, phone: user.phoneNumber },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({ message: 'Admin login successful', token, role: 'ADMIN' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};