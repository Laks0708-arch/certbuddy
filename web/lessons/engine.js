(function(){
const L=window.LESSON,narr=window.NARR.narr;
const C={edge:"var(--edge)",compute:"var(--compute)",data:"var(--data)",msg:"var(--msg)",sec:"var(--sec)",ppl:"var(--muted)",net:"var(--net)"};
const LEG={edge:"Edge, DNS & network",compute:"Compute",data:"Storage & data",msg:"Messaging",sec:"Identity & security",net:"Public internet"};
document.getElementById("eyebrow").textContent=L.eyebrow;
document.getElementById("h1").textContent=L.title;
document.getElementById("intro").textContent=L.intro;
const used=new Set(Object.values(L.nodes).map(n=>n[4]));
const lg=document.getElementById("legend");
Object.keys(LEG).forEach(k=>{if(!used.has(k))return;const s=document.createElement("span");s.innerHTML='<i style="background:'+C[k]+'"></i>';s.appendChild(document.createTextNode(LEG[k]));lg.appendChild(s)});
if(L.legendExtra)L.legendExtra.forEach(([col,txt])=>{const s=document.createElement("span");s.innerHTML='<i style="background:'+col+'"></i>';s.appendChild(document.createTextNode(txt));lg.appendChild(s)});
const N=L.nodes,S=L.steps;
const flowsOf=s=>s.flows?s.flows:[{path:s.path,w:1,kind:s.kind}];
const pathsOf=s=>flowsOf(s).map(f=>f.path);
const EDGES=[];S.forEach(s=>pathsOf(s).forEach(p=>{for(let i=0;i<p.length-1;i++){const k=p[i]+">"+p[i+1];if(!EDGES.includes(k))EDGES.push(k)}}));
const NS="http://www.w3.org/2000/svg",svg=document.getElementById("map");
function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
if(L.zones)L.zones.forEach(z=>{el("rect",{x:z[0],y:z[1],width:z[2],height:z[3],rx:14,style:"fill:none;stroke:var(--line);stroke-dasharray:5 6"});const t=el("text",{x:z[0]+12,y:z[1]+20,style:"fill:var(--muted);font:500 11px var(--mono);letter-spacing:.08em"});t.textContent=z[4]});
const gE=el("g",{}),gL=el("g",{}),gN=el("g",{}),gD=el("g",{});
const edgeEl={};EDGES.forEach(k=>{const[a,b]=k.split(">");edgeEl[k]=el("line",{x1:N[a][0],y1:N[a][1],x2:N[b][0],y2:N[b][1],class:"edge"},gE)});
const nodeEl={};
for(const id in N){const[x,y,t,s,c]=N[id];const g=el("g",{class:"node"},gN);
  const r=el("rect",{x:x-75,y:y-29,width:150,height:58,rx:10,class:"box"},g);r.style.stroke=C[c];
  el("rect",{x:x-75,y:y-29,width:6,height:58,rx:3,style:"fill:"+C[c]+";stroke:none"},g);
  const a=el("text",{x:x-63,y:y-5,class:"t"},g);a.textContent=t;
  const b=el("text",{x:x-63,y:y+15,class:"s"},g);b.textContent=s;
  [a,b].forEach(tx=>{try{if(tx.getComputedTextLength()>132){tx.setAttribute("textLength",132);tx.setAttribute("lengthAdjust","spacingAndGlyphs")}}catch(e){}});
  const xx=el("text",{x:x+52,y:y-6,class:"x"},g);xx.textContent="✕";xx.style.display="none";
  nodeEl[id]={g,xx}}
let cur=0,playing=false,raf=null,adv=null,dotEls=[],curItems=[];
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
/* ---- moving dots: one per flow, or a weighted stream when a step has several flows ---- */
function animate(s,cycles){cancelAnimationFrame(raf);dotEls.forEach(d=>d.remove());dotEls=[];gL.innerHTML="";
  const valid=flowsOf(s).filter(f=>f.path&&f.path.length>1);if(!valid.length)return;
  const total=valid.reduce((a,f)=>a+(f.w||1),0);const n=valid.length===1?1:Math.min(10,Math.max(total,valid.length));
  const assign=[];valid.forEach((f,fi)=>{const c=Math.max(1,Math.round((f.w||1)/total*n));for(let k=0;k<c;k++)assign.push(fi)});
  const order=[];const buckets=valid.map((_,fi)=>assign.filter(a=>a===fi));while(buckets.some(b=>b.length))buckets.forEach(b=>{if(b.length)order.push(b.pop())});
  if(valid.length>1)valid.forEach(f=>{if(!f.label)return;const end=N[f.path[f.path.length-1]];const t=el("text",{x:end[0],y:end[1]+46,"text-anchor":"middle",class:"flowlabel"},gL);t.textContent=f.label});
  const items=order.map((fi,k)=>{const f=valid[fi],kind=f.kind||s.kind,pts=f.path.map(id=>[N[id][0],N[id][1]]),seg=[];let tot=0;
    for(let i=0;i<pts.length-1;i++){const d=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);seg.push(d);tot+=d}
    const c=el("circle",{r:valid.length>1?6.5:8,class:"dot"+(kind?" "+kind:"")+(f.alt?" alt":"")},gD);
    return{pts,seg,tot,kind,c,off:k/order.length,dur:Math.max(1500,tot*(kind==="internet"?7:4))}});
  dotEls=items.map(x=>x.c);curItems=items;
  if(reduce){items.forEach(x=>{const p=x.pts[x.pts.length-1];x.c.setAttribute("cx",p[0]);x.c.setAttribute("cy",p[1])});return}
  const period=Math.max(...items.map(x=>x.dur))+700;let t0=null;
  function f(ts){if(t0===null)t0=ts;if(cycles&&ts-t0>period*cycles){parkDots();return}items.forEach(x=>{const ph=(((ts-t0)/period)+x.off)%1;let d=ph*period/x.dur*x.tot;if(d>x.tot)d=x.tot;
      let i=0;while(i<x.seg.length-1&&d>x.seg[i]){d-=x.seg[i];i++}const r=x.seg[i]?Math.min(d/x.seg[i],1):1;
      let jx=0,jy=0;if(x.kind==="internet"&&r<1){jx=Math.sin(ts/40)*4;jy=Math.cos(ts/55)*4}
      x.c.setAttribute("cx",x.pts[i][0]+(x.pts[i+1][0]-x.pts[i][0])*r+jx);x.c.setAttribute("cy",x.pts[i][1]+(x.pts[i+1][1]-x.pts[i][1])*r+jy)});
    raf=requestAnimationFrame(f)}
  raf=requestAnimationFrame(f)}
const dots=document.getElementById("dots"),cap=document.getElementById("caption");
S.forEach((s,i)=>{const b=document.createElement("button");b.type="button";b.textContent=i+1;b.title=s.t;b.addEventListener("click",()=>manual(i));dots.appendChild(b)});
function setCap(t){cap.textContent=t||"";cap.classList.toggle("live",!!t)}
function show(i,cycles){cur=(i+S.length)%S.length;const s=S[cur];const ps=pathsOf(s);const lit=new Set([].concat(...ps,s.lit||[]));const down=new Set(s.down||[]);
  for(const id in nodeEl){const n=nodeEl[id];n.g.classList.toggle("dim",!lit.has(id)&&!down.has(id));n.g.classList.toggle("on",lit.has(id));n.g.classList.toggle("down",down.has(id));n.xx.style.display=down.has(id)?"":"none"}
  const on=new Set();ps.forEach(p=>{for(let k=0;k<p.length-1;k++)on.add(p[k]+">"+p[k+1])});
  for(const k in edgeEl){const e=edgeEl[k];e.classList.toggle("on",on.has(k));e.classList.toggle("internet",on.has(k)&&s.kind==="internet");e.classList.toggle("backbone",on.has(k)&&s.kind==="backbone")}
  document.getElementById("s-title").innerHTML='<span class="n">Step '+(cur+1)+' of '+S.length+'</span>';
  document.getElementById("s-title").appendChild(document.createTextNode(s.t));
  document.getElementById("s-story").textContent=s.story;
  const f=document.getElementById("s-fact");f.hidden=!s.fact;f.textContent=s.fact||"";
  document.getElementById("s-svc").textContent=s.svc;
  document.getElementById("s-key").textContent=s.key;
  document.getElementById("s-trap").textContent=s.trap;
  [...dots.children].forEach((b,j)=>b.setAttribute("aria-current",j===cur?"true":"false"));
  setCap("");animate(s,cycles)}
/* ---- narrator: recorded Polly audio when the lesson has it, otherwise the browser voice ---- */
const synth=window.speechSynthesis,canSpeak=!!(synth&&window.SpeechSynthesisUtterance);
const useAudio=!!(L.audio&&L.audio.length===S.length);const audio=useAudio?new Audio():null;
const canVoice=useAudio||canSpeak;
let voiceOn=canVoice,rate=0.92,voice=null,tok=0,voices=[];
const story=document.querySelector(".story"),vbtn=document.getElementById("voice"),rsel=document.getElementById("rate"),vsel=document.getElementById("vsel"),vtest=document.getElementById("vtest"),vhint=document.getElementById("vhint");
const NOVELTY=/\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|espeak)\b/i;
function score(v){const n=v.name;let s=0;
  if(/natural|neural/i.test(n))s+=10;if(/online/i.test(n))s+=4;if(/google/i.test(n))s+=7;if(/premium/i.test(n))s+=8;if(/enhanced/i.test(n))s+=6;
  if(/\b(serena|daniel|kate|arthur|martha|stephanie|jamie|oliver|sonia|ryan|libby|maisie|thomas|samantha|ava|allison|karen|moira|tessa)\b/i.test(n))s+=3;
  if(/en[-_]GB/i.test(v.lang))s+=2;else if(/en[-_](US|AU|IE)/i.test(v.lang))s+=1;if(v.localService===false)s+=1;return s}
