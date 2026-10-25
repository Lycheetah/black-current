/* Desktop access to the same zoom/fullscreen actions used by touch controls. */
(() => {
  'use strict';
  let ready=false;
  function install(){
    const host=document.createElement('div');host.id='view-controls';host.setAttribute('role','group');host.setAttribute('aria-label','View controls');
    const value=document.createElement('span');value.id='view-zoom-value';const refresh=()=>value.textContent=Math.round(movementFeel.zoom*100)+'%';
    function add(text,id,target){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=text;b.onclick=()=>{document.getElementById(target)?.click();refresh();};host.append(b);}
    add('− Zoom','view-zoom-out','btn-phone-zoom-out');host.append(value);add('+ Zoom','view-zoom-in','btn-phone-zoom-in');add('⛶ Full screen','view-fullscreen','btn-phone-fullscreen');document.body.append(host);refresh();window.addEventListener('keyup',refresh);ready=true;
  }
  window.viewControls={get ready(){return ready;}};window.addEventListener('load',()=>setTimeout(install,0));
})();
