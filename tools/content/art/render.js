"use strict";
// Original M5 sprite renderer (CC0): ray-traces small models built from
// convex polyhedra, cylinders and spheres into palette-indexed frames.
//
// World units are pixels. x points east, y south, z up. The camera is the
// engine's: cells are square on screen, and height shifts a point up the
// screen by K pixels per unit (an oblique top-down view):
//   screen x = x,  screen y = y - K*z
// Each pixel is sampled S x S times. A pixel is opaque when at least
// MIN_COVER of its samples hit, and takes the most common material among
// them, shaded by their average light. Partial edges get a dark outline so
// silhouettes stay readable at 1x.
//
// Shading: one key light from the north-west, above, plus ambient, with cast
// shadows inside the model. Ground under the model that the light cannot
// reach is painted with SHADOW (palette index 4): the engine draws that index
// as translucent dark over the terrain (display.cpp UShadowCols, LTGREEN).
const {rampIndex,rampLength}=require("./palette.js");

const K=0.75;
const S=3;
const MIN_COVER=4;
const SHADOW=4;
const LIGHT=norm([-0.55,-0.75,1.0]);
const OUTLINE={ramp:"dark",shade:15};
const CAP_GIRDER={ramp:"steel",lo:4,hi:11};
const CAP_HOLE={ramp:"dark",lo:9,hi:14};

function norm(v){const l=Math.hypot(...v)||1;return v.map(c=>c/l);}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

// ---------- primitives (in part-local coordinates) ----------
// Each returns {t, n} for the nearest entry along origin + t*dir (t >= 0), or
// null. "inside" tests are used for cast shadows.
function planesHit(planes,o,d){
  let t0=-Infinity,t1=Infinity,n0=null;
  for(const p of planes){
    const den=dot(p.n,d),dist=p.d-dot(p.n,o);
    if(Math.abs(den)<1e-9){if(dist<0)return null;continue;}
    const t=dist/den;
    if(den<0){if(t>t0){t0=t;n0=p.n;}}else if(t<t1)t1=t;
    if(t0>t1)return null;
  }
  if(t1<0||t0>t1||n0===null)return null;
  return t0<0?{t:0,n:n0}:{t:t0,n:n0};
}
// Axis-aligned box [x0,x1]x[y0,y1]x[z0,z1] as six planes.
function boxPlanes([x0,y0,z0],[x1,y1,z1]){
  return [{n:[-1,0,0],d:-x0},{n:[1,0,0],d:x1},{n:[0,-1,0],d:-y0},{n:[0,1,0],d:y1},
    {n:[0,0,-1],d:-z0},{n:[0,0,1],d:z1}];
}
// Cylinder of radius r along axis a ("x","y","z") between lo and hi, centred
// at c on the other two axes.
function cylHit(c,r,axis,lo,hi,o,d){
  const ai={x:0,y:1,z:2}[axis],[ui,vi]=[0,1,2].filter(i=>i!==ai);
  const ou=o[ui]-c[ui],ov=o[vi]-c[vi],du=d[ui],dv=d[vi];
  const A=du*du+dv*dv,B=2*(ou*du+ov*dv),C=ou*ou+ov*ov-r*r;
  let best=null;
  if(A>1e-12){
    const disc=B*B-4*A*C;
    if(disc>=0){
      const sq=Math.sqrt(disc);
      for(const t of [(-B-sq)/(2*A),(-B+sq)/(2*A)]){
        if(t<0)continue;
        const h=o[ai]+t*d[ai];
        if(h>=lo&&h<=hi){const n=[0,0,0];n[ui]=(ou+t*du)/r;n[vi]=(ov+t*dv)/r;best={t,n};break;}
      }
    }
  }
  // Caps.
  if(Math.abs(d[ai])>1e-12)for(const [h,s] of [[hi,1],[lo,-1]]){
    const t=(h-o[ai])/d[ai];
    if(t<0||(best&&t>=best.t))continue;
    const u=ou+t*du,v=ov+t*dv;
    if(u*u+v*v<=r*r){const n=[0,0,0];n[ai]=s;best={t,n};}
  }
  if(!best&&C<=0){const h=o[ai];if(h>=lo&&h<=hi)return {t:0,n:[0,0,1]};}
  return best;
}
function sphereHit(c,r,o,d){
  const oc=[o[0]-c[0],o[1]-c[1],o[2]-c[2]];
  const A=dot(d,d),B=2*dot(oc,d),C=dot(oc,oc)-r*r,disc=B*B-4*A*C;
  if(disc<0)return null;
  const sq=Math.sqrt(disc);let t=(-B-sq)/(2*A);
  if(t<0){if(C<=0)t=0;else return null;}
  const p=[o[0]+t*d[0]-c[0],o[1]+t*d[1]-c[1],o[2]+t*d[2]-c[2]];
  return {t,n:norm(p)};
}