function loadVoices(){try{voices=synth.getVoices().filter(v=>/^en/i.test(v.lang)&&!NOVELTY.test(v.name)).sort((a,b)=>score(b)-score(a))}catch(e){voices=[]}
  if(!voices.length)return;let saved=null;try{saved=localStorage.getItem("aws-lesson-voice")}catch(e){}
  vsel.innerHTML="";voices.forEach(v=>{const o=document.createElement("option");o.value=v.name;o.textContent=(score(v)>=7?"★ ":"")+v.name.replace(/\s*\(.*?\)\s*/g," ").trim()+" · "+v.lang;vsel.appendChild(o)});
  voice=voices.find(v=>v.name===saved)||voices[0];vsel.value=voice.name}
function chooseVoice(){voice=voices.find(v=>v.name===vsel.value)||voice;try{localStorage.setItem("aws-lesson-voice",voice.name)}catch(e){}}
if(useAudio){vsel.parentElement.hidden=true;vtest.hidden=true;vhint.textContent="Press ▶ Play. The narrator (Amazon Polly, British English) explains each step with subtitles, then moves on by itself."}
else if(canSpeak){loadVoices();try{synth.addEventListener("voiceschanged",loadVoices)}catch(e){synth.onvoiceschanged=loadVoices}
  vsel.addEventListener("change",()=>{chooseVoice();hush();speak("Hello. This is how I will explain each step of the lesson.")});
  vtest.addEventListener("click",()=>{chooseVoice();hush();speak("Hello. This is how I will explain each step of the lesson. Global Accelerator, CloudFront, and S3 Transfer Acceleration.")})}
