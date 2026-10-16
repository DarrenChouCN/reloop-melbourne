<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getRoute, isMelbournePoint, mapToken, searchPlaces } from '../services/mapService'

const props = defineProps({ services: { type: Array, required: true }, selectedId: String })
const emit = defineEmits(['select-service'])
const container = ref(null)
const ready = ref(false)
const query = ref('')
const results = ref([])
const origin = ref(null)
const destinationId = ref(props.services[0]?.id || '')
const mode = ref('driving')
const trip = ref(null)
const busy = ref('')
const error = ref('')
const searchMessage = ref('')
const destination = computed(() =>
  props.services.find((service) => service.id === destinationId.value),
)
let map, originMarker, controller
let markers = []
let requestId = 0
const emptyRoute = { type: 'FeatureCollection', features: [] }

function cancelRequest() {
  // Ignore late responses as well as stopping any active fetch.
  requestId++
  controller?.abort()
  busy.value = ''
}
function clearRoute() {
  cancelRequest()
  trip.value = null
  map?.getSource('route')?.setData(emptyRoute)
}
function beginRequest(task) {
  cancelRequest()
  controller = new AbortController()
  busy.value = task
  error.value = ''
  return requestId
}
function showPoints(points) {
  if (!points.length) return
  const bounds = new mapboxgl.LngLatBounds()
  points.forEach((point) => bounds.extend(point))
  map.fitBounds(bounds, { padding: 45, maxZoom: 14, duration: 0 })
}
function updateMarkers() {
  markers.forEach((marker) => marker.remove())
  markers = props.services.map((service, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'service-pin'
    button.textContent = String(index + 1)
    button.setAttribute('aria-label', `Select ${service.name}, demonstration location`)
    button.title = service.name
    button.onclick = () => {
      destinationId.value = service.id
      emit('select-service', service.id)
    }
    return new mapboxgl.Marker({ element: button }).setLngLat(service.coordinates).addTo(map)
  })
  showPoints(props.services.map((service) => service.coordinates))
}

onMounted(() => {
  if (!mapToken.startsWith('pk.') || !mapboxgl.supported()) {
    error.value = 'The interactive map is unavailable. You can still use the service directory.'
    return
  }
  try {
    map = new mapboxgl.Map({
      container: container.value,
      accessToken: mapToken,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [145.1, -37.82],
      zoom: 10,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }))
    map.scrollZoom.disable()
    map.on('error', () => {
      error.value = 'Map tiles could not load. Check your connection or try again later.'
    })
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: emptyRoute })
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#005fcc', 'line-width': 5 },
      })
      ready.value = true
      updateMarkers()
    })
  } catch {
    error.value =
      'The map could not start in this browser. You can still use the service directory.'
  }
})
onUnmounted(() => {
  cancelRequest()
  map?.remove()
  map = null
})

// Keep map markers and destinations in sync with the directory filters.
watch(
  () => props.services.map((service) => service.id).join(','),
  () => {
    clearRoute()
    if (!destination.value) destinationId.value = props.services[0]?.id || ''
    if (ready.value) updateMarkers()
  },
)
watch(
  () => props.selectedId,
  (id) => {
    if (props.services.some((service) => service.id === id)) destinationId.value = id
  },
)
watch([destinationId, mode], () => {
  clearRoute()
  if (ready.value && destination.value) showPoints([destination.value.coordinates])
})

async function findPlaces() {
  const id = beginRequest('Searching places…')
  results.value = []
  searchMessage.value = ''
  try {
    const found = await searchPlaces(query.value, controller.signal)
    if (id !== requestId) return
    results.value = found
    searchMessage.value = found.length
      ? 'Choose a result to set your starting point.'
      : 'No places found. Try another address or suburb.'
  } catch (problem) {
    if (id === requestId) error.value = problem.message
  } finally {
    if (id === requestId) busy.value = ''
  }
}
function chooseOrigin(place) {
  clearRoute()
  origin.value = place
  results.value = []
  searchMessage.value = ''
  error.value = ''
  originMarker?.remove()
  originMarker = new mapboxgl.Marker({ color: '#216137' }).setLngLat(place.coordinates).addTo(map)
  showPoints([place.coordinates])
}
function useLocation() {
  if (!navigator.geolocation) {
    error.value = 'Location is not supported. Search for a starting address instead.'
    return
  }
  const id = beginRequest('Finding your location…')
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (id !== requestId) return
      const coordinates = [position.coords.longitude, position.coords.latitude]
      if (!isMelbournePoint(coordinates)) {
        error.value =
          'Your location is outside Melbourne. Search for a Melbourne starting point instead.'
        busy.value = ''
        return
      }
      chooseOrigin({ label: 'Your current location', coordinates })
    },
    () => {
      if (id !== requestId) return
      error.value =
        'Location could not be obtained. Allow location access or search for a starting address.'
      busy.value = ''
    },
    { timeout: 10000, maximumAge: 60000 },
  )
}
async function planRoute() {
  clearRoute()
  if (!origin.value || !destination.value) return
  const id = beginRequest('Calculating route…')
  try {
    const route = await getRoute(
      origin.value.coordinates,
      destination.value.coordinates,
      mode.value,
      controller.signal,
    )
    if (id !== requestId) return
    trip.value = route
    map.getSource('route').setData({ type: 'Feature', properties: {}, geometry: route.geometry })
    showPoints(route.geometry.coordinates)
  } catch (problem) {
    if (id === requestId) error.value = problem.message
  } finally {
    if (id === requestId) busy.value = ''
  }
}
</script>

