# Database

This folder contains database configuration, models, and queries.

## Files Structure
```
database/
├── supabaseClient.js    # Supabase client initialization
├── models/              # Data models (if needed)
└── queries/             # Complex SQL queries
```

## Supabase Client
`supabaseClient.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
```

## Usage Example
```javascript
const supabase = require('./database/supabaseClient');

// Query buildings
const { data, error } = await supabase
  .from('buildings')
  .select('*')
  .eq('campus', 'SGW');

if (error) {
  console.error('Database error:', error);
  throw error;
}

return data;
```

## Database Tables

### buildings
```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  campus TEXT NOT NULL CHECK (campus IN ('SGW', 'Loyola')),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### rooms
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id),
  room_number TEXT NOT NULL,
  floor INTEGER NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accessibility_features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### floor_plans
```sql
CREATE TABLE floor_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id),
  floor_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  scale_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### points_of_interest
```sql
CREATE TABLE points_of_interest (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  building_id UUID REFERENCES buildings(id),
  floor INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Query Best Practices
1. **Use Prepared Statements:** Prevent SQL injection
2. **Error Handling:** Always check for errors
3. **Indexing:** Add indexes for frequently queried columns
4. **Transactions:** Use for multiple related operations
5. **Connection Pooling:** Reuse database connections
