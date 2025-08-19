const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();



const app = express();

// --- CORS Configuration ---   
const allowedOrigins = [
  'https://www.aestheticstudio.in',
  'http://localhost:5173',
  'https://adminpanel.aestheticstudio.in',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// Enable CORS for all routes including preflight
app.use(cors(corsOptions));

// --- Middleware ---
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ DB connected');
  })
  .catch(err => {
    console.error('❌ DB connection error:', err);
  });

// --- Test Route ---
app.get('/', (req, res) => {
  res.send('<h2>🚀 API is running successfully!</h2>');
});  

app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
// Add these lines where you register your routes
app.use('/api/combos', require('./routes/combos'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/inventory', require('./routes/appointments'));
app.use('/api', require('./routes/staffRoutes'));
app.use('/api/customer', require('./routes/customerRoutes'));

    




      

// --- 404 Not Found Handler ---
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong! Please try again later.' });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
