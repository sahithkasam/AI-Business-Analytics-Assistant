-- ============================================================
-- AI Business Analytics Assistant - Database Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    code        VARCHAR(20) NOT NULL UNIQUE,
    budget      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    manager_id  INTEGER,
    location    VARCHAR(100),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(30),
    department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    job_title       VARCHAR(100),
    salary          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    hire_date       DATE NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    manager_id      INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add manager FK to departments after employees exists
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_manager
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(30),
    company         VARCHAR(200),
    country         VARCHAR(100) NOT NULL DEFAULT 'US',
    city            VARCHAR(100),
    state           VARCHAR(100),
    address         TEXT,
    postal_code     VARCHAR(20),
    customer_type   VARCHAR(20) CHECK (customer_type IN ('individual', 'business')) DEFAULT 'individual',
    lifetime_value  NUMERIC(15, 2) DEFAULT 0,
    loyalty_points  INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    sku             VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    category        VARCHAR(100) NOT NULL,
    subcategory     VARCHAR(100),
    brand           VARCHAR(100),
    unit_price      NUMERIC(12, 2) NOT NULL,
    cost_price      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    stock_quantity  INTEGER NOT NULL DEFAULT 0,
    reorder_level   INTEGER DEFAULT 10,
    weight_kg       NUMERIC(8, 3),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL PRIMARY KEY,
    order_number    VARCHAR(50) UNIQUE NOT NULL,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    employee_id     INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    status          VARCHAR(30) CHECK (status IN ('pending','processing','shipped','delivered','cancelled','refunded')) DEFAULT 'pending',
    payment_status  VARCHAR(30) CHECK (payment_status IN ('unpaid','paid','partial','refunded')) DEFAULT 'unpaid',
    shipping_method VARCHAR(50),
    shipping_address TEXT,
    shipping_cost   NUMERIC(10, 2) DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    tax_amount      NUMERIC(10, 2) DEFAULT 0,
    subtotal        NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'USD',
    notes           TEXT,
    ordered_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipped_at      TIMESTAMP WITH TIME ZONE,
    delivered_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12, 2) NOT NULL,
    discount_pct    NUMERIC(5, 2) DEFAULT 0,
    line_total      NUMERIC(15, 2) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    amount          NUMERIC(15, 2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'USD',
    method          VARCHAR(50) CHECK (method IN ('credit_card','debit_card','paypal','bank_transfer','crypto','cash')) NOT NULL,
    status          VARCHAR(30) CHECK (status IN ('pending','completed','failed','refunded')) DEFAULT 'pending',
    transaction_id  VARCHAR(255) UNIQUE,
    gateway         VARCHAR(100),
    paid_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer_id     ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at       ON orders(ordered_at);
CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id       ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at        ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category);
CREATE INDEX IF NOT EXISTS idx_customers_country       ON customers(country);
CREATE INDEX IF NOT EXISTS idx_employees_dept_id       ON employees(department_id);
