require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mapRoutes = require('./routes/mapRoutes');

const app = express();

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ==================== ROUTES ====================

// API Routes
app.use('/api/map', mapRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OSM Backend API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'OpenStreetMap Backend API',
    version: '1.0.0',
    description: 'Backend service for OpenStreetMap integration',
    baseURL: `http://localhost:${process.env.PORT || 5000}`,
    documentation: '/api/map/documentation',
    health: '/health'
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Error:', error);

  // Handle specific error types
  if (error.code === 'ECONNABORTED') {
    return res.status(504).json({
      success: false,
      error: 'API Timeout - External service took too long to respond'
    });
  }

  if (error.response?.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded - Too many requests to external API'
    });
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }

  if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
    return res.status(503).json({
      success: false,
      error: 'Service unavailable - Cannot reach external API'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message || 'Internal server error'
  });
});

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log('\n');
  console.log('========================================');
  console.log('🗺️  OpenStreetMap Backend API Running');
  console.log('========================================');
  console.log(`✅ Server started at: http://${HOST}:${PORT}`);
  console.log(`📚 Documentation: http://${HOST}:${PORT}/api/map/documentation`);
  console.log(`💓 Health check: http://${HOST}:${PORT}/health`);
  console.log('========================================\n');

  // Log environment
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Nominatim: ${process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'}`);
  console.log(`Overpass: ${process.env.OVERPASS_BASE_URL || 'https://overpass-api.de/api/interpreter'}`);
  console.log(`OSRM: ${process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'}`);
  console.log('\n');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⏹️  SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
