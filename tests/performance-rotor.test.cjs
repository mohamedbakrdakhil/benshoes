const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/scripts/07-fiche.js'),'utf8');

function cible(){
  const events=new Map();
  return {
    addEventListener(n,f){if(!events.has(n))events.set(n,new Set());events.get(n).add(f);},
    removeEventListener(n,f){events.get(n)?.delete(f);},
    emit(n,e={}){for(const f of [...(events.get(n)||[])])f(e);},
    listenerCount(){return [...events.values()].reduce((n,s)=>n+s.size,0);}
  };
}
function harness({observer=true,motion=true}={}){
  let current=null,nextTimer=1;
  const images=[],observers=[],intervals=new Map();
  const classes=new Set();
  const boutique={classList:{contains:n=>classes.has(n)}};
  const document=Object.assign(cible(),{hidden:false,querySelector:s=>s==='.rotor'?current:s==='#shopview'?boutique:null});
  class Image {
    constructor(){images.push(this);this.assignments=[];}
    set src(value){this._src=value;this.assignments.push(value);}
    get src(){return this._src;}
  }
  class IntersectionObserver {
    constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this);}
    observe(target){this.target=target;}
    disconnect(){this.disconnected=true;}
    intersect(value){this.callback([{target:this.target,isIntersecting:value}]);}
  }
  const env={document,navigator:{},Image,MOTION:motion,
    self:{IntersectionObserver:observer?IntersectionObserver:undefined},
    IntersectionObserver:observer?IntersectionObserver:undefined,
    setInterval:f=>{const id=nextTimer++;intervals.set(id,f);return id;},
    clearInterval:id=>intervals.delete(id)};
  const context=vm.createContext(env);vm.runInContext(source,context);
  const maj=()=>vm.runInContext('majRotor()',context);
  return {
    document,images,observers,intervals,classes,maj,
    open(color='noir'){
      if(current)current.isConnected=false;
      const vue={style:{}};
      const rotor=Object.assign(cible(),{
        isConnected:true,dataset:{src:`${color}.webp`,repli:`${color}.jpg`},vue,
        classList:{add(){},remove(){}},querySelector:()=>vue,setPointerCapture(){},
        remove(){this.isConnected=false;if(current===this)current=null;}
      });
      current=rotor;maj();return rotor;
    },
    close(){if(current)current.isConnected=false;current=null;maj();},
    tick(){for(const f of [...intervals.values()])f();}
  };
}

test('une image terminée après fermeture ne relance pas un rotor détaché',()=>{
  const h=harness({observer:false}),r=h.open();
  const lateLoad=h.images[0].onload,lateError=h.images[0].onerror;
  h.close();lateLoad();lateError();
  assert.equal(h.intervals.size,0);
  assert.equal(r.vue.style.backgroundImage,undefined);
  assert.equal(h.images[0].assignments.length,1,'pas de téléchargement JPEG après fermeture');
  assert.equal(h.document.listenerCount(),0);
});

test('le chargement d’un ancien coloris ne remplace ni ne multiplie la rotation courante',()=>{
  const h=harness({observer:false}),ancien=h.open('beige');
  const lateLoad=h.images[0].onload,lateError=h.images[0].onerror;
  const courant=h.open('noir');
  h.images[1].onload();
  assert.equal(h.intervals.size,1);
  lateLoad();lateError();
  assert.equal(h.intervals.size,1);
  assert.equal(ancien.vue.style.backgroundImage,undefined);
  assert.equal(courant.vue.style.backgroundImage,'url("noir.webp")');
  h.tick();assert.notEqual(courant.vue.style.backgroundPosition,'0% 0%');
  h.close();assert.equal(h.intervals.size,0);
});

test('la rotation s’arrête hors écran, en arrière-plan et pendant la pause du décor',()=>{
  const h=harness(),r=h.open();h.images[0].onload();
  assert.equal(h.intervals.size,0,'aucune rotation avant visibilité');
  h.observers[0].intersect(true);assert.equal(h.intervals.size,1);
  h.tick();const position=r.vue.style.backgroundPosition;
  h.observers[0].intersect(false);h.tick();
  assert.equal(h.intervals.size,0);assert.equal(r.vue.style.backgroundPosition,position);
  h.observers[0].intersect(true);assert.equal(h.intervals.size,1);
  h.document.hidden=true;h.document.emit('visibilitychange');assert.equal(h.intervals.size,0);
  h.document.hidden=false;h.document.emit('visibilitychange');assert.equal(h.intervals.size,1);
  h.classes.add('bf-paused');h.document.emit('benka:motionchange');assert.equal(h.intervals.size,0);
  h.classes.delete('bf-paused');h.document.emit('benka:motionchange');assert.equal(h.intervals.size,1);
  h.close();assert.equal(r.listenerCount(),0);assert.equal(h.document.listenerCount(),0);
  assert.equal(h.observers[0].disconnected,true);
});

test('le geste manuel reste disponible et ne redémarre pas automatiquement',()=>{
  const h=harness(),r=h.open();h.observers[0].intersect(true);h.images[0].onload();
  let prevented=false;
  r.emit('keydown',{key:'ArrowRight',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(h.intervals.size,0);
  assert.equal(r.vue.style.backgroundPosition,'20% 0%');
  h.observers[0].intersect(false);h.observers[0].intersect(true);
  h.document.emit('visibilitychange');assert.equal(h.intervals.size,0);
});

test('sans IntersectionObserver, la visibilité de l’onglet suffit à suspendre la rotation',()=>{
  const h=harness({observer:false});h.open();h.images[0].onload();
  assert.equal(h.intervals.size,1);
  h.document.hidden=true;h.document.emit('visibilitychange');assert.equal(h.intervals.size,0);
  h.close();assert.equal(h.document.listenerCount(),0);
});

test('mouvement réduit : image et clavier fonctionnent sans intervalle',()=>{
  const h=harness({motion:false}),r=h.open();h.observers[0].intersect(true);h.images[0].onload();
  assert.equal(h.intervals.size,0);assert.equal(r.vue.style.backgroundImage,'url("noir.webp")');
  r.emit('keydown',{key:'ArrowLeft',preventDefault(){}});
  assert.equal(r.vue.style.backgroundPosition,'100% 100%');
});
