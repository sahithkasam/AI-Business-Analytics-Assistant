-- ============================================================
-- Seed Data for AI Business Analytics Assistant
-- ============================================================

-- Departments
INSERT INTO departments (name, code, budget, location) VALUES
('Engineering',       'ENG',  2500000, 'San Francisco, CA'),
('Sales',             'SAL',  1800000, 'New York, NY'),
('Marketing',         'MKT',  1200000, 'Austin, TX'),
('Human Resources',   'HR',    800000, 'Chicago, IL'),
('Finance',           'FIN',   950000, 'Boston, MA'),
('Product',           'PRD',  1500000, 'San Francisco, CA'),
('Customer Success',  'CS',   1100000, 'Denver, CO'),
('Operations',        'OPS',   750000, 'Atlanta, GA')
ON CONFLICT DO NOTHING;

-- Employees (subset, seeded without circular manager refs first)
INSERT INTO employees (first_name, last_name, email, phone, department_id, job_title, salary, hire_date) VALUES
('James',   'Wilson',    'james.wilson@company.com',    '+1-415-001-0001', 1, 'CTO',                    220000, '2018-03-15'),
('Sarah',   'Martinez',  'sarah.martinez@company.com',  '+1-212-001-0002', 2, 'VP of Sales',            185000, '2019-01-10'),
('Michael', 'Chen',      'michael.chen@company.com',    '+1-512-001-0003', 3, 'CMO',                    175000, '2019-06-01'),
('Emily',   'Johnson',   'emily.johnson@company.com',   '+1-312-001-0004', 4, 'HR Director',            145000, '2020-02-20'),
('David',   'Brown',     'david.brown@company.com',     '+1-617-001-0005', 5, 'CFO',                    210000, '2018-11-05'),
('Lisa',    'Anderson',  'lisa.anderson@company.com',   '+1-415-001-0006', 6, 'Product Manager',        155000, '2021-03-01'),
('Robert',  'Taylor',    'robert.taylor@company.com',   '+1-720-001-0007', 7, 'CS Manager',             130000, '2020-09-15'),
('Jennifer','Thomas',    'jennifer.thomas@company.com', '+1-404-001-0008', 8, 'Operations Manager',     140000, '2021-01-10'),
('William', 'Jackson',   'william.jackson@company.com', '+1-415-001-0009', 1, 'Senior Engineer',        155000, '2020-05-12'),
('Jessica', 'White',     'jessica.white@company.com',   '+1-415-001-0010', 1, 'Senior Engineer',        148000, '2021-02-28'),
('Christopher','Harris', 'chris.harris@company.com',    '+1-212-001-0011', 2, 'Account Executive',       95000, '2021-06-01'),
('Amanda',  'Clark',     'amanda.clark@company.com',    '+1-212-001-0012', 2, 'Account Executive',       92000, '2022-01-15'),
('Daniel',  'Lewis',     'daniel.lewis@company.com',    '+1-512-001-0013', 3, 'Marketing Specialist',    85000, '2022-03-20'),
('Rachel',  'Robinson',  'rachel.robinson@company.com', '+1-312-001-0014', 4, 'HR Specialist',           78000, '2022-05-01'),
('Kevin',   'Walker',    'kevin.walker@company.com',    '+1-617-001-0015', 5, 'Financial Analyst',       92000, '2021-08-10')
ON CONFLICT DO NOTHING;

-- Update manager references
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'james.wilson@company.com')    WHERE code = 'ENG';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'sarah.martinez@company.com')  WHERE code = 'SAL';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'michael.chen@company.com')    WHERE code = 'MKT';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'emily.johnson@company.com')   WHERE code = 'HR';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'david.brown@company.com')     WHERE code = 'FIN';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'lisa.anderson@company.com')   WHERE code = 'PRD';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'robert.taylor@company.com')   WHERE code = 'CS';
UPDATE departments SET manager_id = (SELECT id FROM employees WHERE email = 'jennifer.thomas@company.com') WHERE code = 'OPS';

