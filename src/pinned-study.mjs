import { createHash } from 'node:crypto';
import { analyzeSource } from './scanner.mjs';

const MAX_BYTES = 512 * 1024;
export const PINNED_SOURCES = Object.freeze([
  Object.freeze({ repository:'ReactiveCircus/android-emulator-runner', commit:'ed009f5318f15b1cf93a191b856c4f1748a2d4c1', path:'src/main.ts', gitBlobSha1:'a6c787e7489260719e28e56710fe899c404ba92c', observation:'no-await async logging blocks, GP001 precision control' }),
  Object.freeze({ repository:'mbnuqw/sidebery', commit:'aec831a48883597fa56e8511822d81bb14096e22', path:'src/utils.ts', gitBlobSha1:'61c15e738dbe06990a55f6d7708d36bc73006e66', observation:'async Promise executor GP002 triage candidates' }),
]);

const digest = (alg,bytes) => createHash(alg).update(bytes).digest('hex');
export const gitBlobSha1 = (bytes) => digest('sha1', Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'),bytes]));

async function readBounded(response) {
  if (response.status !== 200 || !response.body) throw new Error('Pinned fetch HTTP '+response.status);
  const declared = response.headers?.get?.('content-length');
  if (declared && Number(declared) > MAX_BYTES) throw new Error('Pinned source exceeds maximum bytes');
  const reader = response.body.getReader();
  let length=0;const pieces=[];
  try {
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) throw new Error('Pinned source exceeds maximum bytes');
      pieces.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(()=>{}); }
  return Buffer.concat(pieces,length);
}

/** Public source is read as data; no downloaded code is imported, built, or executed. */
export async function scanPinnedSource(spec,{fetcher=globalThis.fetch}={}) {
  const url='https://raw.githubusercontent.com/'+spec.repository+'/'+spec.commit+'/'+spec.path;
  const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'text/plain'}});
  const bytes=await readBounded(response);
  const actual=gitBlobSha1(bytes);
  if(actual !== spec.gitBlobSha1) throw new Error('Pinned Git blob identity mismatch: '+spec.repository+'/'+spec.path);
  const code=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const result=analyzeSource(code,spec.repository+'/'+spec.path);
  if(result.diagnostics.length) throw new Error('Pinned source parse diagnostics: '+spec.repository+'/'+spec.path);
  return {repository:spec.repository,commit:spec.commit,path:spec.path,url,
    gitBlobSha1:actual,sha256:digest('sha256',bytes),bytes:bytes.length,
    observation:spec.observation,evidenceLevel:'E0',candidateCount:result.findings.length,
    findings:result.findings};
}

export async function runPinnedStudy({fetcher=globalThis.fetch}={}) {
  const results=[];
  for (const spec of PINNED_SOURCES) results.push(await scanPinnedSource(spec,{fetcher}));
  return {schemaVersion:'0.5',kind:'pinned-public-e0-study',
    tool:{name:'ghostproof',version:'0.5.0',engine:'typescript-ast'},
    summary:{pinnedFiles:results.length,scannedFiles:results.length,candidates:results.reduce((n,v)=>n+v.candidateCount,0),confirmed:0},
    results,note:'Read-only fixed public-file E0 scan. Does not confirm external defects or execute target code.'};
}
