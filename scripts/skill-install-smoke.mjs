#!/usr/bin/env node
import {readFileSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const paths=[['Codex','.agents/skills/ghostproof/SKILL.md'],['Claude Code','.claude/skills/ghostproof/SKILL.md']];
function bytes(path) {
  try {
    const s=lstatSync(path);
    if(!s.isFile() || s.isSymbolicLink() || s.size > 65536) return null;
    return readFileSync(path);
  } catch {return null;}
}
export function checkSkillCopies(home=homedir(),checkout=root) {
  const entries=paths.map(([host,p])=>{
    const reference=bytes(join(checkout,p)), installed=bytes(join(home,p));
    return {host,path:join(home,p),present:Boolean(installed),matchesCheckout:Boolean(reference&&installed&&reference.equals(installed))};
  });
  return {passed:entries.every(x=>x.matchesCheckout),entries,
    note:'This checks installed files, not whether a running Codex or Claude model discovered or invoked the skill.'};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=checkSkillCopies();
  for(const item of result.entries) console.log(item.host+': '+(item.matchesCheckout?'PASS':'MISSING OR OUTDATED')+' | '+item.path);
  console.log(result.note);
  if(!result.passed) process.exitCode=1;
}