-- Products
INSERT INTO products (name, sku, category, subcategory, brand, unit_price, cost_price, stock_quantity, weight_kg) VALUES
('MacBook Pro 16"',           'TECH-LP-001', 'Electronics', 'Laptops',     'Apple',    2499.00, 1800.00, 45,  2.15),
('Dell XPS 15',               'TECH-LP-002', 'Electronics', 'Laptops',     'Dell',     1799.00, 1200.00, 62,  1.86),
('iPhone 15 Pro',             'TECH-PH-001', 'Electronics', 'Phones',      'Apple',    1199.00,  850.00, 120, 0.22),
('Samsung Galaxy S24',        'TECH-PH-002', 'Electronics', 'Phones',      'Samsung',   999.00,  680.00, 95,  0.19),
('Sony WH-1000XM5',           'TECH-HD-001', 'Electronics', 'Headphones',  'Sony',      349.00,  180.00, 200, 0.25),
('iPad Pro 12.9"',            'TECH-TB-001', 'Electronics', 'Tablets',     'Apple',    1099.00,  720.00, 78,  0.68),
('LG 27" 4K Monitor',         'TECH-MN-001', 'Electronics', 'Monitors',    'LG',        599.00,  350.00, 55,  5.80),
('Logitech MX Keys',          'TECH-KB-001', 'Electronics', 'Peripherals', 'Logitech',   99.00,   45.00, 300, 0.81),
('Ergonomic Office Chair',    'FURN-CH-001', 'Furniture',   'Chairs',      'Herman Miller', 1295.00, 600.00, 30, 19.50),
('Standing Desk 60"',         'FURN-DK-001', 'Furniture',   'Desks',       'Uplift',    899.00,  450.00, 22,  52.00),
('AirPods Pro 2nd Gen',       'TECH-EP-001', 'Electronics', 'Earbuds',     'Apple',     249.00,  140.00, 180, 0.06),
('Kindle Paperwhite',         'TECH-KD-001', 'Electronics', 'E-Readers',   'Amazon',    139.00,   70.00, 150, 0.20),
('Nike Air Max 270',          'SHOE-NK-001', 'Footwear',    'Sneakers',    'Nike',      150.00,   65.00, 400, 0.45),
('Adidas Ultraboost 23',      'SHOE-AD-001', 'Footwear',    'Running',     'Adidas',    190.00,   90.00, 320, 0.38),
('The Psychology of Money',   'BOOK-FN-001', 'Books',       'Finance',     'Morgan Housel', 18.00, 6.00, 500, 0.34),
('Atomic Habits',             'BOOK-PD-001', 'Books',       'Self-Help',   'James Clear',   17.00, 5.50, 600, 0.31),
('Wireless Gaming Mouse',     'TECH-MS-001', 'Electronics', 'Peripherals', 'Razer',      79.00,   35.00, 250, 0.11),
('USB-C Hub 10-in-1',         'TECH-HB-001', 'Electronics', 'Accessories', 'Anker',      49.99,   22.00, 400, 0.18),
('Coffee Maker Pro',          'HOME-CF-001', 'Home',        'Appliances',  'Breville',  299.00,  140.00, 65,  3.20),
('Yoga Mat Premium',          'SPRT-YG-001', 'Sports',      'Fitness',     'Lululemon',  78.00,   30.00, 350, 1.50)
ON CONFLICT DO NOTHING;

