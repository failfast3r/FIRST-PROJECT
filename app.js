"use strict";
(() => {
 const data = window.ECOSYSTEM;
 const $ = id => document.getElementById(id);
 const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const normal = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ø/g,"o").replace(/æ/g,"ae");
 const actors = new Map(data.actors.map(a => [a.id, a]));
 const sources = new Map(data.sources.map(s => [s.id, s]));
 const colors = {Danmark:"#78b8ff",Allierede:"#b0a1f0","NATO / multinationalt":"#69d7e3"};
 const state = {geo:"Alle",topics:new Set(),query:"",concepts:true,uncertain:true,selected:"battlelab",view:"map",list:window.matchMedia?.('(max-width:760px)').matches||false,box:[0,0,1240,890]};
 const activeRelations = () => data.relations.filter(r => state.concepts || r.kind === "documented");
 function matchingActors(){
  return data.actors.filter(a => a.id === "battlelab" || ((state.geo === "Alle" || a.geo === state.geo) && (!state.topics.size || a.topics.some(t => state.topics.has(t))) && (state.uncertain || a.status !== "unverified") && (!state.query || normal([a.name,a.short,a.country,a.role,...a.topics].join(" ")).includes(normal(state.query)))));
 }
 function visibleRelations(){const ids=new Set(matchingActors().map(a=>a.id));return activeRelations().filter(r=>ids.has(r.a)&&ids.has(r.b));}
 function evidenceBadge(kind){return kind==="concept"?'<span class="pill warning">Konceptgrundlag · planlagt</span>':'<span class="pill good">Offentligt dokumenteret</span>';}
 function sourceLink(id){const s=sources.get(id);if(!s)return "";return s.url?`<a class="source-inline" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`:`<span class="source-inline">${esc(s.title)}<br><small>Internt dokument · fuld tekst ikke indlejret</small></span>`;}
 function actorBadge(a){return a.status==="planned"?'<span class="pill warning">Åbner 1. november 2026 · brugerbekræftet</span>':a.status==="unverified"?'<span class="pill warning">Uafklaret</span>':a.status==="concept"?'':a.sources.length&&a.sources.every(id=>sources.get(id)?.kind==='Brugeroplysning')?'<span class="pill warning">Brugeroplyst · ikke efterprøvet</span>':'<span class="pill good">Rolle kildeunderbygget</span>';}
 // På smalle skærme ligger detaljepanelet under indholdet; rul det frem, så valget kan ses.
 function revealDetail(){const d=$("detail"),r=d.getBoundingClientRect();if(r.top>window.innerHeight-80||r.bottom<80)d.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
 function bindActorButtons(root){root.querySelectorAll("[data-actor]").forEach(b=>b.addEventListener("click",()=>{selectActor(b.dataset.actor);if(root!==$("detail"))revealDetail();}));}
 function renderFilters(){
  $("geography").innerHTML=["Alle","Danmark","Allierede","NATO / multinationalt"].map(g=>`<button data-geo="${esc(g)}" aria-pressed="${state.geo===g}" class="${state.geo===g?'active':''}">${esc(g)}</button>`).join("");
  $("topics").innerHTML=data.topics.map(t=>`<button data-topic="${esc(t)}" aria-pressed="${state.topics.has(t)}" class="${state.topics.has(t)?'active':''}">${esc(t)}</button>`).join("");
  $("geography").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{state.geo=b.dataset.geo;update();}));
  $("topics").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{const t=b.dataset.topic;state.topics.has(t)?state.topics.delete(t):state.topics.add(t);update();}));
 }
 function nodeSvg(a){
  const hub=a.id==="battlelab", w=hub?226:202,h=hub?106:64;
  const related=new Set([state.selected,...visibleRelations().filter(r=>r.a===state.selected||r.b===state.selected).flatMap(r=>[r.a,r.b])]);
  const classes=["node",hub?"hub":"",state.selected===a.id?"selected":"",a.status==="unverified"?"unverified":"",state.selected!=="battlelab"&&!related.has(a.id)?"dim":""].join(" ");
  const marker=a.status==="unverified"?"?":a.type==="Ramme"?"RAMME":a.type==="Program"?"PROGRAM":a.country;
  return `<g class="${classes}" data-id="${esc(a.id)}" role="button" tabindex="0" aria-label="Vis ${esc(a.name)}${a.status==='unverified'?', uafklaret':''}" transform="translate(${a.x-w/2},${a.y-h/2})"><rect width="${w}" height="${h}" rx="${hub?12:7}"/><circle cx="14" cy="${hub?25:18}" r="3" fill="${hub?'#5ae1b8':a.status==='unverified'?'#e6b866':colors[a.geo]}"/><text class="${hub?'title':''}" x="${hub?25:24}" y="${hub?47:28}">${esc(a.short)}</text><text class="node-meta" x="${hub?25:24}" y="${hub?75:49}">${esc(hub?'Operativ effekt · test & udvikling':marker)}</text></g>`;
 }
 const zones=[{x:24,y:30,w:450,h:425,label:"DANSKE FORSVARSMILJØER"},{x:540,y:30,w:676,h:485,label:"DANSK TEKNOLOGI & FORSKNING",path:"M554 30H1202Q1216 30 1216 44V501Q1216 515 1202 515H780Q766 515 766 501V369Q766 355 752 355H554Q540 355 540 341V44Q540 30 554 30Z"},{x:24,y:550,w:450,h:315,label:"ALLIEREDE & INNOVATIONSINDGANGE"},{x:766,y:550,w:450,h:315,label:"NATO · ORGANISATIONER & RAMMER"}];
 // Zoneoverskrifterne er også (svagere) forhindringer, så linjer helst ikke krydser teksten.
 const labelBoxes=zones.map((z,i)=>["label"+i,{x0:z.x+8,y0:z.y+6,x1:z.x+24+z.label.length*11.5,y1:z.y+34}]);
 const nodeBox=a=>{const hub=a.id==="battlelab",w=hub?226:202,h=hub?106:64,pad=8;return {x0:a.x-w/2-pad,y0:a.y-h/2-pad,x1:a.x+w/2+pad,y1:a.y+h/2+pad};};
 const curveOffsets=[0];for(let c=35;c<=315;c+=35)curveOffsets.push(c,-c);
 // Vælg den mindst krumme kurve, der ikke løber ind under andre aktørers bokse.
 function routeEdge(r,boxes){
  const a=actors.get(r.a),b=actors.get(r.b),dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy)||1,nx=-dy/distance,ny=dx/distance;
  const preferred=parseInt(r.id.slice(1),10)%2===0?1:-1;let best=null;
  for(const offset of curveOffsets){
   const c=offset*preferred,cx=(a.x+b.x)/2+nx*c,cy=(a.y+b.y)/2+ny*c;let hits=0;
   for(const [id,box] of boxes){if(id===r.a||id===r.b)continue;for(let t=.04;t<.97;t+=.03){const u=1-t,px=u*u*a.x+2*u*t*cx+t*t*b.x,py=u*u*a.y+2*u*t*cy+t*t*b.y;if(px>box.x0&&px<box.x1&&py>box.y0&&py<box.y1){hits+=id.startsWith("label")?.25:1;break;}}}
   const cost=hits*1000+Math.abs(offset);if(!best||cost<best.cost)best={cost,d:`M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`};if(!hits)break;
  }
  return best.d;
 }
 function edgeSvg(r,d){
  const a=actors.get(r.a),b=actors.get(r.b);const relevant=r.a===state.selected||r.b===state.selected;
  return `<g data-relation="${esc(r.id)}"><path class="edge-hit" d="${d}" aria-hidden="true"/><path class="edge ${r.kind} ${relevant?'focused':state.selected!=='battlelab'?'dim':''}" d="${d}" tabindex="0" role="button" aria-label="${esc(a.short+' og '+b.short+': '+r.label+(r.kind==='concept'?', konceptgrundlag':''))}"/></g>`;
 }
 function renderMap(){
  const list=matchingActors(),rels=visibleRelations();
  $("stats").innerHTML=`<strong>${data.actors.length}</strong> aktører<br><strong>${data.relations.length}</strong> relationer i grundlaget`;
  $("mapCount").textContent=`${list.length} aktører vist · ${rels.length} relationer${state.topics.size?' · fagområder kombineres med ELLER':''}`;
  $("zones").innerHTML=zones.map(z=>`${z.path?`<path class="zone-box" d="${z.path}"/>`:`<rect class="zone-box" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="14"/>`}<text class="zone-label" x="${z.x+16}" y="${z.y+25}">${z.label}</text>`).join("");
  const boxes=[...list.map(a=>[a.id,nodeBox(a)]),...labelBoxes];
  $("edges").innerHTML=rels.map(r=>edgeSvg(r,routeEdge(r,boxes))).join("");
  $("nodes").innerHTML=list.map(nodeSvg).join("");
  $("nodes").querySelectorAll(".node").forEach(n=>{n.addEventListener("click",()=>selectActor(n.dataset.id));n.addEventListener("keydown",e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectActor(n.dataset.id);}});});
  $("edges").querySelectorAll("[data-relation]").forEach(n=>{n.addEventListener("click",()=>showRelation(n.dataset.relation));n.addEventListener("keydown",e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showRelation(n.dataset.relation);}});});
  $("actorList").innerHTML=list.map(a=>`<button class="actor-row" data-actor="${esc(a.id)}"><strong>${esc(a.name)}</strong><small>${esc(a.country)} · ${esc(a.type)}${a.status==='unverified'?' · Uafklaret':''}</small></button>`).join("");bindActorButtons($("actorList"));
  $("actorList").hidden=!state.list;$("mapArea").hidden=state.list;$("listToggle").textContent=state.list?'Vis kort':'Vis liste';
  const empty=list.length===1&&(state.query||state.geo!=='Alle'||state.topics.size);$("noResults").hidden=!empty;
  $("graph").setAttribute("viewBox",state.box.join(" "));
 }
 // Kontaktoplysninger vises kun, når de er knyttet til en kendt kilde.
 const contactHref={email:v=>'mailto:'+v,phone:v=>'tel:'+v.replace(/[^+\d]/g,''),web:v=>v};
 function contactSection(a){
  const items=(a.contact||[]).filter(c=>contactHref[c.kind]&&sources.has(c.source));
  if(!items.length)return '';
  return `<div class="section-label">KONTAKT · OFFENTLIGT OPLYST</div><ul class="contact-list">${items.map(c=>{const s=sources.get(c.source);const ext=c.kind==='web'?' target="_blank" rel="noopener noreferrer"':'';return `<li><span>${esc(c.label)}</span><a href="${esc(contactHref[c.kind](c.value))}"${ext}>${esc(c.kind==='web'?c.value.replace(/^https?:\/\//,'').replace(/\/$/,''):c.value)}</a><small>Kilde: ${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`:esc(s.title)} · ${esc(s.date)}</small></li>`;}).join('')}</ul>`;
 }
 // Samarbejdsfelter er redaktionelle vurderinger; ansvarlig og dato vises kun, når de er aftalt.
 const collabStages=["Idé","Dialog","Planlagt","I gang","Afsluttet"];
 const fmtDate=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||"");return m?`${m[3]}.${m[2]}.${m[1]}`:"";};
 function collabSection(a){
  const c=data.collaboration?.[a.id];
  if(!c)return `<div class="advice"><strong>NÆSTE SKRIDT · FAGLIG VURDERING</strong><p>${esc(a.next)}</p></div>`;
  const stage=collabStages.indexOf(c.status);
  const steps=collabStages.map((s,i)=>`<li class="${i===stage?'current':i<stage?'done':''}"${i===stage?' aria-current="step"':''}>${esc(s)}</li>`).join('');
  const field=(label,text)=>`<div class="collab-field"><dt>${label}</dt><dd>${esc(text)}</dd></div>`;
  return `<section class="collab" aria-label="Samarbejde med Battlelab"><div class="section-label">SAMARBEJDE MED BATTLELAB · FAGLIG VURDERING</div><dl>${field('Muligt samarbejde',c.work)}${field('Operativt behov',c.need)}${field('Forventet effekt',c.effect)}<div class="collab-field"><dt>Status</dt><dd><ol class="collab-status">${steps}</ol>${stage<0?'<small>Status ikke angivet</small>':''}</dd></div></dl><div class="advice"><strong>NÆSTE SKRIDT</strong><p>${esc(a.next)}</p><small>Ansvarlig: ${c.owner?esc(c.owner):'ikke fastlagt'} · Dato: ${fmtDate(c.due)?esc(fmtDate(c.due)):'ikke fastlagt'}</small></div></section>`;
 }
 function renderDetail(){
  const a=actors.get(state.selected)||actors.get("battlelab");
  const rels=activeRelations().filter(r=>r.a===a.id||r.b===a.id);
  $("detail").innerHTML=`${a.id==='battlelab'?'<div class="logo-lockup"><img src="battlelab-logo.png" width="1536" height="1024" alt="Battlelab Danmark – logo i mørkeblå og rød"></div>':''}<div class="section-label">${a.id==='battlelab'?'KORTETS KNUDEPUNKT':'VALGT AKTØR'}</div><span class="pill">${esc(a.country)} · ${esc(a.type)}</span><h2>${esc(a.name)}</h2>${actorBadge(a)}<p class="intro">${esc(a.role)}</p><div class="tags">${a.topics.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div>${a.uncertainty?`<div class="unverified-banner">${esc(a.uncertainty)}</div>`:''}${a.id==='battlelab'?'':collabSection(a)}<div class="section-label">BIDRAG TIL ØKOSYSTEMET</div><p>${esc(a.contribution)}</p><div class="section-label">KILDEUNDERBYGGEDE RELATIONER · ${rels.length}</div><div class="relations">${rels.length?rels.map(r=>{const other=actors.get(r.a===a.id?r.b:r.a);return `<button data-rel="${esc(r.id)}"><strong>${esc(other.short)}</strong><span>${esc(r.label)}</span><span style="color:${r.kind==='concept'?'var(--amber)':'var(--mint)'}">${r.kind==='concept'?'Konceptgrundlag · planlagt':'Offentligt dokumenteret'}</span></button>`;}).join(''):'<p>Ingen relation dokumenteret i kortets kilder. Det betyder ikke, at en relation ikke findes.</p>'}</div>${contactSection(a)}${a.id==='battlelab'?collabSection(a):''}`;
  $("detail").querySelectorAll("[data-rel]").forEach(b=>b.addEventListener("click",()=>showRelation(b.dataset.rel)));
 }
 function selectActor(id){if(!actors.has(id))throw new Error("Ukendt aktør");state.selected=id;renderMap();renderDetail();}
 function showRelation(id){
  const r=data.relations.find(r=>r.id===id);if(!r)return;const a=actors.get(r.a),b=actors.get(r.b);
  $("detail").innerHTML=`<div class="detail-back"><span>VALGT RELATION</span><button id="backActor" class="text-btn">Til aktøren</button></div><h2>${esc(a.short)} / ${esc(b.short)}</h2>${evidenceBadge(r.kind)}<div class="section-label">${esc(r.label)}</div><div class="relation-evidence"><p>${esc(r.evidence)}</p></div>${r.kind==='concept'?'<div class="unverified-banner">Kilden beskriver en intention. En etableret aftale, integration eller adgang er ikke bekræftet.</div>':'<p>Relationen gælder det omfang og tidspunkt, som kilden beskriver. Den dokumenterer ikke automatisk andre samarbejder.</p>'}<div class="relations"><button data-actor="${esc(a.id)}"><strong>${esc(a.name)}</strong><span>Se rolle og øvrige forbindelser</span></button><button data-actor="${esc(b.id)}"><strong>${esc(b.name)}</strong><span>Se rolle og øvrige forbindelser</span></button></div>${sources.has(r.source)?`<div class="section-label">KILDE</div>${sourceLink(r.source)}<p>${esc(sources.get(r.source).publisher)} · ${esc(sources.get(r.source).date)}</p>`:''}`;
  $("backActor").addEventListener("click",renderDetail);bindActorButtons($("detail"));
 }
 function findPath(from,to){
  if(!actors.has(from)||!actors.has(to))throw new Error("Ukendt aktør");
  if(from===to)return {nodes:[from],edges:[]};
  const edges=visibleRelations().sort((a,b)=>(a.kind==='concept')-(b.kind==='concept'));
  const queue=[{nodes:[from],edges:[]}],seen=new Set([from]);
  while(queue.length){const p=queue.shift(),last=p.nodes[p.nodes.length-1];for(const r of edges){const next=r.a===last?r.b:r.b===last?r.a:null;if(!next||seen.has(next))continue;const n={nodes:[...p.nodes,next],edges:[...p.edges,r]};if(next===to)return n;seen.add(next);queue.push(n);}}
  return null;
 }
 function renderPaths(){
  const from=$("pathFrom").value,to=$("pathTo").value;const a=actors.get(from),b=actors.get(to);
  if(!a||!b){$("pathResult").innerHTML='<div class="empty">Vælg to aktører.</div>';return;}
  const p=findPath(from,to);
  if(!p){const shared=a.topics.filter(t=>b.topics.includes(t));$("pathResult").innerHTML=`<div class="empty"><strong>Ingen underbygget kæde i det valgte grundlag.</strong><p>Der er ikke en forbindelse mellem ${esc(a.short)} og ${esc(b.short)} i de viste relationer. Aktive filtre gælder også her.</p></div>${shared.length?`<div class="advice" style="margin-top:18px"><strong>MULIG SAMARBEJDSFLADE · FAGLIG VURDERING</strong><p>Fælles fokus: ${esc(shared.join(', '))}. Afklar en relevant kontakt og et konkret problem. Dette er et forslag, ikke en dokumenteret relation.</p></div>`:''}`;return;}
  const concepts=p.edges.filter(r=>r.kind==='concept').length;
  $("pathResult").innerHTML=`<div class="note">${p.edges.length} forbindelser · ${concepts?`${concepts} fra konceptgrundlag. Kæden er delvist planlagt og skal afklares.`:'Alle forbindelser er offentligt dokumenteret.'} Linjerne er relationer, ikke retninger for data, ansvar eller adgang.</div>${p.nodes.map((id,i)=>{const n=actors.get(id);return `<div class="path-node"><span class="step-number">${i+1}</span><div><button data-actor="${esc(id)}">${esc(n.name)}</button><p>${esc(n.type)}</p></div></div>${i<p.edges.length?`<div class="path-link ${p.edges[i].kind}"><strong>${esc(p.edges[i].label)}</strong>${evidenceBadge(p.edges[i].kind)}<p>${esc(p.edges[i].evidence)}</p>${sourceLink(p.edges[i].source)}</div>`:''}`;}).join('')}`;bindActorButtons($("pathResult"));
 }
 function renderOverlap(){
  const topic=$("overlapTopic").value;
  const list=matchingActors().filter(a=>a.topics.includes(topic)&&a.status!=='unverified');
  $("overlapResult").innerHTML=`<div class="note">${list.length} aktører med fokus på ${esc(topic.toLowerCase())}. Sammenlign bidrag og testansvar før en opgave fordeles. Aktive filtre gælder.</div><div class="overlap-grid">${list.map(a=>`<article class="overlap-card"><div><h3>${esc(a.name)}</h3><span class="pill">${esc(a.type)}</span></div><p>${esc(a.role)}</p><p><strong style="color:var(--text)">Særligt bidrag:</strong> ${esc(a.contribution)}</p><button data-actor="${esc(a.id)}">Se aktør og relationer</button></article>`).join('')}</div>${!list.length?'<div class="empty">Ingen aktører matcher. Nulstil filtrene eller vælg et andet fokus.</div>':''}`;bindActorButtons($("overlapResult"));
 }
 function renderSources(){
  $("sourcesList").innerHTML=`<div class="note">Interne dokumenter beskriver ambitioner og planlagte relationer. Offentlige kilder beskriver roller og konkrete forbindelser. Brugeroplysninger markeres særskilt. Fagområder og næste skridt er redaktionelle vurderinger.</div>${data.sources.map(s=>`<article class="source-card" id="source-${esc(s.id)}"><h3>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`:esc(s.title)}</h3><small>${esc(s.publisher)} · ${esc(s.date)} · ${esc(s.kind)}</small><p>${esc(s.note)}</p>${!s.url?(s.kind==='Brugeroplysning'?'<small>Oplyst af brugeren; ingen offentlig primærkilde tilknyttet.</small>':'<small>Brugerens interne dokument. Fuld tekst og download er ikke offentliggjort.</small>'):''}</article>`).join('')}`;
 }
 function updateSelectors(){
  const previousFrom=$("pathFrom").value||"battlelab",previousTo=$("pathTo").value||"faic";
  const options=matchingActors().map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
  $("pathFrom").innerHTML=options;$("pathTo").innerHTML=options;
  const ids=new Set(matchingActors().map(a=>a.id));$("pathFrom").value=ids.has(previousFrom)?previousFrom:'battlelab';$("pathTo").value=ids.has(previousTo)?previousTo:(matchingActors().find(a=>a.id!=='battlelab')?.id||'battlelab');
 }
 function update(){
  if(!matchingActors().some(a=>a.id===state.selected))state.selected='battlelab';
  renderFilters();renderMap();renderDetail();updateSelectors();renderPaths();renderOverlap();
 }
 function switchView(view){
  if(!['map','paths','overlap','sources'].includes(view))throw new Error('Ukendt visning');state.view=view;
  document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===view;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  for(const key of ['map','paths','overlap','sources'])$(key+'View').hidden=key!==view;
 }
 function zoom(factor,fx=.5,fy=.5){const [x,y,w,h]=state.box,nw=Math.max(420,Math.min(2100,w*factor)),nh=nw*890/1240;state.box=[x+(w-nw)*fx,y+(h-nh)*fy,nw,nh];$('graph').setAttribute('viewBox',state.box.join(' '));}
 $('search').addEventListener('input',e=>{state.query=e.target.value.trim();update();});
 $('concepts').addEventListener('change',e=>{state.concepts=e.target.checked;update();});
 $('uncertain').addEventListener('change',e=>{state.uncertain=e.target.checked;update();});
 $('reset').addEventListener('click',()=>{state.geo='Alle';state.topics.clear();state.query='';state.concepts=true;state.uncertain=true;state.selected='battlelab';$('search').value='';$('concepts').checked=true;$('uncertain').checked=true;update();});
 $('listToggle').addEventListener('click',()=>{state.list=!state.list;renderMap();});
 const tabs=[...document.querySelectorAll('[data-view]')];
 tabs.forEach((b,i)=>{b.addEventListener('click',()=>switchView(b.dataset.view));b.addEventListener('keydown',e=>{const step={ArrowRight:1,ArrowLeft:-1}[e.key];const target=step?tabs[(i+step+tabs.length)%tabs.length]:e.key==='Home'?tabs[0]:e.key==='End'?tabs[tabs.length-1]:null;if(!target)return;e.preventDefault();switchView(target.dataset.view);target.focus();});});
 $('findPath').addEventListener('click',renderPaths);
 $('pathFrom').addEventListener('change',renderPaths);$('pathTo').addEventListener('change',renderPaths);
 $('overlapTopic').innerHTML=data.topics.map(t=>`<option>${esc(t)}</option>`).join('');$('overlapTopic').addEventListener('change',renderOverlap);
 $('zoomIn').addEventListener('click',()=>zoom(.8));$('zoomOut').addEventListener('click',()=>zoom(1.25));$('fit').addEventListener('click',()=>{state.box=[0,0,1240,890];renderMap();});
 let drag=null;
 $('graph').addEventListener('pointerdown',e=>{if(e.target.closest('.node,[data-relation]'))return;drag={x:e.clientX,y:e.clientY,box:[...state.box]};$('graph').setPointerCapture(e.pointerId);});
 $('graph').addEventListener('pointermove',e=>{if(!drag)return;const r=$('graph').getBoundingClientRect(),scale=Math.max(drag.box[2]/r.width,drag.box[3]/r.height);state.box=[drag.box[0]-(e.clientX-drag.x)*scale,drag.box[1]-(e.clientY-drag.y)*scale,drag.box[2],drag.box[3]];$('graph').setAttribute('viewBox',state.box.join(' '));});
 $('graph').addEventListener('wheel',e=>{e.preventDefault();const g=$('graph'),r=g.getBoundingClientRect(),m=g.getScreenCTM();if(!m)return;const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()),[x,y,w,h]=state.box;zoom(e.deltaY>0?1.12:1/1.12,(pt.x-x)/w,(pt.y-y)/h);},{passive:false});
 $('graph').addEventListener('pointerup',()=>{drag=null;});$('graph').addEventListener('pointercancel',()=>{drag=null;});
 $('methodBtn').addEventListener('click',()=>$('method').showModal());$('closeMethod').addEventListener('click',()=>$('method').close());
 $('method').addEventListener('click',e=>{if(e.target===$('method'))$('method').close();});
 renderSources();update();
 const registry=document.modelContext;
 if(registry?.registerTool){
  const life=new AbortController();const register=tool=>{try{Promise.resolve(registry.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}};
  register({name:'read_ecosystem',description:'Læs aktører og kildeunderbyggede relationer i det aktuelle filter.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({actors:matchingActors().map(a=>({id:a.id,name:a.name,status:a.status||'documented'})),relations:visibleRelations().map(r=>({id:r.id,a:r.a,b:r.b,kind:r.kind,source:r.source}))})});
  register({name:'select_ecosystem_actor',description:'Vælg en aktør og vis rolle, relationer og kilder i detaljepanelet.',inputSchema:{type:'object',properties:{actorId:{type:'string'}},required:['actorId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input.actorId!=='string'||!actors.has(input.actorId))throw new Error('Ukendt aktør');selectActor(input.actorId);const a=actors.get(input.actorId);return {id:a.id,name:a.name,role:a.role,uncertainty:a.uncertainty||null};}});
  window.addEventListener('pagehide',()=>life.abort(),{once:true});
 }
 window.BattlelabAtlas={findPath,matchingActors,visibleRelations,selectActor,showRelation,switchView,state};
})();
