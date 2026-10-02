# Assessing Green Stormwater Infrastructure Research in Arid Climates

An interactive web application for exploring a scoping review of green stormwater infrastructure (GSI) research in arid and semi-arid regions. A hierarchical edge bundling diagram shows how 17 studies relate by location, methodology, GSI practice, and results, and a linked map shows where each study was conducted.

**Live app:** [https://juliannareynolds919.github.io/GSI-visualization/](https://juliannareynolds919.github.io/GSI-visualization/)

## How to use

- **Relationship Explorer:** hover over any node to highlight its connections. Papers connect to their location, methodology, GSI practice, and results.
- **Study Locations:** hover over a map marker to highlight the corresponding paper in the diagram. Click a marker to see paper details and a DOI link.
- Drag the center divider to resize the panels.

## Running locally

The app loads its data with `fetch()`, so serve it over HTTP instead of opening the file directly:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Files

- `js/chart.js`: D3.js hierarchical edge bundling diagram, adapted from the [Observable example](https://observablehq.com/@d3/hierarchical-edge-bundling)
- `js/map.js`: Leaflet map and chart–map linking
- `data/gsi-data.json`: diagram nodes and links
- `data/gsi_literature_locations.json`: study locations (GeoJSON)

## Credits

Research: Julianna Reynolds 
Visualization development: Julianna Reynolds and Yoga Korgaonkar

Based on a Master of Science capstone project in Geographic Information Systems Technology at the University of Arizona (2025). [Full report](http://hdl.handle.net/10150/678098).

Supported by the [Arizona Tri-University Recharge and Water Reliability Project (ATUR)](https://ccass.arizona.edu/atur).

## License

Code is released under the [MIT License](LICENSE).  Data files in `data/` are released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
