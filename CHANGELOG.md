# Changelog

All notable changes to EntityMap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-10-27

### Added

- The panel refreshes on its own when a scan finishes (startup, periodic, or registry-change rescans), and the Rescan button shows when a scan is running.
- The active view and selected node are kept in the URL (`/entitymap/graph/<node_id>`, `/entitymap/issues`, `/entitymap/hierarchy`), so reloads, the browser Back button, and shared links work.
- Node details offer "Edit automation", "Edit script", "Edit scene", "Open device", "Open area", or "Show entity", and a "Focus neighborhood" button. Node ids in migration guidance and on issue cards jump to that node in the graph.
- Issues view: severity filter with counts, sorting by severity, issue type, or node, the search box now filters issues too, and CSV or JSON export of the listed issues.
- Panel translations for English and Polish, following the Home Assistant user language. When that language is missing or not translated, the browser's preferred languages are tried before English.
- A menu button on narrow screens, a bottom-sheet detail panel and a scrollable filter bar on phones.
- Loading and error states (with Retry) for node details.
- Layered 3D view, switched with a 2D | 3D toggle under Tools. The 2D layout becomes the floor plan and each node type gets its own floor (areas, devices, entities and helpers, scenes and scripts, automations), so a node sits above or below where it is in 2D. Drag or arrow keys rotate, scroll zooms, clicking a node opens its details, and filters, search, focus, path finding, event flow, the impact wave and PNG export work as in 2D. It is drawn on a plain canvas with no extra library, loads only when first opened, and remembers the camera while you filter. Keyboard navigation between nodes stays in the 2D view.
- 3D view improvements: nodes float above their floor with a shadow and stem, are shaded, and fade with distance; edges carry arrowheads; hovering highlights a node's neighbors as in 2D; the camera glides to a selected node, to fits and to resets, keeps turning briefly after a drag, and zooms with two fingers on touch screens; Top, Side and Isometric camera presets, an orientation gizmo, and a "Copy link to this view" button (`?dim=3d&cam=...`); floors are highlighted on hover and spread apart with a slider; areas are outlined on every floor they reach and joined by a dashed column; labels are placed by importance without overlapping, with leader lines when moved aside; arrow keys move between nodes (announced to screen readers), Enter opens details and Shift with arrows rotates; the impact wave runs along the edges between floors. Off-screen nodes and edges are skipped, distant nodes draw as plain dots, picking uses a screen grid, and idle auto-rotation runs at about 30 fps; on a 462-node, 600-edge test graph a frame took about 2 ms to draw.
- Graph layouts, chosen under Layout in the filter bar and remembered: Free (the force layout), By room (one labeled frame per area; automations and scripts join the room they mostly control, or an "Across rooms" lane when they span several), Event flow (columns from event sources through automations and scripts to the controlled entities, devices and areas, ordered to limit crossing edges) and Around selected (the selected node in the middle, what it depends on to the right and what depends on it to the left, one ring per hop). Nodes glide to their place and the view fits the layout at once. In 3D, By room and Around selected carry over to the floor plan; Event flow uses the free layout there, since floors already separate node types.
- "Fold entities" collapses each device's entities into the device, which shows a "+N" badge; clicking the badge or "Show N entities" in the device details expands that device again. Edges to folded entities move to their device. The selected, focused or searched-for node and path nodes are never folded.
- Hierarchy tree animations: when the tree opens, its connections grow out of Home one level at a time. Hovering or focusing a node lights its branch (the path up to Home and everything beneath it), dims the rest, and runs dots from each parent down to its children. Tree nodes can be reached with Tab and opened with Enter or Space. The same animation setting and reduced-motion rule as the graph apply.
- Graph animations: moving dots on the edges of the selected or hovered node show which way events travel (from a trigger, condition or referenced entity into the automation, and from an action out to the entity it controls). Selecting a node sends an impact wave outward, one dependency hop at a time, through everything that depends on it, in the color of the impact severity; "Replay impact" in the detail drawer plays it again. Animations can be turned off in View options and are skipped when the system asks for reduced motion.

### Changed