else{vbtn.hidden=true;rsel.parentElement.hidden=true;vsel.parentElement.hidden=true;vtest.hidden=true;vhint.textContent="This browser has no built-in voice, so the lesson plays silently with subtitles. Try Chrome, Edge or Safari for narration."}
const sentences=t=>(t.match(/[^.!?]+[.!?]*/g)||[t]).map(x=>x.trim()).filter(Boolean);
function hush(){tok++;story.classList.remove("speaking");setCap("");if(audio){try{audio.pause()}catch(e){}audio.ontimeupdate=audio.onended=audio.onerror=audio.onloadedmetadata=null}if(canSpeak)try{synth.cancel()}catch(e){}}
function speak(text,done){if(!canSpeak||!voiceOn){done&&done();return}
  hush();const my=tok;const parts=sentences(text);let i=0,fin=false;story.classList.add("speaking");
  const safety=setTimeout(end,text.length*95/rate+5000);
  function end(){if(fin||my!==tok)return;fin=true;clearTimeout(safety);story.classList.remove("speaking");setCap("");done&&done()}
  function next(){if(my!==tok)return;if(i>=parts.length){end();return}const line=parts[i++];setCap(S[cur]&&S[cur].capText?line:line);
    const u=new SpeechSynthesisUtterance(line);if(voice)u.voice=voice;u.lang=voice?voice.lang:"en-GB";u.rate=rate;u.onend=next;u.onerror=next;try{synth.speak(u)}catch(e){end()}}
  next()}
