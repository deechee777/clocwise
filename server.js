// server.js - Main Express server
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Database connection - Supabase PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Please check your DATABASE_URL in .env file');
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your HTML files

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ===== AUTHENTICATION ROUTES =====

// Simple in-memory storage as fallback (for demo purposes)
let memoryUsers = new Map();
let userIdCounter = 1;

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailLower = email.toLowerCase();

    try {
      // Try database first
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [emailLower]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user in database
      const newUser = await pool.query(
        'INSERT INTO users (full_name, email, password_hash, plan, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, full_name, email, plan, created_at',
        [fullName, emailLower, hashedPassword, 'starter']
      );

      const user = newUser.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          plan: user.plan,
          createdAt: user.created_at
        }
      });

    } catch (dbError) {
      console.log('Database unavailable, using memory storage');
      
      // Fallback to memory storage
      if (memoryUsers.has(emailLower)) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user in memory
      const userId = userIdCounter++;
      const user = {
        id: userId,
        full_name: fullName,
        email: emailLower,
        password_hash: hashedPassword,
        plan: 'starter',
        created_at: new Date()
      };

      memoryUsers.set(emailLower, user);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          plan: user.plan,
          createdAt: user.created_at
        }
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailLower = email.toLowerCase();

    try {
      // Try database first
      const userResult = await pool.query(
        'SELECT id, full_name, email, password_hash, plan, created_at FROM users WHERE email = $1',
        [emailLower]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0];

      // Check password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          plan: user.plan,
          createdAt: user.created_at
        }
      });

    } catch (dbError) {
      console.log('Database unavailable, using memory storage');
      
      // Fallback to memory storage
      const user = memoryUsers.get(emailLower);
      
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          plan: user.plan,
          createdAt: user.created_at
        }
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== CLIENTS ROUTES =====

// Get all clients for user
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const clientsResult = await pool.query(
      'SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );

    const clients = [];
    for (const client of clientsResult.rows) {
      const projectsResult = await pool.query(
        'SELECT * FROM projects WHERE client_id = $1 ORDER BY created_at DESC',
        [client.id]
      );

      clients.push({
        ...client,
        projects: projectsResult.rows
      });
    }

    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new client
app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { name, email, hourlyRate, projectName, projectDescription } = req.body;

    if (!name || !hourlyRate || !projectName) {
      return res.status(400).json({ error: 'Name, hourly rate, and project name are required' });
    }

    // Start transaction
    const client = await pool.query('BEGIN');

    try {
      // Create client
      const clientResult = await pool.query(
        'INSERT INTO clients (user_id, name, email, hourly_rate, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [req.user.userId, name, email, parseFloat(hourlyRate)]
      );

      const newClient = clientResult.rows[0];

      // Create project
      const projectResult = await pool.query(
        'INSERT INTO projects (client_id, name, description, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [newClient.id, projectName, projectDescription || '', 'active']
      );

      await pool.query('COMMIT');

      res.status(201).json({
        ...newClient,
        projects: projectResult.rows
      });

    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const clientId = req.params.id;

    // Check if client belongs to user
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
      [clientId, req.user.userId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Delete all related data (cascade should handle this, but being explicit)
    await pool.query('DELETE FROM time_entries WHERE project_id IN (SELECT id FROM projects WHERE client_id = $1)', [clientId]);
    await pool.query('DELETE FROM projects WHERE client_id = $1', [clientId]);
    await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);

    res.json({ message: 'Client deleted successfully' });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== TIME ENTRIES ROUTES =====

// Get time entries for user
app.get('/api/time-entries', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, startDate, endDate } = req.query;

    let query = `
      SELECT te.*, p.name as project_name, c.name as client_name, c.hourly_rate
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE c.user_id = $1
    `;
    
    const params = [req.user.userId];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND te.date >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND te.date <= $${params.length}`;
    }
    
    query += ` ORDER BY te.date DESC, te.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create time entry
app.post('/api/time-entries', authenticateToken, async (req, res) => {
  try {
    const { projectId, date, startTime, duration, description } = req.body;

    if (!projectId || !date || !startTime || !duration) {
      return res.status(400).json({ error: 'Project, date, start time, and duration are required' });
    }

    // Verify project belongs to user
    const projectCheck = await pool.query(
      'SELECT p.id FROM projects p JOIN clients c ON p.client_id = c.id WHERE p.id = $1 AND c.user_id = $2',
      [projectId, req.user.userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      'INSERT INTO time_entries (project_id, date, start_time, duration, description, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [projectId, date, startTime, parseInt(duration), description || '']
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete time entry
app.delete('/api/time-entries/:id', authenticateToken, async (req, res) => {
  try {
    const entryId = req.params.id;

    // Check if entry belongs to user
    const entryCheck = await pool.query(
      `SELECT te.id FROM time_entries te 
       JOIN projects p ON te.project_id = p.id 
       JOIN clients c ON p.client_id = c.id 
       WHERE te.id = $1 AND c.user_id = $2`,
      [entryId, req.user.userId]
    );

    if (entryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    await pool.query('DELETE FROM time_entries WHERE id = $1', [entryId]);
    res.json({ message: 'Time entry deleted successfully' });

  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== STATS ROUTES =====

// Get user stats
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);

    // Today's hours
    const todayResult = await pool.query(
      `SELECT COALESCE(SUM(te.duration), 0) as total_seconds
       FROM time_entries te
       JOIN projects p ON te.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE c.user_id = $1 AND te.date = $2`,
      [req.user.userId, today]
    );

    // This week's hours
    const weekResult = await pool.query(
      `SELECT COALESCE(SUM(te.duration), 0) as total_seconds
       FROM time_entries te
       JOIN projects p ON te.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE c.user_id = $1 AND te.date >= $2`,
      [req.user.userId, thisWeekStart.toISOString().split('T')[0]]
    );

    // This month's hours and earnings
    const monthResult = await pool.query(
      `SELECT 
         COALESCE(SUM(te.duration), 0) as total_seconds,
         COALESCE(SUM((te.duration / 3600.0) * c.hourly_rate), 0) as total_earnings
       FROM time_entries te
       JOIN projects p ON te.project_id = p.id
       JOIN clients c ON p.client_id = c.id
       WHERE c.user_id = $1 AND te.date >= $2`,
      [req.user.userId, thisMonthStart.toISOString().split('T')[0]]
    );

    res.json({
      todayHours: (todayResult.rows[0].total_seconds / 3600).toFixed(1),
      weekHours: (weekResult.rows[0].total_seconds / 3600).toFixed(1),
      monthHours: (monthResult.rows[0].total_seconds / 3600).toFixed(1),
      totalEarnings: parseFloat(monthResult.rows[0].total_earnings).toFixed(0)
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/auth', (req, res) => {
  res.sendFile(__dirname + '/public/auth.html');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/debug', (req, res) => {
  res.sendFile(__dirname + '/public/debug.html');
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Clocwise server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;