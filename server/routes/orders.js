const express = require('express');
const router = express.Router();
const db = require('../db');

function generateTxnNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${dateStr}-${randomNum}`;
}

router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      cust_name,
      contact_number,
      other_contact,
      notes,
      branch_name,
      order_type,
      order_status,
      items
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Order must contain at least one item' });
    }

    let calculatedTotal = 0;
    for (const item of items) {
      let itemTotal = Number(item.unit_price) * Number(item.quantity || 1);
      if (item.addons && Array.isArray(item.addons)) {
        for (const addon of item.addons) {
          itemTotal += Number(addon.addon_price || 0) * Number(addon.quantity || 1);
        }
      }
      calculatedTotal += itemTotal;
    }

    const initialStatus = order_status || 'Pending';

    const [orderResult] = await connection.query(
      `INSERT INTO orders (cust_name, contact_number, other_contact, order_status, order_total, notes, branch_name, order_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cust_name || 'Walk-in Customer',
        contact_number || '',
        other_contact || '',
        initialStatus,
        calculatedTotal,
        notes || '',
        branch_name || 'Balagtas',
        order_type || 'Dine-In'
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      const itemQty = Number(item.quantity || 1);
      const itemUnitPrice = Number(item.unit_price);
      let itemSubtotal = itemUnitPrice * itemQty;

      const [itemResult] = await connection.query(
        `INSERT INTO order_items (order_id, product_id, item_name, unit_price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.item_name, itemUnitPrice, itemQty, itemSubtotal]
      );

      const orderItemId = itemResult.insertId;

      if (item.addons && Array.isArray(item.addons)) {
        for (const addon of item.addons) {
          const addonPrice = Number(addon.addon_price || 0);
          const addonQty = Number(addon.quantity || 1);
          const addonSubtotal = addonPrice * addonQty;

          await connection.query(
            `INSERT INTO order_item_addons (order_item_id, addon_id, addon_name, addon_price, quantity, subtotal)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [orderItemId, addon.addon_id || null, addon.addon_name, addonPrice, addonQty, addonSubtotal]
          );
        }
      }
    }

    await connection.commit();
    res.json({
      success: true,
      order_id: orderId,
      order_total: calculatedTotal,
      message: 'Order created successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const {
      cust_name,
      contact_number,
      other_contact,
      notes,
      order_type,
      order_status,
      payment_status
    } = req.body;

    const allowed_order = ['Pending', 'Preparing', 'Completed', 'Cancelled'];
    const allowed_payment = ['Pending', 'Verified', 'Failed', 'Refunded'];

    if (order_status && !allowed_order.includes(order_status)) {
      return res.status(400).json({ success: false, error: 'Invalid order_status value' });
    }
    if (payment_status && !allowed_payment.includes(payment_status)) {
      return res.status(400).json({ success: false, error: 'Invalid payment_status value' });
    }

    const updates = [];
    const params = [];

    if (cust_name !== undefined) { updates.push('cust_name = ?'); params.push(cust_name); }
    if (contact_number !== undefined) { updates.push('contact_number = ?'); params.push(contact_number); }
    if (other_contact !== undefined) { updates.push('other_contact = ?'); params.push(other_contact); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (order_type !== undefined) { updates.push('order_type = ?'); params.push(order_type); }
    if (order_status !== undefined) { updates.push('order_status = ?'); params.push(order_status); }

    if (updates.length > 0) {
      params.push(orderId);
      await db.query(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`, params);
    }

    if (payment_status !== undefined) {
      const [existingPay] = await db.query('SELECT payment_id FROM payments WHERE order_id = ?', [orderId]);
      if (existingPay.length > 0) {
        await db.query('UPDATE payments SET payment_status = ? WHERE order_id = ?', [payment_status, orderId]);
      } else {
        // If updating payment_status for an unpaid order (e.g. Failed / Pending)
        const [orders] = await db.query('SELECT order_total FROM orders WHERE order_id = ?', [orderId]);
        const orderTotal = orders.length ? orders[0].order_total : 0;
        await db.query(
          `INSERT INTO payments (order_id, payment_method, amount_due, amount_paid, change_amount, payment_status)
           VALUES (?, 'Cash', ?, 0, 0, ?)`,
          [orderId, orderTotal, payment_status]
        );
      }
    }

    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Order update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { order_status, payment_status } = req.body;

    const allowed_order = ['Pending', 'Preparing', 'Completed', 'Cancelled'];
    const allowed_payment = ['Pending', 'Verified', 'Failed', 'Refunded'];

    if (order_status && !allowed_order.includes(order_status)) {
      return res.status(400).json({ success: false, error: 'Invalid order_status value' });
    }
    if (payment_status && !allowed_payment.includes(payment_status)) {
      return res.status(400).json({ success: false, error: 'Invalid payment_status value' });
    }

    if (order_status) {
      await db.query('UPDATE orders SET order_status = ? WHERE order_id = ?', [order_status, orderId]);
    }
    if (payment_status) {
      const [existingPay] = await db.query('SELECT payment_id FROM payments WHERE order_id = ?', [orderId]);
      if (existingPay.length > 0) {
        await db.query('UPDATE payments SET payment_status = ? WHERE order_id = ?', [payment_status, orderId]);
      }
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/pay', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = req.params.id;
    const {
      payment_method,
      amount_due,
      amount_paid,
      change_amount,
      gcash_reference_number,
      paymongo_payment_intent_id,
      receipt_type
    } = req.body;

    const [orders] = await connection.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orders[0];
    const due = parseFloat(amount_due !== undefined ? amount_due : order.order_total);
    const paid = parseFloat(amount_paid !== undefined ? amount_paid : due);
    const change = parseFloat(change_amount !== undefined ? change_amount : Math.max(0, paid - due));

    let paymentId;
    const [existingPay] = await connection.query('SELECT payment_id FROM payments WHERE order_id = ?', [orderId]);
    if (existingPay.length > 0) {
      paymentId = existingPay[0].payment_id;
      await connection.query(
        `UPDATE payments
         SET payment_method = ?, amount_due = ?, amount_paid = ?, change_amount = ?, gcash_reference_number = ?, payment_status = 'Verified', paymongo_payment_intent_id = ?, paid_at = NOW()
         WHERE payment_id = ?`,
        [
          payment_method || 'Cash',
          due,
          paid,
          change,
          gcash_reference_number || null,
          paymongo_payment_intent_id || null,
          paymentId
        ]
      );
    } else {
      const [payResult] = await connection.query(
        `INSERT INTO payments (order_id, payment_method, amount_due, amount_paid, change_amount, gcash_reference_number, payment_status, paymongo_payment_intent_id, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, 'Verified', ?, NOW())`,
        [
          orderId,
          payment_method || 'Cash',
          due,
          paid,
          change,
          gcash_reference_number || null,
          paymongo_payment_intent_id || null
        ]
      );
      paymentId = payResult.insertId;
    }

    let txnNumber;
    let receiptId;
    const [existingReceipt] = await connection.query('SELECT receipt_id, transaction_number FROM receipts WHERE order_id = ?', [orderId]);
    if (existingReceipt.length > 0) {
      receiptId = existingReceipt[0].receipt_id;
      txnNumber = existingReceipt[0].transaction_number;
      await connection.query('UPDATE receipts SET payment_id = ?, issued_at = NOW() WHERE receipt_id = ?', [paymentId, receiptId]);
    } else {
      txnNumber = generateTxnNumber();
      const [receiptResult] = await connection.query(
        `INSERT INTO receipts (order_id, payment_id, transaction_number, receipt_type, issued_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [orderId, paymentId, txnNumber, receipt_type || 'Printed']
      );
      receiptId = receiptResult.insertId;
    }

    await connection.query(
      `UPDATE orders SET order_status = 'Completed' WHERE order_id = ?`,
      [orderId]
    );

    await connection.commit();

    res.json({
      success: true,
      payment_id: paymentId,
      transaction_number: txnNumber,
      receipt_id: receiptId,
      change_amount: change,
      message: 'Payment verified and receipt generated'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Payment processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, branch, status, paymentMethod, search, todayOnly } = req.query;

    let sql = `
      SELECT
        o.order_id,
        o.order_datetime,
        o.cust_name,
        o.contact_number,
        o.other_contact,
        o.order_status,
        o.order_total,
        o.notes,
        o.branch_name,
        o.order_type,
        p.payment_id,
        COALESCE(p.payment_method, 'Unpaid') AS payment_method,
        COALESCE(p.amount_due, o.order_total) AS amount_due,
        COALESCE(p.amount_paid, 0.00) AS amount_paid,
        COALESCE(p.change_amount, 0.00) AS change_amount,
        p.gcash_reference_number,
        COALESCE(p.payment_status, IF(o.order_status = 'Cancelled', 'Failed', 'Pending')) AS payment_status,
        p.paid_at,
        r.receipt_id,
        r.transaction_number,
        r.issued_at
      FROM orders o
      LEFT JOIN payments p ON o.order_id = p.order_id
      LEFT JOIN receipts r ON o.order_id = r.order_id
      WHERE 1=1
    `;

    const params = [];

    if (todayOnly === 'true') {
      sql += ' AND DATE(o.order_datetime) = CURDATE()';
    } else {
      if (startDate) {
        sql += ' AND DATE(o.order_datetime) >= ?';
        params.push(startDate);
      }
      if (endDate) {
        sql += ' AND DATE(o.order_datetime) <= ?';
        params.push(endDate);
      }
    }

    if (branch && branch !== 'All Branches') {
      sql += ' AND o.branch_name = ?';
      params.push(branch);
    }

    if (status && status !== 'All') {
      sql += ' AND o.order_status = ?';
      params.push(status);
    }

    if (paymentMethod && paymentMethod !== 'All') {
      sql += ' AND p.payment_method = ?';
      params.push(paymentMethod);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ' AND (o.cust_name LIKE ? OR o.order_id LIKE ? OR r.transaction_number LIKE ? OR p.gcash_reference_number LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY o.order_datetime DESC, o.order_id DESC';

    const [orders] = await db.query(sql, params);

    const orderIds = orders.map(o => o.order_id);
    let itemsMap = {};

    if (orderIds.length > 0) {
      const [items] = await db.query(
        `SELECT oi.*, mp.product_name
         FROM order_items oi
         LEFT JOIN menu_products mp ON oi.product_id = mp.product_id
         WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
        orderIds
      );

      const itemIds = items.map(i => i.order_item_id);
      let addonsMap = {};
      if (itemIds.length > 0) {
        const [addons] = await db.query(
          `SELECT * FROM order_item_addons WHERE order_item_id IN (${itemIds.map(() => '?').join(',')})`,
          itemIds
        );
        for (const a of addons) {
          if (!addonsMap[a.order_item_id]) addonsMap[a.order_item_id] = [];
          addonsMap[a.order_item_id].push(a);
        }
      }

      for (const item of items) {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        item.addons = addonsMap[item.order_item_id] || [];
        itemsMap[item.order_id].push(item);
      }
    }

    const result = orders.map(o => ({
      ...o,
      items: itemsMap[o.order_id] || []
    }));

    res.json({ success: true, count: result.length, orders: result });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const [orders] = await db.query(
      `SELECT o.*,
              p.payment_id,
              COALESCE(p.payment_method, 'Unpaid') AS payment_method,
              COALESCE(p.amount_due, o.order_total) AS amount_due,
              COALESCE(p.amount_paid, 0.00) AS amount_paid,
              COALESCE(p.change_amount, 0.00) AS change_amount,
              p.gcash_reference_number,
              COALESCE(p.payment_status, IF(o.order_status = 'Cancelled', 'Failed', 'Pending')) AS payment_status,
              p.paid_at,
              r.receipt_id, r.transaction_number, r.issued_at
       FROM orders o
       LEFT JOIN payments p ON o.order_id = p.order_id
       LEFT JOIN receipts r ON o.order_id = r.order_id
       WHERE o.order_id = ?`,
      [orderId]
    );

    if (!orders.length) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orders[0];

    const [items] = await db.query(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    const itemIds = items.map(i => i.order_item_id);
    let addonsMap = {};
    if (itemIds.length > 0) {
      const [addons] = await db.query(
        `SELECT * FROM order_item_addons WHERE order_item_id IN (${itemIds.map(() => '?').join(',')})`,
        itemIds
      );
      for (const a of addons) {
        if (!addonsMap[a.order_item_id]) addonsMap[a.order_item_id] = [];
        addonsMap[a.order_item_id].push(a);
      }
    }

    order.items = items.map(i => ({
      ...i,
      addons: addonsMap[i.order_item_id] || []
    }));

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
