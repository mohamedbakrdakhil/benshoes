const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=name=>fs.readFileSync(path.join(__dirname,'../src/scripts',name),'utf8');

function horloge(){
  let now=0,id=0;
  const frames=new Map(),timers=new Map(),events={};
  const document={hidden:false,addEventListener:(name,fn)=>(events[name]??=[]).push(fn),documentElement:{style:{setProperty(){}}}};
  const ctx=vm.createContext({document,window:{},scrollY:0,innerWidth:1440,innerHeight:900,
    matchMedia:()=>({matches:false}),performance:{now:()=>now},
    requestAnimationFrame:fn=>{frames.set(++id,{fn,at:now+1000/60});return id;},
    cancelAnimationFrame:key=>frames.delete(key),setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},
    clearTimeout:key=>timers.delete(key),$:()=>null,console});
  vm.runInContext(code('11-moteur.js'),ctx);
  const avancer=ms=>{
    const end=now+ms;
    for(let guard=0;guard<10000;guard++){
      let next=null,map=null,key=null;
      for(const collection of [frames,timers])for(const [k,value] of collection){
        if(value.at<=end&&(!next||value.at<next.at)){next=value;map=collection;key=k;}
      }
      if(!next)break;
      now=next.at;map.delete(key);next.fn(now);
    }
    now=end;
  };
  return {ctx,document,frames,timers,avancer,fire:name=>(events[name]||[]).forEach(fn=>fn())};
}

test('le moteur termine une interpolation puis ne travaille plus au repos',()=>{
  const h=horloge();let calls=0;
  h.ctx.task=()=>++calls<4;
  vm.runInContext('avancer(task);reveiller();reveiller();',h.ctx);
  h.avancer(1000);
  assert.equal(calls,4);
  assert.equal(h.frames.size+h.timers.size,0);
  h.avancer(1000);assert.equal(calls,4);
});

test('le décor à 30 fps ne force pas 60 images; un scroll interrompt immédiatement son attente',()=>{
  const h=horloge();let calls=0;
  h.ctx.task=()=>{calls++;return 1000/30;};
  vm.runInContext('avancer(task);reveiller();',h.ctx);
  h.avancer(1000);
  assert.ok(calls>=27&&calls<=32,`cadence=${calls}`);
  if(!h.timers.size)h.avancer(1000/60);
  assert.equal(h.timers.size,1);
  vm.runInContext('reveiller()',h.ctx);
  assert.equal(h.timers.size,0);assert.equal(h.frames.size,1);
});

test('un onglet masqué annule les réveils, sans travail supplémentaire',()=>{
  const h=horloge();let calls=0;
  h.ctx.task=()=>{calls++;return 40;};
  vm.runInContext('avancer(task);reveiller();',h.ctx);h.avancer(50);
  h.document.hidden=true;h.fire('visibilitychange');const before=calls;
  h.avancer(2000);
  assert.equal(calls,before);assert.equal(h.frames.size+h.timers.size,0);
  vm.runInContext('reveiller()',h.ctx);assert.equal(h.frames.size,0);
});

function visite({motion=true,width=1440}={}){
  const tasks=[],observers=[],events={};let builds=0;
  const zones=Object.fromEntries(['fes','seuil','allee','salle'].map(k=>[k,{style:{}}]));
  const world={style:{},querySelector:selector=>zones[selector.match(/"(.+)"/)[1]],querySelectorAll:()=>[]};
  const caps=[{dataset:{a:'0',b:'.5'},style:{}},{dataset:{a:'.5',b:'1.01'},style:{}}];
  const section={querySelectorAll:()=>caps,addEventListener:(name,fn)=>events[name]=fn};
  class IO{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
  const ctx=vm.createContext({innerWidth:width,CATALOG:[],MOTION:motion,sessionStorage:{getItem:()=>0,setItem(){}},
    setTimeout(){},console,IntersectionObserver:IO,scrollY:0,GEO:{vTop:0,vSpan:1000,vh:900},
    $:selector=>selector==='#visite'?section:selector==='#world'?world:null,
    mesurer(){},reveiller(){},degrader(e){throw Error(e);},avancer:fn=>tasks.push(fn),borne:(v,a,b)=>Math.max(a,Math.min(b,v))});
  ctx.self=ctx;
  vm.runInContext(code('12-visite.js'),ctx);
  ctx.recordBuild=()=>builds++;
  vm.runInContext('buildWorld=recordBuild;',ctx);
  return {ctx,tasks,observers,section,world,zones,events,get builds(){return builds;}};
}

test('la 3D est construite une fois à proximité, jamais pour le mouvement réduit',()=>{
  const h=visite();vm.runInContext('initVisite()',h.ctx);
  assert.equal(h.builds,0);
  h.observers[0].fn([{isIntersecting:false}]);assert.equal(h.builds,0);
  h.observers[0].fn([{isIntersecting:true}]);assert.equal(h.builds,1);
  h.observers[0].fn([{isIntersecting:true}]);assert.equal(h.builds,1);
  const reduced=visite({motion:false});vm.runInContext('initVisite()',reduced.ctx);
  assert.equal(reduced.builds,0);assert.equal(reduced.observers.length,0);
});

test('la caméra cesse de demander des images au repos et les chapitres sont immédiats',()=>{
  const h=visite();h.ctx.section=h.section;h.ctx.world=h.world;
  vm.runInContext('installerVisite(section,world)',h.ctx);
  const camera=h.tasks[0];assert.equal(camera(.016,0),false);
  h.events['benka:visitejump']();assert.equal(camera(.016,940),false);
  const final=h.world.style.transform;
  assert.match(final,/rotateY\(90\.00deg\)/);
  assert.equal(camera(.016,940),false);assert.equal(h.world.style.transform,final);
  camera(.016,4000);
  assert.ok(Object.values(h.zones).every(z=>z.style.display==='none'));
});
