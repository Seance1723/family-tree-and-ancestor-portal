import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(process.argv[2] || __dirname);
const OUTPUT_DIR = path.join(ROOT, ".graphify", "output");

const IGNORE = [
  ".git", ".node_modules", "node_modules", "dist", "build", ".graphify",
  "coverage", ".vscode", ".idea", "package-lock.json", "yarn.lock"
];

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".html", ".css"
]);

function shouldIgnore(p) {
  const base = path.basename(p);
  return IGNORE.some((seg) => p.includes(path.sep + seg + path.sep) || p.endsWith(path.sep + seg) || base === seg);
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (shouldIgnore(full)) continue;
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SOURCE_EXTENSIONS.has(ext)) yield full;
    }
  }
}

function relativePath(full) {
  return path.relative(ROOT, full).replace(/\\/g, "/");
}

function stripExtension(rel) {
  return rel.replace(/\.[^.]+$/, "");
}

function normalizeImportSource(source, currentDir) {
  if (!source || source.startsWith("/") || /^[a-zA-Z]+:/.test(source)) return null;
  if (source.startsWith(".")) {
    const resolved = path.resolve(currentDir, source);
    const rel = relativePath(resolved);
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        const index = path.join(resolved, "index.js");
        if (fs.existsSync(index)) return relativePath(index);
      }
      return rel;
    }
    for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt)) return relativePath(withExt);
    }
    return rel;
  }
  return `npm:${source}`;
}

function extractSymbols(text, filePath) {
  const symbols = [];
  const rel = relativePath(filePath);

  // export function name(...)
  let m;
  const exportFnRe = /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g;
  while ((m = exportFnRe.exec(text))) symbols.push({ type: "function", name: m[1], exported: true });

  // export const name = (...) =>
  const exportConstFnRe = /export\s+(?:const|let|var)\s+(\w+)\s*[:=][^;\n]*(?:=>|\bfunction\b)/g;
  while ((m = exportConstFnRe.exec(text))) symbols.push({ type: "function", name: m[1], exported: true });

  // const Component = (...) => or function Component(...)
  const componentRe = /(?:const|let|var|function)\s+([A-Z][A-Za-z0-9_]*)\s*(?:[=(]|\([^)]*\)\s*=>)/g;
  while ((m = componentRe.exec(text))) symbols.push({ type: "component", name: m[1] });

  // interface Name
  const interfaceRe = /interface\s+(\w+)/g;
  while ((m = interfaceRe.exec(text))) symbols.push({ type: "interface", name: m[1] });

  // type Name =
  const typeRe = /type\s+(\w+)\s*=/g;
  while ((m = typeRe.exec(text))) symbols.push({ type: "type", name: m[1] });

  // class Name
  const classRe = /class\s+(\w+)/g;
  while ((m = classRe.exec(text))) symbols.push({ type: "class", name: m[1] });

  return symbols;
}

function extractImports(text, filePath) {
  const imports = [];
  const currentDir = path.dirname(filePath);

  const esmRe = /import\s+(?:(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]|['"]([^'"]+)['"])/g;
  let m;
  while ((m = esmRe.exec(text))) {
    const source = m[1] || m[2];
    const target = normalizeImportSource(source, currentDir);
    if (target) imports.push({ source, target, kind: "import" });
  }

  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = requireRe.exec(text))) {
    const target = normalizeImportSource(m[1], currentDir);
    if (target) imports.push({ source: m[1], target, kind: "require" });
  }

  return imports;
}

function extractReferences(text, symbols) {
  const refs = [];
  for (const sym of symbols) {
    if (sym.type === "component") {
      const re = new RegExp(`<${sym.name}\\b`, "g");
      while (re.exec(text)) refs.push({ targetSymbol: sym.name, kind: "usage" });
    } else {
      const re = new RegExp(`\\b${sym.name}\\b`, "g");
      let count = 0;
      while (re.exec(text)) count++;
      if (count > 1) refs.push({ targetSymbol: sym.name, kind: "call", weight: count - 1 });
    }
  }
  return refs;
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\r\n]/g, " "))
    .replace(/\/\/.*/g, (m) => " ".repeat(m.length));
}

