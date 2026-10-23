-- Database Schema for Chick N Pastil POS System
DROP DATABASE IF EXISTS db123;
CREATE DATABASE IF NOT EXISTS db123;
USE db123;

CREATE TABLE menu_section (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    section_name VARCHAR(100) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    -- ADDED COMMENT: Soft-archive status requested by user ('archive' term for business process automation)
    is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE menu_products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    image_url VARCHAR(255) NULL,
    allow_quantity BOOLEAN NOT NULL DEFAULT TRUE,
    -- ADDED COMMENT: Soft-archive status for products without hard deletion
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES menu_section(section_id)
);

CREATE TABLE product_addons (
    addon_id INT AUTO_INCREMENT PRIMARY KEY,
    addon_name VARCHAR(100) NOT NULL,
    addon_price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    -- ADDED COMMENT: Category group for addons (e.g. 'flavor', 'rice', 'extra') to support the modal UI
    addon_category VARCHAR(50) DEFAULT 'extra',
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    order_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cust_name VARCHAR(255),
    contact_number VARCHAR(30),
    order_status ENUM('Pending','Preparing','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
    order_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes VARCHAR(255),
    -- ADDED COMMENT: Optional branch and order type for multi-branch dashboard and Dine-in/Take-out UI
    branch_name VARCHAR(100) DEFAULT 'Balagtas',
    order_type VARCHAR(50) DEFAULT 'Dine-In',
    other_contact VARCHAR(255) NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES menu_products(product_id)
);

CREATE TABLE order_item_addons (
    order_item_addon_id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id INT NOT NULL,
    addon_id INT NULL,
    addon_name VARCHAR(255) NOT NULL,
    addon_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id) ON DELETE CASCADE
);

CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method ENUM('Cash','GCash') NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    gcash_reference_number VARCHAR(255) NULL,
    payment_status ENUM('Pending','Verified','Failed','Refunded') NOT NULL DEFAULT 'Pending',
    paymongo_payment_intent_id VARCHAR(255) NULL,
    paid_at DATETIME,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

CREATE TABLE receipts (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_id INT NOT NULL,
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    receipt_type ENUM('Printed','Digital') NOT NULL DEFAULT 'Printed',
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
);

-- Seed Data
INSERT INTO menu_section (section_name, is_available) VALUES
('Pastil Size', TRUE),
('Add-ons', TRUE),
('Drinks', TRUE);

INSERT INTO menu_products (section_id, product_name, description, price, is_available, image_url, allow_quantity) VALUES
((SELECT section_id FROM menu_section WHERE section_name = 'Pastil Size' LIMIT 1), 'Small', 'Small pastil serving', 30.00, TRUE, 'assets/logo.png', TRUE),
((SELECT section_id FROM menu_section WHERE section_name = 'Pastil Size' LIMIT 1), 'Medium', 'Medium pastil serving', 40.00, TRUE, 'assets/logo.png', TRUE),
((SELECT section_id FROM menu_section WHERE section_name = 'Pastil Size' LIMIT 1), 'Large', 'Large pastil serving', 50.00, TRUE, 'assets/logo.png', TRUE),
((SELECT section_id FROM menu_section WHERE section_name = 'Add-ons' LIMIT 1), 'Extra Rice', 'Additional rice topping', 10.00, TRUE, NULL, TRUE),
((SELECT section_id FROM menu_section WHERE section_name = 'Add-ons' LIMIT 1), 'Egg', 'Boiled egg add-on', 15.00, TRUE, NULL, TRUE),
((SELECT section_id FROM menu_section WHERE section_name = 'Drinks' LIMIT 1), 'Iced Tea', 'House blend iced tea', 20.00, TRUE, NULL, TRUE),
((SELECT section_id FROM menu_section WHERE section_name = 'Drinks' LIMIT 1), 'Bottled Water', '500ml bottled water', 15.00, TRUE, NULL, TRUE);

INSERT INTO product_addons (addon_name, addon_price, is_available, addon_category) VALUES
('Original', 0.00, TRUE, 'flavor'),
('Spicy', 0.00, TRUE, 'flavor'),
('Plain Rice', 0.00, TRUE, 'rice'),
('Garlic Rice', 5.00, TRUE, 'rice'),
('Cheese', 12.00, TRUE, 'extra'),
('Spicy Sauce', 5.00, TRUE, 'extra'),
('Fried Garlic', 8.00, TRUE, 'extra'),
('Seaweed Flakes', 10.00, FALSE, 'extra');

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
