# figma-compose-mcp

An MCP server that enables AI agents to generate Figma screens using **real linked component instances** from your design system — not visual approximations.

## What it does

1. **Reads your design system** — extracts colors, typography, effects, and design tokens from any Figma file
2. **Creates real component instances** — uses linked instances from your component library with correct variant selection
3. **Generates full screens** — composes screens from your actual components with proper positioning, text, and styling
4. **Sets up prototype interactions** — navigation, overlays, transitions between screens

Every element stays connected to the source design system. Change a component in your kit, and generated screens update automatically.

## Architecture

```
AI Client (Claude, Cursor, etc.) <-> MCP Server (stdio) <-> WebSocket Bridge <-> Figma Plugin
```

The MCP server exposes tools via the Model Context Protocol. The Figma plugin executes operations on the canvas through a WebSocket bridge.

## Installation

No install required — run directly with npx:

```bash
npx figma-compose-mcp
```

Or install globally:

```bash
npm install -g figma-compose-mcp
```

## Setup

### 1. Install the Figma plugin

- Open Figma Desktop
- Go to **Plugins -> Development -> Import plugin from manifest**
- Select `plugin/manifest.json` from this project

### 2. Configure your MCP client

Add to your MCP configuration (e.g., Claude Desktop, Cursor, VS Code):

```json
{
  "mcpServers": {
    "figma-compose": {
      "command": "npx",
      "args": ["figma-compose-mcp"]
    }
  }
}
```

### 3. Connect

1. Open a Figma document with a design system
2. Run the plugin: **Plugins -> Development -> figma-compose-mcp**
3. Start prompting your AI agent

## Tools

### Design System Reading

| Tool | Description |
|------|-------------|
| `get_local_styles` | Extract colors, typography, and effects from the Figma file |
| `get_local_variables` | Get design tokens (variables) with mode support |
| `list_pages` | List all pages in the file |
| `find_nodes` | Find nodes by type and/or name |
| `find_text_nodes` | Return all text nodes on the current page with content |
| `get_node_info` | Get dimensions, visibility, and component info for any node |

### Component Composition

| Tool | Description |
|------|-------------|
| `create_instance` | Create a linked instance with variant selection and optional `parentId` |
| `list_variants` | List variant axes and options for a component set |
| `swap_component` | Swap an instance to a different source component |
| `get_instance_properties` | Read exposed component properties (TEXT, BOOLEAN, INSTANCE_SWAP) |
| `set_instance_properties` | Override component properties declaratively (labels, toggles, icon swaps) |

### Screen Building

| Tool | Description |
|------|-------------|
| `create_frame` | Create a frame with dimensions, position, and optional `parentId` |
| `add_text` | Add text with font, size, position, and optional `parentId` |
| `rectangle` | Create a rectangle with optional fill, corner radius, and `parentId` |
| `set_position` | Move any node to specific coordinates |
| `resize_node` | Resize any node |
| `group_nodes` | Group nodes together |
| `append_child` | Move a node into a parent frame or group |
| `insert_child` | Insert a node at a specific z-index position in a parent |
| `set_fill` | Apply fill colors |
| `set_properties` | Bulk-set layout, styling, visibility, clipsContent, overflowDirection, layoutSizing |
| `clear_page` | Remove all nodes from the current page |

### Prototyping

| Tool | Description |
|------|-------------|
| `set_reactions` | Set prototype interactions (click, hover, navigation, overlays, transitions) |

### Export

| Tool | Description |
|------|-------------|
| `export_node` | Export any node as PNG, SVG, JPG, or PDF |

## Example

```
"Read the design system
```

The agent will extract colors, typography, and components, etc via `get_local_styles` and create a json reference object 

```
Generate a login screen
```

Create a frame and compose instances with `create_instance`
Position and customize text with `set_position` and `set_text_content`

## Limitations

- **Font loading** — some fonts may not be available in the plugin environment; Inter works as a fallback
- **Auto-layout** — components with hug-content sizing don't stretch to arbitrary dimensions
- **Plugin must be running** — the Figma Desktop plugin must be open with WebSocket connected

## Credits

Built on top of [Figma MCP Write Bridge](https://github.com/firasmj/Figma-MCP-Write-Bridge) by [@firasmj](https://github.com/firasmj).

## License

MIT — see [LICENSE](LICENSE) for details.
