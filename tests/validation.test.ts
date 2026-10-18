import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { hash, validateSnapshot, validateComparison, validateRequest } from '../scripts/validate.ts';
const temporary = resolve('e2e/tmp'); mkdirSync(temporary,{recursive:true});
function fixture(action: (root: string, snapshot: any, comparison: any, save: () => void) => void) {
  const root = mkdtempSync(resolve(temporary,'validation-'));
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  writeFileSync(resolve(root,'reference.png'),png); writeFileSync(resolve(root,'ui.png'),png);
  const snapshot={schema_version:1,snapshot_id:'snapshot-one',captured_at:'2026-10-18T10:00:00Z',source:{provider:'figma',instance_url:'https://www.figma.com',document_id:'file-one',version:'version-one',provenance:'Test fixture, not remote evidence'},references:[{id:'screen-one',node_id:'1:2',label:'Screen',export_scale:1,variant:null,viewport:{width:390,height:844},theme:'light',locale:'ru',state:'ready',resource_id:'reference-one'}],resources:[{id:'reference-one',role:'reference',artifact:{path:'reference.png',sha256:hash(png),media_type:'image/png'},source:'test fixture',distribution:'allowed',parent_id:null,transform:null}],limitations:[]};
  const comparison={schema_version:3,request:{path:'request.json',sha256:''},comparison_id:'review-one',created_at:'2026-10-18T10:02:00Z',snapshot:{path:'snapshot.json',sha256:''},pairs:[{id:'pair-one',scope:'Review fixture screen',comparability:{assessed:true,checks:Object.fromEntries(['state','viewport','scale','theme','locale','content','scroll_crop','fonts','animations'].map(key=>[key,'comparable'])),notes:'Controlled test fixture; no live visual assessment'},reference_id:'screen-one',ui:{repository:'example',revision:'test-revision',local_changes:false,provenance:'Synthetic test fixture',run_id:'run-one',spec:{path:'e2e/example.spec.ts',sha256:'a'.repeat(64)},step:'screen-visible',profile:'mobile',attempt:1,captured_at:'2026-10-18T10:01:00Z',viewport:{width:390,height:844},dpr:1,theme:'light',locale:'ru',state:'ready',artifact:{path:'ui.png',sha256:hash(png),media_type:'image/png'}},status:'matched',findings:[],limitations:[]}],limitations:[]};
  const request={schema_version:1,review_id:comparison.comparison_id,requested_at:'2026-10-18T09:00:00Z',pairs:comparison.pairs.map(p=>({id:p.id,scope:p.scope}))};
  const requestBytes=JSON.stringify(request);writeFileSync(resolve(root,'request.json'),requestBytes);comparison.request.sha256=hash(requestBytes);
  const save=()=>{const bytes=JSON.stringify(snapshot);writeFileSync(resolve(root,'snapshot.json'),bytes);comparison.snapshot.sha256=hash(bytes);writeFileSync(resolve(root,'comparison.json'),JSON.stringify(comparison));};
  save();try{action(root,snapshot,comparison,save);}finally{rmSync(root,{recursive:true,force:true});}
}
test('valid snapshot and matched pair accepted',()=>fixture((root)=>{assert.equal(validateSnapshot(root,'snapshot.json').snapshot_id,'snapshot-one');assert.equal(validateComparison(root,'comparison.json').pairs[0].status,'matched');}));
test('format checker rejects invalid dates and unknown schema versions',()=>fixture((root,s,c,save)=>{s.captured_at='2026-02-30T10:00:00Z';save();assert.throws(()=>validateSnapshot(root,'snapshot.json'));s.captured_at='2026-10-18T10:00:00Z';s.schema_version=2;save();assert.throws(()=>validateSnapshot(root,'snapshot.json'));}));
test('missing original, bad hashes and duplicate resource IDs fail',()=>fixture((root,s,c,save)=>{s.references[0].resource_id='missing';save();assert.throws(()=>validateSnapshot(root,'snapshot.json'),/original/);s.references[0].resource_id='reference-one';s.resources[0].artifact.sha256='b'.repeat(64);save();assert.throws(()=>validateSnapshot(root,'snapshot.json'),/Hash/);s.resources.push(structuredClone(s.resources[0]));save();assert.throws(()=>validateSnapshot(root,'snapshot.json'),/duplicate/);}));
test('traversal and symlink escape rejected',()=>fixture((root,s,c,save)=>{s.resources[0].artifact.path='../outside.png';save();assert.throws(()=>validateSnapshot(root,'snapshot.json'));symlinkSync(resolve('package.json'),resolve(root,'outside'));s.resources[0].artifact.path='outside';save();assert.throws(()=>validateSnapshot(root,'snapshot.json'),/escapes/);}));
test('unknown version requires explicit limitation',()=>fixture((root,s,c,save)=>{s.source.version=null;save();assert.throws(()=>validateSnapshot(root,'snapshot.json'),/limitations/);s.limitations.push('Provider version unavailable');save();assert.ok(validateSnapshot(root,'snapshot.json'));}));
test('derived resource cannot form a cycle',()=>fixture((root,s,c,save)=>{s.resources.push({...structuredClone(s.resources[0]),id:'derived-one',role:'derived',parent_id:'derived-one',transform:'annotation'});save();assert.throws(()=>validateSnapshot(root,'snapshot.json'),/cycle/);}));
test('UI evidence binds to snapshot hash and known reference',()=>fixture((root,s,c,save)=>{c.pairs[0].reference_id='missing';save();assert.throws(()=>validateComparison(root,'comparison.json'),/Unknown reference/);c.pairs[0].reference_id='screen-one';save();c.snapshot.sha256='b'.repeat(64);writeFileSync(resolve(root,'comparison.json'),JSON.stringify(c));assert.throws(()=>validateComparison(root,'comparison.json'),/Snapshot hash/);}));
test('different viewport is inconclusive, never matched',()=>fixture((root,s,c,save)=>{c.pairs[0].ui.viewport.width=1440;save();assert.throws(()=>validateComparison(root,'comparison.json'),/Different conditions/);c.pairs[0].status='inconclusive';c.pairs[0].limitations=['No desktop reference'];c.pairs[0].comparability.checks.viewport='different';save();assert.ok(validateComparison(root,'comparison.json'));}));
test('mismatch requires finding and matched cannot hide it',()=>fixture((root,s,c,save)=>{c.pairs[0].status='mismatch';save();assert.throws(()=>validateComparison(root,'comparison.json'),/requires mismatch/);c.pairs[0].findings.push({id:'finding-one',category:'layout',region:'header',expected:'Aligned title',observed:'Title overlaps navigation',impact:'major',confidence:'high',verdict:'mismatch'});save();assert.ok(validateComparison(root,'comparison.json'));c.pairs[0].status='matched';save();assert.throws(()=>validateComparison(root,'comparison.json'),/unresolved/);}));
test('missing sources remain explicit without fabricated files',()=>fixture((root,s,c)=>{
  c.snapshot=null;const pair=c.pairs[0];pair.reference_id=null;pair.ui=null;pair.status='not-reviewed';pair.limitations=['No UI capture or design reference supplied'];pair.comparability={assessed:false,checks:Object.fromEntries(Object.keys(pair.comparability.checks).map(key=>[key,'unknown'])),notes:'Sources unavailable'};
  const write=()=>writeFileSync(resolve(root,'comparison.json'),JSON.stringify(c));write();assert.ok(validateComparison(root,'comparison.json'));
  pair.status='matched';write();assert.throws(()=>validateComparison(root,'comparison.json'),/both original/);
}));
test('unknown fonts or unassessed conditions cannot yield matched',()=>fixture((root,s,c,save)=>{
  c.pairs[0].comparability.checks.fonts='unknown';save();assert.throws(()=>validateComparison(root,'comparison.json'),/comparable/);
  c.pairs[0].status='inconclusive';c.pairs[0].limitations=['Font availability unknown'];save();assert.ok(validateComparison(root,'comparison.json'));
  c.pairs[0].comparability.assessed=false;save();assert.throws(()=>validateComparison(root,'comparison.json'),/must be unknown/);
}));
test('reject stale comparison format and capture after review',()=>fixture((root,s,c,save)=>{
  c.schema_version=1;save();assert.throws(()=>validateComparison(root,'comparison.json'));
  c.schema_version=3;c.pairs[0].ui.captured_at='2026-10-19T10:00:00Z';save();assert.throws(()=>validateComparison(root,'comparison.json'),/later/);
}));

