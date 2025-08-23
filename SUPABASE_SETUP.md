# Supabase Setup for Clocwise

Since we're using a frontend-only approach with Supabase, you need to create the database tables in your Supabase dashboard.

## 📋 **Steps to Set Up Tables**

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `nayyaomcfgfaneyjhqbu`

2. **Go to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run This SQL to Create Tables**
   
   Copy and paste this SQL script:

```sql
-- Enable Row Level Security
ALTER PUBLICATION supabase_realtime ADD TABLE auth.users;

-- Clients table
CREATE TABLE clients (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    hourly_rate DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Time entries table
CREATE TABLE time_entries (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- Duration in seconds
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Users can view their own clients" ON clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON clients
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for projects
CREATE POLICY "Users can view projects of their clients" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = projects.client_id 
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create projects for their clients" ON projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = projects.client_id 
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update projects of their clients" ON projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = projects.client_id 
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete projects of their clients" ON projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM clients 
            WHERE clients.id = projects.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Create policies for time_entries
CREATE POLICY "Users can view their own time entries" ON time_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time entries" ON time_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" ON time_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries" ON time_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
```

4. **Click "Run" to execute the SQL**

5. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should see: `clients`, `projects`, `time_entries`

## ✅ **That's it!**

Your Supabase database is now set up for the Clocwise application. The frontend will connect directly to Supabase using the authentication and database features.

## 🔐 **Security Notes**

- Row Level Security (RLS) is enabled to ensure users can only access their own data
- Authentication is handled by Supabase Auth
- All database operations are secured through Supabase policies