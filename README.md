# Chick N Pastil - Standardized POS System

A standardized, cohesive Point of Sale (POS) and Sales Operations web application for **Tine's Kitchen Chick Pastil**, built for Business Process Automation.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Ensure MySQL is running on `127.0.0.1:3306` with credentials matching `.env`:
```bash
node scripts/init_db.js
```
*This creates the `db123` database, tables, and seed records.*

### 3. Start POS Server
```bash
node server/server.js
```
The server will start listening at: **http://localhost:3000**

---

## 📂 File Structure

```text
POS/
├── .env                              # MySQL & PayMongo credentials
├── .gitignore                        # Git exclusion rules
├── package.json                      # Dependencies (express, mysql2, axios, cors, jspdf)
├── schema.sql                        # Database schema with audit & archive fields
├── server/
│   ├── server.js                     # Express app & static server
│   ├── db.js                         # MySQL connection pool
│   ├── paymongo.js                   # PayMongo API bridge (GCash & Links)
│   └── routes/
│       ├── menu.js                   # Menu catalog, availability toggle, soft-archive
│       ├── orders.js                 # Orders, items, payments, receipts
│       ├── paymongo.js               # PayMongo link generation & status check
│       └── dashboard.js              # Live sales KPIs & sales-only system alerts
├── public/
│   ├── login.html                    # Decoupled login & branch selector (quick testing)
│   ├── assets/
│       └── img/logo.png              # Chick N Pastil brand logo
│   ├── shared/
│       ├── bars.html                 # Reusable Topbar & Sidebar components
│       ├── bars.js                   # Dynamic session, active link, role switcher
│       └── style.css                 # Standard design system & responsive styling
│   ├── manager/
│       ├── dashboard.html            # Live Sales Operations (left-aligned, KPI cards, alerts)
│       ├── menu.html                 # Menu Display Management (rename, modify, archive)
│       └── transaction_reports.html  # Date-range transactions report (CSV & PDF export)
│   ├── pos/
│       └── ordering.html             # New Order (desktop centered / mobile bottom sheet modal)
│   └── staff/
│       └── transactions.html         # Staff shift logs (today only, CSV & PDF export)
└── scripts/
    ├── init_db.js                    # Database initializer & seeder
    └── test_flow.js                  # Automated end-to-end integration test
```

---

## 🎨 Key Features & Compliance

1. **Standardized Design Palette & Spacing**:
   - Signature Chick N Pastil dark green (`#1e5631`) with warm accent red and light card backgrounds (`#f5f8f6`).
   - Clean left-aligned layout avoiding awkward table gaps while maintaining responsive spacing.
2. **Business Process Automation Soft-Archive**:
   - Deletion of menu sections or products is replaced by **Archive** (`is_archived = 1`). Historical reports and audit trails remain 100% intact.
3. **Availability Toggling**:
   - When marked unavailable, products are **not removed from the ordering screen**; they remain visible with an "Unavailable" badge and disabled styling.
4. **Sales-Only System Alerts**:
   - Alerts on the Live Sales page strictly monitor sales velocity against standard stock capacity and register payment ratios (cash float vs GCash).
5. **Responsive Customization Modal**:
   - On **mobile**, slides up as a smooth bottom-sheet modal.
   - On **desktop**, appears as a centered modal.
   - Allows choosing Pastil flavor (Original/Spicy), rice options (Plain/Garlic), extra toppings, and quantities.
6. **Working PayMongo GCash Bridge**:
   - Real-time PayMongo Links integration generates verified payment links and tracks payment status.
7. **Standard Thermal Receipt Generation**:
   - Formatted for standard 80mm/58mm thermal receipt printing and digital download with official transaction numbers (`TXN-YYYYMMDD-XXXX`).
8. **Multi-Format Export**:
   - Transaction reports can be exported directly to either **.csv** or **.pdf**.
   - Managers can select custom date ranges.
   - Staff is restricted to exporting today's shift logs only.
