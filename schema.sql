-- Database Schema for Chick N Pastil POS System (SQLite version)
PRAGMA foreign_keys = ON;

-- Drop tables in reverse order of foreign key dependencies
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_item_addons;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_addons;
DROP TABLE IF EXISTS menu_products;
DROP TABLE IF EXISTS menu_section;

-- 1. Menu Sections
CREATE TABLE menu_section (
    section_id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_name TEXT NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1,
    -- Soft-archive status requested by user ('archive' term for business process automation)
    is_archived INTEGER NOT NULL DEFAULT 0
);

-- 2. Menu Products
CREATE TABLE menu_products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1,
    image_url TEXT NULL,
    allow_quantity INTEGER NOT NULL DEFAULT 1,
    -- Soft-archive status for products without hard deletion
    is_archived INTEGER NOT NULL DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES menu_section(section_id)
);

-- Trigger to simulate ON UPDATE CURRENT_TIMESTAMP for menu_products
CREATE TRIGGER IF NOT EXISTS trg_menu_products_updated_at
AFTER UPDATE ON menu_products
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
BEGIN
    UPDATE menu_products SET updated_at = CURRENT_TIMESTAMP WHERE product_id = OLD.product_id;
END;

-- 3. Product Add-ons
CREATE TABLE product_addons (
    addon_id INTEGER PRIMARY KEY AUTOINCREMENT,
    addon_name TEXT NOT NULL,
    addon_price REAL NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1,
    -- Category group for addons (e.g. 'flavor', 'rice', 'extra') to support the modal UI
    addon_category TEXT DEFAULT 'extra',
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to simulate ON UPDATE CURRENT_TIMESTAMP for product_addons
CREATE TRIGGER IF NOT EXISTS trg_product_addons_updated_at
AFTER UPDATE ON product_addons
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
BEGIN
    UPDATE product_addons SET updated_at = CURRENT_TIMESTAMP WHERE addon_id = OLD.addon_id;
END;

-- 4. Orders
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cust_name TEXT,
    contact_number TEXT,
    order_status TEXT NOT NULL DEFAULT 'Pending' CHECK (order_status IN ('Pending','Preparing','Completed','Cancelled')),
    order_total REAL NOT NULL DEFAULT 0.00,
    notes TEXT,
    -- Optional branch and order type for multi-branch dashboard and Dine-in/Take-out UI
    branch_name TEXT DEFAULT 'Balagtas',
    order_type TEXT DEFAULT 'Dine-In',
    other_contact TEXT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to simulate ON UPDATE CURRENT_TIMESTAMP for orders
CREATE TRIGGER IF NOT EXISTS trg_orders_updated_at
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.updated_at = OLD.updated_at)
BEGIN
    UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE order_id = OLD.order_id;
END;

-- 5. Order Items
CREATE TABLE order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES menu_products(product_id)
);

-- 6. Order Item Add-ons
CREATE TABLE order_item_addons (
    order_item_addon_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER NOT NULL,
    addon_id INTEGER NULL,
    addon_name TEXT NOT NULL,
    addon_price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal REAL NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id) ON DELETE CASCADE
);

-- 7. Payments
CREATE TABLE payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash','GCash')),
    amount_due REAL NOT NULL,
    amount_paid REAL NOT NULL,
    change_amount REAL NOT NULL DEFAULT 0.00,
    gcash_reference_number TEXT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending','Verified','Failed','Refunded')),
    paymongo_payment_intent_id TEXT NULL,
    paid_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- 8. Receipts
CREATE TABLE receipts (
    receipt_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    payment_id INTEGER NOT NULL,
    transaction_number TEXT NOT NULL UNIQUE,
    receipt_type TEXT NOT NULL DEFAULT 'Printed' CHECK (receipt_type IN ('Printed','Digital')),
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
);

-- Seed Data
INSERT INTO menu_section (section_name, is_available) VALUES
('Pastil Size', 1),
('Add-ons', 1),
('Drinks', 1);

INSERT INTO menu_products (section_id, product_name, description, price, is_available, image_url, allow_quantity) VALUES
((SELECT section_id FROM menu_section WHERE section_name = 'Pastil Size' LIMIT 1), 'Small', 'Small pastil serving', 30.00, 1, 'assets/logo.png', 1),
((SELECT section_id FROM menu_section WHERE section_name = 'Pastil Size' LIMIT 1), 'Medium', 'Medium pastil serving', 40.00, 1, 'assets/logo.png', 1),
((SELECT section_id FROM menu_section WHERE section_name = 'Pastil Size' LIMIT 1), 'Large', 'Large pastil serving', 50.00, 1, 'assets/logo.png', 1),
((SELECT section_id FROM menu_section WHERE section_name = 'Add-ons' LIMIT 1), 'Extra Rice', 'Additional rice topping', 10.00, 1, NULL, 1),
((SELECT section_id FROM menu_section WHERE section_name = 'Add-ons' LIMIT 1), 'Egg', 'Boiled egg add-on', 15.00, 1, NULL, 1),
((SELECT section_id FROM menu_section WHERE section_name = 'Drinks' LIMIT 1), 'Iced Tea', 'House blend iced tea', 20.00, 1, NULL, 1),
((SELECT section_id FROM menu_section WHERE section_name = 'Drinks' LIMIT 1), 'Bottled Water', '500ml bottled water', 15.00, 1, NULL, 1);

