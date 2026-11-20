# 绘画方法 / Drawing with intention

[README](README.md) · [干性材料 / Dry media](DRY-MEDIA.md) · [旧笔触与湿画 / Legacy strokes and wet painting](CONTROL.md)

工具负责落笔，模型负责观察、取舍与构图。这份指南是工作方法，不是要求每张图套用一种画风；用户的题材、审美、时间与费用限制始终优先。简短英文指导由 [art-guidance.cjs](lib/art-guidance.cjs) 导出，供工具描述使用；这里展开说明。

The renderer makes marks; the model makes visual decisions. These are working methods, not a mandatory style. The user's subject, taste, time and cost limits take precedence. A short English version is exported by [art-guidance.cjs](lib/art-guidance.cjs) for the tool description; this document provides the fuller practice guide.

## 1. 先安排画面 / Compose before detailing

**中文**

- 先确定画幅、主体位置、观看方向和重心。用一两块大形概括，而不是从眼睛、树叶或杯沿开始。
- 比较外接形的高宽、主要轴线、相邻形之间的距离；检查负形，例如手臂与躯干之间、树枝与天空之间的空隙。
- 选一个视觉焦点。最高对比、最清晰的边缘和最密的细节不必遍布全图。
- 对写生或参考图，先观察再落笔；对想象画，先决定最重要的关系。不要假装看到了未实际查看的图片。

**English**

- Choose the format, subject placement, direction and visual balance. Block one or two large silhouettes before drawing eyes, leaves or cup rims.
- Compare bounding-box proportions, main axes, intervals and negative spaces: the gap beside an arm or the sky between branches can reveal an error faster than a detail.
- Choose a focal point. Reserve the strongest contrast, sharpest edges and richest detail rather than distributing them everywhere.
- Observe an available reference before drawing. For imagined work, decide the essential relationships first. Do not claim to have inspected an image you have not viewed.

## 2. 用光组织体积 / Organize volume with light

**中文**

1. 先定一个主光源；投影方向和受光面应彼此一致。
2. 用三到五组明暗概括：亮面、中间调、形体暗面、投影，必要时单列最深接触暗部。
3. 让笔触解释平面朝向与转折。球面是逐渐转暗，盒体可有明确明暗交界，不能都只用一圈深轮廓。
4. 暗部的反光可以比核心暗部亮，但通常不应抢过受光面的整体亮度。
5. 检查投影的落点与接触暗部，物体才像放在桌面上，而不是浮在背景前。

**English**

1. Establish one principal light; lit planes and cast shadows should agree.
2. Block three to five value families: light, middle tone, form shadow, cast shadow and, if needed, the darkest contact accents.
3. Let marks explain planes and turning surfaces. A sphere turns gradually; a box can change value abruptly. Neither needs an equally dark outline everywhere.
4. Reflected light may lift a shadow without breaking the larger light/shadow separation.
5. Place cast shadows and contact accents convincingly so objects sit on a surface rather than float.

## 3. 铅笔与炭笔 / Graphite and charcoal

**中文**

- 起形用轻线，先纠正比例；铺大灰面用侧锋，不必用成百上千条同样粗细的线填满。
- 排线沿体积走；通过间距、方向、长短、压力和交叉层数组织灰度，而不是把噪点等同于素描质感。
- 硬铅用于克制的细线，软铅用于较深、较宽的调子。炭条适合大暗面和可擦揉浮粉，不能只当作更粗的铅笔。
- 纸擦笔只软化需要软化的地方。保留一些明确的结构边、转折和新鲜排线，避免把一切揉成均匀的灰雾。
- 可塑橡皮用于逐渐提亮和找形；普通橡皮用于更明确的修正。提亮是移走已建模材料，不是往纸上盖白漆。
- 新干性材料流程使用 `dry_media:true` 与有序 `operations`。旧 `brush:pencil/charcoal` + `strokes` 仍是风格化线条路径；旧路径没有因为新功能而自动获得材料擦除、侧锋接触或浮粉搬运。

**English**

- Start lightly and correct proportions. Use side strokes for broad values instead of filling every area with hundreds of identical lines.
- Hatch along the form. Vary spacing, direction, length, pressure and cross-hatching layers to organize tone; random noise alone is not convincing drawing texture.
- Hard graphite suits restrained fine marks; softer grades support darker, broader passages. Charcoal has a distinct broad, loose-powder character, not merely a thicker pencil line.
- Smudge selectively. Retain structural edges, turning points and some fresh hatching instead of rubbing everything into uniform fog.
- Use kneaded erasers to lift gradually and regular erasers for firmer corrections. Lifting removes modeled material; it does not paint white over the paper.
- Use `dry_media:true` and ordered `operations` for the material workflow. Legacy `brush:pencil/charcoal` with `strokes` remains the stylized path; it does not automatically gain material erasing, side-tip contact or powder transport.

## 4. 油画与边缘 / Oils and edge control

**中文**

先铺大色块与明暗，不要让颜色细节掩盖结构。顺形用笔，以软硬边和虚实变化组织空间；背景与暗部可以适度丢边，焦点处再明确。薄涂、较实的色块、少量厚涂高光可以形成层次，不必全画面堆厚。

