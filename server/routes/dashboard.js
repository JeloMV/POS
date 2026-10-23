const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/stats', async (req, res) => {
  try {
    const { branch, filter } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (branch && branch !== 'All Branches') {
      whereClause += ' AND o.branch_name = ?';
      params.push(branch);
    }

    if (filter === 'today') {
      whereClause += " AND DATE(o.order_datetime) = DATE('now')";
    }

    const [orders] = await db.query(
      `SELECT o.order_id, o.order_total, o.order_status, o.branch_name,
              p.payment_method, p.amount_paid, p.payment_status
       FROM orders o
       LEFT JOIN payments p ON o.order_id = p.order_id
       ${whereClause}`,
      params
    );

    let totalOrders = orders.length;
    let totalSalesRevenue = 0;
    let totalCash = 0;
    let totalGCash = 0;
    let cashCount = 0;
    let gcashCount = 0;

    for (const ord of orders) {
      if (ord.order_status !== 'Cancelled') {
        const val = parseFloat(ord.order_total) || 0;
        totalSalesRevenue += val;

        if (ord.payment_method === 'Cash' && ord.payment_status === 'Verified') {
          totalCash += val;
          cashCount++;
        } else if (ord.payment_method === 'GCash' && ord.payment_status === 'Verified') {
          totalGCash += val;
          gcashCount++;
        }
      }
    }

    const activeBranch = branch && branch !== 'All Branches' ? branch : 'Balagtas';
    const alerts = [];

    // 1. Dynamic Surge / Velocity Check: Orders placed in the last 1 hour
    let surgeSql = `SELECT COUNT(*) AS recent_count, COALESCE(SUM(order_total), 0) AS recent_sales
                    FROM orders
                    WHERE order_datetime >= datetime('now', '-1 hour')
                      AND order_status != 'Cancelled'`;
    const surgeParams = [];
    if (branch && branch !== 'All Branches') {
      surgeSql += ' AND branch_name = ?';
      surgeParams.push(branch);
    }
    const [surgeRows] = await db.query(surgeSql, surgeParams);
    const recentOrders = surgeRows[0]?.recent_count || 0;

    const normalHourlyStandard = 5; // Standard operational baseline
    if (recentOrders >= normalHourlyStandard) {
      alerts.push({
        type: 'warning',
        title: `${activeBranch} Branch: High Sales Velocity`,
        message: `Surge alert: ${recentOrders} orders placed in the last 60 minutes (above standard rate of ${normalHourlyStandard}/hr). Kitchen supplies and active items may approach insufficient levels.`
      });
    } else {
      alerts.push({
        type: 'info',
        title: `${activeBranch} Branch: Standard Sales Rate`,
        message: `Operations steady: ${recentOrders} order(s) placed in the past hour. Sales volume is within standard operational thresholds.`
      });
    }

    // 2. Dynamic Product Demand / Depletion Risk Check
    let itemSql = `SELECT p.product_name, SUM(oi.quantity) AS sold_qty
                   FROM order_items oi
                   JOIN orders o ON oi.order_id = o.order_id
                   JOIN menu_products p ON oi.product_id = p.product_id
                   WHERE DATE(o.order_datetime) = DATE('now')
                     AND o.order_status != 'Cancelled'`;
    const itemParams = [];
    if (branch && branch !== 'All Branches') {
      itemSql += ' AND o.branch_name = ?';
      itemParams.push(branch);
    }
    itemSql += ' GROUP BY p.product_id, p.product_name ORDER BY sold_qty DESC LIMIT 1';

    const [fastItems] = await db.query(itemSql, itemParams);
    if (fastItems.length > 0 && fastItems[0].sold_qty >= 5) {
      alerts.push({
        type: 'warning',
        title: `${activeBranch} Branch: Fast-Moving Product Alert`,
        message: `'${fastItems[0].product_name}' has reached ${fastItems[0].sold_qty} portions sold today. Verify prep stock or commissary replenishment to prevent stockouts.`
      });
    }

    // 3. Dynamic Cash / GCash Reconciliation Check
    const paidCount = cashCount + gcashCount;
    if (paidCount > 0) {
      const gcashPct = Math.round((gcashCount / paidCount) * 100);
      if (gcashPct >= 40) {
        alerts.push({
          type: 'info',
          title: `${activeBranch} Branch: High Digital Payment Ratio`,
          message: `Strong GCash adoption (${gcashPct}% of today's verified orders). Ensure adequate physical loose change is reserved for remaining cash purchases.`
        });
      } else {
        alerts.push({
          type: 'info',
          title: `${activeBranch} Branch: Consistent Cash Volume`,
          message: `Cash payments account for ${100 - gcashPct}% of revenue today. Perform mid-shift cash drops to the store safe according to standard operating procedure.`
        });
      }
    } else {
      alerts.push({
        type: 'info',
        title: `${activeBranch} Branch: Register Ready`,
        message: 'Register is balanced and ready for new cash and GCash transactions.'
      });
    }

    res.json({
      success: true,
      branch: branch || 'All Branches',
      totalOrders,
      totalSalesRevenue,
      totalCash,
      totalGCash,
      alerts
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
