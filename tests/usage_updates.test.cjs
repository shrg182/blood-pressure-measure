const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(revision) {
  const nodes=new Map();
  const get=key=>{if(!nodes.has(key))nodes.set(key,{textContent:'',addEventListener(){}});return nodes.get(key)};
  let updates=0;
  const context={window:{BLOOD_MEASURE_BUILD:{version:'0.9.5',released:'2026-10-11',revision}},
    document:{documentElement:{dataset:{}},querySelector:get,querySelectorAll:()=>[]},
    localStorage:{getItem:()=>null},navigator:{language:'en',onLine:true,serviceWorker:{addEventListener(){},getRegistration:async()=>({update:async()=>{updates++}})}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync('src/blood_measure/web/usage.js','utf8'),context);
  return {get,run:code=>vm.runInContext(code,context),updates:()=>updates};
}
test('local metadata and update checks report a development build in both languages',async()=>{
  const env=setup('__BUILD_REVISION__');
  assert.match(env.get('#versionDetails').textContent,/0.9.5 · build local · 2026-10-11/);
  assert.match(env.get('#updateStatus').textContent,/Local development build/);
  await env.run('checkForUpdates()');assert.equal(env.updates(),0);
  env.run('currentLanguage="zh";applyLanguage()');
  assert.match(env.get('#updateStatus').textContent,/本地开发版本/);
});
test('published builds still use the service worker update check',async()=>{
  const env=setup('abcdef0');
  assert.match(env.get('#updateStatus').textContent,/not checked/);
  await env.run('checkForUpdates()');assert.equal(env.updates(),1);
  assert.equal(env.get('#updateStatus').textContent,'This app is up to date.');
});
