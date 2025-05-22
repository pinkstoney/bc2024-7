require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        device_name VARCHAR(255) NOT NULL,
        serial_number VARCHAR(255) UNIQUE NOT NULL,
        user_name VARCHAR(255) DEFAULT NULL
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

app.post('/register', async (req, res) => {
  try {
    const { device_name, serial_number } = req.body;
    
    if (!device_name || !serial_number) {
      return res.status(400).json({ error: 'Device name and serial number are required' });
    }
    
    const existingDevice = await pool.query(
      'SELECT * FROM devices WHERE serial_number = $1',
      [serial_number]
    );
    
    if (existingDevice.rows.length > 0) {
      return res.status(400).json({ error: 'Device already exists' });
    }
    
    await pool.query(
      'INSERT INTO devices (device_name, serial_number) VALUES ($1, $2)',
      [device_name, serial_number]
    );
    
    res.status(200).json({ message: 'Device registered successfully' });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/devices', async (req, res) => {
  try {
    const result = await pool.query('SELECT device_name, serial_number FROM devices');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/take', async (req, res) => {
  try {
    const { user_name, serial_number } = req.body;
    
    if (!user_name || !serial_number) {
      return res.status(400).json({ error: 'User name and serial number are required' });
    }
    
    const device = await pool.query(
      'SELECT * FROM devices WHERE serial_number = $1',
      [serial_number]
    );
    
    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.rows[0].user_name) {
      return res.status(400).json({ error: 'Device is already taken' });
    }
    
    await pool.query(
      'UPDATE devices SET user_name = $1 WHERE serial_number = $2',
      [user_name, serial_number]
    );
    
    res.status(200).json({ message: 'Device taken successfully' });
  } catch (error) {
    console.error('Error taking device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/devices/:serial_number', async (req, res) => {
  try {
    const { serial_number } = req.params;
    
    const result = await pool.query(
      'SELECT device_name, user_name FROM devices WHERE serial_number = $1',
      [serial_number]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/return', async (req, res) => {
  try {
    const { serial_number } = req.body;
    
    if (!serial_number) {
      return res.status(400).json({ error: 'Serial number is required' });
    }
    
    const device = await pool.query(
      'SELECT * FROM devices WHERE serial_number = $1',
      [serial_number]
    );
    
    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    await pool.query(
      'UPDATE devices SET user_name = NULL WHERE serial_number = $1',
      [serial_number]
    );
    
    res.status(200).json({ message: 'Device returned successfully' });
  } catch (error) {
    console.error('Error returning device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await initDb();
  console.log(`Server running on port ${PORT}`);
}); 