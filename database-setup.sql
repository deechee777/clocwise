-- Clocwise PostgreSQL Database Schema
-- Run this script to set up the database structure

-- Create database (run this separately if needed)
-- CREATE DATABASE clocwise;
-- \c clocwise;

-- Enable UUID extension for better ID generation (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'starter',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    hourly_rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Time entries table
CREATE TABLE time_entries (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- Duration in seconds
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices table (for future use)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice items table (for future use)
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    time_entry_id INTEGER REFERENCES time_entries(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(8, 2) NOT NULL,
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_created_at ON clients(user_id, created_at);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(client_id, status);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_created_at ON time_entries(created_at);
CREATE INDEX idx_time_entries_date_project ON time_entries(date, project_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    u.plan,
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(te.id) as total_time_entries,
    COALESCE(SUM(te.duration), 0) as total_seconds_tracked,
    COALESCE(SUM((te.duration / 3600.0) * c.hourly_rate), 0) as total_earnings
FROM users u
LEFT JOIN clients c ON u.id = c.user_id
LEFT JOIN projects p ON c.id = p.client_id
LEFT JOIN time_entries te ON p.id = te.project_id
GROUP BY u.id, u.full_name, u.email, u.plan;

CREATE VIEW project_summary AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    c.name as client_name,
    c.hourly_rate,
    c.user_id,
    p.status,
    COUNT(te.id) as total_entries,
    COALESCE(SUM(te.duration), 0) as total_seconds,
    COALESCE(SUM((te.duration / 3600.0) * c.hourly_rate), 0) as total_value,
    MIN(te.date) as first_entry_date,
    MAX(te.date) as last_entry_date
FROM projects p
INNER JOIN clients c ON p.client_id = c.id
LEFT JOIN time_entries te ON p.id = te.project_id
GROUP BY p.id, p.name, c.name, c.hourly_rate, c.user_id, p.status;

-- Stored function for user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_id_param INTEGER)
RETURNS TABLE(
    period TEXT,
    total_seconds INTEGER,
    total_earnings DECIMAL(10, 2)
) AS $$
DECLARE
    today DATE := CURRENT_DATE;
    week_start DATE := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER;
    month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
    -- Today's stats
    RETURN QUERY
    SELECT 
        'today'::TEXT as period,
        COALESCE(SUM(te.duration), 0)::INTEGER as total_seconds,
        COALESCE(SUM((te.duration / 3600.0) * c.hourly_rate), 0) as total_earnings
    FROM time_entries te 
    INNER JOIN projects p ON te.project_id = p.id 
    INNER JOIN clients c ON p.client_id = c.id 
    WHERE c.user_id = user_id_param AND te.date = today;
    
    -- This week's stats
    RETURN QUERY
    SELECT 
        'week'::TEXT as period,
        COALESCE(SUM(te.duration), 0)::INTEGER as total_seconds,
        COALESCE(SUM((te.duration / 3600.0) * c.hourly_rate), 0) as total_earnings
    FROM time_entries te 
    INNER JOIN projects p ON te.project_id = p.id 
    INNER JOIN clients c ON p.client_id = c.id 
    WHERE c.user_id = user_id_param AND te.date >= week_start;
    
    -- This month's stats
    RETURN QUERY
    SELECT 
        'month'::TEXT as period,
        COALESCE(SUM(te.duration), 0)::INTEGER as total_seconds,
        COALESCE(SUM((te.duration / 3600.0) * c.hourly_rate), 0) as total_earnings
    FROM time_entries te 
    INNER JOIN projects p ON te.project_id = p.id 
    INNER JOIN clients c ON p.client_id = c.id 
    WHERE c.user_id = user_id_param AND te.date >= month_start;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (uncomment to insert)
/*
-- Sample user (password is 'demo123')
INSERT INTO users (full_name, email, password_hash, plan) VALUES 
('Demo User', 'demo@clocwise.com', '$2a$10$8K1p/a0dClAiYiGoAE8Q1OlCe4JYI8M8zHIXB0X8BzYJtDjkG7Fk6', 'starter');

-- Sample client
INSERT INTO clients (user_id, name, email, hourly_rate) VALUES 
(1, 'Sample Client Co.', 'contact@sampleclient.com', 75.00);

-- Sample project
INSERT INTO projects (client_id, name, description, status) VALUES 
(1, 'Website Redesign', 'Complete website overhaul with modern design', 'active');

-- Sample time entries
INSERT INTO time_entries (project_id, date, start_time, duration, description) VALUES 
(1, CURRENT_DATE, '09:00:00', 9000, 'Initial design mockups'), -- 2.5 hours
(1, CURRENT_DATE - 1, '10:00:00', 7200, 'Client feedback implementation'), -- 2 hours
(1, CURRENT_DATE - 2, '14:00:00', 10800, 'Frontend development'), -- 3 hours
(1, CURRENT_DATE - 3, '09:30:00', 5400, 'Code review and testing'), -- 1.5 hours
(1, CURRENT_DATE - 4, '13:00:00', 12600, 'Backend API development'); -- 3.5 hours
*/

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Check that everything was created successfully
SELECT 'Database schema created successfully!' as message;