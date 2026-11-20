import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { apply } from '../index.js';
const require = createRequire(import.meta.url);
const CORE = require('../lib/core.cjs');
const RASTER = require('../lib/raster.cjs');
const sharp = require('sharp');
const { loadBaseImage } = require('../lib/base-image.cjs');
const { loadPaintState } = require('../lib/paint-state.cjs');
let tool;
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'quiet-line-integration-'));
apply({ tools: {register(t){if(t.name==='quiet_line_draw')tool=t;}}, workingDirectory: {ensure: async()=>cwd}, get(){return undefined;} });
const run = args=>tool.execute(args, {agent:{id:'test'}});
const a = {points:[[.15,.45],[.5,.46],[.85,.4]],color:'#ae3829',width:3,tip:'flat',angle:10,flow:.8,controls:[{pressure:0},{pressure:1},{pressure:0}]};
const b = {points:[[.5,.15],[.48,.5],[.52,.85]],color:'#23578a',width:3,tip:'flat',angle:75,hardness:.35};
const opts = {brush:'oil',surface:'linen',seed:623,size:320,grain:35,weight:4,wobble:0,pressure:0};
const first = await run({...opts,strokes:[a],output:'first.png',save_state:'first.qlpaint'});
assert.ok(first.paintState && fs.existsSync(first.paintState));
const second = await run({paint_state:first.paintState,weight:4,wobble:0,pressure:0,strokes:[b],output:'second.png',save_state:'second.qlpaint'});
const single = await run({...opts,strokes:[a,b],output:'single.png'});
assert.deepEqual(fs.readFileSync(second.absolutePath),fs.readFileSync(single.absolutePath),'tool split calls must match one call');
const empty = await run({paint_state:second.paintState,output:'empty.png'});
assert.deepEqual(fs.readFileSync(empty.absolutePath),fs.readFileSync(second.absolutePath),'empty resume must not repaint');
for (const args of [
 {paint_state:first.paintState,brush:'ink'},
 {paint_state:first.paintState,width:321},
 {paint_state:first.paintState,base_image:'first.png'},
 {...opts,strokes:[{...a,controls:[{}]}]},
 {...opts,strokes:[{...a,controls:[{}, {pressure:2}, {}]}]},
 {...opts,strokes:[{...a,hardness:-1}]},
 {brush:'ink',strokes:[a],save_state:'bad.qlpaint'}
]) await assert.rejects(()=>run(args));
await assert.rejects(()=>run({...opts,strokes:[a],output:'occupied.png',save_state:'first.qlpaint'}),/EEXIST/);
// Real decoder -> tool -> snapshot -> resume coverage. Synthetic Uint8Array
// bases alone missed sharp's Buffer subclass in the original 1.1.0 tests.
const pixels = Buffer.alloc(96 * 64 * 4);
for (let y = 0; y < 64; y++) for (let x = 0; x < 96; x++) {
 const i = (y * 96 + x) * 4;
 pixels.set([x * 2, y * 3, 160, x < 24 ? 0 : x < 48 ? 128 : 255], i);
}
for (const format of ['png', 'jpeg', 'webp']) {
 const source = path.join(cwd, `base.${format}`);
 const encoder = sharp(pixels, {raw:{width:96,height:64,channels:4}});
 await (format === 'webp' ? encoder.webp({lossless:true}) : encoder[format]()).toFile(source);
 const original = fs.readFileSync(source);
 for (const brush of ['oil', 'oilknife']) {
  const prefix = `${format}-${brush}`;
  const { size, ...style } = opts;
  // Also cover aspect-preserving resize and inherited non-square dimensions.
  const dimensions = brush === 'oilknife' ? {width:72} : {};
  const baseArgs = {...style,...dimensions,brush,base_image:source};
  const bootstrap = await run({...baseArgs,output:`${prefix}-bootstrap.png`,save_state:`${prefix}-bootstrap.qlpaint`});
  const decoded = await loadBaseImage(cwd, source, dimensions);
  assert.equal(decoded.rgba.constructor, Uint8Array, 'decoder returns canonical owned RGBA, not a Buffer');
  assert.equal(Buffer.isBuffer(decoded.rgba),false);
  assert.equal(decoded.rgba.length,decoded.width * decoded.height * 4);
  const expected = await sharp(original).rotate().resize(decoded.width,decoded.height,{fit:'fill'})
   .toColourspace('srgb').ensureAlpha().raw().toBuffer();
  assert.deepEqual(Buffer.from(decoded.rgba),expected,'RGBA normalization preserves decoded bytes');
  const state = loadPaintState(cwd,bootstrap.paintState);
  assert.equal(state.baseRGBA.constructor,Uint8Array);
  assert.equal(state.paper,null,'base-backed state must not add a paper layer');
  assert.deepEqual(state.baseRGBA,decoded.rgba,'saved base retains RGBA bytes, including alpha');
  assert.equal(state.metadata.width,decoded.width);
  assert.equal(state.metadata.height,decoded.height);
  const plain = await run({...baseArgs,output:`${prefix}-plain.png`});
  assert.deepEqual(fs.readFileSync(bootstrap.absolutePath),fs.readFileSync(plain.absolutePath),'capture does not alter dry overpainting output');
  const bootstrapPixels = await sharp(bootstrap.absolutePath).ensureAlpha().raw().toBuffer();
  assert.deepEqual(bootstrapPixels,expected,'empty bootstrap preserves pixels and transparency');
  const marked = await run({...baseArgs,strokes:[a],output:`${prefix}-marked.png`,save_state:`${prefix}-marked.qlpaint`});
  const resumed = await run({paint_state:marked.paintState,strokes:[b],output:`${prefix}-resumed.png`,save_state:`${prefix}-resumed.qlpaint`});
  const whole = await run({...baseArgs,strokes:[a,b],output:`${prefix}-whole.png`});
  assert.deepEqual(fs.readFileSync(resumed.absolutePath),fs.readFileSync(whole.absolutePath),`${prefix}: real-image split wet painting matches single call`);
  const emptyBase = await run({paint_state:resumed.paintState,output:`${prefix}-empty.png`});
  assert.deepEqual(fs.readFileSync(emptyBase.absolutePath),fs.readFileSync(resumed.absolutePath),'empty real-image resume is stable');
  assert.deepEqual(fs.readFileSync(source),original,'source image is never modified');
 }
}
console.log('base-image state: PASS — real PNG/JPEG/WebP, oil/oilknife, empty bootstrap, resize, RGBA and split equality');
// Legacy rendering against the actual previously installed 1.0.19, when available.
const previous = process.env.QUIET_LINE_BASELINE;
if(previous){
 const OLD_CORE = require(path.join(previous,'lib/core.cjs'));
 const OLD_RASTER = require(path.join(previous,'lib/raster.cjs'));
 for(const brush of Object.keys(CORE.BRUSHES)){
  const style={seed:623,brush,surface:'linen',weight:3,wobble:.58,pressure:.66,texture:.46,padding:.02};
  const sketch={items:[CORE.stroke([[.1,.2],[.35,.6],[.8,.3]],{width:2,color:'#a04030'})]};
  const r={width:320,height:320,seed:623,surface:'linen'};
  assert.deepEqual(RASTER.renderPNG(CORE.buildSketch(sketch,style,r),r).png,OLD_RASTER.renderPNG(OLD_CORE.buildSketch(sketch,style,r),r).png,`legacy ${brush}`);
 }
 console.log('legacy: all 8 brushes byte-identical to baseline');
}
console.log('integration: PASS',cwd);
