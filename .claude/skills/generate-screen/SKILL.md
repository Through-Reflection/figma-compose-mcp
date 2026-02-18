---
name: generate-screen
description: Generate a complete UI screen in Figma using Material 3 component instances
argument-hint: "[screen description]"
allowed-tools: Bash, Read, Grep, Glob, mcp__figma__get_screenshot, mcp__figma__get_design_context, mcp__figma__get_metadata
---

# Figma Screen Generation

Generate a complete UI screen in Figma using real Material 3 component instances via the Figma Compose MCP bridge.

**User request:** $ARGUMENTS

## Core Workflow

### Step 1: Create and configure the frame

```
create_frame({ name: "Screen Name", width: 412, height: 917 })
set_fill({ nodeId: "<frameId>", hex: "#fef7ff" })
set_properties({ nodeId: "<frameId>", props: { clipsContent: true } })
```

Record the frame ID and dimensions (`frame_w`, `frame_h`). Setting `clipsContent: true` prevents children from bleeding outside the frame. When using `parentId` to create children directly inside the frame, coordinates are relative to the frame — no need to track `frame_x`/`frame_y` offsets.

### Step 2: Look up component IDs

Find the component in `M3-DESIGN-SYSTEM.json`. Each component set has an `id` field (e.g., `"57994:2227"` for Button) and optionally a `key` field for published/library components. If `key` is present and the component is from an external library, use `componentKey` instead of `componentId`.

### Step 3: Check available variants before creating instances

```
list_variants({ componentSetId: "<id>" })
```

Or, for components from an external library:
```
list_variants({ componentSetKey: "<key>" })
```

This returns variant axes and their values. Never guess variant property names — always check first.

### Step 4: Place components inside the frame, then measure

Use `parentId` to create nodes directly inside the screen frame. Coordinates become **relative to the parent** instead of the page, which eliminates manual offset math.

```
create_instance({ componentId: "...", x: 0, y: 0, parentId: "<frameId>" })
get_node_info({ nodeId: "<returned nodeId>" })
```

To move an existing node into a frame after creation, use `append_child`:
```
append_child({ nodeId: "<nodeId>", parentId: "<frameId>" })
```

After placing each component, **immediately** query its actual dimensions with `get_node_info`. Use the measured width and height for all subsequent positioning calculations.

### Step 5: Customize instance properties

After creating an instance, use `get_instance_properties` to discover overridable properties, then `set_instance_properties` to configure them declaratively — no need to dig into the layer tree.

```
get_instance_properties({ nodeId: "<instanceId>" })
// Returns: { "Label text#12:45": { type: "TEXT", value: "Label" }, "Show icon#3:7": { type: "BOOLEAN", value: true } }

set_instance_properties({ nodeId: "<instanceId>", properties: { "Label text#12:45": "Sign In", "Show icon#3:7": false } })
```

Property types:
- **TEXT** — set with a string value
- **BOOLEAN** — set with `true`/`false` (toggles visibility of optional elements)
- **INSTANCE_SWAP** — set with a component ID string (swaps a nested instance)
- **VARIANT** — set with the variant value string

### Step 6: Position the next element using measured values

```
next_y = current_y + current_height + gap
```

Since child coordinates are relative to the parent frame, use `0` as the left edge and `frame_w` as the right edge — no need to add `frame_x`/`frame_y` offsets.

Use consistent gaps: 8px between tightly related items, 16px within a section, 24px between sections.

## Critical Rules — Avoiding Design Issues

### Rule 1: NEVER guess positions — always measure then position

The single most common source of bugs is placing elements at guessed coordinates. Every component has an intrinsic size that may differ from expectations.

**Wrong:**
```
// Assuming a list item is 72px tall
create_instance({ ..., y: 300 })
create_instance({ ..., y: 372 })  // guessed
```

**Right:**
```
create_instance({ ..., y: 300 })
get_node_info({ nodeId: "<item1>" })  // returns height: 80
create_instance({ ..., y: 380 })      // 300 + 80 = 380
```

### Rule 2: ALWAYS center elements mathematically

Never eyeball x-coordinates. Compute:

```
centered_x = (frame_w / 2) - (node_width / 2)
```

When using `parentId`, coordinates are relative to the parent frame so no `frame_x` offset is needed. Use `get_node_info` to get the actual node width before computing center position.

### Rule 3: ALWAYS resize full-width components to match the frame

Dividers, navigation bars, app bars, and search bars often have a default width narrower than the frame. Either resize manually or use fill sizing in auto-layout frames:

