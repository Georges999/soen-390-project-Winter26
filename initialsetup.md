

## Initial Setup

```bash
# Clone and install
git clone <repository-url>
cd campus-guide

# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
```

Create `.env` files in `frontend/` and `backend/` directories. Ask team for credentials or check the team chat for the shared keys.

## Running Locally

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm start
```

COMMANDS
### Frontend
```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm test           # Run tests
npm run lint       # Lint code
```

### Backend
```bash
npm run dev        # Start dev server
npm start          # Start production server
npm test           # Run tests
npm run lint       # Lint code