function buildGraph() {
  const nodes = new Map();
  const edges = [];
  const fileSymbols = new Map();

  for (const filePath of walk(ROOT)) {
    const rel = relativePath(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(rel);
    const text = fs.readFileSync(filePath, "utf-8");
    const cleanText = stripComments(text);

    const fileNode = { id: rel, type: "file", label: path.basename(rel), group: dir.split("/")[0] || "root", size: text.length };
    nodes.set(rel, fileNode);

    const symbols = extractSymbols(cleanText, filePath);
    fileSymbols.set(rel, symbols);
    for (const sym of symbols) {
      const nodeId = `${rel}::${sym.name}`;
      nodes.set(nodeId, {
        id: nodeId,
        type: sym.type,
        label: sym.name,
        group: fileNode.group,
        file: rel,
        exported: sym.exported || false,
      });
      edges.push({ source: rel, target: nodeId, kind: "contains", weight: 1 });
    }

    const imports = extractImports(cleanText, filePath);
    for (const imp of imports) {
      if (!nodes.has(imp.target)) {
        if (imp.target.startsWith("npm:")) {
          const pkgName = imp.target.slice(4);
          nodes.set(imp.target, {
            id: imp.target,
            type: "package",
            label: pkgName,
            group: "package",
            exported: false,
          });
        } else {
          nodes.set(imp.target, {
            id: imp.target,
            type: "external-file",
            label: path.basename(imp.target),
            group: "external",
            exported: false,
          });
        }
      }
      edges.push({ source: rel, target: imp.target, kind: imp.kind, weight: 1 });
    }
  }

  // Second pass: symbol references between in-project symbols
  for (const [rel, symbols] of fileSymbols) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf-8");
    const cleanText = stripComments(text);
    for (const sym of symbols) {
      const srcId = `${rel}::${sym.name}`;
      for (const [otherRel, otherSymbols] of fileSymbols) {
        if (otherRel === rel) continue;
        const refs = extractReferences(cleanText, otherSymbols);
        for (const ref of refs) {
          const tgtId = `${otherRel}::${ref.targetSymbol}`;
          if (nodes.has(tgtId)) {
            edges.push({ source: srcId, target: tgtId, kind: ref.kind, weight: ref.weight || 1 });
          }
        }
      }
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}

function labelPropagation(nodes, edges, iterations = 30) {
  const labels = new Map(nodes.map((n, i) => [n.id, i]));
  const adj = new Map(nodes.map((n) => [n.id, new Map()]));
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Map());
    if (!adj.has(e.target)) adj.set(e.target, new Map());
    adj.get(e.source).set(e.target, (adj.get(e.source).get(e.target) || 0) + e.weight);
    adj.get(e.target).set(e.source, (adj.get(e.target).get(e.source) || 0) + e.weight);
  }

  const nodeIds = nodes.map((n) => n.id);
  for (let i = 0; i < iterations; i++) {
    nodeIds.sort(() => Math.random() - 0.5);
    for (const id of nodeIds) {
      const neighbors = adj.get(id);
      if (!neighbors || neighbors.size === 0) continue;
      const counts = new Map();
      for (const [neighbor, weight] of neighbors) {
        const label = labels.get(neighbor);
        counts.set(label, (counts.get(label) || 0) + weight);
      }
      let bestLabel = labels.get(id);
      let bestScore = -1;
      for (const [label, score] of counts) {
        if (score > bestScore || (score === bestScore && Math.random() > 0.5)) {
          bestScore = score;
          bestLabel = label;
        }
      }
      labels.set(id, bestLabel);
    }
  }

  const communities = new Map();
  for (const [id, label] of labels) {
    if (!communities.has(label)) communities.set(label, []);
    communities.get(label).push(id);
  }

  const communityIndex = new Map();
  let idx = 0;
  for (const [label, members] of communities) {
    const sorted = [...members].sort();
    communityIndex.set(label, { id: idx, members: sorted, name: `Community ${idx + 1}` });
    idx++;
  }

  return { labels, communities: communityIndex };
}

