# Features

This folder contains feature-specific code organized by feature.

## Feature Organization
Each major feature gets its own folder:

```
features/
├── outdoor-directions/
│   ├── OutdoorDirectionsScreen.js
│   ├── components/
│   │   ├── TransportSelector.js
│   │   └── RoutePreview.js
│   └── outdoorService.js
│
├── indoor-navigation/
│   ├── IndoorNavigationScreen.js
│   ├── components/
│   │   ├── FloorSelector.js
│   │   ├── FloorPlan.js
│   │   └── PathOverlay.js
│   └── indoorService.js
│
└── points-of-interest/
    ├── POIScreen.js
    ├── components/
    │   ├── POIList.js
    │   └── POIMarker.js
    └── poiService.js
```

## Feature Development Workflow

### 1. Create Feature Folder
```bash
mkdir -p src/features/your-feature-name
cd src/features/your-feature-name
```

### 2. Create Screen Component
Main screen file (e.g., `YourFeatureScreen.js`)

### 3. Add Feature-Specific Components
Create `components/` subfolder for components only used in this feature

### 4. Add Service File
Create service file for API calls (e.g., `yourFeatureService.js`)

### 5. Register with Navigation
Add screen to navigation stack in `src/navigation/`

## Example Feature Structure

### Feature: Outdoor Directions
```
outdoor-directions/
├── OutdoorDirectionsScreen.js      # Main screen
├── components/
│   ├── TransportSelector.js        # Walk/Drive/Transit buttons
│   ├── RoutePreview.js             # Route summary card
│   └── DirectionsList.js           # Turn-by-turn directions
└── outdoorService.js                # API calls to backend
```

## Guidelines
- Keep feature code self-contained
- Use shared components from `src/components/`
- Use shared services from `src/services/`