<template>
  <div>
    <p class="muted">
      Markers follow the directory filters. These are approximate demonstration points, not verified
      business addresses.
    </p>
    <div ref="container" class="map-canvas" role="region" aria-label="Melbourne service map"></div>
    <p v-if="!ready && !error" role="status">Loading map…</p>
    <p v-if="error" class="error-message" role="alert">{{ error }}</p>
    <p v-if="busy" role="status">{{ busy }}</p>
    <button v-if="busy" class="button secondary-button" type="button" @click="cancelRequest">
      Cancel request
    </button>
    <form class="form-fields" @submit.prevent="findPlaces">
      <fieldset :disabled="!ready || Boolean(busy)">
        <legend class="visually-hidden">Choose a route starting point</legend>
        <label
          >Starting address, suburb or postcode
          <input
            v-model="query"
            type="search"
            maxlength="100"
            required
            placeholder="e.g. Richmond, Melbourne"
          />
        </label>
        <p class="export-actions">
          <button class="button" type="submit">Find place</button>
          <button class="button secondary-button" type="button" @click="useLocation">
            Use My Location
          </button>
        </p>
        <p v-if="searchMessage" role="status">{{ searchMessage }}</p>
        <ul v-if="results.length" class="place-results">
          <li v-for="place in results" :key="place.id">
            <button class="button secondary-button" type="button" @click="chooseOrigin(place)">
              {{ place.label }}
            </button>
          </li>
        </ul>
      </fieldset>
    </form>
    <p v-if="origin"><strong>Start:</strong> {{ origin.label }}</p>
    <form class="form-fields" @submit.prevent="planRoute">
      <fieldset :disabled="!ready || Boolean(busy)">
        <legend class="visually-hidden">Plan a demonstration journey</legend>
        <label
          >Destination (demonstration point)
          <select v-model="destinationId" required @change="emit('select-service', destinationId)">
            <option v-if="!services.length" value="">No services match the filters</option>
            <option v-for="(service, index) in services" :key="service.id" :value="service.id">
              {{ index + 1 }}. {{ service.name }}
            </option>
          </select>
        </label>
        <label
          >Travel mode
          <select v-model="mode">
            <option value="driving">Driving</option>
            <option value="walking">Walking</option>
            <option value="cycling">Cycling</option>
          </select>
        </label>
        <p class="export-actions">
          <button class="button" type="submit" :disabled="!origin || !destination">
            Show route
          </button>
          <button class="button secondary-button" type="button" @click="clearRoute">
            Clear route
          </button>
        </p>
      </fieldset>
    </form>
    <section v-if="trip" aria-label="Journey information">
      <p role="status">
        <strong
          >{{ (trip.distance / 1000).toFixed(1) }} km · approximately
          {{ Math.max(1, Math.round(trip.duration / 60)) }} minutes</strong
        >
      </p>
      <p class="muted">
        {{ mode }} route to {{ destination.name }}. Demonstration only; estimated time is not live
        traffic information.
      </p>
      <details>
        <summary>Route instructions</summary>
        <ol>
          <li v-for="(step, index) in trip.legs[0].steps" :key="index">
            {{ step.maneuver.instruction }}
          </li>
        </ol>
      </details>
    </section>
  </div>
</template>

<style scoped>
.map-canvas {
  height: 340px;
  border: 1px solid #767676;
  margin: 16px 0;
}
.form-fields label {
  margin-top: 16px;
}
.place-results {
  padding-left: 20px;
}
.place-results li {
  margin: 8px 0;
}
.place-results button {
  text-align: left;
}
:deep(.service-pin) {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 2px solid white;
  border-radius: 50%;
  color: white;
  background: #005fcc;
  font:
    bold 16px Arial,
    sans-serif;
  cursor: pointer;
}
</style>