function computeStats(nodes, edges, communities) {
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) || 0) + e.weight);
    degree.set(e.target, (degree.get(e.target) || 0) + e.weight);
  }

  const sorted = [...degree.entries()].sort((a, b) => b[1] - a[1]);
  const topNodes = sorted.slice(0, 10).map(([id, d]) => ({ id, degree: d, node: nodes.find((n) => n.id === id) }));

  const fileNodes = nodes.filter((n) => n.type === "file");
  const symbolNodes = nodes.filter((n) => n.type !== "file" && n.type !== "package" && n.type !== "external-file");
  const packageNodes = nodes.filter((n) => n.type === "package");
  const externalFileNodes = nodes.filter((n) => n.type === "external-file");
  const isolated = nodes.filter((n) => (degree.get(n.id) || 0) === 0);

  const communityStats = [];
  for (const [_, c] of communities) {
    const members = c.members.map((id) => nodes.find((n) => n.id === id)).filter(Boolean);
    const files = members.filter((n) => n.type === "file");
    const dominant = dominantGroup(members);
    communityStats.push({
      id: c.id,
      name: dominant ? `${dominant} cluster` : c.name,
      size: c.members.length,
      files: files.map((n) => n.id),
      symbols: members.filter((n) => n.type !== "file" && n.type !== "package" && n.type !== "external-file").map((n) => n.id),
    });
  }

  return { topNodes, fileCount: fileNodes.length, symbolCount: symbolNodes.length, packageCount: packageNodes.length, externalFileCount: externalFileNodes.length, isolatedCount: isolated.length, isolated: isolated.map((n) => n.id), communities: communityStats };
}

function dominantGroup(members) {
  const counts = new Map();
  for (const m of members) {
    const g = m.group || "root";
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [g, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      best = g;
    }
  }
  return best;
}

