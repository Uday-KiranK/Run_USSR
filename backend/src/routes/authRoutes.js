const express = require("express");
const router = express.Router();
const { sendOTP, verifyOTP, adminLogin } = require("../controllers/authController");

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/admin/login", adminLogin);

module.exports = router;