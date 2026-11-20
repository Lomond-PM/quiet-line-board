# Changelog / 更新记录

## 1.1.1 — 2026-11-20

### 中文

修复在已有图片上首次使用 `base_image` + `save_state` 时失败的问题。

- **原因**：sharp 解码返回 Node.js `Buffer`，它虽然是 `Uint8Array` 的子类，但湿画快照要求精确的 `Uint8Array` 类型。此前没有在解码边界统一类型，导致快照捕获时报 `Invalid paint state: baseRGBA type/length`，尚未写出 PNG 就已失败。
- **修复**：将可信图片解码结果复制成独立的 `Uint8Array`，不改变像素值，不放宽快照类型校验。
- **新增回归**：通过真实 PNG、JPEG、WebP 文件调用绘画工具，覆盖油画笔和画刀、无新增笔迹的初始快照、非正方形缩放、RGBA/透明度保留、保存后读取与续画、空续画、分步与一次完成的 PNG 一致性，以及原图不被改写。
- 新增快照拒绝 `Buffer` 类型的测试，确保格式校验仍然严格。此前的缺口是底图单元测试仅构造了精确类型的 `Uint8Array`，未覆盖真实解码到工具执行的完整路径。

工具参数及 `.qlpaint` 文件格式未改变。1.1.0 其他正常生成的湿画状态无需迁移。升级后请重新加载插件；如果当前 DSH 进程仍运行缓存代码，请重启 DSH。

### English

Fixed initial `base_image` + `save_state` failing on existing images.

- **Cause:** sharp returns a Node.js `Buffer`. Although it subclasses `Uint8Array`, wet-state snapshots require the exact `Uint8Array` type. The mismatch caused `Invalid paint state: baseRGBA type/length` during capture, before PNG output was written.
- **Fix:** copy trusted decoded RGBA into an owned, exact `Uint8Array` at the decoder boundary, preserving pixel values and keeping strict snapshot validation intact.
- **Regression coverage:** real PNG/JPEG/WebP files through the actual tool handler, oil and palette knife, empty initial snapshots, non-square resizing, RGBA/alpha preservation, save/load/resume, empty resumes, split/single PNG equality and unchanged source files.
- Added a negative test that snapshots still reject `Buffer` values. Earlier base-state unit tests used synthetic exact `Uint8Array` data and missed the real decoding-to-tool boundary.

No tool parameter or `.qlpaint` format changes. Previously valid 1.1.0 snapshots need no migration. Reload the plugin after upgrading; restart DSH if its process still uses cached plugin code.
