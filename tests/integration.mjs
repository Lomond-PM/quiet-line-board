import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { apply } from '../index.js';
const require = createRequire(import.meta.url);
const CORE = require('../lib/core.cjs');
const RASTER = require('../lib/raster.cjs');
let tool;
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'quiet-line-integration-'));
apply({ tools: {register(t){tool=t;}}, workingDirectory: {ensure: async()=>cwd}, get(){return undefined;} });
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
