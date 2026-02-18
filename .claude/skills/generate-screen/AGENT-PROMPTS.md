# Agent Prompts for Parallel Screen Generation

These are template prompts for spawning parallel agents to build multiple screens simultaneously. Each agent gets its own frame ID and builds independently.

## Pre-work (done by parent before spawning)

```
1. Read the design system JSON to identify available components
2. Create frames spaced 452px apart (412px width + 40px gap)
3. Set fill color (from design system surface color) and clipsContent: true on each
4. Record frame IDs
5. Spawn agents in parallel with frame IDs
```

---

## Template: Generic Screen Agent Prompt

```
Build a <SCREEN_NAME> SCREEN inside an existing Figma frame using the Figma Compose MCP tools.

## Frame Info
- **Frame ID**: `<FRAME_ID>`
- **Size**: <WIDTH> x <HEIGHT>, already configured with fill and clipsContent
- Use `parentId: "<FRAME_ID>"` for all children (coordinates relative to frame)

## Design System Reference
Read the design system JSON to look up component IDs, variant axes, and color tokens.
Use `list_variants` on each component set before creating instances — never guess variant names.

## Layout (top to bottom)
<DESCRIBE THE LAYOUT — list each component from top to bottom with positioning notes>

## Component Lookup
For each component needed:
1. Find it in the design system JSON by name
2. Call `list_variants({ componentSetId: "<id>" })` to discover available variants
3. Choose the appropriate variant for the screen context

## Critical Rules
1. After placing each component, ALWAYS call `get_node_info` to measure actual dimensions. NEVER guess heights.
2. Use measured heights: `next_y = current_y + measured_height + gap`. Gaps: 16px within sections, 24px between sections.
3. Full-width components (app bars, nav bars, dividers) must be resized to <WIDTH>px with `resize_node`.
4. Pin bottom navigation to frame bottom: measure its height, then `set_position` to y = <HEIGHT> - nav_height.
5. Use `get_instance_properties` then `set_instance_properties` to set labels and text. Property key IDs (the `#...:...` suffix) vary between instances — always discover them first.
6. For navigation bars: find each nav item with `find_nodes({ type: "INSTANCE", nameContains: "Nav item", within: "<navBarId>" })`, then `get_instance_properties` on each to find the label property key, then set labels accordingly.
7. After completing, call `get_file_key()` then `get_screenshot({ fileKey, nodeId: "<FRAME_ID>" })` to verify. Check for overlapping elements. If found, fix with minimal `set_position` adjustments and re-screenshot.

## Navigation Tab Activation
If this screen's nav tab is not the default active one:
1. Find nav items: `find_nodes({ type: "INSTANCE", nameContains: "Nav item", within: "<navBarId>" })`
2. Call `get_instance_properties` on EACH nav item to discover property keys (they differ per instance!)
3. Set labels on all items
4. Deactivate the default item and activate the target item using the appropriate variant/boolean property
5. NEVER swap nav item components — only use `set_instance_properties` to change the active state
```

---

## Example: Home Screen (adapt to your design system)

```
Build a HOME SCREEN inside an existing Figma frame using the Figma Compose MCP tools.

## Frame Info
- **Frame ID**: `<FRAME_ID>`
- **Size**: 412 x 917, already configured with fill and clipsContent
- Use `parentId: "<FRAME_ID>"` for all children (coordinates relative to frame)

## Design System Reference
Read the design system JSON for component IDs and variants.

## Layout (top to bottom)
1. **Top App Bar** — Use the default/standard variant. Title: "Home". Full width 412px.
2. **Search Bar** — Default enabled state, no avatar. x=16, width=380.
3. **Section title** — "Recent" text, x=16, 24px below search bar. Use fontFamily "Inter", fontStyle "Regular", fontSize 14.
4. **1 Card** — Use an elevated card variant. x=16, width=380. Let it auto-size (do NOT manually set height).
5. **Navigation Bar** — 4 items, full width 412px, pinned to bottom. Labels: Home, Chat, Explore, Settings. Tab 1 (Home) active (default).

