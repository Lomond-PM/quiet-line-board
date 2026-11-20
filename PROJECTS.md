# 单文件绘画工程 / Single-file drawing projects

[README](README.md) · [干性材料 / Dry media](DRY-MEDIA.md) · [湿画快照 / Wet snapshots](CONTROL.md) · [绘画方法 / Drawing practice](DRAWING.md)

## 为什么用工程 / Why projects

`.qlpaint` 和 `.qldry` 是独立的材料状态快照。它们继续有效，但不必再为每一轮绘制手动保存一个新文件。

新的 **`.qlproject`** 把一个画布的材料快照、PNG 预览、步骤记录和命名检查点放进一个 SQLite 工程文件。模型每次把 `project` 传给 `quiet_line_draw`，成功后自动记录一步；下一次仍使用同一个工程路径。PNG 依然作为绘画结果独立导出，工程不会自动删除你已有的 PNG 或快照。

`.qlpaint` and `.qldry` remain standalone material snapshots. A **`.qlproject`** instead holds material snapshots, PNG previews, step metadata and named checkpoints in one SQLite project. Pass the same `project` path to successive `quiet_line_draw` calls; successful calls automatically record new steps. PNG output remains independent. Existing PNGs and snapshots are never automatically deleted.

一个工程固定使用一种材料模式：`wet`（oil / oilknife）或 `dry`（干性铅笔／炭条）。这不是任意图层编辑器，也不会把旧 PNG 反解成可擦揉或湿混的材料。

A project has one fixed material mode: `wet` (oil / oilknife) or `dry` (material-aware graphite / charcoal). It is not a layer editor and cannot recover wet or erasable material from a flattened PNG.

## 默认保留策略 / Retention defaults

- 最近 **30 步未命名自动历史**，可调整为 `1..500`。
- 另支持最多 **64 个命名检查点**，不会被自动清理。
- 默认 **2048 MiB** 逻辑容量，可调整为 `64..8192 MiB`。容量计算含压缩材料状态、PNG 预览及记录；SQLite 页结构另有至多 16 MiB 的预留。
- 超过历史数量或容量时，从最旧的未命名步骤开始清理，但保留当前步骤及所有命名检查点。若这样仍无法满足容量限制，本次提交失败，原工程不变；需要先取消一些检查点或提高容量。
- 历史记录数不是笔画数：**一次成功工具调用是一整步**，其中可以包含许多笔画和材料操作。

Defaults retain the **30 most recent unpinned automatic steps**, configurable from `1..500`, plus up to **64 named checkpoints**. The logical size limit defaults to **2048 MiB**, configurable from `64..8192 MiB`; this includes compressed material snapshots, PNG previews and records, with up to 16 MiB reserved separately for SQLite page overhead. Oldest unpinned steps are pruned first, never the current head or pinned checkpoints. If the remaining data still exceeds capacity, the commit fails without replacing the previous project. Unpin checkpoints or raise the limit. A history step is one successful tool call, not one individual stroke.

**一个文件不意味着无限空间。** 当前保存的是完整、压缩后的材料快照，而不是每笔的极小增量；复杂或大画布工程仍可能很大。已有历史不需要在每次绘制时重新演算。

**One file does not mean unlimited space.** History stores full compressed material snapshots, not tiny per-stroke deltas. Complex projects can still be large, but earlier strokes do not have to be replayed for each new drawing.

## 开始湿画工程 / Start a wet project

调用 `quiet_line_draw` / Call `quiet_line_draw`:

```json
{
  "project": "still-life.qlproject",
  "brush": "oil",
  "size": 800,
  "title": "Still life — block in",
  "strokes": [
    {"points": [[0.2, 0.65], [0.8, 0.65]], "width": 3, "color": "ochre"}
  ],
  "project_checkpoint": "Block in"
}
```

继续时无需 `paint_state` 或 `save_state` / Continue without loose snapshots:

```json
{
  "project": "still-life.qlproject",
  "strokes": [
    {"points": [[0.45, 0.3], [0.5, 0.7]], "width": 2, "color": "clay"}
  ]
}
```

## 开始干性材料工程 / Start a dry project

```json
{
  "project": "charcoal-study.qlproject",
  "dry_media": true,
  "size": 700,
  "operations": [
    {"tool": "charcoal", "points": [[0.2, 0.5], [0.8, 0.5]], "width": 10, "pressure": 0.35, "grade": "6B", "tilt": 0.8, "angle": 90},
    {"tool": "kneaded", "points": [[0.48, 0.35], [0.48, 0.65]], "width": 6, "pressure": 0.7}
  ],
  "project_history_limit": 30,
  "project_max_mb": 2048
}
```

此后仅需 `project` 和新的 `operations`。材料模式自动继承；恢复材料时仍遵守原状态的尺寸、纸面等约束。`project_history_limit` 和 `project_max_mb` 省略时继承现值，显式提供时调整保留策略；检查点不会因此被静默删除。

Later calls need only `project` and new `operations`. Mode is inherited, and original state constraints such as dimensions and substrate still apply. Retention settings inherit when omitted; explicit values adjust the policy without silently dropping named checkpoints.

## 历史、恢复与分支 / History, restore and branch

管理工具名为 **`quiet_line_project`**。`project` 始终必填；步骤使用工具列表返回的 **ID**，不是显示顺序或笔画编号。

Use **`quiet_line_project`**. Always provide `project`; use actual step IDs from its list, not row positions or stroke numbers.