**Manual resize:**
```
resize_node({ nodeId: "<dividerId>", width: 412, height: 1 })
resize_node({ nodeId: "<navBarId>", width: 412, height: 80 })
```

**Auto-layout fill (preferred when parent uses auto-layout):**
```
set_properties({ nodeId: "<childId>", props: { layoutSizingHorizontal: "FILL" } })
```

`layoutSizingHorizontal`/`layoutSizingVertical` accept `"FIXED"`, `"HUG"`, or `"FILL"`. Use `"FILL"` to make children stretch to the parent width without hardcoding pixel values.

### Rule 4: NEVER manually set height on auto-layout components

Components like Cards use auto-layout with hug-content sizing. Setting an arbitrary height will clip internal elements (buttons, text). Either:
- Let the component auto-size based on its content
- Measure the content height with `get_node_info` first, then set height to content + padding

### Rule 5: ALWAYS use "Vertical items" navigation bar

Always use the **Nav Bar Vertical** component set (`58016:37259`) — never the Horizontal items variant. The Horizontal variant is for tablets and will squish labels on phone frames.

```
create_instance({ componentSetId: "58016:37259", variantProperties: { "Nav items": "4" }, ... })
```

### Rule 6: Default to "Small-centered" app bar

Always use the **Small-centered, Flat** app bar variant unless the user explicitly requests a different style. This ensures consistent header placement across screens.

```
create_instance({ componentSetId: "58114:20565", variantProperties: { "Configuration": "Small-centered", "Elevation": "Flat" }, ... })
```

### Rule 7: Pin bottom navigation to the frame bottom

```
nav_y = frame_h - nav_height
```

When using `parentId`, the y-coordinate is relative to the frame so no `frame_y` offset is needed.

### Rule 8: Use Inter Regular for all text

Inter Medium and other weights may not be loaded in the Figma environment. Stick with `fontFamily: "Inter"`, `fontStyle: "Regular"` to avoid font loading errors.

### Rule 9: Screenshot and verify after completing a screen

First, get the file key from the compose bridge, then use it with `get_screenshot`:

```
get_file_key()          // returns { fileKey: "..." }
get_screenshot({ fileKey: "<fileKey>", nodeId: "<frameId>" })
```

`get_screenshot` returns the image inline for direct visual verification — no decoding or file workarounds needed.

**Fallback:** If `get_screenshot` is unavailable, use `export_node` with `scale: 0.5` to stay under tool result size limits:
```
export_node({ nodeId: "<frameId>", format: "PNG", scale: 0.5 })
```
Note: `export_node` at scale 1 or 2 often exceeds the tool result character limit (~30k chars) and requires saving to a file and decoding — avoid this unless higher resolution is specifically needed.

Check for:
- Elements bleeding outside the frame
- Overlapping text or components
- Components wider than the frame
- Inconsistent alignment or spacing
- Buttons clipped by parent component borders

### Rule 10: ALWAYS check for and fix overlapping elements

After taking the screenshot, visually inspect for any overlapping components. If overlaps are found, fix them with the **smallest possible change** — typically a `set_position` to nudge the overlapping element down or sideways.

**Diagnosis:** Two elements overlap when `element_A.y + element_A.height > element_B.y` (vertical) or analogously for horizontal overlap.

**Fix strategy — do the minimum:**
1. Identify the overlapping pair closest to correct placement
2. Use `get_node_info` on both to get exact positions and dimensions
3. Shift only the lower/later element by the exact overlap amount plus the appropriate gap (8/16/24px)
4. Re-check downstream elements — if moving one element causes a cascade, shift subsequent elements by the same delta
5. Do NOT rebuild or reposition all elements. Do NOT recreate instances. Only adjust the positions that are actually wrong.

```
// Example: item_B overlaps item_A
get_node_info({ nodeId: "<item_A>" })  // y: 200, height: 88
get_node_info({ nodeId: "<item_B>" })  // y: 270 — but should be >= 288 (200+88)
overlap = (200 + 88) - 270            // 18px overlap
set_position({ nodeId: "<item_B>", x: current_x, y: 270 + 18 + 8 })  // shift by overlap + 8px gap
```

After fixing, take another screenshot to confirm no remaining overlaps.

## Changing the Active Navigation Tab

The M3 navigation bar activates item 1 by default. Each nav item exposes a `Selected` variant property that can be toggled via `set_instance_properties`.

### Step 1: Find the nav item instances

