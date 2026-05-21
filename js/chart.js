/* ============================================================
   chart.js — D3 Hierarchical Edge Bundling
   ============================================================ */

/* ---------------------------------------------------
   CONSTANTS
--------------------------------------------------- */
const width = 700;
const radius = width / 2.8;
const RADIUS_PADDING = 50;
const FONT_SIZE = 11;
const HOVER_FONT_SIZE = 13;
const TEXT_OFFSET = 23;
const TEXT_VERTICAL_OFFSET = "0.31em";
const CURVE_BETA = 0.75;
const DEFAULT_STROKE_WIDTH = 1;
const HOVER_STROKE_WIDTH = 3;
const LEGEND_ITEM_WIDTH = 115;
const LEGEND_CIRCLE_RADIUS = 7;
const LEGEND_TEXT_OFFSET = 18;
const LEGEND_TOP_MARGIN = 17;

const ROTATION_DEGREES = -45;
const ROTATION_RADIANS = ROTATION_DEGREES * Math.PI / 180;
const GLOBAL_ROTATION = Math.PI / 2 + ROTATION_RADIANS;

const groupColors = ["#F39C12", "#E74C3C", "#9B59B6", "#2ECC71", "#3498DB"];
const colornone = "#ccc";

// Shared state for chart-map linking
window.gsiChart = {
  highlightLocation: null,
  onLocationHover: null,
  onLocationOut: null
};

/* ---------------------------------------------------
   HELPERS
--------------------------------------------------- */
function id(node) {
  return `${node.parent ? id(node.parent) + "_" : ""}${node.data.name}`;
}

function hierarchy(data, delimiter = "_") {
  let root;
  const map = new Map();
  data.forEach(function find(d) {
    const { name } = d;
    if (map.has(name)) return map.get(name);
    const i = name.lastIndexOf(delimiter);
    map.set(name, d);
    if (i >= 0) {
      find({ name: name.substring(0, i), children: [] }).children.push(d);
      d.name = name.substring(i + 1);
    } else {
      root = d;
    }
    return d;
  });
  return root;
}

function bilink(root) {
  const map = new Map(root.leaves().map(d => [id(d), d]));
  for (const d of root.leaves()) {
    d.incoming = [];
    d.outgoing = d.data.imports.map(i => [d, map.get(i)]);
  }
  for (const d of root.leaves()) {
    for (const o of d.outgoing) o[1].incoming.push(o);
  }
  return root;
}

function reversePaperOrder(root) {
  root.children.forEach(child => {
    if (child.data.name === "Paper") {
      child.children.reverse();
    }
  });
}