-- Customers (30 realistic customers)
INSERT INTO customers (first_name, last_name, email, phone, company, country, city, state, customer_type) VALUES
('Alice',   'Thompson',  'alice.thompson@email.com',   '+1-555-0101', 'Tech Startup Inc',      'US', 'San Francisco', 'CA', 'business'),
('Bob',     'Garcia',    'bob.garcia@email.com',       '+1-555-0102', NULL,                    'US', 'Los Angeles',   'CA', 'individual'),
('Carol',   'Smith',     'carol.smith@email.com',      '+1-555-0103', 'Global Corp',           'US', 'New York',      'NY', 'business'),
('Dan',     'Lee',       'dan.lee@email.com',          '+1-555-0104', NULL,                    'US', 'Seattle',       'WA', 'individual'),
('Eva',     'Brown',     'eva.brown@email.com',        '+1-555-0105', 'Creative Agency',       'US', 'Austin',        'TX', 'business'),
('Frank',   'Wilson',    'frank.wilson@email.com',     '+1-555-0106', NULL,                    'CA', 'Toronto',       'ON', 'individual'),
('Grace',   'Taylor',    'grace.taylor@email.com',     '+1-555-0107', 'Finance Pro LLC',       'US', 'Chicago',       'IL', 'business'),
('Henry',   'Anderson',  'henry.anderson@email.com',   '+1-555-0108', NULL,                    'US', 'Boston',        'MA', 'individual'),
('Iris',    'Martinez',  'iris.martinez@email.com',    '+1-555-0109', 'Retail Solutions',      'US', 'Miami',         'FL', 'business'),
('Jake',    'Jackson',   'jake.jackson@email.com',     '+1-555-0110', NULL,                    'GB', 'London',        '',   'individual'),
('Karen',   'White',     'karen.white@email.com',      '+1-555-0111', 'Healthcare Plus',       'US', 'Denver',        'CO', 'business'),
('Leo',     'Harris',    'leo.harris@email.com',       '+1-555-0112', NULL,                    'US', 'Phoenix',       'AZ', 'individual'),
('Maria',   'Clark',     'maria.clark@email.com',      '+1-555-0113', 'Edu Systems Ltd',       'US', 'Portland',      'OR', 'business'),
('Nathan',  'Lewis',     'nathan.lewis@email.com',     '+1-555-0114', NULL,                    'AU', 'Sydney',        '',   'individual'),
('Olivia',  'Walker',    'olivia.walker@email.com',    '+1-555-0115', 'E-commerce Hub',        'US', 'Las Vegas',     'NV', 'business'),
('Peter',   'Hall',      'peter.hall@email.com',       '+1-555-0116', NULL,                    'US', 'Atlanta',       'GA', 'individual'),
('Quinn',   'Young',     'quinn.young@email.com',      '+1-555-0117', 'Media Group',           'US', 'Nashville',     'TN', 'business'),
('Rachel',  'King',      'rachel.king@email.com',      '+1-555-0118', NULL,                    'DE', 'Berlin',        '',   'individual'),
('Steve',   'Wright',    'steve.wright@email.com',     '+1-555-0119', 'Logistics One',         'US', 'Dallas',        'TX', 'business'),
('Tina',    'Scott',     'tina.scott@email.com',       '+1-555-0120', NULL,                    'US', 'San Diego',     'CA', 'individual'),
('Uma',     'Green',     'uma.green@email.com',        '+1-555-0121', 'Cloud Services Co',     'US', 'Seattle',       'WA', 'business'),
('Victor',  'Baker',     'victor.baker@email.com',     '+1-555-0122', NULL,                    'FR', 'Paris',         '',   'individual'),
('Wendy',   'Adams',     'wendy.adams@email.com',      '+1-555-0123', 'Fashion Retail Ltd',    'US', 'New York',      'NY', 'business'),
('Xavier',  'Nelson',    'xavier.nelson@email.com',    '+1-555-0124', NULL,                    'US', 'Houston',       'TX', 'individual'),
('Yara',    'Carter',    'yara.carter@email.com',      '+1-555-0125', 'Health & Wellness Inc', 'US', 'Minneapolis',   'MN', 'business'),
('Zach',    'Mitchell',  'zach.mitchell@email.com',    '+1-555-0126', NULL,                    'US', 'Columbus',      'OH', 'individual'),
('Amber',   'Perez',     'amber.perez@email.com',      '+1-555-0127', 'Digital Ventures',      'US', 'Charlotte',     'NC', 'business'),
('Brian',   'Roberts',   'brian.roberts@email.com',    '+1-555-0128', NULL,                    'US', 'Indianapolis',  'IN', 'individual'),
('Clara',   'Turner',    'clara.turner@email.com',     '+1-555-0129', 'Software Factory',      'CA', 'Vancouver',     'BC', 'business'),
('Derek',   'Phillips',  'derek.phillips@email.com',   '+1-555-0130', NULL,                    'US', 'Memphis',       'TN', 'individual')
ON CONFLICT DO NOTHING;

-- Generate orders over the past 18 months using a function
DO $$
DECLARE
    v_order_num   INTEGER := 1000;
    v_date        TIMESTAMP;
    v_customer_id INTEGER;
    v_employee_id INTEGER;
    v_product_id  INTEGER;
    v_qty         INTEGER;
    v_price       NUMERIC;
    v_subtotal    NUMERIC;
    v_tax         NUMERIC;
    v_ship_cost   NUMERIC;
    v_total       NUMERIC;
    v_order_id    INTEGER;
    v_status      VARCHAR;
    v_pay_status  VARCHAR;
    v_num_items   INTEGER;
    i             INTEGER;
    j             INTEGER;
    statuses      VARCHAR[] := ARRAY['delivered','delivered','delivered','shipped','processing','cancelled'];
