const axios = require('axios');

class AccessibilityService {
  constructor() {
    this.overpass = axios.create({
      baseURL: process.env.OVERPASS_BASE_URL || 'https://overpass-api.de/api/interpreter',
      timeout: 60000 // Longer timeout for complex queries
    });
  }

  /**
   * Sample points along a route geometry to create a search corridor
   * @param {Object} geometry - GeoJSON geometry from OSRM
   * @param {number} sampleInterval - Sample every Nth point
   * @returns {Array} Array of {lat, lng} points
   */
  _sampleRoutePoints(geometry, sampleInterval = 5) {
    if (!geometry || !geometry.coordinates) return [];

    const coords = geometry.coordinates;
    const sampled = [];

    for (let i = 0; i < coords.length; i += sampleInterval) {
      sampled.push({
        lng: coords[i][0],
        lat: coords[i][1]
      });
    }

    // Always include the last point
    if (coords.length > 0) {
      const last = coords[coords.length - 1];
      sampled.push({ lng: last[0], lat: last[1] });
    }

    return sampled;
  }

  /**
   * Calculate bounding box from route geometry with buffer
   * @param {Object} geometry - GeoJSON geometry
   * @param {number} bufferDeg - Buffer in degrees (~111m per 0.001 deg)
   * @returns {string} "south,west,north,east"
   */
  _getBoundingBox(geometry, bufferDeg = 0.003) {
    if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
      return null;
    }

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const coord of geometry.coordinates) {
      const lng = coord[0];
      const lat = coord[1];
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }

    return `${minLat - bufferDeg},${minLng - bufferDeg},${maxLat + bufferDeg},${maxLng + bufferDeg}`;
  }

  /**
   * Query Overpass API for accessibility-relevant features along a route
   * @param {Object} routeGeometry - GeoJSON geometry from OSRM route
   * @param {number} corridorRadius - Search radius in meters around route
   * @returns {Promise<Object>} Accessibility data
   */
  async getAccessibilityData(routeGeometry, corridorRadius = 50) {
    try {
      const bbox = this._getBoundingBox(routeGeometry);
      if (!bbox) {
        return this._emptyAccessibilityData();
      }

      // Run multiple focused queries in parallel for speed
      const [
        wheelchairData,
        surfaceData,
        barrierData,
        curbData,
        tactileData,
        rampData
      ] = await Promise.allSettled([
        this._queryWheelchairFeatures(bbox),
        this._querySurfaceData(bbox),
        this._queryBarriers(bbox),
        this._queryCurbData(bbox),
        this._queryTactilePaving(bbox),
        this._queryRampsAndElevators(bbox)
      ]);

      return {
        wheelchair: this._extractResult(wheelchairData),
        surfaces: this._extractResult(surfaceData),
        barriers: this._extractResult(barrierData),
        curbs: this._extractResult(curbData),
        tactilePaving: this._extractResult(tactileData),
        rampsAndElevators: this._extractResult(rampData),
        bbox: bbox,
        queriedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Accessibility data fetch error:', error.message);
      throw new Error(`Accessibility data fetch failed: ${error.message}`);
    }
  }

  /**
   * Extract result from Promise.allSettled
   */
  _extractResult(settledResult) {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    }
    console.warn('Accessibility query failed:', settledResult.reason?.message);
    return { elements: [], error: settledResult.reason?.message };
  }

  /**
   * Query wheelchair-accessible features
   */
  async _queryWheelchairFeatures(bbox) {
    const query = `
      [out:json][timeout:25][bbox:${bbox}];
      (
        nwr["wheelchair"];
        nwr["wheelchair:description"];
      );
      out center tags;
    `;
    const response = await this.overpass.post('', `data=${encodeURIComponent(query)}`);
    return response.data;
  }

  /**
   * Query surface and smoothness data for paths/roads
   */
  async _querySurfaceData(bbox) {
    const query = `
      [out:json][timeout:25][bbox:${bbox}];
      (
        way["highway"]["surface"];
        way["highway"]["smoothness"];
        way["highway"]["width"];
        way["highway"]["incline"];
        way["footway"]["surface"];
        way["sidewalk"]["surface"];
      );
      out center tags;
    `;
    const response = await this.overpass.post('', `data=${encodeURIComponent(query)}`);
    return response.data;
  }

  /**
   * Query barriers (steps, gates, bollards, etc.)
   */
  async _queryBarriers(bbox) {
    const query = `
      [out:json][timeout:25][bbox:${bbox}];
      (
        node["barrier"];
        node["highway"="steps"];
        way["highway"="steps"];
        node["obstacle:wheelchair"];
      );
      out center tags;
    `;
    const response = await this.overpass.post('', `data=${encodeURIComponent(query)}`);
    return response.data;
  }

  /**
   * Query curb/kerb data
   */
  async _queryCurbData(bbox) {
    const query = `
      [out:json][timeout:25][bbox:${bbox}];
      (
        node["kerb"];
        node["highway"="crossing"]["kerb"];
        node["highway"="crossing"]["wheelchair"];
      );
      out center tags;
    `;
    const response = await this.overpass.post('', `data=${encodeURIComponent(query)}`);
    return response.data;
  }

  /**
   * Query tactile paving features (for visually impaired)
   */
  async _queryTactilePaving(bbox) {
    const query = `
      [out:json][timeout:25][bbox:${bbox}];
      (
        nwr["tactile_paving"];
        nwr["traffic_signals:sound"];
        nwr["traffic_signals:vibration"];
      );
      out center tags;
    `;
    const response = await this.overpass.post('', `data=${encodeURIComponent(query)}`);
    return response.data;
  }

  /**
   * Query ramps, elevators, and escalators
   */
  async _queryRampsAndElevators(bbox) {
    const query = `
      [out:json][timeout:25][bbox:${bbox}];
      (
        nwr["highway"="elevator"];
        nwr["building:part"="elevator"];
        nwr["conveying"];
        nwr["ramp"];
        nwr["ramp:wheelchair"];
        nwr["entrance"]["wheelchair"];
      );
      out center tags;
    `;
    const response = await this.overpass.post('', `data=${encodeURIComponent(query)}`);
    return response.data;
  }

  /**
   * Find wheelchair-accessible amenities near the route
   */
  async getAccessibleAmenities(bbox) {
    try {
      const query = `
        [out:json][timeout:25][bbox:${bbox}];
        (
          nwr["amenity"="toilets"]["wheelchair"="yes"];
          nwr["amenity"="parking"]["wheelchair"="yes"];
          nwr["amenity"="parking_space"]["wheelchair"="yes"];
          nwr["amenity"="pharmacy"]["wheelchair"="yes"];
          nwr["amenity"="hospital"]["wheelchair"="yes"];
          nwr["amenity"="bench"];
          nwr["amenity"="shelter"];
        );
        out center tags;
      `;
      const response = await this.overpass.post('', `data=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Accessible amenities query error:', error.message);
      return { elements: [] };
    }
  }

  /**
   * Return empty accessibility data structure
   */
  _emptyAccessibilityData() {
    return {
      wheelchair: { elements: [] },
      surfaces: { elements: [] },
      barriers: { elements: [] },
      curbs: { elements: [] },
      tactilePaving: { elements: [] },
      rampsAndElevators: { elements: [] },
      bbox: null,
      queriedAt: new Date().toISOString()
    };
  }

  /**
   * Summarize accessibility data for Gemini prompt (reduce token usage)
   */
  summarizeForAI(accessibilityData) {
    const summary = {
      wheelchairAccessiblePlaces: 0,
      wheelchairLimitedPlaces: 0,
      wheelchairInaccessiblePlaces: 0,
      surfaces: {},
      smoothness: {},
      barriers: [],
      curbTypes: {},
      tactilePavingCount: 0,
      ramps: 0,
      elevators: 0,
      stepsCount: 0,
      narrowWidths: [],
      steepInclines: []
    };

    // Wheelchair features
    const wheelchairElements = accessibilityData.wheelchair?.elements || [];
    for (const el of wheelchairElements) {
      const wc = el.tags?.wheelchair;
      if (wc === 'yes' || wc === 'designated') summary.wheelchairAccessiblePlaces++;
      else if (wc === 'limited') summary.wheelchairLimitedPlaces++;
      else if (wc === 'no') summary.wheelchairInaccessiblePlaces++;
    }

    // Surfaces
    const surfaceElements = accessibilityData.surfaces?.elements || [];
    for (const el of surfaceElements) {
      if (el.tags?.surface) {
        summary.surfaces[el.tags.surface] = (summary.surfaces[el.tags.surface] || 0) + 1;
      }
      if (el.tags?.smoothness) {
        summary.smoothness[el.tags.smoothness] = (summary.smoothness[el.tags.smoothness] || 0) + 1;
      }
      if (el.tags?.width) {
        const width = parseFloat(el.tags.width);
        if (!isNaN(width) && width < 1.5) {
          summary.narrowWidths.push({ width: el.tags.width, id: el.id });
        }
      }
      if (el.tags?.incline) {
        const incline = parseFloat(el.tags.incline);
        if (!isNaN(incline) && Math.abs(incline) > 6) {
          summary.steepInclines.push({ incline: el.tags.incline, id: el.id });
        }
      }
    }

    // Barriers
    const barrierElements = accessibilityData.barriers?.elements || [];
    for (const el of barrierElements) {
      if (el.tags?.highway === 'steps') {
        summary.stepsCount++;
      } else if (el.tags?.barrier) {
        summary.barriers.push({
          type: el.tags.barrier,
          wheelchair: el.tags?.wheelchair || 'unknown',
          lat: el.lat,
          lon: el.lon
        });
      }
    }

    // Curbs
    const curbElements = accessibilityData.curbs?.elements || [];
    for (const el of curbElements) {
      if (el.tags?.kerb) {
        summary.curbTypes[el.tags.kerb] = (summary.curbTypes[el.tags.kerb] || 0) + 1;
      }
    }

    // Tactile paving
    const tactileElements = accessibilityData.tactilePaving?.elements || [];
    summary.tactilePavingCount = tactileElements.filter(
      el => el.tags?.tactile_paving === 'yes'
    ).length;

    // Ramps & elevators
    const rampElements = accessibilityData.rampsAndElevators?.elements || [];
    for (const el of rampElements) {
      if (el.tags?.highway === 'elevator' || el.tags?.['building:part'] === 'elevator') {
        summary.elevators++;
      }
      if (el.tags?.ramp === 'yes' || el.tags?.['ramp:wheelchair'] === 'yes') {
        summary.ramps++;
      }
    }

    return summary;
  }
}

module.exports = new AccessibilityService();
