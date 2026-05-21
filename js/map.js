/* ============================================================
   map.js — Leaflet Map with Chart Linking
   ============================================================ */

// Location name lookup — matches gsi-data.json location names to GeoJSON LOCATION field
const LOCATION_LOOKUP = {
  "Arizona, USA":    ["Arizona"],
  "California, USA": ["California"],
  "Nevada, USA":     ["Nevada"],
  "New Mexico, USA": ["New Mexico"],
  "Utah, USA":       ["Utah"],
  "Sicily, Italy":   ["Sicily"],
  "Hidalgo, Mexico": ["Hidalgo"],
  "Sindh, Pakistan": [null],        // LOCATION is null in GeoJSON for Ali et al. 2020
  "Alicante, Spain": ["Alicante"]
};

// GSI Practice colors (matching chart)
const METHODOLOGY_COLORS = {
  "Modeled":   "#3498DB",
  "Empirical": "#2ECC71"
};

const DEFAULT_MARKER_COLOR = "#3498DB";
const HIGHLIGHT_MARKER_COLOR = "#F39C12";

/* ---------------------------------------------------
   INIT MAP
--------------------------------------------------- */
const map = L.map("map", {
  center: [30, -40],
  zoom: 2,
  zoomControl: true,
  attributionControl: true
});

// Dark tile layer (CartoDB Dark Matter)
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19
}).addTo(map);

/* ---------------------------------------------------
   LOAD GEOJSON & ADD MARKERS
--------------------------------------------------- */
let allMarkers = [];
let markerLayers = [];

function makeMarkerIcon(color, highlighted = false) {
  const size = highlighted ? 16 : 12;
  return L.divIcon({
    className: "gsi-marker" + (highlighted ? " highlighted" : ""),
    html: `<div style="
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:50%;
      border:2px solid rgba(255,255,255,${highlighted ? 0.9 : 0.4});
      box-shadow: 0 0 ${highlighted ? 10 : 4}px ${color};
      transition: all 0.2s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)]
  });
}

fetch("data/gsi_literature_locations.json")
  .then(res => res.json())
  .then(geojson => {

    geojson.features.forEach(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) return;

      const props = feature.properties;
      const [lng, lat] = feature.geometry.coordinates;
      const color = METHODOLOGY_COLORS[props.METHODOLOGY] || DEFAULT_MARKER_COLOR;

      const marker = L.marker([lat, lng], {
        icon: makeMarkerIcon(color)
      });

      // Build popup content
      const gsiPractices = [
        props.GREEN_ROOFS        ? "Green Roofs" : null,
        props.PERMEABLE_PAVEMENT ? "Permeable Pavement" : null,
        props.RAINWATER_HARVESTING ? "Rainwater Harvesting" : null,
        props.RETENTION_BASIN    ? "Retention Basin" : null
      ].filter(Boolean);

      const results = [
        props.INFILTRATION_VOLUME ? "Infiltration Volume" : null,
        props.PEAK_FLOW           ? "Peak Flow" : null,
        props.RUNOFF_VOLUME       ? "Runoff Volume" : null,
        props.STORAGE             ? "Storage" : null,
        props.WATER_QUALITY       ? "Water Quality" : null
      ].filter(Boolean);

      const popupHtml = `
        <strong>${props.CITATION}</strong>
        <div class="popup-meta">
          📍 ${props.CITY ? props.CITY + ", " : ""}${props.COUNTRY || ""}<br/>
          🔬 ${props.METHODOLOGY || "—"}<br/>
          ${gsiPractices.length ? "🌿 " + gsiPractices.join(", ") + "<br/>" : ""}
          ${results.length ? "📊 " + results.join(", ") : ""}
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });

      // Store metadata on marker for linking
      marker._gsiLocation = props.LOCATION;
      marker._gsiCitation = props.CITATION;
      marker._gsiColor = color;

      marker.addTo(map);
      allMarkers.push(marker);
    });

    // Fit map to markers
    if (allMarkers.length > 0) {
      const group = L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  });

/* ---------------------------------------------------
   LINKING API — called by chart.js
--------------------------------------------------- */
window.gsiMap = {

  // Called when a Location node is hovered in the chart
  highlightByLocation(locationLabel) {
    // locationLabel is like "Arizona, USA" — look up short form
    const shortForms = LOCATION_LOOKUP[locationLabel] || [];

    allMarkers.forEach(marker => {
      const isMatch = shortForms.includes(marker._gsiLocation) ||
        (shortForms.includes(null) && marker._gsiLocation === null);

      if (isMatch) {
        marker.setIcon(makeMarkerIcon(HIGHLIGHT_MARKER_COLOR, true));
        marker.setZIndexOffset(1000);
      } else {
        marker.setOpacity(0.25);
      }
    });
  },

  // Called when hover ends in the chart
  clearHighlights() {
    allMarkers.forEach(marker => {
      marker.setIcon(makeMarkerIcon(marker._gsiColor, false));
      marker.setOpacity(1);
      marker.setZIndexOffset(0);
    });
  }
};

/* ---------------------------------------------------
   RESIZER
--------------------------------------------------- */
const resizer = document.getElementById("resizer");
const chartPanel = document.getElementById("chart-panel");
const mapPanel = document.getElementById("map-panel");
const container = document.querySelector(".split-container");

let isResizing = false;

resizer.addEventListener("mousedown", e => {
  isResizing = true;
  resizer.classList.add("dragging");
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", e => {
  if (!isResizing) return;
  const containerRect = container.getBoundingClientRect();
  const offset = e.clientX - containerRect.left;
  const total = containerRect.width - 6; // subtract resizer width
  const pct = Math.min(Math.max(offset / total * 100, 20), 80);
  chartPanel.style.width = pct + "%";
  map.invalidateSize(); // tell Leaflet to re-render
});

document.addEventListener("mouseup", () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    map.invalidateSize();
  }
});