| `action` | 其他字段 / Other fields | 作用 / Effect |
| --- | --- | --- |
| `list` | — | 列出当前步骤、历史、检查点和容量设置 / List head, history, checkpoints and limits |
| `checkpoint` | `step`（省略为当前 / default head）, `label` | 为该步骤命名并保留 / Name and pin a step |
| `delete_checkpoint` | `step`（省略为当前 / default head） | 取消长期保留，不代表立刻删除该步骤 / Unpin, not necessarily immediately delete the step |
| `restore` | `step` | 切换当前材料到已有步骤，不删除之后的历史 / Move head to an existing step without deleting later history |
| `prune` | `history_limit`, `max_mb`（均可省略 / optional） | 调整策略并立即清理可清理历史 / Apply retention and prune eligible history |
| `branch` | `step`（省略为当前 / default head）, `target` | 以所选状态另存一个新工程，不修改原工程 / Create a new project from one selected state, source unchanged |
| `export` | `step`（省略为当前 / default head）, `target` | 导出 PNG 或对应模式快照 / Export PNG or the mode's standalone snapshot |
| `recover` | — | 显式恢复中断写入的 SQLite 事务并检查工程，不生成新步骤 / Explicitly recover an interrupted SQLite transaction and check the project, without adding a step |

```json
{"project": "still-life.qlproject", "action": "list"}
```

```json
{"project": "still-life.qlproject", "action": "checkpoint", "step": 2, "label": "Before highlights"}
```

```json
{"project": "still-life.qlproject", "action": "restore", "step": 2}
```

```json
{"project": "still-life.qlproject", "action": "branch", "step": 2, "target": "still-life-alternative.qlproject"}
```

```json
{"project": "still-life.qlproject", "action": "export", "target": "still-life-preview.png"}
```

恢复之后继续绘制会生成新 ID，父步骤为恢复的那一步。之后的旧步骤不会因恢复动作立刻消失，但仍受自动历史清理规则影响。想长期保留两个方向时，先命名检查点或另存分支。

Drawing after restore creates a new step ID whose parent is the restored step. Later old steps are not immediately discarded by restore, but remain subject to normal retention. Pin important alternatives or branch them into separate projects.

导出快照时，湿画工程使用 `.qlpaint`，干性工程使用 `.qldry`；PNG 使用 `.png`。新工程、分支和导出只写入工作目录内，不覆盖已有目标。导出父目录须已存在。

Export `.qlpaint` for wet material, `.qldry` for dry material, or `.png` for the preview. Project creation, branches and exports stay within the session working directory and never overwrite existing output targets. Export parent directories must exist.

## 导入旧快照 / Import old snapshots

向一个**尚不存在的新工程**提供 `paint_state` 或 `dry_state`，即可迁移材料；源快照保持不变。例如调用 `quiet_line_draw`：

Provide `paint_state` or `dry_state` with a **new, nonexistent project** to import the material without changing its source:

```json
{
  "project": "imported-oil.qlproject",
  "paint_state": "old-study.qlpaint",
  "project_checkpoint": "Imported state"
}
```

```json
{
  "project": "imported-charcoal.qlproject",
  "dry_state": "old-study.qldry",
  "project_checkpoint": "Imported state"
}
```

已有工程自行持有材料，不能再同时指定 `base_image`、`paint_state` 或 `dry_state` 来悄悄替换它；如需另一幅画，请创建新工程。使用工程时不再提供 `save_state` 或 `save_dry_state`，因为材料由工程自动保存。`project_checkpoint` 等工程选项不能脱离 `project` 单独使用。

Existing projects own their material state: do not combine them with `base_image`, `paint_state` or `dry_state` to silently replace it. Create a new project for different material. Do not supply `save_state` / `save_dry_state` with a project; it saves automatically. Project-only options require `project`.

## 安全与文件行为 / Safety and file behavior

提交使用 SQLite 事务，并核对读入时的修订号。并行绘画若在渲染期间遇到工程已被另一次调用更新，会报告冲突而不是覆盖对方的最新进度。绘画、校验、容量检查或提交失败时，不更新已有工程；PNG 可能已经被导出，但不会因此假称工程提交成功。

Commits use SQLite transactions and revision checks. Concurrent calls cannot silently overwrite a newer revision. Rendering, validation, capacity or commit failures leave the previous project intact; an independent PNG may already have been exported, but is not reported as a successful project commit.

平时保存的是一个 `.qlproject`。写入期间 SQLite 可能短暂创建事务日志；**不要在写入或崩溃恢复时手动删除日志**。普通读取遇到遗留日志会停止；确认没有仍在写入的工具后，调用 `quiet_line_project` 的 `recover` 动作，由 SQLite 恢复最后一次完整提交并执行完整一致性检查。它不会增加历史步骤，也不保证修复任意外部损坏。材料桥接使用的隐藏临时目录会在正常结束或捕获异常时清理，强制终止进程可能留下临时文件。工具关闭数据库后，可复制工程文件备份。保留重要作品的外部备份仍然有价值，工程并不替代备份。

Normally the persistent result is one `.qlproject`. SQLite may briefly create a transaction journal; **do not manually delete it during writes or crash recovery**. Ordinary reads stop when a journal is present. After ensuring no tool is still writing, call `quiet_line_project` with `action:"recover"` to let SQLite restore the last complete commit and run a full consistency check. This does not create a history step or promise to repair arbitrary external corruption. Hidden temporary material-bridge directories are cleaned on normal completion and caught errors; forcibly terminating the process may leave temporary files. Once the tool has closed the database, copy the project for backup. A project is not a replacement for external backups.
