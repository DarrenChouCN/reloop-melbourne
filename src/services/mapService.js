export const mapToken = import.meta.env.VITE_MAPBOX_TOKEN?.trim() || ''
const bounds = [144.4, -38.5, 145.7, -37.4]

export function isMelbournePoint(point) {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    point.every(Number.isFinite) &&
    point[0] >= bounds[0] &&
    point[0] <= bounds[2] &&
    point[1] >= bounds[1] &&
    point[1] <= bounds[3]
  )
}

async function request(path, parameters, signal) {
  const query = new URLSearchParams({ ...parameters, access_token: mapToken })
  const response = await fetch(`https://api.mapbox.com/${path}?${query}`, { signal })
  if (!response.ok) {
    if (response.status === 429) throw new Error('The map service is busy. Please try again later.')
    throw new Error('The map service is unavailable. You can still browse the service directory.')
  }
  return response.json()
}

export async function searchPlaces(text, signal) {
  const q = text.trim()
  if (q.length < 2 || q.length > 100 || q.includes(';') || q.split(/\s+/).length > 20)
    throw new Error('Enter a short address, suburb or postcode in Melbourne.')
  // Search only when submitted; keep temporary results in memory.
  const data = await request(
    'search/geocode/v6/forward',
    {
      q,
      country: 'au',
      bbox: bounds.join(','),
      language: 'en',
      limit: '5',
      autocomplete: 'false',
    },
    signal,
  )
  return (data.features || [])
    .filter((place) => isMelbournePoint(place.geometry?.coordinates))
    .map((place) => ({
      id: place.properties.mapbox_id,
      label:
        place.properties.full_address ||
        [place.properties.name, place.properties.place_formatted].filter(Boolean).join(', '),
      coordinates: place.geometry.coordinates,
    }))
}

export async function getRoute(start, end, mode, signal) {
  if (
    !isMelbournePoint(start) ||
    !isMelbournePoint(end) ||
    !['driving', 'walking', 'cycling'].includes(mode)
  )
    throw new Error('Choose a starting point and destination in Melbourne.')
  // Mapbox coordinates are longitude first, then latitude.
  const data = await request(
    `directions/v5/mapbox/${mode}/${start.join(',')};${end.join(',')}`,
    {
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      language: 'en',
    },
    signal,
  )
  if (data.code !== 'Ok' || !data.routes?.length)
    throw new Error('No route was found. Try another starting point or travel mode.')
  return data.routes[0]
}
