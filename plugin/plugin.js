// Show UI (hidden) so we can use Web APIs (WebSocket in ui.html)
figma.showUI(__html__, { visible: true, width: 200, height: 40 });
figma.skipInvisibleInstanceChildren = true;

// ---------- Bridge ----------
figma.ui.onmessage = async (msg) => {
  const { id, action, args } = msg || {};
  try {
    const result = await handleAction(action, args || {});
    reply(id, Object.assign({ ok: true }, result || {}));
  } catch (e) {
    reply(id, { ok: false }, e instanceof Error ? e.message : String(e));
  }
};
function reply(replyTo, result, error) {
  figma.ui.postMessage({ replyTo, result, error });
}
const page = () => figma.currentPage;

// ---------- Utilities ----------
function hexToRGB(hex) {
  const v = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(v)) throw new Error("Invalid hex color");
  return { r: parseInt(v.slice(0,2),16)/255, g: parseInt(v.slice(2,4),16)/255, b: parseInt(v.slice(4,6),16)/255 };
}
function getNode(id) {
  const n = figma.getNodeById(id);
  if (!n) throw new Error("Node not found: " + id);
  return n;
}
function getParent(parentId) {
  if (!parentId) return page();
  const p = getNode(parentId);
  if (!("appendChild" in p)) throw new Error("Node " + parentId + " cannot have children");
  return p;
}
async function resolveComponent(componentId, componentKey) {
  if (componentKey) {
    try {
      return await figma.importComponentByKeyAsync(componentKey);
    } catch (e) {
      try {
        return await figma.importComponentSetByKeyAsync(componentKey);
      } catch (e2) {
        throw new Error("Failed to import component by key: " + componentKey);
      }
    }
  }
  return getNode(componentId);
}
function assertFills(n) {
  if (!("fills" in n)) throw new Error("Node does not support fills");
}
function base64ToUint8Array(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---------- Actions dispatcher ----------
async function handleAction(action, input) {
  switch (action) {
    // Create
    case "create_frame": return createFrame(input);
    case "create_rectangle": return createRectangle(input);
    case "create_ellipse": return createEllipse(input);
    case "create_line": return createLine(input);
    case "create_polygon": return createPolygon(input);
    case "create_star": return createStar(input);
    case "add_text": return addText(input);
    case "place_image_base64": return placeImageBase64(input);

    // Selection / find / pages
    case "list_pages": return listPages();
    case "find_nodes": return findNodes(input);
    case "select_nodes": return selectNodes(input);
    case "get_selection": return getSelection();
    case "create_page": return createPage(input);
    case "set_current_page": return setCurrentPage(input);

    // Node management
    case "rename_node": return renameNode(input);
    case "delete_node": return deleteNode(input);
    case "duplicate_node": return duplicateNode(input);
    case "resize_node": return resizeNode(input);
    case "rotate_node": return rotateNode(input);
    case "set_position": return setPosition(input);
    case "group_nodes": return groupNodes(input);
    case "append_child": return appendChild(input);
    case "insert_child": return insertChild(input);
    case "ungroup": return ungroup(input);

    // Styling
    case "set_fill": return setFill(input);
    case "set_stroke": return setStroke(input);
    case "set_corner_radius": return setCornerRadius(input);
    case "set_opacity": return setOpacity(input);
    case "set_blend_mode": return setBlendMode(input);
    case "add_effect": return addEffect(input);
    case "clear_effects": return clearEffects(input);
    case "layout_grid_add": return layoutGridAdd(input);
    case "layout_grid_clear": return layoutGridClear(input);

    // Auto Layout & Constraints
    case "set_auto_layout": return setAutoLayout(input);
    case "set_constraints": return setConstraints(input);

    // Text
    case "set_text_content": return setTextContent(input);
    case "set_text_style": return setTextStyle(input);
    case "set_text_color": return setTextColor(input);

    // Components / booleans
    case "create_component": return createComponent(input);
    case "create_instance": return await createInstance(input);
    case "list_variants": return await listVariants(input);
    case "detach_instance": return detachInstance(input);
    case "boolean_op": return booleanOp(input);
    case "swap_component": return await swapComponent(input);
    case "get_instance_properties": return getInstanceProperties(input);
    case "set_instance_properties": return await setInstanceProperties(input);

    // Prototype interactions
    case "set_reactions": return await setReactions(input);

    // Design system extraction
    case "get_local_styles": return getLocalStyles(input);
    case "get_local_variables": return getLocalVariables(input);

    // Text search / page clear
    case "find_text_nodes": return findTextNodes();
    case "clear_page": return clearPage();

    // Info
    case "get_file_key": return getFileKey();
    case "get_node_info": return getNodeInfo(input);

    // Export / data / generic
    case "export_node": return exportNode(input);
    case "set_plugin_data": return setPluginData(input);
    case "get_plugin_data": return getPluginData(input);
    case "set_properties": return setProperties(input);

    default:
      throw new Error("Unknown action: " + action);
  }
}

// ---------- Create ----------
function createFrame({ name = "Frame", width = 800, height = 600, x = 0, y = 0, parentId }) {
  const f = figma.createFrame();
  f.name = name; f.resize(width, height); f.x = x; f.y = y;
  getParent(parentId).appendChild(f);
  return { nodeId: f.id, type: f.type, name: f.name, width, height };
}
function createRectangle({ width, height, x = 0, y = 0, cornerRadius, hex, parentId }) {
  const r = figma.createRectangle(); r.resize(width, height);
  if (typeof cornerRadius === "number") r.cornerRadius = cornerRadius;
  if (hex) r.fills = [{ type: "SOLID", color: hexToRGB(hex) }];
  r.x = x; r.y = y; getParent(parentId).appendChild(r);
  return { nodeId: r.id, type: r.type };
}
function createEllipse({ width, height, x = 0, y = 0, hex, parentId }) {
  const e = figma.createEllipse(); e.resize(width, height);
  if (hex) e.fills = [{ type: "SOLID", color: hexToRGB(hex) }];
  e.x = x; e.y = y; getParent(parentId).appendChild(e);
  return { nodeId: e.id, type: e.type };
}
function createLine({ x = 0, y = 0, length, rotation = 0, strokeHex = "#111827", strokeWeight = 1, parentId }) {
  const l = figma.createLine();
  l.x = x; l.y = y; l.rotation = rotation;
  l.strokes = [{ type: "SOLID", color: hexToRGB(strokeHex) }];
  l.strokeWeight = strokeWeight;
  // Figma line length controlled via vector network — easiest: resize in x.
  l.resize(length, 0);
  getParent(parentId).appendChild(l);
  return { nodeId: l.id, type: l.type };
}
function createPolygon({ sides, width, height, x = 0, y = 0, hex, parentId }) {
  const p = figma.createPolygon(); p.pointCount = sides; p.resize(width, height);
  if (hex) p.fills = [{ type: "SOLID", color: hexToRGB(hex) }];
  p.x = x; p.y = y; getParent(parentId).appendChild(p);
  return { nodeId: p.id, type: p.type };
}
function createStar({ points, width, height, x = 0, y = 0, hex, parentId }) {
  const s = figma.createStar(); s.pointCount = points; s.resize(width, height);
  if (hex) s.fills = [{ type: "SOLID", color: hexToRGB(hex) }];
  s.x = x; s.y = y; getParent(parentId).appendChild(s);
  return { nodeId: s.id, type: s.type };
}
async function addText({ text, x = 0, y = 0, fontFamily = "Inter", fontStyle = "Regular", fontSize = 32, parentId }) {
  await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
  const t = figma.createText();
  t.characters = text; t.fontName = { family: fontFamily, style: fontStyle };
  if (fontSize) t.fontSize = fontSize;
  t.x = x; t.y = y; getParent(parentId).appendChild(t);
  return { nodeId: t.id, type: t.type, text: t.characters };
}
function placeImageBase64({ width, height, x = 0, y = 0, base64, parentId }) {
  const bytes = base64ToUint8Array(base64);
  const image = figma.createImage(bytes);
  const r = figma.createRectangle(); r.resize(width, height); r.x = x; r.y = y;
  r.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
  getParent(parentId).appendChild(r);
  return { nodeId: r.id, type: r.type };
}

// ---------- Selection / find / pages ----------
function listPages() {
  return figma.root.children.map(p => ({ id: p.id, name: p.name, isCurrent: p === figma.currentPage }));
}
function findNodes({ type, nameContains, within }) {
  let scope = within ? getNode(within) : page();
  if (!("findAll" in scope)) throw new Error("Invalid 'within' scope");
  // Use findAllWithCriteria for faster type-only searches
  let nodes;
  if (type && !nameContains && "findAllWithCriteria" in scope) {
    nodes = scope.findAllWithCriteria({ types: [type] });
  } else {
    nodes = scope.findAll(n => {
      const typeOk = type ? n.type === type : true;
      const nameOk = nameContains ? (("name" in n) && String(n.name).toLowerCase().includes(nameContains.toLowerCase())) : true;
      return typeOk && nameOk;
    });
  }
  return nodes.map(n => ({ id: n.id, type: n.type, name: "name" in n ? n.name : undefined }));
}
function selectNodes({ nodeIds }) {
  const nodes = nodeIds.map(getNode).filter(n => !!n);
  figma.currentPage.selection = nodes;
  return { selected: nodes.map(n => n.id) };
}
function getSelection() {
  return figma.currentPage.selection.map(n => ({ id: n.id, type: n.type, name: "name" in n ? n.name : undefined }));
}
function createPage({ name = "Page", makeCurrent = true }) {
  const p = figma.createPage(); p.name = name;
  if (makeCurrent) figma.currentPage = p;
  return { pageId: p.id, name: p.name };
}
function setCurrentPage({ pageId }) {
  const p = getNode(pageId);
  if (p.type !== "PAGE") throw new Error("Not a page");
  figma.currentPage = p;
  return { pageId: p.id };
}

// ---------- Node management ----------
function renameNode({ nodeId, name }) { const n = getNode(nodeId); if ("name" in n) n.name = name; return { nodeId }; }
function deleteNode({ nodeId }) { const n = getNode(nodeId); n.remove(); return { removed: nodeId }; }
function duplicateNode({ nodeId, x, y }) {
  const n = getNode(nodeId); const copy = n.clone();
  if (typeof x === "number") copy.x = x;
  if (typeof y === "number") copy.y = y;
  n.parent && n.parent.appendChild(copy);
  return { nodeId: copy.id };
}
function resizeNode({ nodeId, width, height }) { const n = getNode(nodeId); if (!("resize" in n)) throw new Error("Node cannot be resized"); n.resize(width, height); return { nodeId }; }
function rotateNode({ nodeId, rotation }) { const n = getNode(nodeId); if (!("rotation" in n)) throw new Error("No rotation on node"); n.rotation = rotation; return { nodeId }; }
function setPosition({ nodeId, x, y }) { const n = getNode(nodeId); if (!("x" in n && "y" in n)) throw new Error("Node not positionable"); n.x = x; n.y = y; return { nodeId }; }
function groupNodes({ nodeIds, name = "Group" }) {
  const nodes = nodeIds.map(getNode).filter(n => !!n && "visible" in n);
  if (nodes.length < 2) throw new Error("Need 2+ nodes");
  const parent = nodes[0].parent || page();
  const g = figma.group(nodes, parent); g.name = name; return { nodeId: g.id, type: g.type };
}
function appendChild({ nodeId, parentId }) {
  const node = getNode(nodeId);
  const parent = getNode(parentId);
  if (!("appendChild" in parent)) throw new Error("Target node cannot have children");
  parent.appendChild(node);
  return { nodeId: node.id, parentId: parent.id };
}
function insertChild({ nodeId, parentId, index }) {
  const node = getNode(nodeId);
  const parent = getNode(parentId);
  if (!("insertChild" in parent)) throw new Error("Target node cannot have children");
  const i = Math.max(0, Math.min(index, parent.children.length));
  parent.insertChild(i, node);
  return { nodeId: node.id, parentId: parent.id, index: i };
}
function findTextNodes() {
  const texts = page().findAllWithCriteria({ types: ["TEXT"] });
  return texts.map(t => ({ nodeId: t.id, name: t.name, text: t.characters }));
}
function clearPage() {
  const children = [...page().children];
  for (const c of children) c.remove();
  return { cleared: children.length };
}
function ungroup({ groupId }) {
  const g = getNode(groupId);
  if (g.type !== "GROUP") throw new Error("Not a group");
  const parent = g.parent || page();
  const children = [];
  for (let i = 0; i < g.children.length; i++) children.push(g.children[i]);
  for (const c of children) parent.appendChild(c);
  g.remove();
  return { released: children.map(c => c.id) };
}

// ---------- Styling ----------
function setFill({ nodeId, hex, opacity }) {
  const n = getNode(nodeId); assertFills(n);
  const fill = { type: "SOLID", color: hexToRGB(hex) };
  if (typeof opacity === "number") fill.opacity = Math.max(0, Math.min(1, opacity));
  n.fills = [fill];
  return { nodeId };
}
function setStroke({ nodeId, hex, opacity, strokeWeight, strokeAlign, dashPattern, cap, join }) {
  const n = getNode(nodeId);
  if (!("strokes" in n)) throw new Error("Node does not support strokes");
  const s = { type: "SOLID", color: hexToRGB(hex) };
  if (typeof opacity === "number") s.opacity = Math.max(0, Math.min(1, opacity));
  n.strokes = [s];
  if (strokeWeight != null) n.strokeWeight = strokeWeight;
  if (strokeAlign) n.strokeAlign = strokeAlign;
  if (dashPattern) n.dashPattern = dashPattern;
  if (cap) n.strokeCap = cap;
  if (join) n.strokeJoin = join;
  return { nodeId };
}
function setCornerRadius({ nodeId, radius, topLeft, topRight, bottomRight, bottomLeft }) {
  const n = getNode(nodeId);
  if ("cornerRadius" in n && typeof radius === "number") n.cornerRadius = radius;
  if ("topLeftRadius" in n) {
    if (typeof topLeft === "number") n.topLeftRadius = topLeft;
    if (typeof topRight === "number") n.topRightRadius = topRight;
    if (typeof bottomRight === "number") n.bottomRightRadius = bottomRight;
    if (typeof bottomLeft === "number") n.bottomLeftRadius = bottomLeft;
  }
  return { nodeId };
}
function setOpacity({ nodeId, opacity }) { const n = getNode(nodeId); if (!("opacity" in n)) throw new Error("No opacity on node"); n.opacity = Math.max(0, Math.min(1, opacity)); return { nodeId }; }
function setBlendMode({ nodeId, mode }) { const n = getNode(nodeId); if (!("blendMode" in n)) throw new Error("No blend mode"); n.blendMode = mode; return { nodeId }; }
function addEffect({ nodeId, type, radius = 8, spread = 0, hex = "#000000", opacity = 0.25, offsetX = 0, offsetY = 2 }) {
  const n = getNode(nodeId);
  if (!("effects" in n)) throw new Error("Node does not support effects");
  const newEff = (() => {
    if (type === "LAYER_BLUR" || type === "BACKGROUND_BLUR") return { type, radius };
    const rgb = hexToRGB(hex);
    const color = { r: rgb.r, g: rgb.g, b: rgb.b, a: opacity };
    return { type, radius, spread, color, offset: { x: offsetX, y: offsetY } };
  })();
  const currentEffects = [];
  for (let i = 0; i < n.effects.length; i++) currentEffects.push(n.effects[i]);
  currentEffects.push(newEff);
  n.effects = currentEffects;
  return { nodeId, effects: n.effects.length };
}
function clearEffects({ nodeId }) { const n = getNode(nodeId); if (!("effects" in n)) throw new Error("Node does not support effects"); n.effects = []; return { nodeId }; }
function layoutGridAdd({ nodeId, pattern = "COLUMNS", count = 12, gutterSize = 20, sectionSize = 80, hex = "#E5E7EB", opacity = 0.5 }) {
  const n = getNode(nodeId);
  if (!("layoutGrids" in n)) throw new Error("Node does not support layoutGrids");
  const rgb = hexToRGB(hex);
  const g = { pattern, count, gutterSize, sectionSize, color: { r: rgb.r, g: rgb.g, b: rgb.b, a: opacity } };
  const currentGrids = [];
  for (let i = 0; i < n.layoutGrids.length; i++) currentGrids.push(n.layoutGrids[i]);
  currentGrids.push(g);
  n.layoutGrids = currentGrids;
  return { nodeId, grids: n.layoutGrids.length };
}
function layoutGridClear({ nodeId }) { const n = getNode(nodeId); if (!("layoutGrids" in n)) throw new Error("Node does not support layoutGrids"); n.layoutGrids = []; return { nodeId }; }

// ---------- Auto Layout & Constraints ----------
function setAutoLayout(input) {
  const nodeId = input.nodeId;
  const props = Object.assign({}, input);
  delete props.nodeId;
  const f = getNode(nodeId);
  if (f.type !== "FRAME") throw new Error("Auto Layout only on frames");
  const map = {
    layoutMode: "layoutMode",
    primaryAxisSizingMode: "primaryAxisSizingMode",
    counterAxisSizingMode: "counterAxisSizingMode",
    itemSpacing: "itemSpacing",
    paddingTop: "paddingTop",
    paddingRight: "paddingRight",
    paddingBottom: "paddingBottom",
    paddingLeft: "paddingLeft",
    primaryAxisAlignItems: "primaryAxisAlignItems",
    counterAxisAlignItems: "counterAxisAlignItems",
    layoutWrap: "layoutWrap",
    counterAxisSpacing: "counterAxisSpacing",
    layoutPositioning: "layoutPositioning"
  };
  for (const k in map) if (k in props) f[map[k]] = props[k];
  return { nodeId: f.id };
}
function setConstraints({ nodeId, horizontal, vertical }) {
  const n = getNode(nodeId);
  if (!("constraints" in n)) throw new Error("No constraints on node");
  n.constraints = {
    horizontal: horizontal || n.constraints.horizontal,
    vertical: vertical || n.constraints.vertical
  };
  return { nodeId };
}

// ---------- Text ----------
async function setTextContent({ nodeId, text }) {
  const t = getNode(nodeId);
  if (t.type !== "TEXT") throw new Error("Not a text node");
  const font = t.fontName;
  if (font && typeof font !== "symbol") await figma.loadFontAsync(font);
  t.characters = text;
  return { nodeId };
}
async function setTextStyle({ nodeId, fontFamily, fontStyle, fontSize, lineHeight, letterSpacing, textAlignHorizontal, textAutoResize }) {
  const t = getNode(nodeId);
  if (t.type !== "TEXT") throw new Error("Not a text node");
  const fam = fontFamily || (typeof t.fontName !== "symbol" ? t.fontName.family : "Inter");
  const sty = fontStyle || (typeof t.fontName !== "symbol" ? t.fontName.style : "Regular");
  await figma.loadFontAsync({ family: fam, style: sty });
  t.fontName = { family: fam, style: sty };
  if (fontSize != null) t.fontSize = fontSize;
  if (lineHeight != null) t.lineHeight = { unit: "PIXELS", value: lineHeight };
  if (letterSpacing != null) t.letterSpacing = { unit: "PIXELS", value: letterSpacing };
  if (textAlignHorizontal) t.textAlignHorizontal = textAlignHorizontal;
  if (textAutoResize) t.textAutoResize = textAutoResize;
  return { nodeId };
}
function setTextColor({ nodeId, hex, opacity }) {
  const t = getNode(nodeId);
  if (t.type !== "TEXT") throw new Error("Not a text node");
  const fill = { type: "SOLID", color: hexToRGB(hex) };
  if (typeof opacity === "number") fill.opacity = Math.max(0, Math.min(1, opacity));
  t.fills = [fill];
  return { nodeId };
}

// ---------- Components & Boolean ----------
function createComponent({ name = "Component", fromNodeIds, parentId }) {
  const c = figma.createComponent(); c.name = name;
  getParent(parentId).appendChild(c);
  if (Array.isArray(fromNodeIds) && fromNodeIds.length) {
    const nodes = fromNodeIds.map(getNode);
    for (const n of nodes) c.appendChild(n);
  }
  return { nodeId: c.id, type: c.type };
}
async function createInstance({ componentId, componentKey, variantProperties, x = 0, y = 0, parentId }) {
  const node = await resolveComponent(componentId, componentKey);
  let component;

  if (node.type === "COMPONENT_SET") {
    if (variantProperties && Object.keys(variantProperties).length > 0) {
      // Find matching variant by checking component properties
      const match = node.children.find(child => {
        if (child.type !== "COMPONENT") return false;
        for (const [key, val] of Object.entries(variantProperties)) {
          // Variant names in Figma are comma-separated "Key=Value, Key=Value"
          const pattern = key + "=" + val;
          if (!child.name.includes(pattern)) return false;
        }
        return true;
      });
      if (!match) {
        // List available variants for debugging
        const available = node.children
          .filter(c => c.type === "COMPONENT")
          .slice(0, 10)
          .map(c => c.name);
        throw new Error("No matching variant found. Available (first 10): " + JSON.stringify(available));
      }
      component = match;
    } else {
      component = node.defaultVariant;
    }
  } else if (node.type === "COMPONENT") {
    component = node;
  } else {
    throw new Error("Node is not a COMPONENT or COMPONENT_SET (got " + node.type + ")");
  }

  const inst = component.createInstance();
  inst.x = x;
  inst.y = y;
  getParent(parentId).appendChild(inst);
  return { nodeId: inst.id, type: inst.type, componentName: component.name, componentKey: component.key };
}
async function listVariants({ componentSetId, componentSetKey, limit = 50 }) {
  const node = await resolveComponent(componentSetId, componentSetKey);
  if (node.type !== "COMPONENT_SET") throw new Error("Not a COMPONENT_SET (got " + node.type + ")");
  // Extract variant group properties (axes and their possible values)
  const axes = node.variantGroupProperties || {};
  const variantAxes = {};
  for (const [key, prop] of Object.entries(axes)) {
    variantAxes[key] = prop.values;
  }
  // List individual variants (capped by limit)
  const variants = node.children
    .filter(c => c.type === "COMPONENT")
    .slice(0, limit)
    .map(c => ({ id: c.id, name: c.name, key: c.key }));
  return { key: node.key, axes: variantAxes, variants, total: node.children.filter(c => c.type === "COMPONENT").length };
}
function detachInstance({ nodeId }) {
  const n = getNode(nodeId);
  if ("detachInstance" in n) {
    const d = n.detachInstance();
    return { nodeId: d.id, type: d.type };
  }
  throw new Error("Node is not an instance");
}
function getFileKey() {
  const key = figma.fileKey || null;
  const fileName = figma.root ? figma.root.name : null;
  return { fileKey: key, fileName: fileName };
}
function getNodeInfo({ nodeId }) {
  const n = getNode(nodeId);
  const info = { nodeId: n.id, type: n.type, name: n.name, visible: n.visible, opacity: n.opacity, width: n.width, height: n.height };
  if (n.type === "INSTANCE" && n.mainComponent) {
    info.mainComponentId = n.mainComponent.id;
    info.mainComponentName = n.mainComponent.name;
    info.mainComponentKey = n.mainComponent.key;
    info.remote = n.mainComponent.remote;
  }
  return info;
}

async function swapComponent({ nodeId, componentId, componentKey }) {
  const instance = getNode(nodeId);
  if (instance.type !== "INSTANCE") {
    throw new Error("Node is not an INSTANCE (got " + instance.type + ")");
  }
  const target = await resolveComponent(componentId, componentKey);
  if (target.type === "COMPONENT") {
    instance.swapComponent(target);
  } else if (target.type === "COMPONENT_SET") {
    const def = target.defaultVariant;
    instance.swapComponent(def);
  } else {
    throw new Error("Target is not a COMPONENT or COMPONENT_SET (got " + target.type + ")");
  }
  return { nodeId: instance.id, swappedTo: instance.mainComponent ? instance.mainComponent.name : "unknown" };
}

function getInstanceProperties({ nodeId }) {
  const n = getNode(nodeId);
  if (n.type !== "INSTANCE") throw new Error("Not an INSTANCE (got " + n.type + ")");
  const props = n.componentProperties;
  const result = {};
  for (const [key, prop] of Object.entries(props)) {
    result[key] = { type: prop.type, value: prop.value };
    if (prop.preferredValues) result[key].preferredValues = prop.preferredValues;
  }
  return result;
}
async function setInstanceProperties({ nodeId, properties }) {
  const n = getNode(nodeId);
  if (n.type !== "INSTANCE") throw new Error("Not an INSTANCE (got " + n.type + ")");
  n.setProperties(properties);
  return { nodeId, set: Object.keys(properties) };
}

function booleanOp({ op, nodeIds, name = "Boolean" }) {
  const nodes = nodeIds.map(getNode);
  const parent = nodes[0].parent || page();
  let res;
  switch (op) {
    case "UNION": res = figma.union(nodes, parent); break;
    case "SUBTRACT": res = figma.subtract(nodes, parent); break;
    case "INTERSECT": res = figma.intersect(nodes, parent); break;
    case "EXCLUDE": res = figma.exclude(nodes, parent); break;
  }
  res.name = name;
  return { nodeId: res.id, type: res.type };
}

// ---------- Design system extraction ----------
function getLocalStyles({ type, nameContains }) {
  const matchName = (name) => !nameContains || name.toLowerCase().includes(nameContains.toLowerCase());
  const result = {};
  if (!type || type === "paint" || type === "color") {
    const paintStyles = figma.getLocalPaintStyles().filter(s => matchName(s.name));
    result.colors = paintStyles.map(s => {
      const fill = s.paints[0];
      let hex = null;
      if (fill && fill.type === "SOLID") {
        const r = Math.round(fill.color.r * 255).toString(16).padStart(2, "0");
        const g = Math.round(fill.color.g * 255).toString(16).padStart(2, "0");
        const b = Math.round(fill.color.b * 255).toString(16).padStart(2, "0");
        hex = "#" + r + g + b;
      }
      return { name: s.name, hex, opacity: fill ? fill.opacity : 1 };
    });
  }
  if (!type || type === "text") {
    const textStyles = figma.getLocalTextStyles();
    result.typography = textStyles.map(s => ({
      name: s.name,
      fontFamily: s.fontName.family,
      fontStyle: s.fontName.style,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
    }));
  }
  if (!type || type === "effect") {
    const effectStyles = figma.getLocalEffectStyles();
    result.effects = effectStyles.map(s => ({
      name: s.name,
      effects: s.effects.map(e => ({ type: e.type, radius: e.radius, spread: e.spread })),
    }));
  }
  return result;
}

async function getLocalVariables({ collectionName }) {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const result = [];
  for (const col of collections) {
    if (collectionName && !col.name.toLowerCase().includes(collectionName.toLowerCase())) continue;
    const vars = [];
    for (const varId of col.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(varId);
      if (!v) continue;
      const values = {};
      for (const modeId of Object.keys(v.valuesByMode)) {
        const mode = col.modes.find(m => m.modeId === modeId);
        const modeName = mode ? mode.name : modeId;
        const val = v.valuesByMode[modeId];
        if (val && typeof val === "object" && "r" in val) {
          const r = Math.round(val.r * 255).toString(16).padStart(2, "0");
          const g = Math.round(val.g * 255).toString(16).padStart(2, "0");
          const b = Math.round(val.b * 255).toString(16).padStart(2, "0");
          values[modeName] = "#" + r + g + b;
        } else {
          values[modeName] = val;
        }
      }
      vars.push({ name: v.name, type: v.resolvedType, values });
    }
    result.push({ collection: col.name, variables: vars });
  }
  return result;
}

// ---------- Export / plugin data / generic ----------
async function exportNode({ nodeId, format = "PNG", scale = 1 }) {
  const n = getNode(nodeId);
  if (!("exportAsync" in n)) throw new Error("Node type " + n.type + " does not support exportAsync");
  const bytes = await n.exportAsync({ format: format, constraint: { type: "SCALE", value: scale } });
  // encode base64 without btoa (not available in all plugin sandboxes)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = i + 1 < bytes.length ? bytes[i + 1] : 0, b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b0 >> 2] + chars[((b0 & 3) << 4) | (b1 >> 4)] +
      (i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : "=") +
      (i + 2 < bytes.length ? chars[b2 & 63] : "=");
  }
  return { format, base64: result };
}
function setPluginData({ nodeId, key, value }) {
  const n = getNode(nodeId);
  n.setPluginData(key, JSON.stringify(value));
  return { nodeId };
}
function getPluginData({ nodeId, key }) {
  const n = getNode(nodeId);
  const raw = n.getPluginData(key);
  try { 
    return { value: JSON.parse(raw) }; 
  } catch (e) { 
    return { value: raw }; 
  }
}
async function setReactions({ nodeId, reactions }) {
  const n = getNode(nodeId);
  if (!("setReactionsAsync" in n)) {
    throw new Error("Node type " + n.type + " does not support setReactionsAsync");
  }
  await n.setReactionsAsync(reactions);
  return { nodeId, reactionsSet: reactions.length };
}

function setProperties({ nodeId, props }) {
  const n = getNode(nodeId);
  // Whitelisted scalar props (expand as needed)
  const allowed = [
    "x","y","rotation","opacity","visible","locked",
    "layoutAlign","layoutGrow","layoutSizingHorizontal","layoutSizingVertical",
    "fills","strokes","strokeWeight","strokeAlign","dashPattern","blendMode",
    "itemSpacing","paddingTop","paddingRight","paddingBottom","paddingLeft",
    "primaryAxisAlignItems","counterAxisAlignItems","layoutMode",
    "primaryAxisSizingMode","counterAxisSizingMode","layoutWrap","counterAxisSpacing",
    "clipsContent","overflowDirection",
    "textAlignHorizontal","textAlignVertical"
  ];
  for (const k of Object.keys(props || {})) {
    if (allowed.includes(k)) {
      try { n[k] = props[k]; } catch (_) {}
    }
  }
  return { nodeId };
}
