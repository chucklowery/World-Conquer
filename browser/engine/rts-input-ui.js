"use strict";
// R01 browser adapter. It owns camera and selection presentation, not combat or
// movement state. Only native Browser_RTS_Command mutates gameplay state.
(function(root,factory){
  const api=factory(root.WCRTSInput);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.WCRTSBrowserInput=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(input){
  function mount({playfield,canvas,overlay,minimap,readout,selectionLabel,modeButtons,onCommand,onRestart,onDrawMinimap}){
    const camera=new input.Camera(),selection=new input.Selection();
    const ctx=overlay.getContext("2d");
    let snapshot=null,gesture=null,mode="context",keyboardTile=null,spaceDown=false,edgeScroll=false,edge={x:0,y:0};
    const active=()=>document.body.dataset.mode==="engine-courier"&&!playfield.closest("[hidden]");
    const position=event=>{
      const rect=playfield.getBoundingClientRect();
      return {x:event.clientX-rect.left,y:event.clientY-rect.top};
    };
    const announce=message=>{readout.textContent=message;};
    function paint(){
      if(!active())return;
      const box=camera.canvasRect();
      Object.assign(canvas.style,{left:box.left+"px",top:box.top+"px",width:box.width+"px",height:box.height+"px"});
      const w=playfield.clientWidth,h=playfield.clientHeight;
      const dpr=Math.min(window.devicePixelRatio||1,3);
      if(overlay.width!==Math.round(w*dpr)||overlay.height!==Math.round(h*dpr)){
        overlay.width=Math.round(w*dpr);overlay.height=Math.round(h*dpr);
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      if(snapshot){
        for(const unit of selection.entities){
          if(!selection.ids.includes(unit.id))continue;
          const p=camera.worldToScreen((unit.x+.5)*input.TILE,(unit.y+.5)*input.TILE);
          const radius=Math.max(7,14*camera.scale);
          ctx.beginPath();ctx.ellipse(p.x,p.y,radius,radius*.65,0,0,Math.PI*2);
          ctx.strokeStyle="#e5ff91";ctx.lineWidth=2.5;ctx.stroke();
          ctx.fillStyle="#e5ff91";ctx.font="bold 11px system-ui";ctx.textAlign="center";
          ctx.fillText(unit.id===1001?"SCOUT":"RANGER",p.x,p.y-radius*.8-5);
        }
      }
      if(gesture&&gesture.dragging&&gesture.type==="select"){
        const a=gesture.from,b=gesture.to;
        ctx.fillStyle="#91fbd32b";ctx.strokeStyle="#bbffe4";ctx.lineWidth=1.5;
        ctx.setLineDash([6,4]);ctx.fillRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(a.x-b.x),Math.abs(a.y-b.y));
        ctx.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(a.x-b.x),Math.abs(a.y-b.y));ctx.setLineDash([]);
      }
      if(keyboardTile&&mode!=="context"){
        const p=camera.worldToScreen(keyboardTile.x*input.TILE,keyboardTile.y*input.TILE);
        const size=camera.scale*input.TILE;
        ctx.strokeStyle="#ffe184";ctx.lineWidth=2.5;ctx.setLineDash([5,3]);
        ctx.strokeRect(p.x+2,p.y+2,size-4,size-4);ctx.setLineDash([]);
      }
      onDrawMinimap(camera.visibleRect());
    }
    function resize(){camera.setViewport(playfield.clientWidth,playfield.clientHeight);paint();}
    function setMode(next){
      mode=next;
      if(next==="context")keyboardTile=null;
      else{
        const first=selection.entities.find(e=>e.id===selection.ids[0]);
        keyboardTile={x:first?first.x:Math.floor(camera.centerX/input.TILE),
          y:first?first.y:Math.floor(camera.centerY/input.TILE)};
      }
      for(const button of modeButtons)button.setAttribute("aria-pressed",String(button.dataset.commandMode===mode));
      announce(next==="context"?"Context orders ready (right-click or tap Move).":
        `${next.toUpperCase()} target: click/tap or aim with arrows then Enter.`);
      paint();
    }
    function native(kind,actor,x=0,y=0,target=0){
      return onCommand({kind,actor,x,y,target});
    }
    function selected(ids,add=false){
      selection.set(ids,add);
      if(selection.ids.length)native("select",selection.ids[0]);
      feedback();paint();
    }
    function feedback(){
      const names=selection.ids.map(id=>id===1001?"Scout":id===1002?"Ranger":"#"+id);
      selectionLabel.textContent=names.length?`${names.join(" + ")} · ${names.length} selected`:"No units selected";
    }
    function order(tile,explicit=mode){
      const orders=selection.contextual(tile,snapshot,explicit);
      if(explicit==="attack"&&!orders.length){announce("Attack: select a visible enemy tile.");return;}
      for(const cmd of orders)native(cmd.kind,cmd.actor,cmd.x,cmd.y,cmd.target);
      setMode("context");paint();
      if(orders.length)announce(`${orders.length} native ${orders[0].kind} order${orders.length===1?"":"s"} · Sector ${tile.x+1},${tile.y+1}`);
    }
    function receive(next){
      snapshot=next;camera.setMap(next.map.width,next.map.height);
      if(next.events.some(event=>event.type==="restart")){mode="context";camera.zoom=1;camera.centerAt(camera.width/2,camera.height/2);}
      selection.receive(next);feedback();paint();
    }
    function pointerDown(event){
      if(!active()||(event.button!==0&&event.button!==1&&event.button!==2))return;
      event.preventDefault();event.stopPropagation();
      const p=position(event),pan=event.button===1||spaceDown||event.pointerType==="touch";
      gesture={id:event.pointerId,button:event.button,from:p,to:p,dragging:false,
        type:pan?"pan":"select",shift:event.shiftKey};
      playfield.setPointerCapture(event.pointerId);
      canvas.focus({preventScroll:true});
    }
    function pointerMove(event){
      if(!active())return;
      const p=position(event);
      if(edgeScroll&&event.pointerType==="mouse"){
        const margin=22;
        edge={x:p.x<margin?-1:p.x>camera.viewportWidth-margin?1:0,
          y:p.y<margin?-1:p.y>camera.viewportHeight-margin?1:0};
      }
      if(!gesture||gesture.id!==event.pointerId)return;
      event.preventDefault();event.stopPropagation();
      if(Math.hypot(p.x-gesture.from.x,p.y-gesture.from.y)>6)gesture.dragging=true;
      if(gesture.dragging&&gesture.type==="pan")camera.panBy(p.x-gesture.to.x,p.y-gesture.to.y);
      gesture.to=p;paint();
    }
    function pointerUp(event){
      if(!active()||!gesture||gesture.id!==event.pointerId)return;
      event.preventDefault();event.stopPropagation();
      const g=gesture,p=position(event);gesture=null;
      if(playfield.hasPointerCapture(event.pointerId))playfield.releasePointerCapture(event.pointerId);
      if(g.dragging){
        if(g.type==="select"){
          const a=camera.screenToWorld(g.from.x,g.from.y),b=camera.screenToWorld(p.x,p.y);
          selection.box(a,b,g.shift);selected(selection.ids);
        }
      }else if(snapshot&&snapshot.phase==="playing"){
        const tile=camera.screenToTile(p.x,p.y);
        if(!tile){paint();return;}
        const ally=selection.entities.find(e=>e.x===tile.x&&e.y===tile.y);
        if(g.button===2||mode!=="context")order(tile);
        else if(ally)selected([ally.id],g.shift);
        else if(g.shift){selected([],true);paint();}
        else order(tile,"context"); // Preserve alpha's left-click-to-move path.
      }
      paint();
    }
    // Keep SDL2's legacy input listeners from treating a drag as tile orders.
    for(const type of ["mousedown","mouseup","click","dblclick","contextmenu"])
      playfield.addEventListener(type,event=>{
        if(!active())return;
        event.preventDefault();event.stopPropagation();
      },true);
    playfield.addEventListener("pointerdown",pointerDown,true);
    playfield.addEventListener("pointermove",pointerMove,true);
    playfield.addEventListener("pointerup",pointerUp,true);
    playfield.addEventListener("pointercancel",()=>{gesture=null;paint();},true);
    playfield.addEventListener("pointerleave",()=>{edge={x:0,y:0};});
    playfield.addEventListener("wheel",event=>{
      if(!active())return;
      event.preventDefault();event.stopPropagation();
      const p=position(event);camera.zoomAt(event.deltaY<0?1.15:1/1.15,p.x,p.y);paint();
    },{passive:false,capture:true});
    minimap.addEventListener("click",event=>{
      if(!active())return;
      const rect=minimap.getBoundingClientRect();
      camera.minimapToCenter(event.clientX-rect.left,event.clientY-rect.top,rect.width,rect.height);
      announce("Camera centered from minimap · No unit order issued");paint();canvas.focus({preventScroll:true});
    });
    function centerSelection(){const center=selection.center();if(center){camera.centerAt(center.x,center.y);paint();}}
    function zoom(factor){camera.zoomAt(factor);paint();}
    document.addEventListener("keydown",event=>{
      if(!active()||event.isComposing||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||event.target.isContentEditable)return;
      const key=event.key.toLowerCase();
      if(event.ctrlKey||event.metaKey||event.altKey)return; // Keep browser tab switching and system shortcuts.
      if(event.shiftKey&&/^Digit[1-9]$/.test(event.code)){
        const digit=Number(event.code.slice(-1));
        event.preventDefault();selection.assign(digit);
        announce(`Group ${digit} saved (${selection.ids.length} units)`);
        return;
      }
      if(key===" "){spaceDown=true;event.preventDefault();return;}
      if(/^[1-9]$/.test(key)){
        event.preventDefault();event.stopPropagation();
        if(selection.groups.has(Number(key))){selection.recall(Number(key));selected(selection.ids);centerSelection();}
        else if(key==="1"||key==="2")selected([Number(key)===1?1001:1002]);
        return;
      }
      if(mode!=="context"&&keyboardTile){
        const step={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]}[key];
        if(step){
          keyboardTile={x:Math.max(0,Math.min(camera.mapWidth-1,keyboardTile.x+step[0])),
            y:Math.max(0,Math.min(camera.mapHeight-1,keyboardTile.y+step[1]))};
          camera.centerOnTile(keyboardTile.x,keyboardTile.y);
          announce(`Target sector ${keyboardTile.x+1},${keyboardTile.y+1} · Enter to order`);
          paint();event.preventDefault();return;
        }
        if(key==="enter"&&event.target.tagName!=="BUTTON"){
          order(keyboardTile);event.preventDefault();return;
        }
      }
      const panKeys={arrowleft:[35,0],arrowright:[-35,0],arrowup:[0,35],arrowdown:[0,-35],w:[0,35],a:null,d:[-35,0]};
      if(panKeys[key]){const [x,y]=panKeys[key];camera.panBy(x*(event.shiftKey?3:1),y*(event.shiftKey?3:1));paint();event.preventDefault();return;}
      if(key==="="||key==="+"){zoom(1.2);event.preventDefault();return;}
      if(key==="-"||key==="_"){zoom(1/1.2);event.preventDefault();return;}
      if(key==="m"||key==="a"){setMode(key==="m"?"move":"attack");event.preventDefault();return;}
      if(key==="s"){for(const id of selection.ids)native("stop",id);setMode("context");event.preventDefault();return;}
      if(key==="c"){centerSelection();event.preventDefault();return;}
      if(key==="escape"){
        for(const id of selection.ids)native("stop",id);
        setMode("context");event.preventDefault();event.stopPropagation();return;
      }
      if(key==="r"){onRestart();event.preventDefault();event.stopPropagation();}
    },true);
    document.addEventListener("keyup",event=>{if(event.key===" ")spaceDown=false;},true);
    for(const button of modeButtons)button.addEventListener("click",()=>{setMode(button.dataset.commandMode);canvas.focus({preventScroll:true});});
    document.getElementById("hud-stop").addEventListener("click",()=>{
      for(const id of selection.ids)native("stop",id);setMode("context");canvas.focus({preventScroll:true});
    });
    document.getElementById("hud-center").addEventListener("click",centerSelection);
    document.getElementById("hud-zoom-in").addEventListener("click",()=>zoom(1.2));
    document.getElementById("hud-zoom-out").addEventListener("click",()=>zoom(1/1.2));
    document.getElementById("hud-edge-scroll").addEventListener("change",event=>{edgeScroll=event.target.checked;});
    const directions={"hud-pan-up":[0,45],"hud-pan-down":[0,-45],"hud-pan-left":[45,0],"hud-pan-right":[-45,0]};
    for(const [id,delta] of Object.entries(directions))document.getElementById(id).addEventListener("click",()=>{
      camera.panBy(...delta);paint();
    });
    function edgeFrame(){
      if(active()&&edgeScroll&&camera.zoom>1&&(edge.x||edge.y)){
        camera.panBy(-edge.x*9,-edge.y*9);paint();
      }
      requestAnimationFrame(edgeFrame);
    }
    requestAnimationFrame(edgeFrame);
    setMode("context");feedback();
    return {camera,selection,receive,resize,paint,centerSelection,setMode};
  }
  return {mount};
});
