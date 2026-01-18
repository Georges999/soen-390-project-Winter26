# Controllers

This folder contains business logic for handling API requests.

## Controller Organization
Create controllers that match your routes:
- `buildingsController.js` - Building operations
- `directionsController.js` - Direction calculations
- `indoorController.js` - Indoor navigation logic
- `poiController.js` - Points of interest operations

## Controller Structure
Controllers receive request/response and handle business logic:

```javascript
const buildingsService = require('../services/buildingsService');

/**
 * Get all buildings
 */
exports.getAllBuildings = async (req, res) => {
  try {
    const buildings = await buildingsService.fetchAllBuildings();
    res.json({
      success: true,
      data: buildings,
    });
  } catch (error) {
    console.error('Error in getAllBuildings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch buildings',
    });
  }
};

/**
 * Get building by ID
 */
exports.getBuildingById = async (req, res) => {
  try {
    const { id } = req.params;
    const building = await buildingsService.fetchBuildingById(id);
    
    if (!building) {
      return res.status(404).json({
        success: false,
        error: 'Building not found',
      });
    }
    
    res.json({
      success: true,
      data: building,
    });
  } catch (error) {
    console.error('Error in getBuildingById:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch building',
    });
  }
};

/**
 * Get buildings by campus
 */
exports.getBuildingsByCampus = async (req, res) => {
  try {
    const { campus } = req.params;
    
    // Validate campus parameter
    if (!['SGW', 'Loyola'].includes(campus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campus. Must be SGW or Loyola',
      });
    }
    
    const buildings = await buildingsService.fetchBuildingsByCampus(campus);
    res.json({
      success: true,
      data: buildings,
    });
  } catch (error) {
    console.error('Error in getBuildingsByCampus:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch buildings',
    });
  }
};
```

## Response Format
Use consistent response format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Guidelines
1. **Validation:** Validate input parameters
2. **Error Handling:** Always wrap in try-catch
3. **Status Codes:** Use appropriate HTTP status codes
4. **Separation:** Controllers handle HTTP, services handle business logic
5. **Documentation:** Comment complex operations
