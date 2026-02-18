# Agent Prompts for Screen Generation

These are the proven prompts used to spawn parallel agents for building screens. Each agent gets its own frame ID and builds independently.

## Pre-work (done by parent before spawning)

```
1. Create frames spaced 452px apart (412px width + 40px gap)
2. Set fill #fef7ff and clipsContent: true on each
3. Record frame IDs
4. Spawn agents in parallel with frame IDs
```

---

## Home Screen

```
Build a HOME SCREEN inside an existing Figma frame using the Figma Compose MCP tools.

## Frame Info
- **Frame ID**: `<FRAME_ID>`
- **Size**: 412 x 917, already configured with fill and clipsContent
- Use `parentId: "<FRAME_ID>"` for all children (coordinates relative to frame)

## Layout (top to bottom)
1. **Top App Bar** — Small-centered, Flat. Title: "Home". Full width 412px.
2. **Search Bar** — State=Enabled, Show avatar=False. x=16, width=380.
3. **Section title** — "Recent" text, x=16, 24px below search bar. Use fontFamily "Inter", fontStyle "Regular", fontSize 14.
4. **1 Stacked Card** — Style=Elevated, Layout=Media & text. x=16, width=380. Let it auto-size (do NOT manually set height).
5. **Navigation Bar** — 4 items, full width 412px, pinned to bottom. Labels: Home, Chat, Explore, Settings. **Tab 1 (Home) active** (default, no changes needed).

## Component IDs — use componentId (local file)
- App Bar: componentSetId `58114:20565`, variant `{"Configuration": "Small-centered", "Elevation": "Flat"}`
- Search Bar: componentSetId `52977:33813`, variant `{"State": "Enabled", "Show avatar": "False"}`
- Stacked Card: componentSetId `52346:27573`, variant `{"Style": "Elevated", "Layout": "Media & text"}`
- **Nav Bar: componentSetId `58016:37259`** (VERTICAL items — NEVER use `58016:37236`), variant `{"Nav items": "4"}`

## Critical Rules
1. After placing each component, ALWAYS call `get_node_info` to measure actual dimensions. NEVER guess heights.
2. Use measured heights: `next_y = current_y + measured_height + gap`. Gaps: 16px within sections, 24px between sections.
3. Full-width components (app bar, nav bar) must be resized to 412px with `resize_node`.
4. Pin nav bar to bottom: measure its height, then `set_position` to y = 917 - nav_height.
5. Use `get_instance_properties` then `set_instance_properties` to set labels. Property key IDs (the `#...:...` suffix) vary — always discover them first.
6. Nav bar labels: find each nav item with `find_nodes({ type: "INSTANCE", nameContains: "Nav item", within: "<navBarId>" })`, then `get_instance_properties` on each to find the label property key, then set: "Home", "Chat", "Explore", "Settings".
7. After completing, call `get_file_key()` then `get_screenshot({ fileKey, nodeId: "<FRAME_ID>" })` to verify. Check for overlapping elements. If found, fix with minimal `set_position` adjustments and re-screenshot.
```

---

## Chat Screen

```
Build a CHAT SCREEN inside an existing Figma frame using the Figma Compose MCP tools.

## Frame Info
- **Frame ID**: `<FRAME_ID>`
- **Size**: 412 x 917, already configured with fill and clipsContent
- Use `parentId: "<FRAME_ID>"` for all children (coordinates relative to frame)

## Layout (top to bottom)
1. **Top App Bar** — Small-centered, Flat. Title: "Chat". Full width 412px.
2. **6 List Items** with dividers between each — representing chat conversations.
3. **Navigation Bar** — 4 items, full width 412px, pinned to bottom. Labels: Home, Chat, Explore, Settings. **Tab 2 (Chat) must be active.**

## Component IDs — use componentId (local file)
- App Bar: componentSetId `58114:20565`, variant `{"Configuration": "Small-centered", "Elevation": "Flat"}`
- List Item: componentSetId `59106:13183` — call `list_variants` first to find a 2-line variant with leading element
- Divider: componentId `51816:5860` (standalone COMPONENT — use componentId directly, NO variantProperties)
- **Nav Bar: componentSetId `58016:37259`** (VERTICAL items — NEVER use `58016:37236`), variant `{"Nav items": "4"}`