```
find_nodes({ type: "INSTANCE", nameContains: "Nav item", within: "<navBarId>" })
```

### Step 2: Get instance properties to discover property key IDs

```
get_instance_properties({ nodeId: "<navItem01Id>" })
// Returns properties including: "Selected" (VARIANT), "Label text#...:..." (TEXT)
```

**IMPORTANT:** Property key IDs (the `#...:...` suffix) differ between nav bars. Always call `get_instance_properties` on the actual nav item instance — never reuse property IDs from a different nav bar.

### Step 3: Set Selected and labels

```
// Deactivate item 1 (default active)
set_instance_properties({ nodeId: "<navItem01Id>", properties: { "Selected": "False" } })

// Activate the target item
set_instance_properties({ nodeId: "<targetItemId>", properties: { "Selected": "True" } })

// Set labels on all items (use the correct Label text#...:... key from step 2)
set_instance_properties({ nodeId: "<navItem01Id>", properties: { "Label text#...:...": "Home" } })
```

## Available Tools

| Tool | Purpose |
|---|---|
| `create_frame` | Create a frame. Accepts optional `parentId` to nest inside another frame |
| `create_instance` | Place a component instance with variant selection. Accepts `parentId`, optional `componentKey` for library components |
| `get_instance_properties` | Read exposed component properties (TEXT, BOOLEAN, INSTANCE_SWAP) on an instance |
| `set_instance_properties` | Override component properties declaratively — set labels, toggle icons, swap nested instances |
| `list_variants` | List variant axes and values for a component set. Accepts optional `componentSetKey` for library components |
| `get_node_info` | Get node type, dimensions, visibility, mainComponent |
| `set_position` | Move a node to (x, y) |
| `resize_node` | Resize a node to width/height |
| `set_fill` | Apply solid fill color to a node |
| `set_properties` | Set whitelisted properties (visible, opacity, fills, layout, clipsContent, overflowDirection, layoutSizingHorizontal/Vertical, etc.) |
| `swap_component` | Swap an instance's source component. Accepts optional `componentKey` for library components |
| `set_text_content` | Update text content of a text node |
| `set_text_color` | Set fill color of a text node |
| `add_text` | Add a new text node with font/size. Accepts optional `parentId` |
| `rectangle` | Create a rectangle with optional fill/cornerRadius. Accepts optional `parentId` |
| `append_child` | Move an existing node into a parent frame or group (appends on top) |
| `insert_child` | Insert a node into a parent at a specific index for z-order control |
| `group_nodes` | Group nodes together |
| `find_nodes` | Find nodes by type/name on the current page |
| `find_text_nodes` | Return all text nodes on the current page with content |
| `set_reactions` | Set prototype interactions (navigation, overlays, transitions) |
| `get_local_styles` | Get paint/text/effect styles from the file |
| `get_local_variables` | Get design token variables |
| `get_file_key` | Get the file key of the currently open Figma file (needed for `get_screenshot`) |
| `export_node` | Export a node as PNG/SVG/JPG/PDF (use `scale: 0.5` to avoid size limits) |
| `clear_page` | Delete all nodes on current page |

## Local vs Library Components

- If the design system JSON was extracted from the **current file**, use `componentId` (faster, no network fetch)
- If the design system JSON references components from a **published library** (different file), use `componentKey`
- `componentKey` triggers `importComponentByKeyAsync` which fetches from the team library
- `get_node_info` on an instance returns `mainComponentKey` and `remote` — use these to determine if a component is from an external library

## Common Pitfalls

| Issue | Cause | Fix |
|---|---|---|
| Text not centered | Guessing x-position | Measure width with `get_node_info`, compute `center_x - width/2` |
| Dividers don't span the screen | Default width is narrower than frame | `resize_node` to frame width after creation |
| Nav bar labels squished | Using Horizontal items variant | Always use "Vertical items" (`58016:37259`) — never Horizontal |
| List items overlapping | Spacing based on assumed height | Measure actual height, then add gap |
| Components clipped at edges | Placed without checking actual width | Measure width, adjust position |
| Buttons outside card bounds | Card height set arbitrarily | Let auto-layout size the card, or measure content first |
| Nav bar wrong tab active | M3 nav always activates item 1 | Use `get_instance_properties` then `set_instance_properties` with `"Selected": "True"/"False"` |
| Font loading error | Using Inter Medium or other weights | Use `fontStyle: "Regular"` only |
| Elements appear unchanged | Modified vector inside instance instead of instance itself | Use `set_properties` on the INSTANCE node |
