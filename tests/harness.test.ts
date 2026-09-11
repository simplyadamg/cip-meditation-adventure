import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('dry-run reports bounded plan without launching Codex',()=>{
 const p=spawnSync(process.execPath,['scripts/harness.mjs','--dry-run','--iterations','3'],{encoding:'utf8'});
 assert.equal(p.status,0);const plan=JSON.parse(p.stdout);assert.equal(plan.iterations,3);assert.equal(plan.launchesAgent,false);assert.equal(plan.perIterationMinutes,20);assert.equal(plan.maxElapsedMinutes,60);assert.equal(plan.model,'configured default');
});
test('runner rejects unbounded or malformed iteration counts before doing work',()=>{
 for(const count of ['0','11','Infinity','-1','1.2','nope']){
   const p=spawnSync(process.execPath,['scripts/harness.mjs','--dry-run','--iterations',count],{encoding:'utf8'});assert.notEqual(p.status,0);
 }
});
test('feature dependencies are valid and final production requires review',()=>{
 const d=JSON.parse(readFileSync('harness/features.json','utf8'));const ids=new Set(d.features.map((f:{id:string})=>f.id));assert.equal(ids.size,d.features.length);
 for(const f of d.features){assert.ok(f.acceptance.length);for(const dep of f.dependsOn)assert.ok(ids.has(dep));}
 assert.equal(d.reviewApproved,false);assert.equal(d.features.find((f:{id:string})=>f.id==='G02').dependsOn[0],'R01');
});
