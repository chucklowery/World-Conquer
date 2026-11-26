"use strict";
// M5 sound pack: original sound effects and voice lines (CC0) for the files
// the engine plays (tiberiandawn/audio.cpp).
//
// - Effects (SoundEffectName, audio.cpp:52-205) are synthesised here from
//   noise, tones and envelopes. They go in SOUNDS.MIX as NAME.AUD.
// - Unit replies (the IN_VAR entries) are spoken lines, NAME.V00-.V03, one
//   voice per variant (audio.cpp:318-336).
// - COMMS announcements (Speech[], audio.cpp:354) are spoken lines through a
//   radio filter, NAME.AUD in SPEECH.MIX (read with CCFileClass,
//   audio.cpp:517).
// Voices come from the flite speech synthesiser (CMU; its voices are from
// the CMU ARCTIC and KAL databases, which allow free use and
// redistribution). flite's output is deterministic, so the pack stays
// reproducible.
//
// File format (common/audio.h AUDHeaderType): 12-byte header, then raw
// unsigned 8-bit mono PCM (compression 0: soundio_common.cpp:281 copies it
// unchanged).
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const cp=require("node:child_process");

const FX_RATE=22050,VOICE_RATE=11025;

// ---------- AUD ----------
function encodeAUD(samples,rate){
  const data=Buffer.alloc(samples.length);
  for(let i=0;i<samples.length;i++)data[i]=Math.max(0,Math.min(255,Math.round(128+samples[i]*127)));
  const h=Buffer.alloc(12);
  h.writeUInt16LE(rate,0);h.writeInt32LE(data.length,2);h.writeInt32LE(data.length,6);h[10]=0;h[11]=0;
  return Buffer.concat([h,data]);
}

// ---------- synthesis ----------
// Deterministic noise.
function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296*2-1;};}
const sec=(t,rate=FX_RATE)=>Math.round(t*rate);
function lowpass(x,cut,rate=FX_RATE){const a=1-Math.exp(-2*Math.PI*cut/rate);let y=0;return x.map(v=>y+=a*(v-y));}
function highpass(x,cut,rate=FX_RATE){const lp=lowpass(x,cut,rate);return x.map((v,i)=>v-lp[i]);}
function normalize(x,peak=0.9){const m=Math.max(1e-6,...x.map(Math.abs));return x.map(v=>v/m*peak);}
function mix(len,...parts){const out=new Array(len).fill(0);for(const [buf,at=0,gain=1] of parts)for(let i=0;i<buf.length&&at+i<len;i++)out[at+i]+=buf[i]*gain;return out;}
// Noise burst with an exponential decay, low-passed.
function burst(seed,dur,decay,cut,rate=FX_RATE){
  const r=rng(seed),n=sec(dur,rate);
  return lowpass(Array.from({length:n},(_,i)=>r()*Math.exp(-i/rate/decay)),cut,rate);
}
// Sine sweep with an envelope.
function tone(f0,f1,dur,{attack=0.005,decay=null,wave="sine",rate=FX_RATE}={}){
  const n=sec(dur,rate);let ph=0;
  return Array.from({length:n},(_,i)=>{
    const t=i/rate,f=f0+(f1-f0)*t/dur;ph+=2*Math.PI*f/rate;
    let v=wave==="square"?Math.sign(Math.sin(ph))*0.6:wave==="tri"?2/Math.PI*Math.asin(Math.sin(ph)):Math.sin(ph);
    const env=Math.min(1,t/attack)*(decay?Math.exp(-t/decay):Math.min(1,(dur-t)/0.02));
    return v*env;
  });
}
function shot(seed,{body=0.12,cut=3200,thump=120}={}){
  const crack=burst(seed,body,body/4,cut);
  const low=tone(thump,thump*0.5,body*1.5,{decay:body/2});
  return normalize(mix(Math.max(crack.length,low.length),[crack,0,1],[low,0,0.8]));
}
function bursts(seed,count,gap,opts){
  const one=i=>shot(seed+i*17,opts);
  const len=sec(gap*count+0.3);
  return normalize(mix(len,...Array.from({length:count},(_,i)=>[one(i),sec(gap*i),1-i*0.04])));
}
function cannon(seed,{size=1}={}){
  const crack=burst(seed,0.18,0.03,4200);
  const boom=lowpass(burst(seed+1,0.9*size,0.22*size,420),300);
  const thud=tone(70,38,0.6*size,{decay:0.18*size});
  return normalize(mix(sec(1.0*size),[crack,0,0.7],[boom,0,1.2],[thud,0,1]));
}
function explosion(seed,{size=1,crunch=0.5}={}){
  const body=lowpass(burst(seed,1.6*size,0.35*size,700),500);
  const debris=highpass(burst(seed+3,0.8*size,0.12*size,5000),900);
  const thud=tone(60,30,0.9*size,{decay:0.3*size});
  return normalize(mix(sec(1.8*size),[body,0,1.3],[debris,sec(0.02),crunch],[thud,0,1]));
}
function click(f=1800,dur=0.03){return normalize(mix(sec(dur+0.02),[tone(f,f*0.7,dur,{decay:dur/3}),0,1],[burst(5,dur,dur/4,6000),0,0.3]));}
function chime(notes,step=0.07,dur=0.22,wave="tri"){
  return normalize(mix(sec(step*notes.length+dur),...notes.map((f,i)=>[tone(f,f,dur,{decay:dur/3,wave}),sec(step*i),1])));
}
function crackle(seed,dur){const r=rng(seed),n=sec(dur);const x=new Array(n).fill(0);
  for(let i=0;i<n;i++)if(r()>0.985)for(let k=0;k<60&&i+k<n;k++)x[i+k]+=r()*Math.exp(-k/12);
  return normalize(lowpass(x,4000));}