## Critical Rules
1. After placing each component, ALWAYS call `get_node_info` to measure actual dimensions. NEVER guess heights.
2. Use measured heights: `next_y = current_y + measured_height + gap`.
3. Full-width components (app bar, nav bar, dividers, list items) must be resized to 412px with `resize_node`.
4. Pin nav bar to bottom: measure its height, then `set_position` to y = 917 - nav_height.
5. Use `get_instance_properties` then `set_instance_properties` to set labels. Property key IDs vary — always discover them first.

## Nav Bar — Making Tab 2 Active
1. Find nav items: `find_nodes({ type: "INSTANCE", nameContains: "Nav item", within: "<navBarId>" })`
2. Call `get_instance_properties` on EACH nav item to discover property keys (they differ per instance!)
3. Set labels on all 4 items: "Home", "Chat", "Explore", "Settings"
4. Set `"Selected": "False"` on item 01, `"Selected": "True"` on item 02
5. **NEVER swap nav item components** — only use `set_instance_properties` to change the `Selected` variant

## Chat Conversations
Set list item labels to: Alice ("Hey! Are we still on for lunch?"), Bob ("Did you see the game last night?"), Carol ("The project deadline moved"), David ("Thanks for the files!"), Eve ("Can you review my PR?"), Frank ("Let's catch up this weekend!")

## Verification
After completing, call `get_file_key()` then `get_screenshot({ fileKey, nodeId: "<FRAME_ID>" })`. Check for overlaps. Fix with minimal `set_position` adjustments if needed.
```

---

## Explore Screen

```
Build an EXPLORE SCREEN inside an existing Figma frame using the Figma Compose MCP tools.

## Frame Info
- **Frame ID**: `<FRAME_ID>`
- **Size**: 412 x 917, already configured with fill and clipsContent
- Use `parentId: "<FRAME_ID>"` for all children (coordinates relative to frame)

## Layout (top to bottom)
1. **Top App Bar** — Small-centered, Flat. Title: "Explore". Full width 412px.
2. **Search Bar** — State=Enabled, Show avatar=False. x=16, width=380. 16px below app bar.
3. **Tabs** — Primary, Fixed. Full width 412px. 16px below search bar. Use `get_instance_properties` then `set_instance_properties` to set tab labels: "For You", "Trending", "Popular".
4. **Category tiles** — 2 rectangles with rounded corners (cornerRadius 12) in a single row. Each tile 182x100px. Left tile x=16, right tile x=214. 24px below tabs.
5. **Section title** — "Trending" text, x=16, 24px below the tiles. fontFamily "Inter", fontStyle "Regular", fontSize 14.
6. **3 List Items** with dividers — representing trending topics. Full width 412px.
7. **Navigation Bar** — 4 items, full width 412px, pinned to bottom. Labels: Home, Chat, Explore, Settings. **Tab 3 (Explore) must be active.**

## Component IDs — use componentId (local file)
- App Bar: componentSetId `58114:20565`, variant `{"Configuration": "Small-centered", "Elevation": "Flat"}`
- Search Bar: componentSetId `52977:33813`, variant `{"State": "Enabled", "Show avatar": "False"}`
- Tabs: componentSetId `54563:40023` — call `list_variants` to find a Primary, Fixed variant with 3 tabs
- List Item: componentSetId `59106:13183` — call `list_variants` to find a 2-line variant
- Divider: componentId `51816:5860` (standalone COMPONENT — NO variantProperties)
- **Nav Bar: componentSetId `58016:37259`** (VERTICAL items — NEVER use `58016:37236`), variant `{"Nav items": "4"}`

## Category Tiles (use rectangles, NOT card components)
Create 2 rectangles as category tiles in a single row:
- Left tile: x=16, y=<24px below tabs>, width=182, height=100, hex="#eaddff", cornerRadius=12
- Right tile: x=214, y=same, width=182, height=100, hex="#ffd8e4", cornerRadius=12
Add text labels on each tile: "Design", "Tech" using add_text with fontFamily "Inter", fontStyle "Regular", fontSize 16. Center each label on its tile.