function generateHtml(nodes, edges, labels, communities) {
  const palette = [
    "#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#a78bfa",
    "#f87171", "#22d3ee", "#fb923c", "#c084fc", "#86efac"
  ];

  const communityColor = new Map();
  for (const [label, c] of communities) {
    communityColor.set(label, palette[c.id % palette.length]);
  }

  const nodeData = nodes.map((n) => {
    const label = labels.get(n.id);
    return { ...n, community: label, color: communityColor.get(label) || "#94a3b8" };
  });

  const edgeData = edges.map((e) => ({ ...e, value: e.weight }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Graphify Knowledge Graph</title>
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; }
    #header { padding: 1rem 1.5rem; background: #1e293b; border-bottom: 1px solid #334155; }
    #header h1 { margin: 0; font-size: 1.25rem; }
    #header p { margin: 0.25rem 0 0; color: #94a3b8; font-size: 0.875rem; }
    #container { display: flex; height: calc(100vh - 85px); }
    #graph { flex: 1; }
    #sidebar { width: 320px; background: #1e293b; border-left: 1px solid #334155; padding: 1rem; overflow-y: auto; }
    #sidebar h2 { margin: 0 0 0.75rem; font-size: 1rem; color: #cbd5e1; }
    .stat { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #334155; font-size: 0.875rem; }
    .community { margin: 0.5rem 0; padding: 0.5rem; border-radius: 0.5rem; background: #0f172a; font-size: 0.8rem; }
    .community strong { display: block; margin-bottom: 0.25rem; }
    .legend { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .legend span { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
  </style>
</head>
<body>
  <div id="header">
    <h1>Graphify Knowledge Graph</h1>
    <p>Interactive code architecture visualization with detected communities</p>
  </div>
  <div id="container">
    <div id="graph"></div>
    <div id="sidebar">
      <h2>Stats</h2>
      <div id="stats"></div>
      <h2 style="margin-top:1.25rem;">Communities</h2>
      <div id="communities"></div>
      <h2 style="margin-top:1.25rem;">Selected Node</h2>
      <div id="selection">Click a node to inspect details.</div>
    </div>
  </div>
  <script>
    const nodes = new vis.DataSet(${JSON.stringify(nodeData)});
    const edges = new vis.DataSet(${JSON.stringify(edgeData)});
    const container = document.getElementById('graph');
    const data = { nodes, edges };
    const options = {
      nodes: { shape: 'dot', font: { color: '#e2e8f0', size: 12 }, borderWidth: 1 },
      edges: { color: { color: '#475569', highlight: '#60a5fa' }, width: 0.5, smooth: { type: 'continuous' } },
      physics: { stabilization: false, barnesHut: { gravitationalConstant: -2000, springConstant: 0.04, springLength: 150 } },
      interaction: { hover: true, tooltipDelay: 200 }
    };
    const network = new vis.Network(container, data, options);

    const stats = ${JSON.stringify({
      nodeCount: nodeData.length,
      edgeCount: edgeData.length,
      communityCount: communities.size,
      fileCount: nodeData.filter(n => n.type === 'file').length,
      symbolCount: nodeData.filter(n => n.type !== 'file' && n.type !== 'package' && n.type !== 'external-file').length,
      packageCount: nodeData.filter(n => n.type === 'package').length,
      externalFiles: nodeData.filter(n => n.type === 'external-file').length
    })};
    document.getElementById('stats').innerHTML = Object.entries(stats).map(([k, v]) => \n      \`<div class="stat"><span>\${k.replace(/([A-Z])/g, ' \$1').replace(/^./, c => c.toUpperCase())}</span><span>\${v}</span></div>\`).join('');

    const communities = ${JSON.stringify(Array.from(communities.values()).map(c => ({ id: c.id, name: c.name, size: c.members.length, color: communityColor.get(c.members[0]) || '#94a3b8' })))};
    document.getElementById('communities').innerHTML = communities.map(c => \n      \`<div class="community"><strong style="color:\${c.color}">\${c.name}</strong>\${c.size} nodes</div>\`).join('');

    network.on('click', (params) => {
      const el = document.getElementById('selection');
      if (params.nodes.length === 0) { el.innerText = 'Click a node to inspect details.'; return; }
      const node = nodes.get(params.nodes[0]);
      el.innerHTML = \`<strong>\${node.label}</strong><br>ID: \${node.id}<br>Type: \${node.type}<br>Group: \${node.group || 'root'}<br>Community: \${node.community}\`;
    });
  </script>
</body>
</html>`;
}

function generateAuditReport(stats, nodes, edges) {
  const lines = [
    "# Graphify Audit Report",
    "",
    `Generated: ${new Date().toUTCString()}`,
    `Project root: ${ROOT}`,
    "",
    "## Summary",
    "",
    `- **Total files analyzed:** ${stats.fileCount}`,
    `- **Total symbols extracted:** ${stats.symbolCount}`,
    `- **Total external packages:** ${stats.packageCount || 0}`,
    `- **Total external files:** ${stats.externalFileCount || 0}`,
    `- **Total graph nodes:** ${nodes.length}`,
    `- **Total graph edges:** ${edges.length}`,
    `- **Communities detected:** ${stats.communities.length}`,
    `- **Isolated nodes:** ${stats.isolatedCount}`,
    "",
    "## Top Central Nodes",
    "",
    stats.topNodes.map((n, i) => `${i + 1}. \`${n.id}\` (degree: ${n.degree})`).join("\n"),
    "",
    "## Detected Communities",
    "",
    ...stats.communities.map((c) => {
      return `- **${c.name}** (${c.size} nodes)\n  - Files: ${c.files.slice(0, 5).join(", ")}${c.files.length > 5 ? " …" : ""}\n  - Symbols: ${c.symbols.slice(0, 5).join(", ")}${c.symbols.length > 5 ? " …" : ""}`;
    }),
    "",
  ];

  if (stats.isolatedCount > 0) {
    lines.push("## Isolated Nodes", "", ...stats.isolated.map((id) => `- \`${id}\``), "");
  }

  lines.push(
    "## Observations",
    "",
    "- The graph was built from file-level imports, exported symbols, and internal references.",
    "- Communities were detected using label propagation over weighted edges.",
    "- High-degree nodes usually represent shared utilities, core components, or main entry points.",
    "- Isolated nodes may indicate dead code, test stubs, or assets not yet wired into the application.",
    ""
  );

  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { nodes, edges } = buildGraph();
  const { labels, communities } = labelPropagation(nodes, edges);
  const enrichedNodes = nodes.map((n) => ({ ...n, community: labels.get(n.id) }));
  const stats = computeStats(nodes, edges, communities);

  const graphJson = {
    meta: { generated: new Date().toISOString(), root: ROOT },
    nodes: enrichedNodes,
    edges,
    communities: Array.from(communities.values()).map((c) => ({
      id: c.id,
      name: c.name,
      members: c.members,
    })),
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      fileCount: stats.fileCount,
      symbolCount: stats.symbolCount,
      communityCount: stats.communities.length,
      isolatedCount: stats.isolatedCount,
    },
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, "knowledge_graph.json"), JSON.stringify(graphJson, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, "knowledge_graph.html"), generateHtml(nodes, edges, labels, communities));
  fs.writeFileSync(path.join(OUTPUT_DIR, "audit_report.md"), generateAuditReport(stats, nodes, edges));

  console.log(`Graphify complete.`);
  console.log(`  Nodes: ${nodes.length}`);
  console.log(`  Edges: ${edges.length}`);
  console.log(`  Communities: ${stats.communities.length}`);
  console.log(`  Outputs: ${relativePath(OUTPUT_DIR)}`);
}

main();