test('request pins identity, scope and all pairs even when unreviewed',()=>fixture((root,s,c,save)=>{
  c.pairs.push({...structuredClone(c.pairs[0]),id:'unrequested'});save();assert.throws(()=>validateComparison(root,'comparison.json'),/coverage/);
}));
test('changed scope and request bytes cannot silently narrow review',()=>fixture((root,s,c,save)=>{
  c.pairs[0].scope='Only a smaller area';save();assert.throws(()=>validateComparison(root,'comparison.json'),/scope changed/);
  writeFileSync(resolve(root,'request.json'),'{}');assert.throws(()=>validateComparison(root,'comparison.json'),/Request hash/);
}));
test('request rejects duplicate IDs, unknown fields and invalid date',()=>fixture((root,s,c)=>{
  const request:any={schema_version:1,review_id:c.comparison_id,requested_at:'2026-10-18T09:00:00Z',pairs:[{id:'one',scope:'Header'}]};
  const write=()=>writeFileSync(resolve(root,'request.json'),JSON.stringify(request));
  request.pairs.push({...request.pairs[0]});write();assert.throws(()=>validateRequest(root,'request.json'),/duplicate/);
  request.pairs.pop();request.unknown=true;write();assert.throws(()=>validateRequest(root,'request.json'));
  delete request.unknown;request.requested_at='2026-02-30T09:00:00Z';write();assert.throws(()=>validateRequest(root,'request.json'));
}));

test('inconclusive does not allow comparable flags that contradict recorded sources',()=>fixture((root,s,c,save)=>{
  const pair=c.pairs[0];pair.status='inconclusive';pair.limitations=['Conditions differ'];
  for(const key of ['theme','locale','state']) {
    const previous=pair.ui[key];pair.ui[key]='different';save();
    assert.throws(()=>validateComparison(root,'comparison.json'),new RegExp(`Contradictory comparable condition: ${key}`));
    pair.comparability.checks[key]='different';save();assert.ok(validateComparison(root,'comparison.json'));
    pair.ui[key]=previous;pair.comparability.checks[key]='comparable';
  }
  pair.ui.viewport.width+=1;save();assert.throws(()=>validateComparison(root,'comparison.json'),/Contradictory comparable condition: viewport/);
  pair.comparability.checks.viewport='unknown';save();assert.ok(validateComparison(root,'comparison.json'));
}));
