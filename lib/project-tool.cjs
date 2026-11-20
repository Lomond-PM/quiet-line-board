'use strict';

// Projects bridge the unchanged drawing engines through short-lived snapshots.
// Only the SQLite project and ordinary result PNGs survive a successful call.
const fs = require('node:fs');
const path = require('node:path');
const { loadPaintState } = require('./paint-state.cjs');
const { loadDryState } = require('./dry-state.cjs');
const store = () => require('./project-store.cjs');
const own = (o, k) => Object.hasOwn(o, k);
const projectKeys = ['project', 'project_checkpoint', 'project_history_limit', 'project_max_mb'];
const parameters = {
  project: { type: 'string', description: 'Create/open one .qlproject engineering file containing editable wet oil OR dry materials, PNG history and checkpoints. Every call auto-saves; prefer this over many loose state files. Continue with the same project path. New wet projects require oil/oilknife; dry mode is inferred from operations, dry_media or dry_state import. Existing projects own all state inputs/outputs.' },
  project_checkpoint: { type: 'string', minLength: 1, maxLength: 120, description: 'Optional label (1–120 characters) that pins this saved project step against automatic history pruning.' },
  project_history_limit: { type: 'integer', minimum: 1, maximum: 500, description: 'Recent automatic steps retained, 1–500, plus up to 64 pinned checkpoints. Default 30 for a new project; absent on continuation inherits its limit.' },
  project_max_mb: { type: 'integer', minimum: 64, maximum: 8192, description: 'Project logical storage cap in MiB, 64–8192, default 2048 for a new project. Absent on continuation inherits its cap. SQLite overhead has a bounded allowance.' }
};
function integer(v, lo, hi, name) {
  if (!Number.isSafeInteger(v) || v < lo || v > hi) throw new Error(`${name} must be an integer between ${lo} and ${hi}`);
  return v;
}
function label(v) {
  if (typeof v !== 'string' || !v.trim() || v.length > 120 || v.includes('\0')) throw new Error('checkpoint label must contain 1–120 characters');
  return v;
}
function projectPath(v) {
  if (typeof v !== 'string' || !v.trim() || path.extname(v).toLowerCase() !== '.qlproject') throw new Error('project must be a .qlproject path');
  return v;
}
function checkWithoutProject(args) {
  for (const k of projectKeys.slice(1)) if (own(args, k)) throw new Error(`${k} requires project`);
  if (own(args, 'project')) projectPath(args.project);
}
function inside(root, candidate) {
  const r = path.relative(root, candidate);
  return r !== '' && r !== '..' && !r.startsWith(`..${path.sep}`) && !path.isAbsolute(r);
}
function exportPath(cwd, requested) {
  if (typeof requested !== 'string' || !requested.trim()) throw new Error('export requires a new target path');
  const root = fs.realpathSync(cwd), target = path.resolve(root, requested);
  if (process.platform === 'win32' && (target.slice(2).includes(':') || target.startsWith('\\\\?\\') || target.startsWith('\\\\.\\'))) throw new Error('unsafe export target path');
  if (!inside(root, target)) throw new Error('export target must be inside the working directory');
  const parent = fs.realpathSync(path.dirname(target));
  if (parent !== root && !inside(root, parent)) throw new Error('export target parent must be inside the working directory');
  return path.join(parent, path.basename(target));
}
async function temporary(cwd, fn) {
  const root = fs.realpathSync(cwd);
  const dir = fs.mkdtempSync(path.join(root, '.quiet-line-project-'));
  // Verify the exact owned directory before any recursive removal, never a caller path.
  const owned = fs.realpathSync(dir);
  if (owned !== dir || path.dirname(owned) !== root || !path.basename(owned).startsWith('.quiet-line-project-')) throw new Error('invalid project temporary directory');
  try { return await fn(owned); }
  finally {
    const stat = fs.lstatSync(owned);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(owned) !== owned) throw new Error('project temporary directory changed; refusing cleanup');
    fs.rmSync(owned, { recursive: true, force: true });
  }
}
function validateState(cwd, file, mode) {
  return mode === 'dry' ? loadDryState(cwd, file) : loadPaintState(cwd, file);
}
function stageError(stage, error) {
  const wrapped = new Error(`Quiet Line project ${stage}: ${error?.message || String(error)}`);
  if (error?.code) wrapped.code = error.code;
  return wrapped;
}
async function executeProject(args, exec, { ctx, execute }) {
  let stage = 'validation';
  try {
    projectPath(args.project);
    if (args.dry_media != null && typeof args.dry_media !== 'boolean') throw new Error('dry_media must be boolean');
    if (args.project_checkpoint !== undefined) label(args.project_checkpoint);
    if (args.project_history_limit !== undefined) integer(args.project_history_limit, 1, 500, 'project_history_limit');
    if (args.project_max_mb !== undefined) integer(args.project_max_mb, 64, 8192, 'project_max_mb');
    for (const k of ['save_state', 'save_dry_state']) if (own(args, k)) throw new Error(`${k} cannot be used with project; state auto-saves inside the project`);
    if (args.paint_state != null && args.dry_state != null) throw new Error('cannot import both paint_state and dry_state');
    const cwd = await ctx.workingDirectory.ensure(exec.agent, exec.signal);
    if (!cwd) throw new Error('the session working directory is unavailable');
    stage = 'read';
    let previous;
    try { previous = await store().readProject(cwd, args.project, { includeData: true }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    stage = 'validation';
    const dryRequested = args.dry_media === true || args.operations != null || args.dry_state != null;
    const mode = previous?.mode ?? (dryRequested ? 'dry' : 'wet');
    if (previous) {
      for (const k of ['base_image', 'paint_state', 'dry_state']) if (own(args, k)) throw new Error(`existing project owns state; omit ${k}`);
    }
    if (mode === 'wet' && dryRequested) throw new Error('wet project cannot accept dry operations');
    if (mode === 'dry' && (args.paint_state != null || args.dry_media === false)) throw new Error('dry project cannot accept wet state or dry_media:false');
    if (!previous && mode === 'wet' && args.paint_state == null && !['oil', 'oilknife'].includes(args.brush)) throw new Error('new wet project requires brush oil or oilknife');
    return await temporary(cwd, async dir => {
      const ext = mode === 'dry' ? '.qldry' : '.qlpaint';
      const next = { ...args };
      for (const k of projectKeys) delete next[k];
      if (previous) {
        const input = path.join(dir, `input${ext}`);
        fs.writeFileSync(input, previous.selected.state, { flag: 'wx' });
        next[mode === 'dry' ? 'dry_state' : 'paint_state'] = input;
      }
      const output = path.join(dir, `output${ext}`);
      next[mode === 'dry' ? 'save_dry_state' : 'save_state'] = output;
      if (mode === 'dry') next.dry_media = true;
      stage = 'drawing';
      const result = await execute(next, exec);
      stage = 'snapshot validation';
      const snapshot = validateState(cwd, output, mode);
      const m = snapshot.metadata;
      const info = { brush: m.brush ?? m.settings.brush, width: m.width, height: m.height, surface: m.surface, seed: m.seed, title: String(result.title).slice(0, 1000) };
      const state = fs.readFileSync(output), png = fs.readFileSync(result.absolutePath);
      if (exec.signal?.aborted) throw new Error('drawing cancelled before project commit');
      stage = 'commit';
      const committed = await store().commitProject(cwd, args.project, {
        mode, state, png, info, label: args.project_checkpoint,
        expectedRevision: previous ? previous.revision : null,
        historyLimit: args.project_history_limit ?? previous?.historyLimit ?? 30,
        maxBytes: args.project_max_mb === undefined ? (previous?.maxBytes ?? 2048 * 1024 * 1024) : args.project_max_mb * 1024 * 1024
      });
      for (const k of ['paintState', 'resumedState', 'dryState', 'resumedDryState']) delete result[k];
      return { ...result, project: committed.path, projectStep: committed.head, projectRevision: committed.revision, projectMode: mode };
    });
  } catch (error) { throw stageError(stage, error); }
}
const stepSchema = { type: 'integer', minimum: 1, description: 'Saved step ID; defaults to current head when optional.' };
const metadataProperties = {
  path: { type: 'string' }, mode: { type: 'string', enum: ['wet', 'dry'] }, head: { type: 'integer' }, revision: { type: 'integer' },
  historyLimit: { type: 'integer' }, maxBytes: { type: 'integer' },
  steps: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'integer' }, parentId: { oneOf: [{ type: 'integer' }, { type: 'null' }] }, createdAt: { type: 'string' }, label: { oneOf: [{ type: 'string' }, { type: 'null' }] }, bytes: { type: 'integer' }, pinned: { type: 'boolean' }
  }, required: ['id', 'parentId', 'createdAt', 'label', 'bytes', 'pinned'] } }
};
function renderProject(_args, value) {
  const lines = [`Project: ${value.path}`, `Mode: ${value.mode}; head: ${value.head}; revision: ${value.revision}; history: ${value.historyLimit}; cap: ${value.maxBytes} bytes.`];
  if (value.target) lines.push(`Exported: ${value.target}`);
  for (const s of value.steps) lines.push(`${s.id === value.head ? '*' : ' '} Step ${s.id} (parent ${s.parentId ?? 'none'})${s.pinned ? ` [checkpoint: ${s.label}]` : ''} — ${s.bytes} bytes, ${s.createdAt}`);
  return [{ type: 'text', text: lines.join('\n') }];
}
function createProjectTool(ctx) {
  return {
    name: 'quiet_line_project',
    description: 'Manage a single Quiet Line .qlproject file: list metadata/history, restore a saved step (retaining later history), pin a checkpoint, delete_checkpoint, prune automatic history/change limits, branch to a NEW .qlproject, export a selected step to a NEW .png/.qlpaint/.qldry, or recover a safely contained project after interrupted SQLite writes and run a full integrity check. Recovery preserves history/revision and refuses unsafe files or active locks. No image attachment is needed. Continue drawing with quiet_line_draw project; project state is never overwritten by an import.',
    parameters: { type: 'object', additionalProperties: false, required: ['project', 'action'], properties: {
      project: parameters.project, action: { type: 'string', enum: ['list', 'restore', 'checkpoint', 'delete_checkpoint', 'prune', 'branch', 'export', 'recover'] },
      step: stepSchema, label: { type: 'string', minLength: 1, maxLength: 120, description: 'Required checkpoint label.' },
      target: { type: 'string', description: 'Required NEW path for branch (.qlproject) or export (.png/.qlpaint/.qldry); inside working directory, existing parent, never overwrites.' },
      history_limit: { type: 'integer', minimum: 1, maximum: 500 }, max_mb: { type: 'integer', minimum: 64, maximum: 8192 }
    } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { ...metadataProperties, target: { type: 'string' } }, required: ['path', 'mode', 'head', 'revision', 'historyLimit', 'maxBytes', 'steps'] }, render: renderProject },
    timeoutMs: 60000,
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      let stage = 'validation';
      try {
        if (!exec.agent) throw new Error('quiet_line_project needs an owning Agent session');
        projectPath(args.project);
        const actions = ['list', 'restore', 'checkpoint', 'delete_checkpoint', 'prune', 'branch', 'export', 'recover'];
        if (!actions.includes(args.action)) throw new Error('unknown project action');
        if (args.step !== undefined) integer(args.step, 1, Number.MAX_SAFE_INTEGER, 'step');
        if (args.label !== undefined) label(args.label);
        if (args.action === 'checkpoint' && args.label === undefined) throw new Error('checkpoint requires label');
        if (args.label !== undefined && args.action !== 'checkpoint') throw new Error('label is only for checkpoint');
        if (args.target !== undefined && !['branch', 'export'].includes(args.action)) throw new Error('target is only for branch/export');
        if (['branch', 'export'].includes(args.action) && args.target === undefined) throw new Error(`${args.action} requires target`);
        if (args.action !== 'prune' && (args.history_limit !== undefined || args.max_mb !== undefined)) throw new Error('history_limit/max_mb are only for prune');
        if (args.history_limit !== undefined) integer(args.history_limit, 1, 500, 'history_limit');
        if (args.max_mb !== undefined) integer(args.max_mb, 64, 8192, 'max_mb');
        if (args.step !== undefined && ['list', 'prune', 'recover'].includes(args.action)) throw new Error('step is not used by list/prune/recover');
        const cwd = await ctx.workingDirectory.ensure(exec.agent, exec.signal);
        if (!cwd) throw new Error('the session working directory is unavailable');
        if (args.action === 'recover') {
          stage = 'recover';
          if (exec.signal?.aborted) throw new Error('project recovery cancelled');
          // A hot rollback journal intentionally makes normal readProject fail.
          // Let the store acquire SQLite locks and recover before reading metadata.
          return await store().manageProject(cwd, args.project, { action: 'recover' });
        }
        stage = 'read';
        const previous = await store().readProject(cwd, args.project, { step: args.step, includeData: args.action === 'export' });
        if (args.action === 'list') return previous;
        if (args.action === 'export') {
          stage = 'export';
          const target = exportPath(cwd, args.target), ext = path.extname(target).toLowerCase();
          const stateExt = previous.mode === 'dry' ? '.qldry' : '.qlpaint';
          if (ext !== '.png' && ext !== stateExt) throw new Error(`export target must end in .png or ${stateExt}`);
          if (ext !== '.png') await temporary(cwd, async dir => {
            const input = path.join(dir, `validate${stateExt}`);
            fs.writeFileSync(input, previous.selected.state, { flag: 'wx' });
            validateState(cwd, input, previous.mode);
          });
          if (exec.signal?.aborted) throw new Error('export cancelled');
          fs.writeFileSync(target, ext === '.png' ? previous.selected.png : previous.selected.state, { flag: 'wx' });
          const { selected, ...metadata } = previous;
          return { ...metadata, target };
        }
        stage = args.action;
        if (exec.signal?.aborted) throw new Error('project operation cancelled');
        return await store().manageProject(cwd, args.project, { action: args.action, step: args.step, label: args.label, target: args.target,
          historyLimit: args.history_limit, maxBytes: args.max_mb === undefined ? undefined : args.max_mb * 1024 * 1024, expectedRevision: previous.revision });
      } catch (error) { throw stageError(stage, error); }
    },
    presentCall(args) { return { card: 'generic', title: `Project ${args?.action || 'manage'}`, kind: 'other' }; }
  };
}
module.exports = { parameters, executeProject, checkWithoutProject, createProjectTool };