## Critical Rules
1. After placing each component, ALWAYS call `get_node_info` to measure actual dimensions. NEVER guess heights.
2. Use measured heights: `next_y = current_y + measured_height + gap`.
3. Full-width components (app bar, nav bar, dividers, list items) must be resized to 412px with `resize_node`.
4. Pin nav bar to bottom: measure its height, then `set_position` to y = 917 - nav_height.
5. Use `get_instance_properties` then `set_instance_properties` to set labels. Property key IDs vary — always discover them first.

## Nav Bar — Making Tab 3 Active
1. Find nav items: `find_nodes({ type: "INSTANCE", nameContains: "Nav item", within: "<navBarId>" })`
2. Call `get_instance_properties` on EACH nav item to discover property keys (they differ per instance!)
3. Set labels on all 4 items: "Home", "Chat", "Explore", "Settings"
4. Set `"Selected": "False"` on item 01, `"Selected": "True"` on item 03
5. **NEVER swap nav item components** — only use `set_instance_properties` to change the `Selected` variant

## Verification
After completing, call `get_file_key()` then `get_screenshot({ fileKey, nodeId: "<FRAME_ID>" })`. Check for overlaps. Fix with minimal `set_position` adjustments if needed.
```

---

## Settings Screen

```
Build a SETTINGS SCREEN inside an existing Figma frame using the Figma Compose MCP tools.

## Frame Info
- **Frame ID**: `<FRAME_ID>`
- **Size**: 412 x 917, already configured with fill and clipsContent
- Use `parentId: "<FRAME_ID>"` for all children (coordinates relative to frame)

## Layout (top to bottom)
1. **Top App Bar** — Small-centered, Flat. Title: "Settings". Full width 412px.
2. **Section: "Account"** — Text label x=16, 24px below app bar. fontFamily "Inter", fontStyle "Regular", fontSize 14.
3. **3 List Items** — Profile (Manage your account), Notifications (Push, email, SMS), Privacy (Manage your data). Full width 412px.
4. **Divider** — Full width.
5. **Section: "General"** — Text label x=16, 16px below divider.
6. **3 List Items** — Theme (Light), Language (English), Storage (1.2 GB used). Full width 412px.
7. **Divider** — Full width.
8. **Section: "About"** — Text label x=16, 16px below divider.
9. **2 List Items** — Version (2.4.1), Terms of Service (View terms). Full width 412px.
10. **Navigation Bar** — 4 items, full width 412px, pinned to bottom. Labels: Home, Chat, Explore, Settings. **Tab 4 (Settings) must be active.**

## Component IDs — use componentId (local file)
- App Bar: componentSetId `58114:20565`, variant `{"Configuration": "Small-centered", "Elevation": "Flat"}`
- List Item: componentSetId `59106:13183` — call `list_variants` to find a 2-line variant
- Divider: componentId `51816:5860` (standalone COMPONENT — NO variantProperties)
- **Nav Bar: componentSetId `58016:37259`** (VERTICAL items — NEVER use `58016:37236`), variant `{"Nav items": "4"}`

## Critical Rules
1. After placing each component, ALWAYS call `get_node_info` to measure actual dimensions. NEVER guess heights.
2. Use measured heights: `next_y = current_y + measured_height + gap`. Gaps: 8px between list items in same section, 16px after dividers.
3. Full-width components (app bar, nav bar, dividers, list items) must be resized to 412px with `resize_node`.
4. Pin nav bar to bottom: measure its height, then `set_position` to y = 917 - nav_height.
5. Use `get_instance_properties` then `set_instance_properties` to set labels. Property key IDs vary — always discover them first.

## Nav Bar — Making Tab 4 Active
1. Find nav items: `find_nodes({ type: "INSTANCE", nameContains: "Nav item", within: "<navBarId>" })`
2. Call `get_instance_properties` on EACH nav item to discover property keys (they differ per instance!)
3. Set labels on all 4 items: "Home", "Chat", "Explore", "Settings"
4. Set `"Selected": "False"` on item 01, `"Selected": "True"` on item 04
5. **NEVER swap nav item components** — only use `set_instance_properties` to change the `Selected` variant

## Verification
After completing, call `get_file_key()` then `get_screenshot({ fileKey, nodeId: "<FRAME_ID>" })`. Check for overlaps. Fix with minimal `set_position` adjustments if needed.
```
