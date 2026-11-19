import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PINNED_SOURCES,gitBlobSha1,scanPinnedSource,runPinnedStudy} from '../src/pinned-study.mjs';
const identity = (code)=>gitBlobSha1(Buffer.from(code));
const sample=(code)=>({repository:'sample/repo',commit:'a'.repeat(40),path:'test.ts',gitBlobSha1:identity(code),observation:'test'});
const fake=(code,status=200)=>async(url,opts)=>{
  assert.ok(url.startsWith('https://raw.githubusercontent.com/sample/repo/'));
  assert.equal(opts.redirect,'error');
  return new Response(code,{status});
};
test('two real sources are fixed to 40-digit commits and Git objects',()=>{
  assert.equal(PINNED_SOURCES.length,2);
  for(const x of PINNED_SOURCES){assert.match(x.commit,/^[a-f0-9]{40}$/);assert.match(x.gitBlobSha1,/^[a-f0-9]{40}$/);}
});
test('Git blob identity is computed with the Git object header',()=>{
  const b=Buffer.from('hello\n');
  assert.equal(gitBlobSha1(b),createHash('sha1').update(Buffer.concat([Buffer.from('blob 6\0'),b])).digest('hex'));
});
test('AST scans verified pinned bytes and emits E0 candidate only',async()=>{
  const code='items.forEach(async item => { await save(item); });';
  const r=await scanPinnedSource(sample(code),{fetcher:fake(code)});
  assert.equal(r.candidateCount,1);
  assert.equal(r.findings[0].ruleId,'GP001');
  assert.equal(r.evidenceLevel,'E0');
  assert.match(r.sha256,/^[a-f0-9]{64}$/);
});
test('tampered bytes and invalid syntax are rejected before report',async()=>{
  await assert.rejects(()=>scanPinnedSource(sample('const ok = true;'),{fetcher:fake('const ok = false;')}),/blob identity mismatch/);
  await assert.rejects(()=>scanPinnedSource(sample('const ok = true;'),{fetcher:fake('x',404)}),/HTTP 404/);
  const bad='const invalid = ;';
  await assert.rejects(()=>scanPinnedSource(sample(bad),{fetcher:fake(bad)}),/parse diagnostics/);
});
test('public study refuses mismatched external inputs, never substitutes another revision',async()=>{
  await assert.rejects(()=>runPinnedStudy({fetcher:()=>Promise.resolve(new Response('wrong bytes'))}),/blob identity mismatch/);
});
