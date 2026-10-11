const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('src/blood_measure/web/app.js', 'utf8');
const html = fs.readFileSync('src/blood_measure/web/index.html', 'utf8');
function setup(failWrite = false) {
  const nodes = new Map(), values = new Map(), writes = [];
  const graphics = new Proxy({}, { get: () => () => {} });
  const node = () => ({textContent:'', value:'', style:{}, dataset:{}, hidden:false, events:{},
    classList:{values:new Set(),add(v){this.values.add(v)},remove(v){this.values.delete(v)},contains(v){return this.values.has(v)}},
    addEventListener(k,fn){this.events[k]=fn},setAttribute(k,v){this[k]=v},
    focus(){this.focused=true},reset(){},append(){},replaceChildren(){},getContext:()=>graphics });
  const get = key => { if (!nodes.has(key)) nodes.set(key,node()); return nodes.get(key); };
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const n=get('#'+match[1]); n.hidden=/\bhidden\b/.test(match[0]);
    const key=match[0].match(/data-i18n="([^"]+)"/); if(key)n.dataset.i18n=key[1];
  }
  const context = { document:{documentElement:{dataset:{}},querySelector:get,
    querySelectorAll:selector=>selector==='[data-i18n]'?[...nodes.values()].filter(n=>n.dataset.i18n):[],createElement:node},
    localStorage:{getItem:key=>values.get(key)||null,setItem(key,value){if(failWrite)throw Error('quota');values.set(key,value)},removeItem:key=>values.delete(key)},
    navigator:{language:'en'},window:{addEventListener(){},BloodMeasureStore:{record:(type,data)=>writes.push({type,data}),getSessions:()=>[],removeType(){}}},
    confirm:()=>true };
  vm.createContext(context); vm.runInContext(source,context);
  return {get,values,writes,run:code=>vm.runInContext(code,context)};
}
function save(env) {
  env.get('#systolic').value='122';env.get('#diastolic').value='82';env.get('#cuffPulse').value='70';
  env.run('latestReading = {bpm:71,quality:.85}; saveReferenceReading({preventDefault(){}})');
}
test('Enter cuff reading focuses the existing systolic input',()=>{
  const env=setup();env.get('#enterCuffButton').events.click();assert.equal(env.get('#systolic').focused,true);
});
test('saved cuff card uses unchanged paired payload, timestamp and source labels',()=>{
  const env=setup();save(env);
  assert.equal(env.get('#savedCuffCard').hidden,false);
  assert.equal(env.get('#savedCuffPressure').textContent,'122/82');
  assert.equal(env.get('#savedCuffPulse').textContent,'Pulse 70 BPM');
  const saved=JSON.parse(env.values.get('blood-measure-paired-readings-v1'))[0];
  assert.equal(env.writes.length,1);assert.equal(env.writes[0].type,'cuff-comparison');
  assert.deepEqual(JSON.parse(JSON.stringify(env.writes[0].data)),saved);
  assert.deepEqual(Object.keys(saved).sort(),['app','cuff','ppg','recordedAt']);
  assert.equal(env.get('#savedCuffTime').dateTime,saved.recordedAt);
  env.run('currentLanguage="zh"; applyLanguage()');
  assert.equal(env.get('#savedCuffTitle').textContent,'袖带读数');
  assert.equal(env.get('#savedCuffPulse').textContent,'脉搏 70 BPM');
  assert.match(env.run('t("cuffSource")'),/用户手动输入/);
  env.run('clearHistory()');assert.equal(env.get('#savedCuffCard').hidden,true);
});
test('failed or invalid saves do not display a saved cuff card',()=>{
  const env=setup(true);save(env);
  assert.equal(env.get('#savedCuffCard').hidden,true);assert.equal(env.writes.length,0);
  assert.match(env.get('#saveMessage').textContent,/could not store/);
  const invalid=setup();invalid.run('saveReferenceReading({preventDefault(){}})');
  assert.equal(invalid.get('#savedCuffCard').hidden,true);assert.equal(invalid.writes.length,0);
});
test('camera details translate without changing calculated values',()=>{
  const env=setup();
  env.run('displayedCameraReading={bpm:71,quality:.85,pulseEstimate:{bpm:72,referenceCount:0},bpEstimate:{systolic:120,diastolic:80,referenceCount:0}}; applyLanguage()');
  assert.equal(env.get('#estimatedSystolic').textContent,120);
  assert.match(env.get('#resultQuality').textContent,/85% signal confidence/);
  env.run('currentLanguage="zh"; applyLanguage()');
  assert.match(env.get('#resultQuality').textContent,/信号置信度 85%/);
  assert.equal(env.get('#estimatedSystolic').textContent,120);
  assert.equal(env.get('#heartRate').textContent,72);
});
test('measurement failure remains distinct when switching languages',()=>{
  const env=setup();env.run('showMeasurementFailure("No reliable pulse"); currentLanguage="zh"; applyLanguage()');
  assert.equal(env.get('#resultTitle').textContent,'测量未成功');
  assert.equal(env.get('#pressureValue').hidden,true);assert.equal(env.get('#referenceForm').hidden,true);
});
test('caution precedes metrics; saved cuff card is separate and inputs retain labels',()=>{
  assert.ok(html.indexOf('id="pressureValue"') < html.indexOf('id="cameraCaution"'));
  assert.ok(html.indexOf('id="cameraCaution"') < html.indexOf('class="camera-metrics"'));
  assert.ok(html.indexOf('</form>') < html.indexOf('id="savedCuffCard"'));
  assert.match(html,/id="savedCuffCard"[^>]*aria-labelledby="savedCuffTitle"[^>]*hidden/);
  assert.match(html,/id="enterCuffButton"[^>]*type="button"/);
  assert.match(html,/id="saveMessage"[^>]*role="status"/);
  for(const id of ['systolic','diastolic','cuffPulse']) assert.match(html,new RegExp('<label[^>]*>[^<]*<span[^>]*>[^<]+</span><input id="'+id+'"'));
});