- In the Around selected layout, nodes outside the rings fade, so the selected node's dependency tree stands out.
- CI uses the Node.js 24 versions of the GitHub actions, can be started by hand, and now fails on type errors instead of only reporting them.
- Toggling a type filter, the colorblind palette, or typing a search no longer reshuffles the graph: node positions and zoom are kept.
- Panel icons use Material Design Icons through Home Assistant's `ha-icon` instead of emoji. The hierarchy tree draws the same node shapes as the graph.
- Missing or unavailable nodes keep their type color and get a dashed error outline. In large graphs, labels of well-connected nodes stay visible and the rest appear when zooming in.
- The area filter lists area names instead of area ids.
- Graph edges are colored by dependency family (trigger, condition, action, reference, structure) with matching arrowheads, and dashed by confidence (certain, likely, uncertain). The legend shows both, drawn with the same strokes as the graph.
- Arrowheads end on the node outline whatever the node size, and a highlighted path recolors its arrowheads too.
- Hovering or focusing a node shows a tooltip (name, type, area, id, what it depends on and what uses it) and emphasizes its direct connections.
- Selection and path highlighting dim the rest of the graph less and animate the change (no animation with reduced motion).
- Node labels keep a readable on-screen size at every zoom level, and the layout leaves room for them.
- Isolated nodes stay near the rest of the graph instead of drifting to the edges.
- Areas are drawn as soft outlines around their devices and entities instead of hubs with a spoke to every device. The area color changed from yellow to teal for contrast.
- Nodes carry a small type glyph, use a background-colored outline that works in light and dark themes, and search, path, and missing highlights come from theme-overridable CSS variables (`--entitymap-search-color`, `--entitymap-path-color`, `--entitymap-edge-*`).
- The PNG export keeps the on-screen styling (edge colors, outlines, dimming).
- The filter bar is grouped into labeled sections (Show, Scope, Tools). Type chips show each type's shape, color and node count, so they double as the node legend, and a hidden type is struck through. Types without nodes are left out. The bottom legend now explains edges only.
- When filters are active, the bar shows how many nodes they hide and a "Clear filters (n)" button.
- The scope filter is a searchable list of areas (by name) and domains, each with its node count.
- Compact layout, colorblind-safe colors and the PNG download moved into a "View options" menu in the header.
- Zoom controls form one group showing the current zoom level, with keyboard shortcuts: + and - to zoom, 0 to reset, F to fit.
- Header: tabs carry icons and the Issues tab shows the issue count, tinted by the worst severity. The subtitle shows when the last scan ran ("Scanned 5 minutes ago", refreshed every minute, with the exact time on hover) and warns when a scan had adapter errors. Rescan and the View options menu are secondary buttons with labels.
- Search follows the active view (nodes, issues, or hierarchy), shows the number of matches, has a clear button, opens with the / key, clears with Escape, and Enter jumps to the first matching node in the graph. Typing no longer rebuilds the graph on every keystroke. The Hierarchy view can now be searched too.
- The `entitymap/graph` WebSocket response includes `last_scan` and `scan_status`.
- On phones, filters open as a bottom sheet from a "Filters" button that shows how many filters are active.
- The 3D view no longer has its own floor toggles: the type chips filter the 2D and 3D views alike.

### Fixed

- The panel fills the whole screen height in Home Assistant. It used to shrink to its content, which left empty space under the footer and squeezed the 3D view into a thin strip.
- The View menu opens above the minimap and the detail drawer instead of behind them.
- The hierarchy tree opens readable on large homes: a tree too big to fit at a readable size starts at normal size on Home (left edge for horizontal, top for vertical) instead of a page-sized drawing scrolled to the top. Drag to pan, scroll to zoom, down to 5% to see the whole tree. In the vertical tree, entity names run downward and device names get room, so labels no longer overlap.
- The severity filters in the Issues view show their colored dots again; the dots had no size and were invisible.
- Hierarchy icons follow the colorblind palette like the rest of the panel.
- The 3D view shows the grabbing cursor while you rotate it.
- Room, column and ring labels in the graph layouts stay readable when the view is zoomed out, and labels no longer overlap in crowded rooms.
- A restored sensor value of an unexpected type is ignored instead of being shown until the first scan finishes.
- Entity names, aliases, finding texts, and device metadata are HTML-escaped in the panel, so a name containing markup can no longer inject HTML or script.
- Closing the detail panel no longer leaves the previously selected node outlined.
- The Issues and Hierarchy views redraw after a rescan instead of showing an empty area.
- Closing the detail drawer in the 3D view no longer throws an error, and the minimap is hidden again when the graph is empty or in 3D.
- The panel follows the Home Assistant light or dark theme everywhere: native controls (dropdowns, the floor spacing slider, scrollbars) switch to dark too, and the 3D view redraws with the new colors when the theme changes while it is open. Without theme information from Home Assistant, the system preference decides. In light themes, tab bars, the search field and other secondary surfaces use a softer gray than Home Assistant's secondary background. View options has a Theme choice: Automatic (follow Home Assistant, the default), Light or Dark, which applies to this panel only and is remembered.
- In dark themes, hierarchy tree connections, room and flow column frames, and the rings of the Around selected layout were drawn in the divider color and nearly invisible. They now use a line color derived from the theme's secondary text color, visible in light and dark themes alike.
- Switching to 3D shows a loading state while the 3D view downloads, and if the download fails (offline, Home Assistant restarting) an error with "Retry" and "Back to 2D" instead of an empty area.
- Fragility issues and migration guidance in the detail drawer are shown as cards: a severity accent and chip, the text, and the remediation or recommendation in a highlighted callout; affected items sit behind a disclosure with a count and show as a row of jump buttons. Section titles show how many items they hold.
- The header shows the app as a gradient tile next to the name, with node and dependency counts and the last scan time on one line separated by dots, and a status dot (green after a clean scan, amber after adapter errors).
- Issue titles keep their translated sentence case instead of capitalizing every word.
- Icons are vertically centered on their text in every button, badge, heading and callout, instead of being nudged by a fixed pixel offset.

