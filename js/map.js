/* ============================================================
   map.js — Leaflet Map with Chart Linking
   ============================================================ */

const LOCATION_LOOKUP = {
    "Arizona, USA":    ["Arizona"],
    "California, USA": ["California"],
    "Nevada, USA":     ["Nevada"],
    "New Mexico, USA": ["New Mexico"],
    "Utah, USA":       ["Utah"],
    "Sicily, Italy":   ["Sicily"],
    "Hidalgo, Mexico": ["Hidalgo"],
    "Sindh, Pakistan": ["Sindh"],
    "Alicante, Spain": ["Alicante"]
};

const DEFAULT_MARKER_COLOR = "#9B59B6";
const HIGHLIGHT_MARKER_COLOR = "#F39C12";

/* ---------------------------------------------------
   INIT MAP
--------------------------------------------------- */
const map = L.map("map", {
    center: [0, 0],
    zoom: 2,
    zoomControl: true,
    attributionControl: true
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CartoDB',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

/* ---------------------------------------------------
   MARKERS
--------------------------------------------------- */
let allMarkers = [];

function makeMarkerIcon(color, highlighted = false) {
    const size = highlighted ? 16 : 12;
    return L.divIcon({
        className: "gsi-marker" + (highlighted ? " highlighted" : ""),
        html: `<div style="
            width:${size}px;
            height:${size}px;
            background:${color};
            border-radius:50%;
            border:2px solid rgba(0,0,0,${highlighted ? 0.4 : 0.15});
            box-shadow:none;
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

            const marker = L.marker([lat, lng], {
                icon: makeMarkerIcon(DEFAULT_MARKER_COLOR)
            });

            const gsiPractices = [
                props.GREEN_ROOFS          ? "Green Roofs" : null,
                props.PERMEABLE_PAVEMENT   ? "Permeable Pavement" : null,
                props.RAINWATER_HARVESTING ? "Rainwater Harvesting" : null,
                props.RETENTION_BASIN      ? "Retention Basin" : null
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
                <div style="font-size:0.8rem; font-style:italic; color:var(--text-secondary); margin-bottom:6px;">${props.TITLE}</div>
                <div class="popup-meta">
                    <span style="color:#9B59B6">Location:</span> ${props.CITY ? props.CITY + ", " : ""}${props.COUNTRY || ""}<br/>
                    <span style="color:#E74C3C">Methodology:</span> ${props.METHODOLOGY || "—"}<br/>
                    <span style="color:#2ECC71">GSI Practice:</span> ${gsiPractices.length ? gsiPractices.join(", ") : "—"}<br/>
                    <span style="color:#3498DB">Results:</span> ${results.length ? results.join(", ") : "—"}<br/>
                    ${props.DOI ? `<span style="color:var(--text-secondary)">DOI:</span> <a href="https://doi.org/${props.DOI.trim()}" target="_blank" style="color:var(--accent); font-size:0.8rem;">${props.DOI.trim()}</a>` : ""}
                </div>
            `;

            marker.bindPopup(popupHtml, { maxWidth: 280 });

            marker._gsiLocation    = props.LOCATION;
            marker._gsiCitation    = props.CITATION;
            marker._gsiMethodology = props.METHODOLOGY;
            marker._gsiPractices   = gsiPractices;
            marker._gsiResults     = results;
            marker._gsiColor       = DEFAULT_MARKER_COLOR;

            // Map hover → highlight chart
            marker.on('mouseover', function () {
                console.log('hovering:', props.CITATION);
                if (window.gsiChart && window.gsiChart.highlightByPaper) {
                    window.gsiChart.highlightByPaper(props.CITATION);
                }
            });

            marker.on('mouseout', function () {
                if (window.gsiChart && window.gsiChart.clearHighlights) {
                    window.gsiChart.clearHighlights();
                }
            });

            marker.addTo(map);
            allMarkers.push(marker);
        });

        if (allMarkers.length > 0) {
            const group = L.featureGroup(allMarkers);
            map.fitBounds(group.getBounds().pad(0.15));
        }
    });

/* ---------------------------------------------------
   LINKING API — called by chart.js
--------------------------------------------------- */
window.gsiMap = {

    highlightByLocation(locationLabel) {
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

    highlightByPaper(citation) {
        allMarkers.forEach(marker => {
            const isMatch = marker._gsiCitation === citation;
            if (isMatch) {
                marker.setIcon(makeMarkerIcon(HIGHLIGHT_MARKER_COLOR, true));
                marker.setZIndexOffset(1000);
            } else {
                marker.setOpacity(0.25);
            }
        });
    },

    highlightByMethodology(methodology) {
        allMarkers.forEach(marker => {
            const isMatch = marker._gsiMethodology === methodology;
            if (isMatch) {
                marker.setIcon(makeMarkerIcon(HIGHLIGHT_MARKER_COLOR, true));
                marker.setZIndexOffset(1000);
            } else {
                marker.setOpacity(0.25);
            }
        });
    },

    highlightByPractice(practice) {
        allMarkers.forEach(marker => {
            const isMatch = marker._gsiPractices.includes(practice);
            if (isMatch) {
                marker.setIcon(makeMarkerIcon(HIGHLIGHT_MARKER_COLOR, true));
                marker.setZIndexOffset(1000);
            } else {
                marker.setOpacity(0.25);
            }
        });
    },

    highlightByResult(result) {
        allMarkers.forEach(marker => {
            const isMatch = marker._gsiResults.includes(result);
            if (isMatch) {
                marker.setIcon(makeMarkerIcon(HIGHLIGHT_MARKER_COLOR, true));
                marker.setZIndexOffset(1000);
            } else {
                marker.setOpacity(0.25);
            }
        });
    },

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
    const total = containerRect.width - 6;
    const pct = Math.min(Math.max(offset / total * 100, 20), 80);
    chartPanel.style.width = pct + "%";
    map.invalidateSize();
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