INSERT INTO product_addons (addon_name, addon_price, is_available, addon_category) VALUES
('Original', 0.00, 1, 'flavor'),
('Spicy', 0.00, 1, 'flavor'),
('Plain Rice', 0.00, 1, 'rice'),
('Garlic Rice', 5.00, 1, 'rice'),
('Cheese', 12.00, 1, 'extra'),
('Spicy Sauce', 5.00, 1, 'extra'),
('Fried Garlic', 8.00, 1, 'extra'),
('Seaweed Flakes', 10.00, 0, 'extra');

INSERT INTO orders (order_datetime, cust_name, contact_number, order_status, order_total, notes, branch_name, order_type) VALUES
('2026-10-20 09:10:00', 'Walk-in Customer', '09170000001', 'Completed', 112.00, 'Dine-in', 'Balagtas', 'Dine-In'),
('2026-10-20 10:05:00', 'Maria Santos', '09170000002', 'Completed', 70.00, 'Takeout', 'Balagtas', 'Take-Out'),
('2026-10-21 11:25:00', 'John Cruz', '09170000003', 'Preparing', 53.00, 'No onions', 'Santol', 'Dine-In'),
('2026-10-21 12:45:00', 'Liza Reyes', '09170000004', 'Pending', 50.00, 'Waiting for GCash confirmation', 'Balagtas', 'Dine-In'),
('2026-10-22 08:20:00', 'Mark Dela Pena', '09170000005', 'Cancelled', 40.00, 'Customer cancelled before prep', 'Borol', 'Take-Out');

INSERT INTO order_items (order_id, product_id, item_name, unit_price, quantity, subtotal) VALUES
(1, (SELECT product_id FROM menu_products WHERE product_name = 'Medium' LIMIT 1), 'Medium', 40.00, 2, 80.00),
(1, (SELECT product_id FROM menu_products WHERE product_name = 'Iced Tea' LIMIT 1), 'Iced Tea', 20.00, 1, 20.00),
(2, (SELECT product_id FROM menu_products WHERE product_name = 'Small' LIMIT 1), 'Small', 30.00, 2, 60.00),
(3, (SELECT product_id FROM menu_products WHERE product_name = 'Small' LIMIT 1), 'Small', 30.00, 1, 30.00),
(3, (SELECT product_id FROM menu_products WHERE product_name = 'Egg' LIMIT 1), 'Egg', 15.00, 1, 15.00),
(4, (SELECT product_id FROM menu_products WHERE product_name = 'Large' LIMIT 1), 'Large', 50.00, 1, 50.00),
(5, (SELECT product_id FROM menu_products WHERE product_name = 'Medium' LIMIT 1), 'Medium', 40.00, 1, 40.00);

INSERT INTO order_item_addons (order_item_id, addon_id, addon_name, addon_price, quantity, subtotal) VALUES
(1, (SELECT addon_id FROM product_addons WHERE addon_name = 'Cheese' LIMIT 1), 'Cheese', 12.00, 1, 12.00),
(3, (SELECT addon_id FROM product_addons WHERE addon_name = 'Spicy Sauce' LIMIT 1), 'Spicy Sauce', 5.00, 2, 10.00),
(4, (SELECT addon_id FROM product_addons WHERE addon_name = 'Fried Garlic' LIMIT 1), 'Fried Garlic', 8.00, 1, 8.00);

INSERT INTO payments (order_id, payment_method, amount_due, amount_paid, change_amount, gcash_reference_number, payment_status, paid_at) VALUES
(1, 'Cash', 112.00, 200.00, 88.00, NULL, 'Verified', '2026-10-20 09:12:00'),
(2, 'Cash', 70.00, 100.00, 30.00, NULL, 'Verified', '2026-10-20 10:08:00'),
(3, 'GCash', 53.00, 53.00, 0.00, 'GCX-20261021-001', 'Pending', NULL),
(4, 'GCash', 50.00, 50.00, 0.00, 'GCX-20261021-002', 'Pending', NULL),
(5, 'Cash', 40.00, 0.00, 0.00, NULL, 'Failed', NULL);

INSERT INTO receipts (order_id, payment_id, transaction_number, receipt_type, issued_at) VALUES
(1, 1, 'TXN-20261020-0001', 'Printed', '2026-10-20 09:13:00'),
(2, 2, 'TXN-20261020-0002', 'Digital', '2026-10-20 10:09:00');