// Effects by engine name. Only the ones a skirmish with the M5 roster can
// play are given distinct designs; the rest reuse the nearest design so no
// effect is silent.
function effects(){
  const fx={};
  fx.GUN18=shot(1,{body:0.10,cut:4500,thump:160});           // rifle
  fx.MGUN2=bursts(2,3,0.07,{body:0.08,cut:4800,thump:170});  // rifle triple burst
  fx.MGUN11=bursts(3,3,0.06,{body:0.08,cut:4200,thump:150});
  fx.GUN19=bursts(4,6,0.075,{body:0.09,cut:3800,thump:130}); // vehicle MG
  fx.GUN5=bursts(5,4,0.09,{body:0.10,cut:3400,thump:120});   // tower MG
  fx.GUN8=bursts(6,9,0.045,{body:0.06,cut:5000,thump:180});
  fx.TURRFIR5=lowpass(bursts(7,3,0.1,{body:0.12,cut:2000,thump:100}),1500);
  fx.GUN20=normalize(mix(sec(0.4),[tone(220,180,0.35,{decay:0.12,wave:"square"}),0,0.6],[burst(8,0.3,0.05,2500),0,1]));
  fx.TNKFIRE2=cannon(9);fx.TNKFIRE3=cannon(10,{size:0.9});fx.TNKFIRE4=cannon(11,{size:0.95});
  fx.TNKFIRE6=cannon(12,{size:1.2});fx.HVYGUN10=cannon(13,{size:1.1});
  fx.XPLOS=explosion(20,{size:0.6,crunch:0.8});fx.XPLOSML2=explosion(21,{size:0.7,crunch:0.6});
  fx.XPLODE=explosion(22,{size:1.0,crunch:0.3});fx.XPLOBIG4=explosion(23,{size:1.4,crunch:0.4});
  fx.XPLOBIG6=explosion(24,{size:1.5,crunch:0.5});fx.XPLOBIG7=explosion(25,{size:1.6,crunch:0.4});
  fx.BOMB1=explosion(26,{size:0.9,crunch:0.9});
  fx.CRUMBLE=normalize(lowpass(burst(27,1.2,0.4,900),600));
  fx.BUTTON=click(1500,0.025);
  fx.BLEEP2=chime([1320,1760],0.05,0.12,"sine");
  fx.TONE15=click(2400,0.015);fx.TONE16=click(1700,0.015);
  fx.TONE2=chime([880,660],0.06,0.12,"square");
  fx.TONE5=chime([1046],0.1,0.6,"sine");
  fx.SCOLD2=normalize(tone(180,150,0.28,{wave:"square",decay:0.2}));
  fx.SIDBAR1C=chime([784,1046,1318],0.05,0.18);fx.SIDBAR2C=chime([1318,1046,784],0.05,0.18);
  fx.CASHTURN=chime([1568,2093,1568,2637],0.035,0.1,"sine");
  fx.BEACON=chime([988,988],0.25,0.2,"sine");
  fx.CONSTRU2=normalize(mix(sec(1.0),...[0,0.18,0.36,0.6,0.8].map((t,i)=>[shot(30+i,{body:0.05,cut:2600,thump:300}),sec(t),0.8])));
  fx.HVYDOOR1=normalize(mix(sec(0.7),[burst(31,0.6,0.12,1200),0,1],[tone(110,80,0.5,{decay:0.15}),0,1]));
  fx.GUNCLIP1=normalize(mix(sec(0.25),[click(2600,0.02),0,1],[click(1900,0.02),sec(0.09),1]));
  fx.POWRDN1=normalize(tone(600,90,0.8,{wave:"tri"}));
  fx.COMCNTR1=normalize(mix(sec(1.0),[highpass(burst(32,1.0,0.6,6000),800),0,0.5],[chime([1200,1500,1200],0.12,0.15,"sine"),sec(0.2),1]));
  fx.FLAMER2=normalize(lowpass(burst(33,0.9,0.5,2500),1800));
  fx.ROCKET1=normalize(mix(sec(0.9),[highpass(burst(34,0.9,0.4,3000),400),0,1],[tone(300,900,0.6,{decay:0.4}),0,0.4]));
  fx.ROCKET2=normalize(mix(sec(0.9),[highpass(burst(35,0.9,0.4,3000),400),0,1],[tone(260,800,0.6,{decay:0.4}),0,0.4]));
  fx.BAZOOK1=fx.ROCKET1;
  fx.SAMMOTR2=normalize(tone(220,260,0.6,{wave:"square"}));
  fx.TOSS=normalize(highpass(burst(36,0.35,0.15,5000),1500));
  fx.TREEBRN1=crackle(37,1.2);
  fx.SQUISH2=normalize(lowpass(burst(38,0.3,0.08,900),700));
  fx.RAMGUN2=normalize(lowpass(shot(39,{body:0.06}),1500));
  fx.NUKEMISL=fx.ROCKET1;fx.NUKEXPLO=explosion(40,{size:2});
  fx.ION1=normalize(tone(1200,300,1.0,{wave:"tri"}));fx.OBELRAY1=fx.ION1;fx.OBELPOWR=normalize(tone(200,900,0.8));
  fx.TRANS1=normalize(tone(500,1500,0.5,{wave:"tri"}));
  // Infantry cries: short pitched vocal-like bursts.
  const yell=(seed,f)=>normalize(mix(sec(0.45),[tone(f,f*0.6,0.42,{wave:"tri",decay:0.2}),0,1],[burst(seed,0.4,0.15,2000),0,0.4]));
  for(const [n,f] of [["NUYELL1",520],["NUYELL3",470],["NUYELL4",560],["NUYELL5",500],["NUYELL6",440],
    ["NUYELL7",590],["NUYELL10",480],["NUYELL11",540],["NUYELL12",460],["YELL1",420]])fx[n]=yell(f,f);
  return fx;
}

