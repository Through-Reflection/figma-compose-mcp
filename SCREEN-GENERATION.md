# Figma Compose MCP — Agent Instructions

## Overview

This system allows an AI agent to generate complete UI screens in Figma using real Material 3 component instances via two MCP servers: one for reading Figma data and one for writing to the canvas through a plugin bridge.
```

## Prerequisites

1. The Figma Desktop plugin must be running with the WebSocket connection active
2. Both MCP servers must be registered in the Claude Code config
## Core Workflow

### Step 1: Create and configure the frame

```
create_frame({ name: "Screen Name", width: 412, height: 917 })
set_fill({ nodeId: "<frameId>", hex: "#fef7ff" })
```

Record the frame origin (`frame_x`, `frame_y`) and dimensions (`frame_w`, `frame_h`). All positioning is relative to these values.

### Step 2: Look up component IDs

Find the component in `M3-DESIGN-SYSTEM.json`. Each component set has an `id` field (e.g., `"57994:2227"` for Button).

### Step 3: Check available variants before creating instances

```
list_variants({ componentSetId: "<id>" })
```

This returns variant axes and their values. Never guess variant property names — always check first.

### Step 4: Place components, then measure

After placing each component, **immediately** query its actual dimensions:

```
create_instance({ componentId: "...", x: frame_x, y: frame_y })
get_node_info({ nodeId: "<returned nodeId>" })
```

Use the measured width and height for all subsequent positioning calculations.

### Step 5: Position the next element using measured values

```
next_y = current_y + current_height + gap
```

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
centered_x = frame_x + (frame_w / 2) - (node_width / 2)
```

Use `get_node_info` or `get_metadata` to get the actual node width before computing center position.

### Rule 3: ALWAYS resize full-width components to match the frame

Dividers, navigation bars, app bars, and search bars often have a default width narrower than the frame. Resize immediately after creation:

```
resize_node({ nodeId: "<dividerId>", width: 412, height: 1 })
resize_node({ nodeId: "<navBarId>", width: 412, height: 80 })
```

### Rule 4: NEVER manually set height on auto-layout components

Components like Cards use auto-layout with hug-content sizing. Setting an arbitrary height will clip internal elements (buttons, text). Either:
- Let the component auto-size based on its content
- Measure the content height with `get_node_info` first, then set height to content + padding

### Rule 5: Use the correct component variant for the screen size

- **Phone (412px):** Use "Vertical items" variants for navigation bars
- **Tablet (840px+):** Use "Horizontal items" variants for navigation bars

Check component descriptions in `M3-DESIGN-SYSTEM.json` for size guidance.

### Rule 6: Pin bottom navigation to the frame bottom

```
nav_y = frame_y + frame_h - nav_height
```

### Rule 7: Use Inter Regular for all text

Inter Medium and other weights may not be loaded in the Figma environment. Stick with `fontFamily: "Inter"`, `fontStyle: "Regular"` to avoid font loading errors.

### Rule 8: Screenshot and verify after completing a screen

```
get_screenshot({ nodeId: "<frameId>" })
```

Check for:
- Elements bleeding outside the frame
- Overlapping text or components
- Components wider than the frame
- Inconsistent alignment or spacing
- Buttons clipped by parent component borders

## Changing the Active Navigation Tab

The M3 navigation bar always makes item 1 active by default. To change which tab appears active:

1. **Discover icon component IDs** — Use `get_node_info` on each nav item's icon instance to find its `mainComponentId` (e.g., `stars_filled` = `54616:25409`, `stars` = `54616:25411`)

2. **Toggle visibility** — Hide the current active item's filled icon and show its outlined icon:
   ```
   set_properties({ nodeId: "<item1_filledIcon>", props: { visible: false, opacity: 0 } })
   set_properties({ nodeId: "<item1_outlinedIcon>", props: { visible: true, opacity: 1 } })
   ```

3. **Swap icon components** — Change the source component reference:
   ```
   swap_component({ nodeId: "<item1_icon>", componentId: "<outlinedIconId>" })
   swap_component({ nodeId: "<targetItem_icon>", componentId: "<filledIconId>" })
   ```

4. **Swap pill backgrounds** — Remove the pill from the old active item and add it to the new one:
   ```
   set_properties({ nodeId: "<item1_iconContainer>", props: { fills: [] } })
   set_fill({ nodeId: "<targetItem_iconContainer>", hex: "#e8def8" })
   ```

## Available Tools

| Tool | Purpose |
|---|---|
| `create_frame` | Create a frame with width/height/name/position |
| `create_instance` | Place a component instance with variant selection |
| `list_variants` | List variant axes and values for a component set |
| `get_node_info` | Get node type, dimensions, visibility, mainComponent |
| `set_position` | Move a node to (x, y) |
| `resize_node` | Resize a node to width/height |
| `set_fill` | Apply solid fill color to a node |
| `set_properties` | Set whitelisted properties (visible, opacity, fills, layout, etc.) |
| `swap_component` | Swap an instance's source component |
| `set_text_content` | Update text content of a text node |
| `set_text_color` | Set fill color of a text node |
| `add_text` | Add a new text node with font/size |
| `group_nodes` | Group nodes together |
| `find_nodes` | Find nodes by type/name on the current page |
| `set_reactions` | Set prototype interactions (navigation, overlays, transitions) |
| `get_local_styles` | Get paint/text/effect styles from the file |
| `get_local_variables` | Get design token variables |
| `export_node` | Export a node as PNG/SVG/JPG/PDF |
| `clear_page` | Delete all nodes on current page |

## Common Pitfalls

| Issue | Cause | Fix |
|---|---|---|
| Text not centered | Guessing x-position | Measure width with `get_node_info`, compute `center_x - width/2` |
| Dividers don't span the screen | Default width is narrower than frame | `resize_node` to frame width after creation |
| Nav bar labels squished | Using tablet variant on phone frame | Use "Vertical items" variant for 412px |
| List items overlapping | Spacing based on assumed height | Measure actual height, then add gap |
| Components clipped at edges | Placed without checking actual width | Measure width, adjust position |
| Buttons outside card bounds | Card height set arbitrarily | Let auto-layout size the card, or measure content first |
| Nav bar wrong tab active | M3 nav always activates item 1 | Use `get_node_info` + `swap_component` + `set_properties` workflow |
| Font loading error | Using Inter Medium or other weights | Use `fontStyle: "Regular"` only |
| Elements appear unchanged | Modified vector inside instance instead of instance itself | Use `set_properties` on the INSTANCE node |
