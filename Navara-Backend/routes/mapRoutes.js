const express = require('express');
const osmService = require('../services/osmService');
const accessibilityService = require('../services/accessibilityService');
const geminiService = require('../services/geminiService');

const router = express.Router();

/**
 * Helper function for error response
 */
const errorResponse = (res, status, error) => {
  res.status(status).json({
    success: false,
    error: error.message || error
  });
};

/**
 * Helper function for success response
 */
const successResponse = (res, data) => {
  res.json({
    success: true,
    data: data
  });
};

// ==================== NOMINATIM ROUTES ====================

/**
 * GET /api/map/search-address
 * Search for an address and get coordinates
 * Query params: query (required), limit (optional, default: 10)
 */
router.get('/search-address', async (req, res) => {
  try {
    const { query, limit } = req.query;

    if (!query) {
      return errorResponse(res, 400, 'Query parameter is required');
    }

    const results = await osmService.searchAddress(query);

    successResponse(res, {
      query: query,
      results: limit ? results.slice(0, parseInt(limit)) : results,
      count: results.length
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

/**
 * GET /api/map/batch-search-addresses
 * Search for multiple addresses
 * Query params: queries (comma-separated, required)
 */
router.get('/batch-search-addresses', async (req, res) => {
  try {
    const { queries } = req.query;

    if (!queries) {
      return errorResponse(res, 400, 'Queries parameter is required (comma-separated)');
    }

    const queryArray = queries.split(',').map(q => q.trim());
    const results = await osmService.batchSearchAddresses(queryArray);

    successResponse(res, {
      queries: queryArray,
      results: results,
      count: results.length
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

/**
 * GET /api/map/reverse-geocode
 * Reverse geocoding - Get address from coordinates
 * Query params: lat (required), lng (required)
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return errorResponse(res, 400, 'Both lat and lng parameters are required');
    }

    const result = await osmService.reverseGeocode(parseFloat(lat), parseFloat(lng));

    successResponse(res, {
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      address: result
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

// ==================== OVERPASS ROUTES ====================

/**
 * GET /api/map/find-pois
 * Find points of interest (restaurants, hospitals, etc.)
 * Query params: bbox (required), amenityType (required)
 * bbox format: "south,west,north,east"
 */
router.get('/find-pois', async (req, res) => {
  try {
    const { bbox, amenityType } = req.query;

    if (!bbox) {
      return errorResponse(res, 400, 'bbox parameter is required (format: south,west,north,east)');
    }
    if (!amenityType) {
      return errorResponse(res, 400, 'amenityType parameter is required (e.g., restaurant, hospital)');
    }

    const results = await osmService.findPOIs(bbox, amenityType);

    successResponse(res, {
      bbox: bbox,
      amenityType: amenityType,
      pois: results.elements || [],
      count: results.elements?.length || 0
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

/**
 * GET /api/map/find-buildings
 * Find buildings in area
 * Query params: bbox (required)
 */
router.get('/find-buildings', async (req, res) => {
  try {
    const { bbox } = req.query;

    if (!bbox) {
      return errorResponse(res, 400, 'bbox parameter is required (format: south,west,north,east)');
    }

    const results = await osmService.findBuildings(bbox);

    successResponse(res, {
      bbox: bbox,
      buildings: results.elements || [],
      count: results.elements?.length || 0
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

/**
 * GET /api/map/find-roads
 * Find roads/highways in area
 * Query params: bbox (required), roadType (optional, default: primary)
 */
router.get('/find-roads', async (req, res) => {
  try {
    const { bbox, roadType } = req.query;

    if (!bbox) {
      return errorResponse(res, 400, 'bbox parameter is required (format: south,west,north,east)');
    }

    const results = await osmService.findRoads(bbox, roadType || 'primary');

    successResponse(res, {
      bbox: bbox,
      roadType: roadType || 'primary',
      roads: results.elements || [],
      count: results.elements?.length || 0
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

/**
 * GET /api/map/find-nearest
 * Find nearest object to a coordinate
 * Query params: lat (required), lng (required), tagKey (optional), tagValue (optional), radius (optional)
 */
router.get('/find-nearest', async (req, res) => {
  try {
    const { lat, lng, tagKey, tagValue, radius } = req.query;

    if (!lat || !lng) {
      return errorResponse(res, 400, 'lat and lng parameters are required');
    }

    const results = await osmService.findNearest(
      parseFloat(lat),
      parseFloat(lng),
      tagKey || 'amenity',
      tagValue || 'restaurant',
      parseInt(radius) || 1000
    );

    successResponse(res, {
      center: { lat: parseFloat(lat), lng: parseFloat(lng) },
      search: { tagKey: tagKey || 'amenity', tagValue: tagValue || 'restaurant' },
      radius: `${parseInt(radius) || 1000}m`,
      results: results.elements || [],
      count: results.elements?.length || 0
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

// ==================== OSRM ROUTES ====================

/**
 * POST /api/map/get-route
 * Get route between two points
 * Body: { startLat, startLng, endLat, endLng, profile (optional) }
 */
router.post('/get-route', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, profile } = req.body;

    if (!startLat || !startLng || !endLat || !endLng) {
      return errorResponse(res, 400, 'startLat, startLng, endLat, endLng are all required');
    }

    const route = await osmService.getRoute(
      parseFloat(startLat),
      parseFloat(startLng),
      parseFloat(endLat),
      parseFloat(endLng),
      profile || 'driving'
    );

    if (route.code !== 'Ok') {
      return errorResponse(res, 400, `Routing failed: ${route.code}`);
    }

    const route_data = route.routes[0];

    successResponse(res, {
      profile: profile || 'driving',
      startPoint: { lat: parseFloat(startLat), lng: parseFloat(startLng) },
      endPoint: { lat: parseFloat(endLat), lng: parseFloat(endLng) },
      distance: `${(route_data.distance / 1000).toFixed(2)} km`,
      duration: `${Math.round(route_data.duration / 60)} minutes`,
      geometry: route_data.geometry,
      steps: route_data.steps
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

/**
 * POST /api/map/distance-matrix
 * Calculate distance/duration matrix for multiple points
 * Body: { coordinates: [[lng,lat], [lng,lat], ...], profile (optional) }
 */
router.post('/distance-matrix', async (req, res) => {
  try {
    const { coordinates, profile } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return errorResponse(res, 400, 'coordinates array with at least 2 points is required');
    }

    const matrix = await osmService.getDistanceMatrix(coordinates, profile || 'driving');

    if (matrix.code !== 'Ok') {
      return errorResponse(res, 400, `Matrix calculation failed: ${matrix.code}`);
    }

    // Convert distances to km and durations to minutes
    const distances = matrix.distances.map(row =>
      row.map(d => `${(d / 1000).toFixed(2)} km`)
    );
    const durations = matrix.durations.map(row =>
      row.map(d => `${Math.round(d / 60)} min`)
    );

    successResponse(res, {
      profile: profile || 'driving',
      points_count: coordinates.length,
      distances_km: distances,
      durations_minutes: durations,
      sources: matrix.sources,
      destinations: matrix.destinations
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

// ==================== ACCESSIBLE ROUTING ====================

/**
 * POST /api/map/get-accessible-route
 * Get an accessible route analyzed by Gemini AI for disabled/wheelchair users
 * Body: {
 *   startLat, startLng, endLat, endLng (required),
 *   accessibilityNeeds: {
 *     wheelchair: boolean,
 *     visualImpairment: boolean,
 *     hearingImpairment: boolean,
 *     mobilityAid: string ("wheelchair", "walker", "cane", "crutches"),
 *     avoidStairs: boolean,
 *     avoidSteepSlopes: boolean,
 *     preferSmooth: boolean,
 *     needsCurbCuts: boolean,
 *     minPathWidth: number (meters)
 *   }
 * }
 */
router.post('/get-accessible-route', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, accessibilityNeeds } = req.body;

    if (!startLat || !startLng || !endLat || !endLng) {
      return errorResponse(res, 400, 'startLat, startLng, endLat, endLng are all required');
    }

    if (!accessibilityNeeds || typeof accessibilityNeeds !== 'object') {
      return errorResponse(res, 400, 'accessibilityNeeds object is required');
    }

    console.log('🦽 Accessible route request:', { startLat, startLng, endLat, endLng });
    console.log('   Needs:', accessibilityNeeds);

    // Step 1: Get walking route from OSRM (foot profile as base)
    console.log('   Step 1: Fetching walking route from OSRM...');
    const route = await osmService.getRoute(
      parseFloat(startLat),
      parseFloat(startLng),
      parseFloat(endLat),
      parseFloat(endLng),
      'foot'
    );

    if (route.code !== 'Ok') {
      return errorResponse(res, 400, `Routing failed: ${route.code}`);
    }

    const routeData = route.routes[0];
    const distance = `${(routeData.distance / 1000).toFixed(2)} km`;
    const duration = `${Math.round(routeData.duration / 60)} minutes`;

    // Step 2: Query accessibility features along the route corridor
    console.log('   Step 2: Querying accessibility data from OpenStreetMap...');
    const accessibilityData = await accessibilityService.getAccessibilityData(
      routeData.geometry
    );

    // Step 3: Get accessible amenities near the route
    console.log('   Step 3: Finding accessible amenities nearby...');
    const bbox = accessibilityService._getBoundingBox(routeData.geometry, 0.005);
    const accessibleAmenities = await accessibilityService.getAccessibleAmenities(bbox);

    // Step 4: Summarize data for AI (reduce tokens)
    const accessibilitySummary = accessibilityService.summarizeForAI(accessibilityData);

    // Step 5: Gemini AI analysis
    console.log('   Step 4: Analyzing with Gemini AI...');
    const aiAnalysis = await geminiService.analyzeRouteAccessibility(
      {
        distance,
        duration,
        stepsCount: routeData.legs?.[0]?.steps?.length || 0
      },
      accessibilitySummary,
      accessibilityNeeds
    );

    console.log('   ✅ Accessible route analysis complete!');

    // Step 6: Build response
    successResponse(res, {
      profile: 'foot',
      startPoint: { lat: parseFloat(startLat), lng: parseFloat(startLng) },
      endPoint: { lat: parseFloat(endLat), lng: parseFloat(endLng) },
      route: {
        distance: distance,
        duration: duration,
        geometry: routeData.geometry,
        steps: routeData.legs?.[0]?.steps || []
      },
      accessibilityNeeds: accessibilityNeeds,
      accessibilityAnalysis: aiAnalysis,
      accessibilityDataSummary: accessibilitySummary,
      nearbyAccessibleAmenities: (accessibleAmenities.elements || []).slice(0, 20).map(el => ({
        type: el.tags?.amenity || 'unknown',
        name: el.tags?.name || null,
        wheelchair: el.tags?.wheelchair || 'unknown',
        location: {
          lat: el.lat || el.center?.lat,
          lng: el.lon || el.center?.lon
        }
      }))
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

// ==================== UTILITY ROUTES ====================

/**
 * GET /api/map/status
 * Check if all services are working
 */
router.get('/status', async (req, res) => {
  try {
    // Test Nominatim
    const nominatimTest = await osmService.searchAddress('Delhi')
      .then(() => true)
      .catch(() => false);

    // Test OSRM
    const osrmTest = await osmService.getRoute(28.6139, 77.2090, 28.4595, 77.0266)
      .then(() => true)
      .catch(() => false);

    successResponse(res, {
      nominatim: nominatimTest ? 'OK' : 'FAILED',
      osrm: osrmTest ? 'OK' : 'FAILED',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    errorResponse(res, 500, error);
  }
});

/**
 * GET /api/map/documentation
 * Get API documentation
 */
router.get('/documentation', (req, res) => {
  successResponse(res, {
    endpoints: [
      {
        method: 'GET',
        path: '/search-address',
        params: { query: 'string (required)', limit: 'number (optional)' },
        description: 'Search for an address'
      },
      {
        method: 'GET',
        path: '/reverse-geocode',
        params: { lat: 'number (required)', lng: 'number (required)' },
        description: 'Get address from coordinates'
      },
      {
        method: 'GET',
        path: '/find-pois',
        params: { bbox: 'string (required)', amenityType: 'string (required)' },
        description: 'Find POIs in area'
      },
      {
        method: 'GET',
        path: '/find-buildings',
        params: { bbox: 'string (required)' },
        description: 'Find buildings in area'
      },
      {
        method: 'GET',
        path: '/find-roads',
        params: { bbox: 'string (required)', roadType: 'string (optional)' },
        description: 'Find roads in area'
      },
      {
        method: 'GET',
        path: '/find-nearest',
        params: { lat: 'number (required)', lng: 'number (required)', tagKey: 'string', tagValue: 'string', radius: 'number' },
        description: 'Find nearest object'
      },
      {
        method: 'POST',
        path: '/get-route',
        body: { startLat: 'number', startLng: 'number', endLat: 'number', endLng: 'number', profile: 'string' },
        description: 'Get route between points'
      },
      {
        method: 'POST',
        path: '/distance-matrix',
        body: { coordinates: 'array', profile: 'string' },
        description: 'Calculate distance matrix'
      },
      {
        method: 'GET',
        path: '/status',
        description: 'Check service status'
      },
      {
        method: 'POST',
        path: '/get-accessible-route',
        body: {
          startLat: 'number (required)',
          startLng: 'number (required)',
          endLat: 'number (required)',
          endLng: 'number (required)',
          accessibilityNeeds: {
            wheelchair: 'boolean',
            visualImpairment: 'boolean',
            hearingImpairment: 'boolean',
            mobilityAid: 'string (wheelchair/walker/cane/crutches)',
            avoidStairs: 'boolean',
            avoidSteepSlopes: 'boolean',
            preferSmooth: 'boolean',
            needsCurbCuts: 'boolean',
            minPathWidth: 'number (meters)'
          }
        },
        description: 'Get accessible route with Gemini AI analysis for disabled/wheelchair users'
      }
    ]
  });
});

module.exports = router;
