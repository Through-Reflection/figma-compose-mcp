---
name: extract-design-system
description: Extract a structured design system reference (colors, typography, tokens, components) from a Figma file into JSON
argument-hint: "[figma file description or specific components to extract]"
allowed-tools: Bash, Read, Write, Grep, Glob, mcp__figma__get_screenshot, mcp__figma__get_design_context, mcp__figma__get_metadata
---

# Design System Extraction

Extract a structured design system reference from the Figma file and produce a JSON file containing color tokens, typography scales, shape values, elevation specs, and component IDs with their variant axes.

**User request:** $ARGUMENTS

## Prerequisites

1. The Figma Read MCP server must be connected
2. The Figma Write MCP bridge must be running (needed for `get_local_styles` and `get_local_variables`)
3. The target Figma file must be open in Figma Desktop with the plugin active

## Extraction Workflow

### Step 1: Discover the file structure

Use `get_metadata` on the root page to understand how the design kit is organized:

```
get_metadata({ nodeId: "0:1" })
```

For large design kits (e.g., 30+ pages), this gives you page names and IDs. Record the page structure — components are typically organized by category (Buttons, Cards, Navigation, etc.).

### Step 2: Extract color tokens

Use `get_local_styles` with the `nameContains` filter to extract colors in manageable batches.

**Critical: Never request all colors at once.** Large design systems have hundreds of color styles. Requesting them all produces 98K+ characters which exceeds practical limits.

Extract by theme:
```
get_local_styles({ type: "paint", nameContains: "sys/light" })   // light theme
get_local_styles({ type: "paint", nameContains: "sys/dark" })    // dark theme
```

Extract by category if needed:
```
get_local_styles({ type: "paint", nameContains: "primary" })
get_local_styles({ type: "paint", nameContains: "surface" })
get_local_styles({ type: "paint", nameContains: "error" })
```

Record each token as:
```json
{
  "name": "sys/light/primary",
  "hex": "#6750a4"
}
```

### Step 3: Extract typography scales

```
get_local_styles({ type: "text" })
```

Typography styles are typically smaller in number and can be fetched in one call. Record:
```json
{
  "name": "Display Large",
  "fontFamily": "Roboto",
  "fontSize": 57,
  "fontWeight": 400,
  "lineHeight": 64,
  "letterSpacing": -0.25
}
```

**Note:** If the design kit uses fonts not available in the Figma environment (e.g., Roboto), document Inter as the fallback with equivalent sizing.

### Step 4: Extract shape and elevation tokens

```
get_local_styles({ type: "effect" })                              // shadows/elevation
get_local_variables({ collectionName: "shape" })                  // corner radii
```

If variables aren't available, scan the design kit pages for shape/elevation reference frames using `get_metadata` and `get_design_context`.

Record shape tokens:
```json
{
  "none": 0,
  "extraSmall": 4,
  "small": 8,
  "medium": 12,
  "large": 16,
  "extraLarge": 28,
  "full": 9999
}
```

Record elevation levels:
```json
{
  "level0": { "shadow": "none" },
  "level1": { "blur": 3, "y": 1, "color": "rgba(0,0,0,0.15)" },
  "level2": { "blur": 6, "y": 2, "color": "rgba(0,0,0,0.15)" }
}
```

### Step 5: Scan component pages for component set IDs

For each component category page, use `get_metadata` to find `COMPONENT_SET` nodes:

```
get_metadata({ nodeId: "<pageId>" })
```

Look for nodes of type `COMPONENT_SET`. Record the name, ID, and key:
```json
{
  "buttons": {
    "componentSets": [
      { "name": "Button", "id": "57994:2227", "key": "abc123def456..." },
      { "name": "FAB", "id": "57998:43426", "key": "def789ghi012..." },
      { "name": "Icon button", "id": "58000:1199", "key": "ghi345jkl678..." }
    ]
  }
}
```

The `key` is a stable identifier that works across files via `importComponentByKeyAsync`. Components with `remote: true` (from external libraries) are always importable by key. Local components need to be published to a team library for their key to work cross-file.

**Important:** Also record standalone `COMPONENT` nodes (not in sets) like Dividers, which are used directly without variant selection.

### Step 6: Discover variant axes for each component set

For every component set ID collected, run:

```
list_variants({ componentSetId: "<id>" })
```

Or, for components from an external library:
```
list_variants({ componentSetKey: "<key>" })
```

The response includes `key` for the component set and each individual variant. Record the axes, keys, and values:
```json
{
  "name": "Button",
  "id": "57994:2227",
  "key": "abc123def456...",
  "published": true,
  "axes": {
    "Style": ["Filled", "Outlined", "Text", "Elevated", "Tonal"],
    "State": ["Enabled", "Disabled", "Pressed", "Focused", "Hovered"]
  },
  "variantCount": 25
}
```