// ---------- speech ----------
// Unit replies: four variants, one voice each (.V00-.V03).
const REPLIES={
  "2DANGR1":"Negative. Too dangerous.",ACKNO:"Acknowledged.",AFFIRM1:"Affirmative.",
  AWAIT1:"Awaiting orders.",MOVOUT1:"Moving out.",NEGATV1:"Negative.",NOPROB:"No problem.",
  READY:"Ready.",REPORT1:"Reporting.",RITAWAY:"Right away.",ROGER:"Roger.",UGOTIT:"You got it.",
  UNIT1:"Unit reporting.",VEHIC1:"Vehicle reporting.",YESSIR1:"Yes, commander.",
};
const REPLY_VOICES=["kal16","rms","awb","kal"];
// COMMS lines (Speech[], audio.cpp:354). Original wording, no franchise
// terms. Lines for features outside the M5 skirmish are left out; the engine
// then stays silent for them.
const COMMS={
  ACCOM1:"Mission accomplished.",FAIL1:"Mission failed.",
  BLDG1:"Unable to comply. Building in progress.",CONSTRU1:"Construction complete.",
  UNITREDY:"Unit ready.",NEWOPT1:"New construction options.",DEPLOY1:"Cannot deploy here.",
  GDIDEAD1:"Unit destroyed.",NODDEAD1:"Unit destroyed.",NOCASH1:"Insufficient funds.",
  BATLCON1:"Battle control terminated.",REINFOR1:"Reinforcements have arrived.",
  CANCEL1:"Cancelled.",BLDGING1:"Building.",LOPOWER1:"Low power.",NOPOWER1:"Insufficient power.",
  MOCASH1:"Need more funds.",BASEATK1:"Our base is under attack.",NOBUILD1:"Unable to build more.",
  PRIBLDG1:"Primary building selected.",UNITLOST:"Unit lost.",STRCLOST:"Structure lost.",
  NEEDHARV:"Harvester needed.",SELECT1:"Select target.",NOREDY1:"Not ready.",
  ENMYAPP1:"Enemy approaching.",SILOS1:"Storage needed.",ONHOLD1:"On hold.",REPAIR1:"Repairing.",
  ESTRUCX:"Enemy structure destroyed.",GSTRUC1:"Structure destroyed.",NSTRUC1:"Structure destroyed.",
  ENMYUNIT:"Enemy unit destroyed.",
};
const COMMS_VOICE="slt";