function playAudio(i,done){hush();const my=tok;const parts=sentences(narr(S[i]));const lens=parts.map(p=>p.length);const totalLen=lens.reduce((a,b)=>a+b,0)||1;let fin=false;
  story.classList.add("speaking");
  function end(){if(fin||my!==tok)return;fin=true;story.classList.remove("speaking");setCap("");done&&done()}
  audio.src=L.audio[i];audio.playbackRate=rate/0.92;audio.onloadedmetadata=()=>{if(my===tok&&audio.duration)runFill(audio.duration*1000/audio.playbackRate)};
  audio.ontimeupdate=()=>{if(my!==tok||!audio.duration)return;const at=audio.currentTime/audio.duration*totalLen;let acc=0,k=0;while(k<parts.length-1&&acc+lens[k]<at){acc+=lens[k];k++}setCap(parts[k])};
  audio.onended=end;audio.onerror=()=>{if(canSpeak){fin=true;speak(narr(S[i]),done)}else end()};
  const p=audio.play();if(p&&p.catch)p.catch(()=>{if(my!==tok)return;if(canSpeak){fin=true;speak(narr(S[i]),done)}else end()})}
function say(i,done){if(useAudio)playAudio(i,done);else speak(narr(S[i]),done)}
const fill=document.getElementById("stepfill"),msg=document.getElementById("stepmsg"),nextBig=document.getElementById("nextbig"),replayBtn=document.getElementById("replay"),playBtn=document.getElementById("play");
let stepT=null,cdT=null,fillRaf=null;
function parkDots(){cancelAnimationFrame(raf);(curItems||[]).forEach(x=>{const p=x.pts[x.pts.length-1];x.c.setAttribute("cx",p[0]);x.c.setAttribute("cy",p[1])})}
function setMsg(t,done){msg.textContent=t;msg.classList.toggle("done",!!done)}
function clearStepTimers(){clearTimeout(stepT);clearInterval(cdT);cancelAnimationFrame(fillRaf)}
function estimate(s){return Math.min(24000,Math.max(9000,narr(s).length*55))}
function runFill(dur){cancelAnimationFrame(fillRaf);const t0=performance.now();const tick=t=>{const p=Math.min(1,(t-t0)/dur);fill.style.width=(p*100)+"%";if(p<1)fillRaf=requestAnimationFrame(tick)};fillRaf=requestAnimationFrame(tick)}
function silentStep(){const d=estimate(S[cur])/(rate/0.92);runFill(d);stepT=setTimeout(stepDone,d)}
function beginStep(i,wantVoice){clearStepTimers();hush();show(i);fill.style.width="0%";nextBig.classList.remove("pulse");
  nextBig.textContent=cur<S.length-1?"Next step →":"Check questions ↓";
  setMsg((playing?"▶ Playing · ":"")+"Step "+(cur+1)+" of "+S.length+": watch the dots and follow the subtitles");
  if(wantVoice&&voiceOn&&canVoice){runFill(estimate(S[cur])/(rate/0.92));say(cur,stepDone)}else silentStep()}
