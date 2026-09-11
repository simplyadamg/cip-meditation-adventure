import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitFlag = args.indexOf('--iterations');
const iterations = limitFlag < 0 ? 1 : Number(args[limitFlag + 1]);
if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10) throw new Error('Iterations must be 1–10.');
const root = process.cwd();
const readFeatures = () => JSON.parse(readFileSync('harness/features.json', 'utf8'));
const criteria = data => JSON.stringify(data.features.map(({status,evidence,...item}) => item));
const digest = () => createHash('sha256').update(readFileSync('harness/features.json')).update(readFileSync('harness/progress.md')).update(spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout || '').digest('hex');
const eligible = data => data.features.filter(f => f.milestone === data.currentMilestone && f.status !== 'verified' && f.dependsOn.every(id => data.features.find(x=>x.id===id)?.status === 'verified'));
const initial = readFeatures();
if (initial.currentMilestone === 'full-neighborhood' && !initial.reviewApproved) throw new Error('The sample review gate is not approved.');
if (dryRun) {
  console.log(JSON.stringify({iterations,perIterationMinutes:20,maxElapsedMinutes:60,milestone:initial.currentMilestone,eligible:eligible(initial).map(x=>x.id),command:['codex','exec','--sandbox','workspace-write','--json','--output-schema','harness/output.schema.json'],model:'configured default',launchesAgent:false},null,2));
  process.exit(0);
}
if(spawnSync('git',['rev-parse','--is-inside-work-tree'],{stdio:'ignore'}).status!==0) throw new Error('Initialize the project Git repository before running the harness.');
if(spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout.trim()) throw new Error('Commit or set aside existing changes before an automated run.');
const started = Date.now();
const originalCriteria = criteria(initial);
for(let i=0;i<iterations;i++) {
  const data = readFeatures();
  if(data.features.filter(f=>f.milestone===data.currentMilestone).every(f=>f.status==='verified')) { console.log('Milestone verified. Stop for user review.'); break; }
  if(!eligible(data).length) { console.log('No eligible feature. Resolve dependencies or review before continuing.'); break; }
  const remaining=60*60_000-(Date.now()-started);
  if(remaining<=0) break;
  const runDir=resolve('.harness/runs',`${new Date().toISOString().replaceAll(':','-')}-${i+1}`);
  mkdirSync(runDir,{recursive:true});
  const before=digest();
  const output=resolve(runDir,'result.json');
  const log=openSync(resolve(runDir,'events.jsonl'),'w');
  const err=openSync(resolve(runDir,'stderr.log'),'w');
  const prompt=readFileSync('harness/worker.md','utf8');
  const child=spawn('codex',['exec','--sandbox','workspace-write','--json','--output-schema',resolve('harness/output.schema.json'),'--output-last-message',output,'-'],{cwd:root,stdio:['pipe',log,err],detached:process.platform!=='win32'});
  let timeout=false;
  const killGroup=signal=>{try {process.kill(process.platform==='win32'?child.pid:-child.pid,signal);}catch{}};
  let force;
  const timer=setTimeout(()=>{timeout=true;killGroup('SIGTERM');force=setTimeout(()=>killGroup('SIGKILL'),5000);},Math.min(20*60_000,remaining));
  child.stdin.end(prompt);
  const code=await new Promise((resolve,reject)=>{child.on('close',resolve);child.on('error',reject);}).finally(()=>{clearTimeout(timer);clearTimeout(force);closeSync(log);closeSync(err);});
  if(timeout || code!==0) { console.error('Iteration stopped. Inspect local run logs; no automatic retry.'); process.exitCode=1; break; }
  const result=JSON.parse(readFileSync(output,'utf8'));
  const after=readFeatures();
  if(criteria(after)!==originalCriteria || after.currentMilestone!==initial.currentMilestone || after.reviewApproved!==initial.reviewApproved) throw new Error('Worker changed protected criteria or gate. Stop for inspection.');
  if(!['progress','blocked','ready_for_review'].includes(result.status)) throw new Error('Invalid structured status.');
  const validation=spawnSync('npm',['run','check'],{stdio:'inherit'});
  writeFileSync(resolve(runDir,'validation.json'),JSON.stringify({exitCode:validation.status,featureId:result.featureId,time:new Date().toISOString()},null,2));
  if(validation.status!==0){process.exitCode=1;break;}
  console.log(result.summary);
  if(result.status==='blocked') break;
  if(before===digest()) {console.log('No durable progress; stop rather than loop.');break;}
  if(result.status==='ready_for_review') {
    if(!after.features.filter(f=>f.milestone===after.currentMilestone).every(f=>f.status==='verified'&&f.evidence.length)) throw new Error('Readiness claim lacks verified feature evidence.');
    console.log('Ready for user review.');break;
  }
}
