const axios = require('axios');

// Profile mapping for public OSRM server
// Public OSRM expects 'foot' not 'walking', 'bike' not 'cycling'
const OSRM_PROFILES = {
  driving: 'driving',
  walking: 'foot',
  foot: 'foot',
  cycling: 'bike',
  bike: 'bike',
  wheelchair: 'foot' // Use foot profile as base for wheelchair routing
};

class OSMService {
  constructor() {
    this.nominatim = axios.create({
      baseURL: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
      timeout: 10000,
      headers: {
        'User-Agent': 'NavaraBackend/1.0 (github.com/navara-backend)',
        'Referer': 'https://navara-backend.app'
      }
    });

    this.overpass = axios.create({
      baseURL: process.env.OVERPASS_BASE_URL || 'https://overpass-api.de/api/interpreter',
      timeout: 30000
    });

    this.osrm = axios.create({
      baseURL: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
      timeout: 15000
    });

    // Secondary accurate routing service for foot/bike
    this.osm_de_routing = 'https://routing.openstreetmap.de';
  }

  /**
   * Search address and get coordinates
   * @param {string} query - Address query (e.g., "Delhi India")
   * @returns {Promise<Array>} Array of location results
   */
  async searchAddress(query) {
    try {
      const response = await this.nominatim.get('/search', {
        params: {
          q: query,
          format: 'json',
          limit: 10,
          addressdetails: 1
        }
      });
      return response.data;
    } catch (error) {
      console.error('Address search error:', error.message);
      throw new Error(`Address search failed: ${error.message}`);
    }
  }