function stepDone(){clearStepTimers();fill.style.width="100%";parkDots();
  if(cur>=S.length-1){playing=false;playBtn.textContent="▶ Play again";setMsg("🎉 Lesson complete! Now try the check questions below.",true);nextBig.classList.add("pulse");return}
  if(playing){let n=5;setMsg("✅ Step "+(cur+1)+" done · next step in "+n+"s (press Pause to stay here)",true);
    cdT=setInterval(()=>{n--;if(n<=0){clearInterval(cdT);beginStep(cur+1,true)}else setMsg("✅ Step "+(cur+1)+" done · next step in "+n+"s (press Pause to stay here)",true)},1000)}
  else{setMsg("✅ Step "+(cur+1)+" of "+S.length+" done. Ready? Tap Next step →, or Replay to watch it again.",true);nextBig.classList.add("pulse")}}
function stop(){playing=false;clearStepTimers();hush();parkDots();playBtn.textContent="▶ Play";setMsg("⏸ Paused on step "+(cur+1)+". Press Play to continue, or Next step.")}
playBtn.addEventListener("click",()=>{if(playing){stop();return}playing=true;playBtn.textContent="❚❚ Pause";beginStep(cur>=S.length-1&&msg.classList.contains("done")?0:cur,true)});
function manual(i){playing=false;playBtn.textContent="▶ Play";beginStep(i,true)}
function goNext(){if(cur>=S.length-1){const q=document.getElementById("quiz");if(q)q.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});return}manual(cur+1)}
nextBig.addEventListener("click",goNext);
replayBtn.addEventListener("click",()=>beginStep(cur,true));
document.getElementById("next").addEventListener("click",goNext);
document.getElementById("prev").addEventListener("click",()=>{if(cur>0)manual(cur-1)});
document.addEventListener("keydown",e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test((e.target&&e.target.tagName)||""))return;if(e.key==="ArrowRight")goNext();else if(e.key==="ArrowLeft"&&cur>0)manual(cur-1)});
vbtn.addEventListener("click",()=>{voiceOn=!voiceOn;vbtn.setAttribute("aria-pressed",voiceOn?"true":"false");vbtn.textContent=voiceOn?"🔊 Voice on":"🔇 Voice off";
  if(msg.classList.contains("done"))return;if(!voiceOn){hush();clearStepTimers();silentStep()}else beginStep(cur,true)});
rsel.addEventListener("change",()=>{rate=parseFloat(rsel.value)||0.92;if(audio)audio.playbackRate=rate/0.92});
const tb=document.getElementById("tbl");
S.forEach((s,i)=>{const tr=document.createElement("tr");[(i+1)+". "+s.t,s.svc,s.trap].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td)});tb.appendChild(tr)});
show(0,2);
const qz=document.getElementById("quiz");
L.quiz.forEach((x,qi)=>{const d=document.createElement("div");d.className="q";
  d.innerHTML='<span class="app"></span><p class="qq"></p><div class="opts"></div><p class="why" hidden></p>';
  d.querySelector(".app").textContent=x.app;d.querySelector(".qq").textContent=(qi+1)+". "+x.q;
  const os=d.querySelector(".opts"),why=d.querySelector(".why");
  x.o.forEach((t,oi)=>{const b=document.createElement("button");b.type="button";b.textContent=String.fromCharCode(65+oi)+". "+t;
    b.addEventListener("click",()=>{[...os.children].forEach((bb,j)=>{bb.classList.remove("right","wrong");if(j===x.a)bb.classList.add("right")});
      if(oi!==x.a)b.classList.add("wrong");why.hidden=false;why.textContent=(oi===x.a?"Correct. ":"Not quite. ")+x.w});
    os.appendChild(b)});
  qz.appendChild(d)});
const sr=document.getElementById("series-rest");
(window.SERIES||[]).forEach(([t,u])=>{const e=u?document.createElement("a"):document.createElement("span");e.textContent=t;if(u)e.href=u;sr.appendChild(e);sr.appendChild(document.createTextNode("  "))});
})();
