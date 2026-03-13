const Box = require('../models/Box');
const Order = require('../models/Order');
const { asyncHandler, validateObjectId } = require('../utils/helpers');

// POST /api/sim/box/:boxId/opened
// Simulates the hardware latch confirming the box has physically opened.
// In production this callback would come from the IoT gateway, not be called manually.
// Box: OPEN_REQUESTED → OCCUPIED_OPEN
// Order: READY_FOR_PICKUP → IN_PROGRESS
const simulateOpened = asyncHandler(async (req, res) => {
  const { boxId } = req.params;
  if (!validateObjectId(boxId)) {
    return res.status(400).json({ success: false, message: 'Invalid boxId format' });
  }

  const box = await Box.findById(boxId);
  if (!box) return res.status(404).json({ success: false, message: 'Box not found' });

  if (box.boxStatus !== 'OPEN_REQUESTED') {
    return res.status(409).json({
      success: false,
      message: `Expected box in OPEN_REQUESTED state, got ${box.boxStatus}`,
    });
  }

  // Find the active order for this box and advance it to IN_PROGRESS
  const order = await Order.findOneAndUpdate(
    { boxId, status: 'READY_FOR_PICKUP' },
    { status: 'IN_PROGRESS' },
    { new: true }
  );

  await Box.findByIdAndUpdate(boxId, { boxStatus: 'OCCUPIED_OPEN' });

  res.json({
    success: true,
    message: 'Hardware confirmed: box is open. Access mode active.',
    data: {
      boxId,
      boxStatus: 'OCCUPIED_OPEN',
      orderId: order?.orderId,
      orderStatus: 'IN_PROGRESS',
    },
  });
});

module.exports = { simulateOpened };
