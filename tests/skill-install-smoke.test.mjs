import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {checkSkillCopies} from '../scripts/skill-install-smoke.mjs';

test('installed skill files must match trusted checkout; changed or symlinked files fail',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'ghostproof-host-'));
 const checkout=path.join(dir,'checkout'),home=path.join(dir,'home');
 const files=['.agents/skills/ghostproof/SKILL.md','.claude/skills/ghostproof/SKILL.md'];
 try {
   for(const file of files){
     for(const root of [checkout,home]){
       const out=path.join(root,file);
       mkdirSync(path.dirname(out),{recursive:true});
       writeFileSync(out,'---\nname: ghostproof\n---\n');
     }
   }
   assert.equal(checkSkillCopies(home,checkout).passed,true);
   writeFileSync(path.join(home,files[0]),'outdated');
   assert.equal(checkSkillCopies(home,checkout).passed,false);
   rmSync(path.join(home,files[1]));
   symlinkSync(path.join(checkout,files[1]),path.join(home,files[1]));
   assert.equal(checkSkillCopies(home,checkout).passed,false);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