/* ---------------------------------------------------
   LOAD DATA & BUILD CHART
--------------------------------------------------- */
fetch("data/gsi-data.json")
  .then(res => res.json())
  .then(data => {

    const tree = d3.cluster().size([2 * Math.PI, radius - RADIUS_PADDING]);

    const hierarchyRoot = d3.hierarchy(hierarchy(data))
      .sort((a, b) =>
        d3.ascending(a.height, b.height) ||
        d3.ascending(a.data.name, b.data.name)
      );

    reversePaperOrder(hierarchyRoot);
    const root = tree(bilink(hierarchyRoot));

    /* ---------------------------------------------------
       SVG
    --------------------------------------------------- */
    const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", width)
      .attr("viewBox", [-width / 2, -width / 2, width, width])
      .attr("style", `max-width:100%; height:auto; font:${FONT_SIZE}px 'DM Sans', sans-serif;`);

    const line = d3.lineRadial()
      .curve(d3.curveBundle.beta(CURVE_BETA))
      .radius(d => d.y)
      .angle(d => d.x + GLOBAL_ROTATION);

    /* ---------------------------------------------------
       GROUPING FOR CATEGORY ARCS
    --------------------------------------------------- */
    const groupedNodes = d3.groups(root.leaves(), d => {
      let current = d;
      while (current.parent && current.parent !== root)
        current = current.parent;
      return current.data.name;
    });

    let groupData = groupedNodes.map(([label, nodes]) => {
      const angles = nodes.map(d => d.x).sort(d3.ascending);
      return { label, startAngle: angles[0], endAngle: angles[angles.length - 1] };
    });

    const desiredOrder = ["Paper", "Methodology", "Location", "GSI Practice", "Results"];
    groupData.sort((a, b) => desiredOrder.indexOf(a.label) - desiredOrder.indexOf(b.label));

    /* ---------------------------------------------------
       CATEGORY ARCS
    --------------------------------------------------- */
    groupData.forEach((group, i) => {
      const arc = d3.arc()
        .innerRadius(radius - 40)
        .outerRadius(radius - 40);

      svg.append("path")
        .attr("d", arc({
          startAngle: group.startAngle + GLOBAL_ROTATION,
          endAngle: group.endAngle + GLOBAL_ROTATION
        }))
        .attr("stroke", groupColors[i % groupColors.length])
        .attr("stroke-width", 10)
        .attr("fill", "none");
    });

    /* ---------------------------------------------------
       LINKS
    --------------------------------------------------- */
    const link = svg.append("g")
      .attr("stroke", colornone)
      .attr("stroke-width", DEFAULT_STROKE_WIDTH)
      .attr("fill", "none")
      .selectAll("path")
      .data(root.leaves().flatMap(leaf => leaf.outgoing))
      .join("path")
      .style("mix-blend-mode", "multiply")
      .attr("d", ([i, o]) => line(i.path(o)))
      .each(function (d) { d.path = this; });

    /* ---------------------------------------------------
       HOVER HANDLERS
    --------------------------------------------------- */
    function overed(event, d) {
      link.style("mix-blend-mode", null);
      d3.select(this).attr("font-weight", "bold").attr("font-size", HOVER_FONT_SIZE);

      d.incoming.forEach(linkDatum => {
        const [source, target] = linkDatum;
        let cur = target;
        while (cur.parent && cur.parent !== root) cur = cur.parent;
        const idx = groupData.findIndex(g => g.label === cur.data.name);
        const color = groupColors[idx % groupColors.length];
        d3.select(linkDatum.path).attr("stroke", color).attr("stroke-width", HOVER_STROKE_WIDTH).raise();
        if (source.text) d3.select(source.text).attr("font-weight", "bold").attr("font-size", HOVER_FONT_SIZE);
      });

      d.outgoing.forEach(linkDatum => {
        const [source, target] = linkDatum;
        let cur = target;
        while (cur.parent && cur.parent !== root) cur = cur.parent;
        const idx = groupData.findIndex(g => g.label === cur.data.name);
        const color = groupColors[idx % groupColors.length];
        d3.select(linkDatum.path).attr("stroke", color).attr("stroke-width", HOVER_STROKE_WIDTH).raise();
        if (target.text) d3.select(target.text).attr("font-weight", "bold").attr("font-size", HOVER_FONT_SIZE);
      });

      // Notify map if this is a Location node
      let cur = d;
      while (cur.parent && cur.parent !== root) cur = cur.parent;
      if (cur.data.name === "Location" && window.gsiMap && window.gsiMap.highlightByLocation) {
        window.gsiMap.highlightByLocation(d.data.name);
      }
    }

    function outed(event, d) {
      link.style("mix-blend-mode", "multiply");
      d3.select(this).attr("font-weight", null).attr("font-size", FONT_SIZE);

      d3.selectAll(d.incoming.map(ld => ld.path)).attr("stroke", colornone).attr("stroke-width", DEFAULT_STROKE_WIDTH);
      d3.selectAll(d.outgoing.map(ld => ld.path)).attr("stroke", colornone).attr("stroke-width", DEFAULT_STROKE_WIDTH);
      d3.selectAll(d.incoming.map(ld => ld[0].text)).attr("font-weight", null).attr("font-size", FONT_SIZE);
      d3.selectAll(d.outgoing.map(ld => ld[1].text)).attr("font-weight", null).attr("font-size", FONT_SIZE);

      // Reset map highlights
      if (window.gsiMap && window.gsiMap.clearHighlights) {
        window.gsiMap.clearHighlights();
      }
    }

    /* ---------------------------------------------------
       LABELS
    --------------------------------------------------- */
    svg.append("g")
      .selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", d => {
        const angle = d.x + GLOBAL_ROTATION;
        const angleDeg = angle * 180 / Math.PI - 90;
        return `rotate(${angleDeg}) translate(${d.y},0)`;
      })
      .append("text")
      .attr("dy", TEXT_VERTICAL_OFFSET)
      .attr("x", TEXT_OFFSET)
      .attr("text-anchor", "start")
      .each(function (d) {
        const angle = d.x + GLOBAL_ROTATION;
        const flip = Math.sin(angle) < 0;
        if (flip) {
          d3.select(this)
            .attr("text-anchor", "end")
            .attr("x", -TEXT_OFFSET)
            .attr("transform", "rotate(180)");
        }
      })
      .text(d => d.data.name)
      .each(function (d) { d.text = this; })
      .on("mouseover", overed)
      .on("mouseout", outed)
      .call(text => text.append("title").text(d =>
        `${id(d)}\n${d.outgoing.length} outgoing\n${d.incoming.length} incoming`
      ))
      .attr("fill", function (d) {
        let cur = d;
        while (cur.parent && cur.parent !== root) cur = cur.parent;
        const idx = groupData.findIndex(g => g.label === cur.data.name);
        return groupColors[idx % groupColors.length];
      });

    /* ---------------------------------------------------
       LEGEND
    --------------------------------------------------- */
    const totalLegendWidth = groupData.length * LEGEND_ITEM_WIDTH;
    const legendStartX = -totalLegendWidth / 2;

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(0, ${-width / 2 + LEGEND_TOP_MARGIN})`);

    const legendItems = legend.selectAll(".legend-item")
      .data(groupData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(${legendStartX + i * LEGEND_ITEM_WIDTH}, 0)`);

    legendItems.append("circle")
      .attr("cx", LEGEND_CIRCLE_RADIUS)
      .attr("cy", 0)
      .attr("r", LEGEND_CIRCLE_RADIUS)
      .attr("fill", (d, i) => groupColors[i % groupColors.length])
      .attr("stroke", "#555")
      .attr("stroke-width", 0.5);

    legendItems.append("text")
      .attr("x", LEGEND_TEXT_OFFSET)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("font-size", "12px")
      .attr("fill", "#888888")
      .text(d => d.label);

    document.getElementById("chart").appendChild(svg.node());

  });