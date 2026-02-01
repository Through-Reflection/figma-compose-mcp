#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// --- WebSocket bridge to the Figma plugin UI ---
const PORT = 3055;
const HOST = "127.0.0.1";

const wss = new WebSocketServer({ host: HOST, port: PORT });
let pluginClient: WebSocket | null = null;

type Pending = {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
};
const pending = new Map<string, Pending>();

function makeId() {
  return Math.random().toString(36).slice(2);
}

function sendToPlugin(action: string, args: unknown): Promise<any> {
  if (!pluginClient || pluginClient.readyState !== WebSocket.OPEN) {
    throw new Error(
      "Figma plugin not connected. Open Figma → Plugins → Development → MCP Figma Write Bridge."
    );
  }
  const id = makeId();
  const payload = JSON.stringify({ id, action, args });
  pluginClient.send(payload);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Plugin timeout waiting for "${action}" response.`));
    }, 15000);

    pending.set(id, { resolve, reject, timeout });
  });
}

wss.on("connection", (ws) => {
  pluginClient = ws;
  console.error(`[bridge] Plugin connected from ${ws.url ?? "ui.html"}`);


  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { replyTo, result, error } = msg;
      if (!replyTo) return;

      const p = pending.get(replyTo);
      if (!p) return;

      clearTimeout(p.timeout);
      pending.delete(replyTo);
      if (error) p.reject(new Error(error));
      else p.resolve(result);
    } catch (e) {
      console.error("[bridge] Bad message from plugin:", e);
    }
  });

  ws.on("close", () => {
    console.error("[bridge] Plugin disconnected");
    pluginClient = null;
  });
});

console.error(`[bridge] Waiting for plugin on ws://${HOST}:${PORT}`);

// --- MCP server with tools that forward to the plugin ---
const server = new McpServer({
  name: "figma-compose-mcp",
  version: "0.1.0"
});

// Utility to register a tool quickly
function registerTool<T extends z.ZodRawShape>(
  name: string,
  schema: T,
  description: string,
  action: string
) {
  // @ts-expect-error - SDK overload inference issue with generic wrapper
  server.tool(
    name,
    description,
    schema,
    async (input, _extra) => {
      const result = await sendToPlugin(action, input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}

// --- Tools ---
registerTool(
  "create_frame",
  {
    name: z.string().optional(),
    width: z.number().positive(),
    height: z.number().positive(),
    x: z.number().optional(),
    y: z.number().optional()
  },
  "Create a frame with width/height and optional name/position.",
  "create_frame"
);

registerTool(
  "add_text",
  {
    text: z.string(),
    x: z.number().optional(),
    y: z.number().optional(),
    fontFamily: z.string().optional().default("Inter"),
    fontStyle: z.string().optional().default("Regular"),
    fontSize: z.number().optional().default(32)
  },
  "Add a text node (loads font) at optional position.",
  "add_text"
);

registerTool(
  "rectangle",
  {
    width: z.number().positive(),
    height: z.number().positive(),
    hex: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    cornerRadius: z.number().optional()
  },
  "Create a rectangle with optional fill color/position/cornerRadius.",
  "create_rectangle"
);

registerTool(
  "set_position",
  {
    nodeId: z.string(),
    x: z.number(),
    y: z.number()
  },
  "Move a node to (x,y).",
  "set_position"
);

registerTool(
  "group_nodes",
  {
    nodeIds: z.array(z.string()).min(2),
    name: z.string().optional()
  },
  "Group the given nodes into a single group.",
  "group_nodes"
);

registerTool(
  "set_fill",
  {
    nodeId: z.string(),
    hex: z.string(),
    opacity: z.number().min(0).max(1).optional()
  },
  "Apply a solid fill color (optionally opacity) to a node that supports fills.",
  "set_fill"
);

registerTool(
  "list_pages",
  {},
  "List all pages in the Figma file with their IDs and names.",
  "list_pages"
);

registerTool(
  "set_current_page",
  { pageId: z.string() },
  "Switch to a different page by its ID.",
  "set_current_page"
);

registerTool(
  "find_nodes",
  {
    type: z.string().optional(),
    nameContains: z.string().optional(),
    within: z.string().optional()
  },
  "Find nodes on the current page by type and/or name substring.",
  "find_nodes"
);

registerTool(
  "find_text_nodes",
  {},
  "Return all text nodes on the current page with nodeId and content.",
  "find_text_nodes"
);

registerTool(
  "set_text_content",
  { nodeId: z.string(), text: z.string() },
  "Update the text content of an existing text node.",
  "set_text_content"
);

registerTool(
  "set_text_color",
  { nodeId: z.string(), hex: z.string(), opacity: z.number().min(0).max(1).optional() },
  "Set the fill color of a text node.",
  "set_text_color"
);

registerTool(
  "resize_node",
  { nodeId: z.string(), width: z.number().positive(), height: z.number().positive() },
  "Resize a node to the given width and height.",
  "resize_node"
);

registerTool(
  "add_icon_placeholder",
  {
    frameId: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    size: z.number().optional(),
    shape: z.enum(["circle", "square"]).optional(),
    hex: z.string().optional()
  },
  "Insert a simple icon placeholder (circle or square) into a frame or page.",
  "add_icon_placeholder"
);

registerTool(
  "create_instance",
  {
    componentId: z.string().describe("ID of a COMPONENT or COMPONENT_SET node"),
    variantProperties: z.record(z.string()).optional().describe("Key-value pairs to select a specific variant, e.g. {\"Style\": \"Filled\", \"State\": \"Enabled\"}"),
    x: z.number().optional(),
    y: z.number().optional()
  },
  "Create an instance of a component or component set variant. Pass variantProperties to pick a specific variant from a COMPONENT_SET.",
  "create_instance"
);

registerTool(
  "list_variants",
  {
    componentSetId: z.string().describe("ID of a COMPONENT_SET node"),
    limit: z.number().optional().describe("Max variants to return (default 50)")
  },
  "List variant axes (properties and their possible values) and individual variants for a COMPONENT_SET.",
  "list_variants"
);

registerTool(
  "get_node_info",
  { nodeId: z.string() },
  "Get info about a node including type, name, visibility, dimensions, and mainComponent ID if it's an instance.",
  "get_node_info"
);

registerTool(
  "swap_component",
  {
    nodeId: z.string().describe("ID of an INSTANCE node to swap"),
    componentId: z.string().describe("ID of the COMPONENT or COMPONENT_SET to swap to")
  },
  "Swap the component that an instance points to. The instance keeps its position and overrides but changes its source component.",
  "swap_component"
);

registerTool(
  "set_interaction_data",
  { nodeId: z.string(), event: z.string().optional(), targetId: z.string().optional() },
  "Store interaction mapping in pluginData for a node (non-prototype).",
  "set_interaction_data"
);

registerTool(
  "set_reactions",
  {
    nodeId: z.string().describe("ID of the node to add interactions to"),
    reactions: z.array(z.object({
      trigger: z.object({
        type: z.enum(["ON_CLICK", "ON_HOVER", "ON_PRESS", "ON_DRAG",
          "MOUSE_ENTER", "MOUSE_LEAVE", "MOUSE_UP", "MOUSE_DOWN",
          "AFTER_TIMEOUT"]).describe("The trigger event type")
      }).passthrough(),
      actions: z.array(z.object({
        type: z.enum(["NODE", "BACK", "CLOSE", "URL", "UPDATE_MEDIA_RUNTIME"]).describe("Action type"),
        destinationId: z.string().optional().describe("Target frame/node ID for NODE actions"),
        navigation: z.enum(["NAVIGATE", "SWAP", "OVERLAY", "SCROLL_TO", "CHANGE_TO"]).optional(),
        transition: z.object({
          type: z.enum(["DISSOLVE", "SMART_ANIMATE", "MOVE_IN", "MOVE_OUT", "PUSH", "SLIDE_IN", "SLIDE_OUT"]),
          duration: z.number().optional(),
          easing: z.object({ type: z.enum(["EASE_IN", "EASE_OUT", "EASE_IN_AND_OUT", "LINEAR", "EASE_IN_BACK", "EASE_OUT_BACK", "EASE_IN_AND_OUT_BACK", "CUSTOM_CUBIC_BEZIER"]) }).passthrough().optional()
        }).passthrough().nullable().optional(),
        preserveScrollPosition: z.boolean().optional()
      }).passthrough())
    }).passthrough()).describe("Array of reaction objects with trigger and actions")
  },
  "Set prototype interactions (reactions) on a node using setReactionsAsync. Supports navigation, overlays, transitions, and various trigger types.",
  "set_reactions"
);

registerTool(
  "get_local_styles",
  {
    type: z.enum(["paint", "color", "text", "effect"]).optional(),
    nameContains: z.string().optional()
  },
  "Get local paint/text/effect styles from the Figma file. Returns colors as hex, typography as font specs. Omit type to get all. Use nameContains to filter by name (e.g. 'sys/light' for light theme colors).",
  "get_local_styles"
);

registerTool(
  "get_local_variables",
  { collectionName: z.string().optional() },
  "Get local variables (design tokens) from the Figma file. Filter by collection name optionally.",
  "get_local_variables"
);

registerTool(
  "export_node",
  {
    nodeId: z.string(),
    format: z.enum(["PNG", "SVG", "JPG", "PDF"]).optional().default("PNG"),
    scale: z.number().optional().default(2)
  },
  "Export a node as an image (base64 encoded). Returns { format, base64 }.",
  "export_node"
);

registerTool(
  "set_properties",
  {
    nodeId: z.string(),
    props: z.record(z.any()).describe("Key-value pairs of properties to set (e.g. { visible: false, opacity: 0.5 })")
  },
  "Set whitelisted properties on a node (visible, opacity, rotation, fills, strokes, layout properties, etc.).",
  "set_properties"
);

registerTool(
  "clear_page",
  {},
  "Delete all nodes on the current page (use carefully!).",
  "clear_page"
);

// --- Resources: expose docs to agents ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadDoc(filename: string): string {
  try {
    // Check both source dir and dist dir (for npx installs)
    const paths = [
      join(__dirname, "..", filename),
      join(__dirname, filename),
      join(process.cwd(), filename)
    ];
    for (const p of paths) {
      try { return readFileSync(p, "utf-8"); } catch {}
    }
    return `Document ${filename} not found.`;
  } catch {
    return `Document ${filename} not found.`;
  }
}

server.resource(
  "screen-generation-guide",
  "docs://screen-generation",
  { description: "Step-by-step guide for generating screens with component instances, including critical rules and common pitfalls" },
  async () => ({
    contents: [{
      uri: "docs://screen-generation",
      mimeType: "text/markdown",
      text: loadDoc("SCREEN-GENERATION.md")
    }]
  })
);

server.resource(
  "component-workflow",
  "docs://component-workflow",
  { description: "Workflow for design system extraction, component mapping, and instance creation" },
  async () => ({
    contents: [{
      uri: "docs://component-workflow",
      mimeType: "text/markdown",
      text: loadDoc("COMPONENT-INSTANCE-WORKFLOW.md")
    }]
  })
);

// Connect via stdio (VS Code will spawn this process)
const transport = new StdioServerTransport();
await server.connect(transport);