未干交叠会拾色混色：利用它连接相近色；需要干净亮色时，减少无目的来回搅动。画刀不是万能锐化器，它的定向接触和拖带也应服务于形体。油画续画使用 `.qlpaint` 湿画状态；不要把一张 PNG 当作尚未干的颜料状态。

**English**

Establish large colour and value masses before small colour variations. Follow the form with directional strokes and vary hard, soft and lost edges. Lose some boundaries into adjacent values; clarify the focal area. Contrast thin passages, more solid masses and selective impasto highlights rather than loading every inch equally.

Wet overlap picks up and mixes pigment: use it to connect related colours, but avoid aimless stirring when a clean light is needed. A palette knife is not a universal sharpening filter; its orientation and drag should describe the subject. Continue wet oils from `.qlpaint`, not from the flattened pixels of a PNG.

## 5. 看结果，再有目的地继续 / Inspect, decide, continue

**中文**

不要因为担心 “overworking／画过头” 就过早停笔。作品往往需要几轮明确的修正：比例、明暗分组、体积、边缘，最后才是细节。多画几轮本身不是问题；没有观察和目标地反复加笔才是问题。

每轮尽量遵循：

1. 实际查看刚生成的图片（当前环境可查看时）；若无法查看，明确说明限制，不要假称已完成视觉检查。
2. 只选一到三个最影响画面的差距，例如“主体偏小”“暗部太碎”“焦点边缘不够清晰”。
3. 为每个差距安排具体操作，再输出检查；保护已经奏效的区域。
4. 保存合适的干画或湿画节点，需要时从旧节点分支。PNG 适合展示，材料状态适合继续编辑。
5. 用户要求已经满足就停下；用户指定了轮数、调用次数、时间、费用或完成度时，始终以此为界。不无限循环，不为堆笔数而加笔。

**English**

Do not stop prematurely merely from fear of overworking. Several focused revisions can improve proportions, value grouping, volume and edges before details. More passes are not inherently a problem; unobserved, purposeless repetition is.

For each pass:

1. Actually inspect the rendered image when the environment permits it. If unavailable, state that limitation rather than claiming visual verification.
2. Choose one to three important mismatches, such as a small subject, fragmented shadows or an unclear focal edge.
3. Make specific corrections, render and inspect again. Protect areas that already work.
4. Save appropriate dry or wet checkpoints and branch when useful. PNGs show the image; material states preserve its editable simulation.
5. Stop when the request is satisfied or the user's pass, call, time, cost or detail limits are reached. Never loop indefinitely or add strokes just to increase a count.

## 6. 三个练习 / Three exercises

### A. 三明度球体 / Three-value sphere

**中文：** 选择暖纸与左上光。轻画外形，分亮面、中间调、暗面；加一块落在右下的投影。第二轮沿球面排线，把接触暗部压实；第三轮只修比例、软化转面并用橡皮提一处高光。缩小看时仍应读成球，而不是一个涂灰的圆。

**English:** On warm paper, choose upper-left light. Block a sphere into light, middle and dark, with a cast shadow to the lower right. On pass two, hatch around the form and strengthen contact accents. On pass three, correct proportions, soften the turn and lift one highlight. At thumbnail size it should read as a sphere, not a grey disc.

### B. 炭笔布料／石块 / Charcoal cloth or stone

**中文：** 用侧锋概括两三块大灰面，以炭条加核心暗部。只在转面处沿形擦揉，保留一两条硬边；用可塑橡皮提出受光棱线。检查最暗、最亮和边缘变化是否集中在你想强调的位置。

**English:** Block two or three broad values with side strokes, then establish core darks in charcoal. Smudge along selected turning planes while retaining a few hard edges. Lift lit ridges with a kneaded eraser. Check that the extremes and edge changes support your intended emphasis.

### C. 限色油画小景 / Limited-palette oil study

**中文：** 先定冷暖关系和三块主色，不急着画树叶。第二轮调整天空、地面和主体的明度比例，第三轮再放少量厚涂亮点。每轮都比较整体；不因担心画过头而放弃仍明显需要的修正，也不因尚有调用预算而硬添细节。

**English:** Choose a warm/cool relationship and three main colour masses before drawing leaves. On pass two, adjust the sky/ground/subject value balance; on pass three, add selective loaded highlights. Compare the whole at every stage. Do not abandon a clear improvement from fear of overworking, or invent extra details just because calls remain.

## 边界 / Limits

这些是可控、可重复的程序近似，不是石墨光泽、纸纤维磨损、炭粉颗粒碰撞或真实油彩流变的完整物理模型。画得是否有说服力，仍取决于观察、构图和每一轮的取舍。不同状态格式不能互换，也不是图层、蒙版或任意单笔撤销系统。

These are controllable, repeatable procedural approximations, not full physics of graphite sheen, fibre wear, colliding charcoal particles or paint rheology. Convincing results still depend on observation, composition and decisions between passes. State formats are not interchangeable and do not constitute layers, masks or arbitrary per-stroke undo.