// ---------- parts ----------
// A part: {shape, mat, ...shape fields, yaw (radians, about its own centre
// point "at"), at:[x,y,z]}. Shapes:
//   box:    {min:[x,y,z], max:[x,y,z]}
//   poly:   {planes:[{n,d}]}
//   wedge:  box whose top slopes down toward +y from z1 to z1lo ("dir")
//   cyl:    {c:[x,y,z], r, axis, lo, hi}
//   sphere: {c:[x,y,z], r}
// Model transforms (heading) rotate everything about the model origin.
function rotZ([x,y,z],a){const c=Math.cos(a),s=Math.sin(a);return [x*c-y*s,x*s+y*c,z];}
function partHit(part,o,d){
  let lo=o,ld=d;
  if(part.yaw){const at=part.at||[0,0,0];
    lo=rotZ([o[0]-at[0],o[1]-at[1],o[2]-at[2]],-part.yaw);lo=[lo[0]+at[0],lo[1]+at[1],lo[2]+at[2]];
    ld=rotZ(d,-part.yaw);}
  let h=null;
  switch(part.shape){
    case "box":h=planesHit(part._planes||(part._planes=boxPlanes(part.min,part.max)),lo,ld);break;
    case "poly":h=planesHit(part.planes,lo,ld);break;
    case "cyl":h=cylHit(part.c,part.r,part.axis||"z",part.lo,part.hi,lo,ld);break;
    case "sphere":h=sphereHit(part.c,part.r,lo,ld);break;
    default:throw Error("Unknown shape "+part.shape);
  }
  if(h&&part.yaw)h={t:h.t,n:rotZ(h.n,part.yaw)};
  return h;
}
// ---------- materials ----------
// {ramp, lo, hi}: shade range of the ramp to use (0 = brightest entry).
// "house" paints the remap band 176-183. "glow" materials ignore light.
const HOUSE_START=176;
function materialIndex(mat,light){
  if(mat.fixed!==undefined)return mat.fixed;
  const lo=mat.lo??0;
  const len=mat.ramp==="house"?8:rampLength(mat.ramp);
  const hi=mat.hi??len-1;
  const l=mat.glow?1:Math.max(0,Math.min(1,light));
  const shade=Math.round(lo+(1-l)*(hi-lo));
  if(mat.ramp==="house")return HOUSE_START+Math.max(0,Math.min(7,shade));
  return rampIndex(mat.ramp,shade);
}

