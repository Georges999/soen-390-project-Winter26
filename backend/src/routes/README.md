# Routes

This folder contains API route definitions organized by feature.

## Route Organization
Create separate route files for each feature domain:
- `buildingsRoutes.js` - Building information endpoints
- `directionsRoutes.js` - Outdoor directions endpoints
- `indoorRoutes.js` - Indoor navigation endpoints
- `poiRoutes.js` - Points of interest endpoints
- `scheduleRoutes.js` - Class schedule endpoints

## Example Route File
```javascript
const express = require('express');
const router = express.Router();
const buildingsController = require('../controllers/buildingsController');

// GET /api/buildings - Get all buildings
router.get('/', buildingsController.getAllBuildings);

// GET /api/buildings/:id - Get building by ID
router.get('/:id', buildingsController.getBuildingById);

// GET /api/buildings/campus/:campus - Get buildings by campus
router.get('/campus/:campus', buildingsController.getBuildingsByCampus);

module.exports = router;
```

## Registering Routes
In `backend/src/index.js`:
```javascript
const buildingsRoutes = require('./routes/buildingsRoutes');
app.use('/api/buildings', buildingsRoutes);
```

## Route Naming Conventions
- Use plural nouns: `/buildings`, `/directions`, `/schedules`
- Use kebab-case: `/points-of-interest`
- Use RESTful conventions:
  - `GET /resource` - List all
  - `GET /resource/:id` - Get one
  - `POST /resource` - Create
  - `PUT /resource/:id` - Update
  - `DELETE /resource/:id` - Delete

## Middleware
Apply middleware in routes:
```javascript
const authenticate = require('../middleware/auth');
router.get('/protected', authenticate, controller.protectedRoute);
```