## Critical Rules
1. After placing each component, ALWAYS call `get_node_info` to measure actual dimensions. NEVER guess heights.
2. Use measured heights: `next_y = current_y + measured_height + gap`. Gaps: 16px within sections, 24px between sections.
3. Full-width components (app bar, nav bar) must be resized to 412px with `resize_node`.
4. Pin nav bar to bottom: measure its height, then `set_position` to y = 917 - nav_height.
5. Use `get_instance_properties` then `set_instance_properties` to set labels. Property key IDs (the `#...:...` suffix) vary — always discover them first.
6. After completing, call `get_file_key()` then `get_screenshot({ fileKey, nodeId: "<FRAME_ID>" })` to verify. Check for overlapping elements. If found, fix with minimal `set_position` adjustments and re-screenshot.
```

---

## Example: List Screen (adapt to your design system)

```
Build a LIST SCREEN inside an existing Figma frame using the Figma Compose MCP tools.

## Frame Info
- **Frame ID**: `<FRAME_ID>`
- **Size**: 412 x 917, already configured with fill and clipsContent
- Use `parentId: "<FRAME_ID>"` for all children (coordinates relative to frame)

## Design System Reference
Read the design system JSON for component IDs and variants.

## Layout (top to bottom)
1. **Top App Bar** — Standard variant. Title: "<Screen Title>". Full width 412px.
2. **6 List Items** with dividers between each — representing content rows.
3. **Navigation Bar** — 4 items, full width 412px, pinned to bottom. Labels as needed. Activate the correct tab.

## Critical Rules
1. After placing each component, ALWAYS call `get_node_info` to measure actual dimensions. NEVER guess heights.
2. Use measured heights: `next_y = current_y + measured_height + gap`.
3. Full-width components (app bar, nav bar, dividers, list items) must be resized to 412px with `resize_node`.
4. Pin nav bar to bottom: measure its height, then `set_position` to y = 917 - nav_height.
5. Use `get_instance_properties` then `set_instance_properties` to set labels. Property key IDs vary — always discover them first.
6. For dividers: check if they are standalone COMPONENTs (no variants) vs COMPONENT_SETs in your design system JSON. Use componentId directly for standalone components.
7. After completing, call `get_file_key()` then `get_screenshot({ fileKey, nodeId: "<FRAME_ID>" })`. Check for overlaps. Fix with minimal `set_position` adjustments if needed.
```

---

## Example: Settings Screen (adapt to your design system)

```
Build a SETTINGS SCREEN inside an existing Figma frame using the Figma Compose MCP tools.

## Frame Info
- **Frame ID**: `<FRAME_ID>`
- **Size**: 412 x 917, already configured with fill and clipsContent
- Use `parentId: "<FRAME_ID>"` for all children (coordinates relative to frame)

## Design System Reference
Read the design system JSON for component IDs and variants.

## Layout (top to bottom)
1. **Top App Bar** — Standard variant. Title: "Settings". Full width 412px.
2. **Section: "Account"** — Text label x=16, 24px below app bar. fontFamily "Inter", fontStyle "Regular", fontSize 14.
3. **3 List Items** — Settings rows for account-related options. Full width 412px.
4. **Divider** — Full width separator.
5. **Section: "General"** — Text label x=16, 16px below divider.
6. **3 List Items** — General settings rows. Full width 412px.
7. **Divider** — Full width separator.
8. **Section: "About"** — Text label x=16, 16px below divider.
9. **2 List Items** — About/info rows. Full width 412px.
10. **Navigation Bar** — 4 items, full width 412px, pinned to bottom. Activate the correct tab.

## Critical Rules
1. After placing each component, ALWAYS call `get_node_info` to measure actual dimensions. NEVER guess heights.
2. Use measured heights: `next_y = current_y + measured_height + gap`. Gaps: 8px between list items in same section, 16px after dividers.
3. Full-width components (app bar, nav bar, dividers, list items) must be resized to 412px with `resize_node`.
4. Pin nav bar to bottom: measure its height, then `set_position` to y = 917 - nav_height.
5. Use `get_instance_properties` then `set_instance_properties` to set labels. Property key IDs vary — always discover them first.
6. After completing, call `get_file_key()` then `get_screenshot({ fileKey, nodeId: "<FRAME_ID>" })`. Check for overlaps. Fix with minimal `set_position` adjustments if needed.
```