This is the most time-consuming step. Prioritize components you expect to use in screens:
1. Navigation (app bars, nav bars, tabs)
2. Inputs (text fields, buttons, checkboxes, switches)
3. Content (cards, list items, chips)
4. Feedback (dialogs, snackbars, progress indicators)
5. Layout (dividers, bottom sheets)

### Step 7: Assemble the JSON reference

Combine everything into a single structured file:

```json
{
  "meta": {
    "source": "<design system name>",
    "extractedFrom": "<figma file name>",
    "date": "2026-02-01"
  },
  "colors": {
    "light": { "primary": "#6750a4", "onPrimary": "#ffffff", "surface": "#fef7ff" },
    "dark": { "primary": "#d0bcff", "onPrimary": "#381e72", "surface": "#141218" }
  },
  "typography": {
    "displayLarge": { "fontSize": 57, "lineHeight": 64, "fontWeight": 400 },
    "bodyMedium": { "fontSize": 14, "lineHeight": 20, "fontWeight": 400 }
  },
  "shape": { "none": 0, "extraSmall": 4, "small": 8, "medium": 12, "large": 16, "extraLarge": 28, "full": 9999 },
  "components": { }
}
```

## Critical Rules

### Rule 1: Filter style extraction to avoid token overflow

Never call `get_local_styles` without a `nameContains` filter on large design systems. Large kits can have hundreds of paint styles — fetching all at once produces output that exceeds context limits.

Break extraction into themed batches: `sys/light`, `sys/dark`, `ref/primary`, `ref/neutral`, etc.

### Rule 2: Distinguish COMPONENT_SET from COMPONENT

- **COMPONENT_SET** — A group of variants (e.g., Button with Style/State axes). Use `create_instance` with `variantProperties` to select a specific variant.
- **COMPONENT** — A single component with no variants (e.g., Divider). Use `create_instance` with just the `componentId`, no `variantProperties`.

Recording the wrong type leads to failed instance creation.

### Rule 3: Record component descriptions and sizing notes

Some components have size-specific variants or behaviors:
- Navigation bars: "Vertical items" for phones, "Horizontal items" for tablets
- Text fields: different widths for different screen sizes
- Cards: auto-layout hug-content — don't manually constrain height

Include a `notes` field for any component with non-obvious behavior.

### Rule 4: Verify IDs are current — prefer keys for stability

Component node IDs are specific to the Figma file. If the design kit is updated or duplicated, IDs will change. Component **keys** are more stable — they persist if the library is republished.

- When working with external/shared libraries, prefer using `componentKey` / `componentSetKey` over ID-based parameters
- Components with `remote: true` are confirmed importable from external libraries
- For local components, the key only works cross-file if the file is published as a team library

Before generating screens with a previously extracted JSON:
1. Spot-check a few component IDs with `list_variants` to confirm they still resolve
2. If any fail, re-extract the affected category

### Rule 5: Check published status during extraction

During extraction, verify that components are published by checking that `.key` exists and is non-empty:
- Components with `remote: true` are confirmed importable from external libraries
- For local components, note that the key only works if the file is published as a team library
- Record a `published` field based on whether `remote` is true or the key was successfully verified

### Rule 6: Extract only what you need

A full extraction of a large design kit takes many API calls. For a focused project:
1. Start with the components needed for your first screen
2. Extract additional components as new screens require them
3. Incrementally build the JSON reference

### Rule 7: Record the font fallback

If the design system specifies fonts that aren't loaded in the Figma environment (common with Roboto), document which fonts work and which need fallbacks:

```json
{
  "fonts": {
    "primary": "Roboto",
    "fallback": "Inter",
    "availableStyles": ["Regular"],
    "unavailableStyles": ["Medium", "Bold"],
    "note": "Use Inter Regular for all text — other weights cause font loading errors"
  }
}
```

## Output Checklist

Before considering extraction complete, verify:

- [ ] Light theme colors extracted (primary, secondary, tertiary, error, surface, outline families)
- [ ] Dark theme colors extracted (same families)
- [ ] All typography scales recorded (Display, Headline, Title, Label, Body at S/M/L)
- [ ] Shape tokens recorded (corner radii)
- [ ] Elevation levels recorded (shadow specs)
- [ ] Component set IDs collected for all needed categories
- [ ] Variant axes discovered for each component set
- [ ] Standalone components (non-sets) identified and recorded
- [ ] Component sizing notes added where relevant
- [ ] Font availability tested and fallbacks documented
- [ ] JSON file is valid and well-structured
- [ ] Spot-checked 3-5 component IDs with `list_variants` to confirm they resolve