BEGIN
    FOR i IN 1..300 LOOP
        -- Random date in past 18 months (weighted toward recent)
        v_date := NOW() - (RANDOM() * INTERVAL '540 days');
        v_customer_id := FLOOR(RANDOM() * 30 + 1)::INTEGER;
        v_employee_id := FLOOR(RANDOM() * 4 + 11)::INTEGER; -- Sales employees
        v_status := statuses[FLOOR(RANDOM() * 6 + 1)::INTEGER];
        v_pay_status := CASE WHEN v_status IN ('delivered','shipped') THEN 'paid'
                             WHEN v_status = 'cancelled' THEN 'refunded'
                             ELSE 'paid' END;
        v_ship_cost := ROUND((RANDOM() * 25 + 5)::NUMERIC, 2);
        v_subtotal := 0;
        v_order_num := v_order_num + 1;

        INSERT INTO orders (order_number, customer_id, employee_id, status, payment_status,
                            shipping_method, shipping_cost, tax_amount, subtotal, total_amount,
                            ordered_at, shipped_at, delivered_at)
        VALUES (
            'ORD-' || LPAD(v_order_num::TEXT, 6, '0'),
            v_customer_id, v_employee_id, v_status, v_pay_status,
            CASE WHEN RANDOM() > 0.5 THEN 'standard' ELSE 'express' END,
            v_ship_cost, 0, 0, 0,
            v_date,
            CASE WHEN v_status IN ('shipped','delivered') THEN v_date + INTERVAL '2 days' ELSE NULL END,
            CASE WHEN v_status = 'delivered' THEN v_date + INTERVAL '5 days' ELSE NULL END
        ) RETURNING id INTO v_order_id;

        -- 1–5 items per order
        v_num_items := FLOOR(RANDOM() * 5 + 1)::INTEGER;
        FOR j IN 1..v_num_items LOOP
            v_product_id := FLOOR(RANDOM() * 20 + 1)::INTEGER;
            v_qty := FLOOR(RANDOM() * 3 + 1)::INTEGER;
            SELECT unit_price INTO v_price FROM products WHERE id = v_product_id;
            v_subtotal := v_subtotal + ROUND(v_price * v_qty, 2);

            INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
            VALUES (v_order_id, v_product_id, v_qty, v_price, ROUND(v_price * v_qty, 2));
        END LOOP;

        v_tax := ROUND(v_subtotal * 0.08, 2);
        v_total := v_subtotal + v_tax + v_ship_cost;

        UPDATE orders SET subtotal = v_subtotal, tax_amount = v_tax, total_amount = v_total
        WHERE id = v_order_id;

        -- Payment record for paid orders
        IF v_pay_status = 'paid' THEN
            INSERT INTO payments (order_id, customer_id, amount, method, status, transaction_id, gateway, paid_at)
            VALUES (
                v_order_id, v_customer_id, v_total,
                (ARRAY['credit_card','debit_card','paypal','bank_transfer'])[FLOOR(RANDOM()*4+1)::INTEGER],
                'completed',
                'TXN-' || UPPER(MD5(RANDOM()::TEXT)),
                (ARRAY['Stripe','PayPal','Square'])[FLOOR(RANDOM()*3+1)::INTEGER],
                v_date + INTERVAL '1 hour'
            );
        END IF;
    END LOOP;
END $$;

-- Update customer lifetime values
UPDATE customers c SET
    lifetime_value = COALESCE((
        SELECT SUM(o.total_amount) FROM orders o
        WHERE o.customer_id = c.id AND o.payment_status = 'paid'
    ), 0),
    loyalty_points = FLOOR(COALESCE((
        SELECT SUM(o.total_amount) FROM orders o
        WHERE o.customer_id = c.id AND o.payment_status = 'paid'
    ), 0) / 10)::INTEGER;

-- App users for the analytics platform
INSERT INTO users (id, email, username, hashed_password, full_name, role, is_active, is_verified) VALUES
(
    uuid_generate_v4(),
    'admin@analytics.com',
    'admin',
    -- bcrypt hash of 'Admin@123'
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'System Administrator',
    'admin',
    true,
    true
),
(
    uuid_generate_v4(),
    'analyst@analytics.com',
    'analyst',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Data Analyst',
    'analyst',
    true,
    true
),
(
    uuid_generate_v4(),
    'viewer@analytics.com',
    'viewer',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Report Viewer',
    'viewer',
    true,
    true
)
ON CONFLICT DO NOTHING;
