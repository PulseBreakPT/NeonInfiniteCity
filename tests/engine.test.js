import test from 'node:test';
import assert from 'node:assert/strict';
import {makePerson,advance,act,choose,loadSave,availableJobs} from '../src/engine.js';
test('character setup and progression',()=>{const p=makePerson({first:'Teste'});assert.equal(p.age,0);assert.equal(advance(p).ok,true);assert.equal(p.age,1);});
test('activities have age restrictions',()=>{const p=makePerson();assert.equal(act(p,'buyhome').ok,false);});
test('job qualification is age dependent',()=>{const p=makePerson();assert.equal(availableJobs(p).some(j=>j.qualified),false);});
test('saves parse safely',()=>{assert.equal(loadSave('{bad'),null);assert.equal(loadSave('{}'),null);});
test('pending decisions block aging',()=>{const p=makePerson();p.pending={icon:'?',title:'X',text:'Y',options:[{label:'A',effect:{happiness:4},text:'OK'}]};assert.equal(advance(p).ok,false);assert.equal(choose(p,0).ok,true);});