  /**
   * Reverse geocoding - Get address from coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object>} Address details
   */
  async reverseGeocode(lat, lng) {
    try {
      const response = await this.nominatim.get('/reverse', {
        params: {
          lat: lat,
          lon: lng,
          format: 'json',
          addressdetails: 1,
          zoom: 18
        }
      });
      return response.data;
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  /**
   * Find Points of Interest (POIs)
   * @param {string} bbox - Bounding box "south,west,north,east"
   * @param {string} amenityType - Type of amenity (restaurant, hospital, etc.)
   * @returns {Promise<Object>} OSM features
   */
  async findPOIs(bbox, amenityType) {
    try {
      const overpassQuery = `
        [bbox:${bbox}];
        (
          node["amenity"="${amenityType}"];
          way["amenity"="${amenityType}"];
          relation["amenity"="${amenityType}"];
        );
        out center;
      `;

      const response = await this.overpass.post('',
        `data=${encodeURIComponent(overpassQuery)}`
      );
      return response.data;
    } catch (error) {
      console.error('POI search error:', error.message);
      throw new Error(`POI search failed: ${error.message}`);
    }
  }

  /**
   * Find buildings in area
   * @param {string} bbox - Bounding box "south,west,north,east"
   * @returns {Promise<Object>} Building features
   */
  async findBuildings(bbox) {
    try {
      const overpassQuery = `
        [bbox:${bbox}];
        (
          way["building"];
          relation["building"];
        );
        out center;
      `;

      const response = await this.overpass.post('',
        `data=${encodeURIComponent(overpassQuery)}`
      );
      return response.data;
    } catch (error) {
      console.error('Building search error:', error.message);
      throw new Error(`Building search failed: ${error.message}`);
    }
  }

  /**
   * Find roads/highways in area
   * @param {string} bbox - Bounding box "south,west,north,east"
   * @param {string} roadType - Type of road (primary, secondary, residential, etc.)
   * @returns {Promise<Object>} Road features
   */
  async findRoads(bbox, roadType = 'primary') {
    try {
      const overpassQuery = `
        [bbox:${bbox}];
        (
          way["highway"="${roadType}"];
        );
        out geom;
      `;

      const response = await this.overpass.post('',
        `data=${encodeURIComponent(overpassQuery)}`
      );
      return response.data;
    } catch (error) {
      console.error('Road search error:', error.message);
      throw new Error(`Road search failed: ${error.message}`);
    }
  }

  /**
   * Get route between two points
   * @param {number} startLat - Starting latitude
   * @param {number} startLng - Starting longitude
   * @param {number} endLat - Ending latitude
   * @param {number} endLng - Ending longitude
   * @param {string} profile - Routing profile (driving, walking, cycling)
   * @returns {Promise<Object>} Route details
   */
  async getRoute(startLat, startLng, endLat, endLng, profile = 'driving') {
    try {
      const osrmProfile = OSRM_PROFILES[profile] || profile;

      // Use the more accurate German OSRM instance for walking/cycling
      let url;
      if (osrmProfile === 'foot') {
        url = `${this.osm_de_routing}/routed-foot/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`;
      } else if (osrmProfile === 'bike') {
        url = `${this.osm_de_routing}/routed-bike/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`;
      } else {
        url = `${this.osrm.defaults.baseURL}/route/v1/${osrmProfile}/${startLng},${startLat};${endLng},${endLat}`;
      }

      console.log(`🗺️  Routing request to: ${url}`);

      const response = await axios.get(url, {
        params: {
          overview: 'full',
          steps: true,
          geometries: 'geojson',
          continue_straight: false
        }
      });
      return response.data;
    } catch (error) {
      console.error('Routing error:', error.message);
      throw new Error(`Routing failed: ${error.message}`);
    }
  }

  /**
   * Get distance matrix between multiple points
   * @param {Array<Array<number>>} coordinates - Array of [lng, lat] pairs
   * @param {string} profile - Routing profile (driving, walking, cycling)
   * @returns {Promise<Object>} Distance and duration matrix
   */
  async getDistanceMatrix(coordinates, profile = 'driving') {
    try {
      const osrmProfile = OSRM_PROFILES[profile] || profile;
      const coordString = coordinates.map(c => c.join(',')).join(';');
      const response = await this.osrm.get(
        `/table/v1/${osrmProfile}/${coordString}`,
        {
          params: {
            annotations: 'distance,duration'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Distance matrix error:', error.message);
      throw new Error(`Distance matrix failed: ${error.message}`);
    }
  }

  /**
   * Get isochrone (reachable area within time/distance)
   * Requires local isochrone server
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} time - Minutes reachable
   * @param {string} profile - Routing profile
   * @returns {Promise<Object>} GeoJSON polygon
   */
  async getIsochrone(lat, lng, time = 10, profile = 'driving') {
    try {
      // Note: This requires isochrone server, not standard OSRM
      const response = await axios.get(
        `https://api.openrouteservice.org/v2/isochrones/${profile}`,
        {
          params: {
            api_key: process.env.OPENROUTE_API_KEY,
            location: `${lng},${lat}`,
            range: time * 60 // Convert minutes to seconds
          },
          timeout: 10000
        }
      );
      return response.data;
    } catch (error) {
      console.error('Isochrone error:', error.message);
      throw new Error(`Isochrone calculation failed: ${error.message}`);
    }
  }

  /**
   * Batch search for multiple addresses
   * @param {Array<string>} queries - Array of address queries
   * @returns {Promise<Array>} Array of results
   */
  async batchSearchAddresses(queries) {
    try {
      const results = await Promise.all(
        queries.map(query => this.searchAddress(query))
      );
      return results;
    } catch (error) {
      console.error('Batch search error:', error.message);
      throw new Error(`Batch search failed: ${error.message}`);
    }
  }

  /**
   * Get nearest object to a coordinate
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} tagKey - OSM tag key (amenity, building, etc.)
   * @param {string} tagValue - OSM tag value (restaurant, hospital, etc.)
   * @param {number} radius - Search radius in meters (default: 1000)
   * @returns {Promise<Object>} Nearest object
   */
  async findNearest(lat, lng, tagKey = 'amenity', tagValue = 'restaurant', radius = 1000) {
    try {
      const overpassQuery = `
        [out:json];
        (
          node["${tagKey}"="${tagValue}"](around:${radius},${lat},${lng});
          way["${tagKey}"="${tagValue}"](around:${radius},${lat},${lng});
          relation["${tagKey}"="${tagValue}"](around:${radius},${lat},${lng});
        );
        out center;
      `;

      const response = await this.overpass.post('',
        `data=${encodeURIComponent(overpassQuery)}`
      );
      return response.data;
    } catch (error) {
      console.error('Nearest search error:', error.message);
      throw new Error(`Nearest search failed: ${error.message}`);
    }
  }
}

module.exports = new OSMService();
