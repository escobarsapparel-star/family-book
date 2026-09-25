import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest, checkForUpdate } from '../update-client.mjs';
const runtime='a'.repeat(20), version='web-'+'b'.repeat(40);
const manifest={schema:1,appId:'com.familybook.app',runtime,version,checksum:'c'.repeat(64),url:`https://github.com/escobarsapparel-star/family-book/releases/download/android-web-${runtime}/${version}.zip`};
function setup({data=manifest,status=200,bundles=[],pending=null,downloadFails=false}={}) {
  const calls=[];
  const updater={
    current:async()=>({bundle:{id:'builtin',version:'1.1'}}),
    list:async()=>({bundles}),getNextBundle:async()=>pending,
    download:async value=>{calls.push(['download',value]);if(downloadFails)throw Error('network interrupted');return {id:'new-bundle'};},
    setMultiDelay:async value=>calls.push(['delay',value]),next:async value=>calls.push(['next',value])
  };
  return {calls,args:{updater,http:{get:async()=>({status,data})},runtime,bundledVersion:'web-'+'d'.repeat(40)}};
}
test('only accepts compatible, complete, same-repository update metadata',()=>{
  assert.equal(validateManifest(manifest,runtime,''),true);
  for(const change of [{runtime:'other'},{schema:2},{appId:'other'},{checksum:''},{url:'https://evil.example/app.zip'},{version:'../bad'}])
    assert.equal(validateManifest({...manifest,...change},runtime,''),false);
  assert.equal(validateManifest(manifest,runtime,version),false);
});
test('stages verified download for a killed/reopened app, without immediate reload',async()=>{
  const {calls,args}=setup();assert.equal(await checkForUpdate(args),'staged');
  assert.deepEqual(calls.map(x=>x[0]),['download','delay','next']);
  assert.equal(calls[0][1].checksum,manifest.checksum);
  assert.deepEqual(calls[1][1],{delayConditions:[{kind:'kill'}]});
});
test('reports download state so the app can show visible progress',async()=>{
  const {args}=setup();const states=[];args.onStatus=(status)=>states.push(status);
  assert.equal(await checkForUpdate(args),'staged');
  assert.deepEqual(states,['downloading','downloaded']);
});
test('failed download cannot become the next bundle',async()=>{
  const {calls,args}=setup({downloadFails:true});await assert.rejects(checkForUpdate(args),/network interrupted/);
  assert.deepEqual(calls.map(x=>x[0]),['download']);
});
test('rolled-back bundle is not retried',async()=>{
  const {calls,args}=setup({bundles:[{version,status:'error'}]});assert.equal(await checkForUpdate(args),'rejected');assert.equal(calls.length,0);
});
test('pending update does not download twice',async()=>{
  const {calls,args}=setup({pending:{version}});assert.equal(await checkForUpdate(args),'pending');assert.equal(calls.length,0);
});
test('missing feed leaves bundled app usable',async()=>{
  const {calls,args}=setup({status:404});assert.equal(await checkForUpdate(args),'unavailable');assert.equal(calls.length,0);
});
test('malformed feed never stages a bundle',async()=>{
  const {calls,args}=setup({data:'not JSON'});await assert.rejects(checkForUpdate(args));assert.equal(calls.length,0);
});
test('unchanged built-in release is not downloaded',async()=>{
  const {calls,args}=setup();args.bundledVersion=version;assert.equal(await checkForUpdate(args),'unchanged');assert.equal(calls.length,0);
});
