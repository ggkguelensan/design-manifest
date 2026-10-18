import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateAdaptation } from '../scripts/adaptation.ts';
function fixture(action: (f: any) => void) {
  mkdirSync('e2e/tmp', { recursive: true }); const root = mkdtempSync(resolve('e2e/tmp/adaptation-'));
  const base = resolve(root, 'base'), target = resolve(root, 'product/apps/web'), dir = resolve(base, 'workdir/frontend/web');
  const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false',...args], {cwd,encoding:'utf8',stdio:'pipe'}).trim();
  mkdirSync(dir, {recursive:true});mkdirSync(target,{recursive:true});
  writeFileSync(resolve(base,'.gitignore'), '/workdir/\n');
  git(base,'init','-b','dev');git(base,'add','.');git(base,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','base');
  git(resolve(root,'product'),'init','-b','task');
  mkdirSync(resolve(dir,'resources'));
  const body='Local export supplied for the confirmed reservation state. No permission to modify source.';
  writeFileSync(resolve(dir,'resources/reference.md'),body);
  const data:any={schema_version:1,base_revision:git(base,'rev-parse','HEAD'),repository_id:'frontend',target_id:'web',modules:['local'],sources:[{id:'reservation',module:'local',resource:{path:'resources/reference.md',sha256:createHash('sha256').update(body).digest('hex')}}]};
  const save=()=>writeFileSync(resolve(dir,'manifest.json'),JSON.stringify(data));save();
  const check=()=>validateAdaptation(dir,base,target,'frontend','web');
  try {action({root,base,target,dir,data,save,check});} finally {rmSync(root,{recursive:true,force:true});}
}
test('standalone adaptation validates selected target and source without provider access',()=>fixture(({check})=>{assert.deepEqual(check().modules,['local']);}));
test('unknown formats settings identities and stale pins are rejected',()=>fixture(({data,save,check})=>{
 data.schema_version=2;save();assert.throws(check,/schema/);data.schema_version=1;
 data.viewport={width:390};save();assert.throws(check,/schema/);delete data.viewport;
 data.target_id='other';save();assert.throws(check,/identity/);data.target_id='web';
 data.base_revision='0'.repeat(40);save();assert.throws(check,/revision/);
}));
test('unselected modules duplicate IDs and changed resources are rejected',()=>fixture(({data,save,check,dir})=>{
 data.sources[0].module='figma';save();assert.throws(check,/unselected/);data.sources[0].module='local';
 data.sources.push(structuredClone(data.sources[0]));save();assert.throws(check,/Duplicate/);data.sources.pop();save();
 writeFileSync(resolve(dir,'resources/reference.md'),'changed');assert.throws(check,/hash/);
}));
test('dirty base and escaped resource cannot be activated',()=>fixture(({base,dir,data,save,check})=>{
 writeFileSync(resolve(base,'unexpected'),'dirty');assert.throws(check,/local changes/);rmSync(resolve(base,'unexpected'));
 symlinkSync(resolve(base,'.gitignore'),resolve(dir,'resources/escape.md'));data.sources[0].resource.path='resources/escape.md';save();assert.throws(check,/escapes/);
}));
