/**
 * agroWish Backend - Central API Server Entry Point
 * SE-331 Software Engineering Design Capstone Project
 * Member 2: Most Tasnim Jahan Rifa (ID: 241-35-116)
 * Lead: Backend and Data Engineering Lead
 * 
 * SRS Reference: Section 2.2, Section 5 (FR-01, FR-02), Section 6 (NFR-04)
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { testConnection } = require('./db');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const recommendationsRoutes = require('./routes/recommendations');
const cropsRoutes = require('./routes/crops');

// Load environment configuration from .env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend client
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express JSON body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
  });
  next();
});

// Health check endpoint (GET /api/health)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    project: 'agroWish (SE-331 Capstone Project)',
    modules: [
      { id: 'M1', lead: 'Md Adnan Ul Islam (241-35-103)', role: 'AI & Algorithm Lead', features: 'Crop Recommendation & Cost Breakdown Engine' },
      { id: 'M2', lead: 'Most Tasnim Jahan Rifa (241-35-116)', role: 'Backend & Data Lead', features: 'Authentication & Database Schema' },
      { id: 'M3', lead: 'Tasdid Al Amin (241-35-108)', role: 'Frontend & Usability Lead', features: 'Farm Profile Form & Bangla UI' }
    ],
    endpoints: ['/api/auth', '/api/profile', '/api/recommendations', '/api/crops'],
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/crops', cropsRoutes);

// Root fallback route
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px;">
      <h1 style="color: #059669; font-size: 2rem;">🌱 agroWish API Server</h1>
      <p style="color: #475569; font-size: 1.1rem;">SE-331 Software Engineering Design Capstone Project</p>
      <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 15px 25px; margin-top: 20px; text-align: left;">
        <p style="margin: 4px 0; color: #065f46;"><strong>Lead:</strong> Most Tasnim Jahan Rifa (ID: 241-35-116)</p>
        <p style="margin: 4px 0; color: #065f46;"><strong>Port:</strong> ${PORT}</p>
        <p style="margin: 4px 0; color: #065f46;"><strong>Auth API:</strong> <code>/api/auth/register</code>, <code>/api/auth/login</code>, <code>/api/auth/me</code></p>
      </div>
      <p style="margin-top: 25px;">
        <a href="/api/health" style="background: #059669; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Check API Health</a>
      </p>
    </div>
  `);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `রুট '${req.originalUrl}' সার্ভারে পাওয়া যায়নি। (Route not found)`
  });
});

// Central Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: 'সার্ভারে অভ্যন্তরীণ ত্রুটি দেখা দিয়েছে। (Internal Server Error)',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Express Server on PORT 5000 and test DB connection pool
app.listen(PORT, async () => {
  console.log('================================================================');
  console.log(`🌾 agroWish API Server is listening on http://localhost:${PORT}`);
  console.log(`📘 SE-331 Capstone Project | Lead: Most Tasnim Jahan Rifa (241-35-116)`);
  console.log('================================================================');
  
  // Test database connection automatically on boot
  await testConnection();
});