function readWav(buf){
  // flite writes 16-bit mono PCM WAV.
  let p=12,rate=16000,data=null,bits=16;
  while(p+8<=buf.length){
    const id=buf.toString("ascii",p,p+4),len=buf.readUInt32LE(p+4);
    if(id==="fmt "){rate=buf.readUInt32LE(p+12);bits=buf.readUInt16LE(p+22);}
    if(id==="data"){data=buf.subarray(p+8,p+8+len);break;}
    p+=8+len+(len&1);
  }
  if(!data||bits!==16)throw Error("Unexpected WAV from flite");
  const out=new Array(data.length/2);
  for(let i=0;i<out.length;i++)out[i]=data.readInt16LE(i*2)/32768;
  return {rate,samples:out};
}
function resample(x,from,to){
  const n=Math.floor(x.length*to/from),out=new Array(n);
  for(let i=0;i<n;i++){const t=i*from/to,k=Math.floor(t),f=t-k;out[i]=(x[k]||0)*(1-f)+(x[k+1]||0)*f;}
  return out;
}
let fliteChecked=false;
function speak(text,voice,{radio=false}={}){
  if(!fliteChecked){
    const v=cp.spawnSync("flite",["-lv"],{encoding:"utf8"});
    if(v.error||v.status!==0)throw Error("The sound pack needs flite (apt-get install flite)");
    fliteChecked=true;
  }
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"wc-voice-"));
  const wav=path.join(tmp,"line.wav");
  const r=cp.spawnSync("flite",["-voice",voice,"-t",text,"-o",wav]);
  if(r.status!==0)throw Error("flite failed for "+JSON.stringify(text));
  const {rate,samples}=readWav(fs.readFileSync(wav));
  fs.rmSync(tmp,{recursive:true,force:true});
  let x=samples;
  if(radio){
    // Band-limited, lightly driven radio voice with a short squelch click.
    x=highpass(lowpass(x,3000,rate),350,rate).map(v=>Math.tanh(v*2.2));
    const sq=burst(91,0.05,0.02,5000,rate).map(v=>v*0.25);
    x=[...sq,...new Array(Math.round(rate*0.04)).fill(0),...x];
  }
  return normalize(resample(x,rate,VOICE_RATE),0.92);
}

// Writes effects and replies to soundsDir and COMMS lines to speechDir.
function build(soundsDir,speechDir){
  const sounds=[],speech=[];
  for(const [name,samples] of Object.entries(effects())){
    fs.writeFileSync(path.join(soundsDir,name+".AUD"),encodeAUD(samples,FX_RATE));sounds.push(name+".AUD");
  }
  for(const [name,text] of Object.entries(REPLIES))REPLY_VOICES.forEach((voice,v)=>{
    const file=name+".V0"+v;
    fs.writeFileSync(path.join(soundsDir,file),encodeAUD(speak(text,voice),VOICE_RATE));sounds.push(file);
  });
  for(const [name,text] of Object.entries(COMMS)){
    fs.writeFileSync(path.join(speechDir,name+".AUD"),encodeAUD(speak(text,COMMS_VOICE,{radio:true}),VOICE_RATE));
    speech.push(name+".AUD");
  }
  return {sounds:sounds.sort(),speech:speech.sort()};
}
build.sources=["tools/content/sound.js"];
module.exports={build,encodeAUD,effects,REPLIES,COMMS};
if(require.main===module){
  const out=process.argv[2];
  if(!out){console.error("Usage: node tools/content/sound.js <outDir>");process.exit(1);}
  const s=path.join(out,"sounds"),v=path.join(out,"speech");
  fs.mkdirSync(s,{recursive:true});fs.mkdirSync(v,{recursive:true});
  const t=Date.now();const r=build(s,v);
  console.log("Sounds",r.sounds.length,"speech",r.speech.length,"in",Date.now()-t,"ms");
}
