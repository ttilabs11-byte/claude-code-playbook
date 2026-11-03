// Shared by install.mjs and audit.mjs: the catalog, the settings template, and what each component consists of.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const SRC = join(ROOT, "claude");
export const START = "<!-- claude-code-setup:start -->", END = "<!-- claude-code-setup:end -->";
export const fwd = (p) => p.replace(/\\/g, "/");
export const catalog = JSON.parse(readFileSync(join(ROOT, "setup", "catalog.json"), "utf8"));
export const template = (home) => JSON.parse(readFileSync(join(SRC, "settings.template.json"), "utf8").replaceAll("{{CLAUDE_HOME}}", fwd(home)));
export const needleOf = (command) => String(command).match(/[\w-]+\.mjs|rtk hook/)?.[0];
export const hasCmd = (groups, needle) => (groups ?? []).some((g) => (g.hooks ?? []).some((h) => String(h.command).includes(needle)));

// the rules text as installed: the tracker rule is dropped unless a tracker file is given
export function rulesText(tracker, file) {
  const rules = readFileSync(file ?? join(SRC, "CLAUDE.md"), "utf8").replace(/\r\n/g, "\n");
  return tracker
    ? rules.replace("{{TRACKER_FILE}}", `\`${fwd(tracker)}\``)
    : rules.replace(/- Project tracker \(optional\)[\s\S]*?Append only; don't read or edit the rest\.\n/, "");
}

// the template's hook groups for a script, as [event, group] pairs
export const hookGroups = (tpl, needle) =>
  Object.entries(tpl.hooks).flatMap(([event, groups]) => groups.filter((g) => needleOf(g.hooks[0].command) === needle).map((g) => [event, g]));

export const extraGroup = (home, h) => [h.event, { ...(h.matcher ? { matcher: h.matcher } : {}), hooks: [{ type: "command", command: `node "${fwd(home)}/scripts/${h.command}"`, timeout: h.timeout ?? 10 }] }];

// ids -> one merged set of parts; throws on an unknown id
export function partsFor(ids) {
  const byId = new Map(catalog.components.map((c) => [c.id, c]));
  const unknown = ids.filter((i) => !byId.has(i));
  if (unknown.length) throw new Error(`unknown component: ${unknown.join(", ")}. Known: ${[...byId.keys()].filter((k) => !byId.get(k).external).join(", ")}`);
  const ext = ids.filter((i) => byId.get(i).external);
  if (ext.length) throw new Error(`third-party, not installed by this playbook: ${ext.map((i) => `${i} (${byId.get(i).external.install ?? `not recommended, see ${byId.get(i).external.url}`})`).join("; ")}`);
  const P = { rules: false, env: new Set(), keys: new Set(), permissions: new Set(), hooks: new Set(), extraHooks: [], scripts: new Set(), skills: new Set(), plugins: [] };
  for (const id of ids) {
    const p = byId.get(id).parts;
    if (p.rules) P.rules = true;
    for (const k of ["env", "keys", "permissions", "hooks", "scripts", "skills"]) for (const v of p[k] ?? []) P[k].add(v);
    P.extraHooks.push(...(p.extraHooks ?? []));
    if (p.plugin) P.plugins.push(p.plugin);
  }
  return P;
}

export const defaultIds = () => catalog.components.filter((c) => c.default).map((c) => c.id);