// ---------- rendering ----------
// Model space: the model faces north (-y). opts.heading turns it counter-
// clockwise on screen (radians); rays and light are turned the other way, so
// parts never need re-expressing.
// opts: {width, height, origin:[sx,sy] (screen position of world 0,0,0),
//        heading, shadow:true, groundShadow:true, outline:true, ztop}
function toModel(v,heading){
  // World = R(heading) * model, with R turning north toward west for +heading:
  // world (x,y) = (x cos + y sin, -x sin + y cos). Inverse below.
  const c=Math.cos(heading),s=Math.sin(heading);
  return [v[0]*c-v[1]*s,v[0]*s+v[1]*c,v[2]];
}
function toWorld(v,heading){
  const c=Math.cos(heading),s=Math.sin(heading);
  return [v[0]*c+v[1]*s,-v[0]*s+v[1]*c,v[2]];
}
function render(parts,opts){
  const W=opts.width,H=opts.height,[ox,oy]=opts.origin;
  const ztop=opts.ztop??64;
  const heading=opts.heading||0;
  const scale=opts.scale||1;          // screen pixels per world unit
  const pixels=new Array(W*H).fill(0);
  const castShadow=opts.shadow!==false;
  const dir=toModel([0,-K,-1],heading);  // the view ray, in model space
  const toLight=toModel(LIGHT,heading);
  const view=toModel([0,K,1],heading);
  const blocked=(p)=>{
    const o=[p[0]+toLight[0]*0.05,p[1]+toLight[1]*0.05,p[2]+toLight[2]*0.05];
    for(const part of parts){if(part.noShadow)continue;const h=partHit(part,o,toLight);if(h&&h.t>0.02)return true;}
    return false;
  };
  const cover=new Uint8Array(W*H);
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){
    const counts=new Map();let hits=0,ground=0,shadowed=0;
    for(let sy=0;sy<S;sy++)for(let sx=0;sx<S;sx++){
      const X=(px+(sx+0.5)/S-ox)/scale,Y=(py+(sy+0.5)/S-oy)/scale;
      // Start high above: screen y = y - K z  =>  y = Y + K*ztop at z=ztop.
      const o=toModel([X,Y+K*ztop,ztop],heading);
      let best=null,bp=null;
      for(const part of parts){
        const h=partHit(part,o,dir);
        if(h&&(!best||h.t<best.t)){best=h;bp=part;}
      }
      const groundT=ztop; // z = 0
      if(best&&best.t<groundT){
        hits++;
        const p=[o[0]+dir[0]*best.t,o[1]+dir[1]*best.t,o[2]+dir[2]*best.t];
        let n=best.n;if(dot(n,view)<0)n=n.map(v=>-v);
        let l=(bp.mat.ambient??0.32)+(1-(bp.mat.ambient??0.32))*Math.max(0,dot(n,toLight));
        if(bp.mat.spec){const h=norm([toLight[0]+view[0],toLight[1]+view[1],toLight[2]+view[2]]);l+=bp.mat.spec*Math.pow(Math.max(0,dot(n,h)),12);}
        if(castShadow&&!bp.mat.glow&&blocked(p))l*=0.55;
        // A part cut open by the build-up animation (build.js clip) shows its
        // cut face as a dark interior crossed by girders.
        let key=bp.mat;
        if(bp.cap&&n[2]>0.9&&Math.abs(p[2]-bp.cap.z)<1e-3){
          const g=bp.cap.grid||6,gx=((p[0]%g)+g)%g,gy=((p[1]%g)+g)%g;
          key=gx<1.2||gy<1.2?CAP_GIRDER:CAP_HOLE;
        }
        const e=counts.get(key)||{n:0,l:0};e.n++;e.l+=l;counts.set(key,e);
      }else if(castShadow&&opts.groundShadow!==false){
        const gp=[o[0]+dir[0]*ztop,o[1]+dir[1]*ztop,0];
        ground++;if(blocked(gp))shadowed++;
      }
    }
    const i=py*W+px;cover[i]=hits;
    if(hits>=MIN_COVER){
      let bestMat=null,bestE=null;
      for(const [m,e] of counts)if(!bestE||e.n>bestE.n){bestMat=m;bestE=e;}
      pixels[i]=materialIndex(bestMat,bestE.l/bestE.n);
    }else if(shadowed*2>S*S){
      pixels[i]=SHADOW;
    }
  }
  if(opts.outline!==false){
    const out=pixels.slice();
    for(let py=0;py<H;py++)for(let px=0;px<W;px++){
      const i=py*W+px;
      if(pixels[i]&&pixels[i]!==SHADOW)continue;
      if(cover[i]===0)continue;
      // Partly covered edge pixel next to the model: outline it.
      let near=false;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const x=px+dx,y=py+dy;
        if(x<0||y<0||x>=W||y>=H)continue;
        const v=pixels[y*W+x];if(v&&v!==SHADOW){near=true;break;}
      }
      if(near)out[i]=materialIndex(OUTLINE,0);
    }
    return out;
  }
  return pixels;
}
// Heading of engine body frame k (TechnoClass::BodyShape): frame k faces
// k*11.25 degrees counter-clockwise from north.
const frameHeading=k=>k*2*Math.PI/32;
module.exports={render,toWorld,frameHeading,boxPlanes,K,S,SHADOW,materialIndex};
