const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

export const fetchNearbyPOIs = async ({
  lat,
  lng,
  radius = 1000,
  type = "cafe",
}) => {
  if (!API_KEY) {
    console.warn("Missing Google API key");
    return [];
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${API_KEY}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("Failed to fetch POIs");
    }

    const data = await res.json();

    if (data.status !== "OK") {
      console.warn("Google Places error:", data.status);
      return [];
    }

    return data.results.map((poi) => ({
      id: poi.place_id,
      name: poi.name,
      rating: poi.rating || null,
      coords: {
        latitude: poi.geometry.location.lat,
        longitude: poi.geometry.location.lng,
      },
      address: poi.vicinity,
    }));
  } catch (error) {
    console.error("POI fetch error:", error);
    return [];
  }
};

export const categoryToType = {
  Coffee: "cafe",
  Food: "restaurant",
  Study: "library",
};