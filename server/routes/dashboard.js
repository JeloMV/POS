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
      whereClause += ' AND DATE(o.order_datetime) = CURDATE()';
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

    if (totalOrders >= 5) {
      alerts.push({
        type: 'warning',
        title: `${activeBranch} Branch: High Sales Velocity`,
        message: 'Order volume is above normal standard. Active product items for sale might approach insufficient stock levels. Coordinate with commissary if replenishment is needed.'
      });
    } else {
      alerts.push({
        type: 'info',
        title: `${activeBranch} Branch: Standard Sales Rate`,
        message: 'Sales volume within standard operational limits. Product supply currently sufficient for ongoing orders.'
      });
    }

    const paidCount = cashCount + gcashCount;
    if (paidCount > 0) {
      const gcashPct = Math.round((gcashCount / paidCount) * 100);
      if (gcashPct >= 40) {
        alerts.push({
          type: 'info',
          title: `${activeBranch} Branch: High Digital Payment Ratio`,
          message: `Strong customer GCash payments (${gcashPct}% of total orders). The physical cash register may require monitoring for available cash change during cash purchases.`
        });
      } else {
        alerts.push({
          type: 'info',
          title: `${activeBranch} Branch: Consistent Cash Volume`,
          message: `Cash payments account for ${100 - gcashPct}% of sales. Ensure scheduled mid-shift cash drops are executed to the store safe.`
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
