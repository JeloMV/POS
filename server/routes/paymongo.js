const express = require('express');
const router = express.Router();
const paymongo = require('../paymongo');
const db = require('../db');

// Create a PayMongo Payment Link for GCash / Cards
router.post('/create-link', async (req, res) => {
  try {
    const { order_id, amount, branch_name } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ success: false, error: 'Order ID and amount are required' });
    }

    const description = `Chick N Pastil Order #${String(order_id).padStart(4, '0')}`;
    const remarks = `${branch_name || 'Balagtas Branch'} - POS`;

    const result = await paymongo.createPaymentLink({
      amount: parseFloat(amount),
      description,
      remarks
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Save temporary reference to order
    await db.query(
      `UPDATE orders SET notes = CONCAT(IFNULL(notes, ''), ' [PayMongo Link: ', ?, ']') WHERE order_id = ?`,
      [result.linkId, order_id]
    );

    res.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      linkId: result.linkId,
      referenceNumber: result.referenceNumber,
      status: result.status
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check status of a PayMongo Payment Link
router.get('/check-status/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;
    const result = await paymongo.getPaymentLink(linkId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook listener
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body.data;
    console.log('Received PayMongo webhook event:', event?.attributes?.type);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