## [1.1.1] - 2026-10-26

### Changed

- The graph panel now loads a bundled copy of D3.js v7.9.0 from `/entitymap_frontend/d3.min.js` instead of `cdn.jsdelivr.net`, so the graph renders on Home Assistant installs without internet access ([#2](https://github.com/POLPROG-TECH/EntityMap/issues/2)).

### Fixed

- Automations and scripts no longer appear as isolated nodes on current Home Assistant. Their configs are now read from each entity's `raw_config` in the entity component, since the state attributes the adapters fell back to do not include triggers, conditions, or actions ([#2](https://github.com/POLPROG-TECH/EntityMap/issues/2)).
- Device actions built in the visual editor, which carry `device_id` at the top level of the action, now create a device dependency and a fragile `device_id` finding.

## [1.1.0] - 2026-06-16

### Added

- Graph export service `entitymap.export`, returning the full graph, fragility findings, and last-scan metadata as a response.
- Graph panel: node sizing by importance, search-match highlighting, focus mode (double-click a node to isolate its neighborhood), area and domain filters, path-finding between two nodes, an on-canvas minimap, zoom controls (in / out / fit / reset), PNG export, a "showing N of M nodes" notice for capped graphs, and a performance mode that simplifies very large graphs.
- Graph panel accessibility and theming: full keyboard navigation, a screen-reader live region, dark-mode polish, a colorblind-safe palette toggle, and a compact density toggle (both remembered).
- Curved routing for parallel edges and direction arrowheads.
- `Last scan` sensor attributes: `status`, `duration_seconds`, and `adapter_errors`.
- Summary sensors restore their last value across restarts.
- Test coverage for the automation, script, scene, and template adapters, plus the hierarchy builder, sensors, and graph builder.

### Changed

- Template entities that referenced other entities no longer appear unconnected: the template adapter now resolves references from each helper's own config entry.
- The first scan runs immediately when the integration is added while Home Assistant is already running (previously it waited for a start event that had already fired).
- Registry-change rescans are debounced so a burst of changes collapses into a single scan.
- Fragility findings are computed once per scan and reused by the sensors, panel, and repairs.
- The panel is served as a static module directory and split into ES-module mixins; its assets are sent with `Cache-Control: no-store` so updates apply without cache issues.
- Internal cleanup: WebSocket API moved to `websocket.py`, the hierarchy builder to `hierarchy.py`, shared adapter parsers to `adapters/_config_parse.py`.
- Shortened the summary-sensor display names (Nodes, Dependencies, Issues, Last scan).

### Fixed

- Detail drawer no longer stays open and empty when switching tabs or changing filters.
- Type filters now apply consistently in the Issues view and are hidden in the structural Hierarchy view.

## [1.0.1] - 2026-06-15

### Fixed

- Sidebar panel failing to open with "Unable to load custom panel" and repeated invalid authentication entries in the HTTP ban log. The view serving the panel JavaScript no longer requires authentication, so the browser can import it as a module ([#1](https://github.com/polprog-tech/EntityMap/issues/1)).

## [1.0.0] - 2025-03-13

### Added

- Initial release of EntityMap
- Full dependency graph generation from HA registries, automations, scripts, scenes, groups, helpers, and template entities
- Interactive force-directed graph visualization panel with D3.js
- Node type filtering, search, zoom/pan, and neighborhood highlighting
- Impact analysis engine with risk scoring and severity classification
- Fragility detection for missing references, device_id usage, disabled/unavailable entities, tight coupling, and hidden dependencies
- Migration guidance with step-by-step recommendations for device/entity replacement
- Summary sensors: total nodes, total dependencies, fragility issues, last scan timestamp
- Rescan button entity
- Services: `entitymap.scan`, `entitymap.analyze_impact`, `entitymap.get_dependencies`
- WebSocket API for frontend: `entitymap/graph`, `entitymap/impact`, `entitymap/neighborhood`, `entitymap/scan`, `entitymap/findings`, `entitymap/migration`
- Repair issues for fragile device_id usage and missing entity references
- Diagnostics support with redacted output
- Config flow with options for scan-on-startup, auto-refresh, scan interval, template/group inclusion
- Options flow for runtime configuration changes
- Full test suite with pytest
- CI workflow with linting (ruff), type checking (mypy), testing, and HACS validation
- Comprehensive documentation: README, architecture, dependency model, contributing guide
