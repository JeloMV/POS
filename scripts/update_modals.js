const fs = require('fs');

// 1. Update public/manager/transaction_reports.html
let mgrHtml = fs.readFileSync('public/manager/transaction_reports.html', 'utf8');

// Remove Method from the table header
mgrHtml = mgrHtml.replace(
`                <th>Payment Status</th>
                <th>Method</th>
                <th>Date and Time</th>`,
`                <th>Payment Status</th>
                <th>Date and Time</th>`
);

// Update colspan in empty / loading state
mgrHtml = mgrHtml.replace('colspan="8"', 'colspan="7"');

// Remove Method column cell in renderTable
const mgrMethodCell = `            <td>
              <span class="badge \${t.payment_method === 'GCash' ? 'bg-primary-subtle text-primary' : (t.payment_method === 'Cash' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning')}">
                \${t.payment_method || 'Unpaid'}
              </span>
            </td>\r\n`;

const mgrMethodCellLF = `            <td>
              <span class="badge \${t.payment_method === 'GCash' ? 'bg-primary-subtle text-primary' : (t.payment_method === 'Cash' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning')}">
                \${t.payment_method || 'Unpaid'}
              </span>
            </td>\n`;

if (mgrHtml.includes(mgrMethodCell)) {
  mgrHtml = mgrHtml.replace(mgrMethodCell, '');
} else if (mgrHtml.includes(mgrMethodCellLF)) {
  mgrHtml = mgrHtml.replace(mgrMethodCellLF, '');
}

// In transactionDetailsModal, add Other Contact field if not present
if (!mgrHtml.includes('id="edit-other-contact"')) {
  mgrHtml = mgrHtml.replace(
    `<div class="col-sm-6">
                <label class="form-label small fw-semibold text-muted mb-1">Customer Name</label>
                <input type="text" id="edit-cust-name" class="form-control form-control-sm" placeholder="Customer name">
              </div>
              <div class="col-sm-6">
                <label class="form-label small fw-semibold text-muted mb-1">Contact Number</label>
                <input type="text" id="edit-contact-no" class="form-control form-control-sm" placeholder="09xxxxxxxxx">
              </div>`,
    `<div class="col-sm-4">
                <label class="form-label small fw-semibold text-muted mb-1">Customer Name</label>
                <input type="text" id="edit-cust-name" class="form-control form-control-sm" placeholder="Customer name">
              </div>
              <div class="col-sm-4">
                <label class="form-label small fw-semibold text-muted mb-1">Contact Number</label>
                <input type="text" id="edit-contact-no" class="form-control form-control-sm" placeholder="09xxxxxxxxx">
              </div>
              <div class="col-sm-4">
                <label class="form-label small fw-semibold text-muted mb-1">Other Contact</label>
                <input type="text" id="edit-other-contact" class="form-control form-control-sm" placeholder="Messenger / Other">
              </div>`
  );
}

// In openDetailsModal, populate edit-other-contact
if (!mgrHtml.includes("document.getElementById('edit-other-contact').value =")) {
  mgrHtml = mgrHtml.replace(
    "document.getElementById('edit-contact-no').value = order.contact_number || '';",
    "document.getElementById('edit-contact-no').value = order.contact_number || '';\n      document.getElementById('edit-other-contact').value = order.other_contact || '';"
  );
}

// In saveManagerOrderChanges, send other_contact
if (!mgrHtml.includes("other_contact: document.getElementById('edit-other-contact')")) {
  mgrHtml = mgrHtml.replace(
    "contact_number: document.getElementById('edit-contact-no').value.trim(),",
    "contact_number: document.getElementById('edit-contact-no').value.trim(),\n        other_contact: document.getElementById('edit-other-contact').value.trim(),"
  );
}

// Update PDF export header to remove Method
mgrHtml = mgrHtml.replace(
  "head: [['Order #', 'Txn #', 'Customer', 'Amount', 'Order Status', 'Pay Status', 'Method', 'Date']],",
  "head: [['Order #', 'Txn #', 'Customer', 'Amount', 'Order Status', 'Pay Status', 'Date']],"
);

// Update PDF row data to remove Method
mgrHtml = mgrHtml.replace(
  "t.payment_status || 'Pending',\n          t.payment_method || 'Unpaid',\n          new Date(t.order_datetime).toLocaleString()",
  "t.payment_status || 'Pending',\n          new Date(t.order_datetime).toLocaleString()"
);

fs.writeFileSync('public/manager/transaction_reports.html', mgrHtml, 'utf8');
console.log('Updated public/manager/transaction_reports.html successfully');
