# 🗺️ Navara Accessible Routing API

A specialized backend service built on OpenStreetMap (OSM) that provides intelligent routing for people with disabilities, analyzed and scored by Gemini AI.

---

## 🚀 Quick Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Rename `env` to `.env` (if not already done) and fill in your keys:
   ```bash
   # .env
   PORT=5000
   NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
   OVERPASS_BASE_URL=https://overpass-api.de/api/interpreter
   OSRM_BASE_URL=https://router.project-osrm.org
   
   # Required for AI analysis (Get one at aistudio.google.com)
   GEMINI_API_KEY=your_key_here
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```

---

## 🧪 Testing in Postman

### 1. Search Address (Location Lookup)
**URL**: `GET http://localhost:5000/api/map/search-address?query=noida`

*   **Method**: `GET`
*   **Params**: `query=noida` (You can search for any city/location)
*   **What it does**: Converts an address string into latitude/longitude coordinates that you'll need for routing.

### 2. Get Accessible Route (AI Analysis)
**URL**: `POST http://localhost:5000/api/map/get-accessible-route`

*   **Method**: `POST`
*   **Body (JSON)**:
    ```json
    {
        "startLat": 28.6139,
        "startLng": 77.2090,
        "endLat": 28.6562,
        "endLng": 77.2410,
        "accessibilityNeeds": {
            "wheelchair": true,
            "avoidStairs": true,
            "preferSmooth": true,
            "avoidSteepSlopes": true,
            "needsCurbCuts": true,
            "mobilityAid": "wheelchair"
        }
    }
    ```

---

## 🦽 Accessible Route Options (`accessibilityNeeds`)

| Option | Type | Description |
| :--- | :--- | :--- |
| **`wheelchair`** | `boolean` | Flags steps, narrow paths, and steep slopes as critical barriers. |
| **`avoidStairs`** | `boolean` | Specifically avoids any `highway=steps` found in OSM data. |
| **`preferSmooth`** | `boolean` | Prioritizes paved/asphalt surfaces over cobblestone or gravel. |
| **`avoidSteepSlopes`**| `boolean` | Flags segments with an incline > 6% (too steep for many manual chairs). |
| **`needsCurbCuts`** | `boolean` | Checks for lowered/flush curbs at every road crossing. |
| **`visualImpairment`**| `boolean` | Checks for tactile paving and audio signals at intersections. |
| **`mobilityAid`** | `string` | `"wheelchair"`, `"walker"`, `"cane"`, or `"crutches"`. Gemini uses this to adjust timing. |
| **`minPathWidth`** | `number` | Minimum width (in meters) required for your mobility aid (e.g. `1.2`). |

---

## 🧠 What Gemini AI Analyzes
When you call the **Accessible Route** API, the backend:
1.  Fetches a **realistic walking route** (fixed for walking speeds).
2.  Scans a **50m corridor** around the route for accessibility data (surface types, curbs, elevators).
3.  Sends the data to **Gemini AI** to calculate an **Accessibility Score (0-100)** and a detailed risk report.

> [!IMPORTANT]
> The response will contain a field called `accessibilityAnalysis`. This is where the AI's "human" advice for the disabled user is stored.