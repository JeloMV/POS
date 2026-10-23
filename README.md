# Chick N Pastil - Standardized POS System

A standardized, cohesive Point of Sale (POS) and Sales Operations web application for **Tine's Kitchen Chick Pastil**, built for Business Process Automation.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Initialize the local SQLite database:
```bash
npm run init-db
```
*This creates `data/pos.sqlite`, the tables, and the seed records. No MySQL server or XAMPP is required.*

### 3. Start POS Server
```bash
node server/server.js
```
The server will start listening at: **http://localhost:3000**

---

## 📂 File Structure

```text
POS/
├── .env                              # PayMongo credentials and optional SQLite path
├── .gitignore                        # Git exclusion rules
├── package.json                      # Dependencies (express, better-sqlite3, axios, cors, jspdf)
├── schema.sql                        # Database schema with audit & archive fields
├── server/
│   ├── server.js                     # Express app & static server
│   ├── db.js                         # SQLite database connection
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
    ├── init_db.js                    # SQLite database initializer & seeder
    └── test_flow.js                  # Automated end-to-end integration test
```
