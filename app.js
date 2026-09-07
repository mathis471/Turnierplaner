const KEY="dart-turnier-data-v2";
const $=s=>document.querySelector(s);
let state;
try {
 state=JSON.parse(localStorage.getItem(KEY)||'null')||{tournaments:[],current:null,view:"home",tab:"overview"};
} catch(e) {
 state={tournaments:[],current:null,view:"home",tab:"overview"};
}
let draftPlayers=[];

function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state));}
 catch(e){console.warn("Speichern fehlgeschlagen:",e);}
}
function uid(){return Math.random().toString(36).slice(2,9)}
function nav(view){state.view=view;save();render()}
function current(){return state.tournaments.find(t=>t.id===state.current)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function modes(selected=3){return [1,3,5,7,9,11,13,15,17,19].map(n=>`<option value="${n}" ${n===selected?"selected":""}>Best of ${n}</option>`).join("")}
function header(back=true){return `<div class="top"><div class="brand">🎯 Dart Turnier</div>${back?'<button class="secondary small" onclick="nav(\'home\')">Startseite</button>':''}</div>`}

function render(){
 const app=$("#app");
 if(state.view==="home")app.innerHTML=home();
 else if(state.view==="new")app.innerHTML=newTournament();
 else app.innerHTML=tournament();
 if(state.view==="new")drawPlayers();
 if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
}

function home(){
 const ts=state.tournaments;
 return `<div class="app">${header(false)}
 <div class="hero"><div class="pill">OFFLINE • iPHONE</div><h1>Dart-Turniere<br>einfach verwalten.</h1>
 <p>Spieler, Gruppen, Tabellen und KO-Phase – alles lokal auf deinem Gerät.</p>
 <button class="primary" onclick="nav('new')">＋ Neues Turnier</button></div>
 <div class="section"><h2>Meine Turniere</h2>
 ${ts.length?`<div class="grid">${ts.map(t=>`<div class="card bigcard"><div><h3>${esc(t.name)}</h3>
 <p class="muted">${t.players.length} Spieler · ${t.groups.length?t.groups.length+" Gruppen":"Direkt KO"}</p></div>
 <div class="row"><button class="primary small" onclick="openT('${t.id}')">Öffnen</button>
 <button class="danger small" onclick="delT('${t.id}')">Löschen</button></div></div>`).join("")}</div>`
 :`<div class="card"><p class="muted">Noch kein Turnier angelegt.</p></div>`}</div>
 <div class="footer">Die Turnierdaten werden nur auf diesem Gerät gespeichert.</div></div>`;
}

function newTournament(){
 if(!draftPlayers.length)draftPlayers=[""];
 return `<div class="app">${header()}<div class="section"><h1>Neues Turnier</h1><div class="card">
 <div class="field"><label>Turniername</label><input id="tname" placeholder="z. B. Sommer-Cup"></div>
 <div class="field"><label>Turnierformat</label><select id="format" onchange="toggleFormat()">
 <option value="groups">Gruppenphase → KO-Phase</option><option value="ko">Direkt KO-Phase</option></select></div>
 <div class="grid">
 <div class="field"><label>Anzahl Spieler</label><input id="pcount" type="number" min="2" max="128" value="${Math.max(2,draftPlayers.length)}" oninput="syncPlayerFields()"></div>
 <div class="field" id="gwrap"><label>Anzahl Gruppen</label><input id="gcount" type="number" min="1" max="32" value="4"></div>
 <div class="field" id="qwrap"><label>Weiterkommer je Gruppe</label><input id="qcount" type="number" min="1" value="2"></div>
 </div>
 <div class="field"><label>Grundmodus</label><select id="baseMode">${modes(3)}</select></div>
 <div class="notice">Der Grundmodus gilt für Gruppenspiele und für KO-Runden bis zum Halbfinale. Halbfinale und Finale können darunter separat eingestellt werden.</div>
 <div class="section"><h2>Halbfinale & Finale</h2>
 <label class="check"><input id="semiDifferent" type="checkbox" onchange="toggleSpecialModes()"> <span>Halbfinale soll einen anderen Modus haben</span></label>
 <div class="field" id="semiWrap" style="display:none"><label>Modus Halbfinale</label><select id="semiMode">${modes(5)}</select></div>
 <label class="check"><input id="finalDifferent" type="checkbox" onchange="toggleSpecialModes()"> <span>Finale soll einen anderen Modus haben</span></label>
 <div class="field" id="finalWrap" style="display:none"><label>Modus Finale</label><select id="finalMode">${modes(7)}</select></div>
 </div>
 <div class="section"><h2>Spieler</h2><p class="muted">Hier kannst du die Namen direkt beim Erstellen eingeben.</p>
 <div id="players"></div></div>
 <button class="primary" onclick="createTournament()">Turnier erstellen</button>
 </div></div></div>`;
}
function toggleFormat(){
 const groups=$("#format").value==="groups";
 $("#gwrap").style.display=groups?"":"none";$("#qwrap").style.display=groups?"":"none";
}
function toggleSpecialModes(){
 $("#semiWrap").style.display=$("#semiDifferent").checked?"":"none";
 $("#finalWrap").style.display=$("#finalDifferent").checked?"":"none";
}
function syncPlayerFields(){
 const n=Math.max(2,Math.min(128,+$("#pcount").value||2));
 while(draftPlayers.length<n)draftPlayers.push("");
 if(draftPlayers.length>n)draftPlayers=draftPlayers.slice(0,n);
 drawPlayers();
}
function drawPlayers(){
 const c=$("#players");if(!c)return;
 c.innerHTML=draftPlayers.map((p,i)=>`<div class="row" style="margin:7px 0">
 <input style="flex:1;padding:12px;border:1px solid #d1d5db;border-radius:10px" placeholder="Spieler ${i+1}" value="${esc(p)}"
 oninput="draftPlayers[${i}]=this.value">
 </div>`).join("");
}
function createTournament(){
 const name=$("#tname").value.trim()||"Dart-Turnier";
 const n=+$("#pcount").value,format=$("#format").value,g=+$("#gcount").value,q=+$("#qcount").value;
 const baseMode=+$("#baseMode").value;
 const semiMode=$("#semiDifferent").checked?+$("#semiMode").value:baseMode;
 const finalMode=$("#finalDifferent").checked?+$("#finalMode").value:baseMode;
 if(n<2)return alert("Mindestens 2 Spieler.");
 if(format==="groups"&&(g<1||g>n||n%g!==0))return alert("Die Spielerzahl muss gleichmäßig auf die Gruppen verteilt werden.");
 if(format==="groups"&&q<1||format==="groups"&&q>n/g)return alert("Zu viele Weiterkommer für die Gruppengröße.");
 let players=draftPlayers.slice(0,n).map((x,i)=>x.trim()||`Spieler ${i+1}`);
 const t={id:uid(),name,format,baseMode,semiMode,finalMode,players,groups:[],matches:[],ko:{rounds:[],champion:null},created:Date.now(),q};
 if(format==="groups")buildGroups(t,g); else buildKO(t);
 state.tournaments.unshift(t);state.current=t.id;state.view="tournament";state.tab="overview";draftPlayers=[];save();render();
}
function buildGroups(t,gcount){
 const size=t.players.length/gcount;
 for(let i=0;i<t.players.length;i+=size)t.groups.push({id:uid(),name:"Gruppe "+String.fromCharCode(65+t.groups.length),players:t.players.slice(i,i+size)});
 t.groups.forEach(gr=>{
  for(let i=0;i<gr.players.length;i++)for(let j=i+1;j<gr.players.length;j++)
   t.matches.push({id:uid(),group:gr.id,a:gr.players[i],b:gr.players[j],sa:null,sb:null,mode:t.baseMode});
 });
}
function roundName(n){return n===2?"Finale":n===4?"Halbfinale":n===8?"Viertelfinale":n===16?"Achtelfinale":`Runde (${n})`}
function modeForRound(t,n){const name=roundName(n);if(name==="Halbfinale")return t.semiMode;if(name==="Finale")return t.finalMode;return t.baseMode}
function makeRound(teams,mode,name){
 let r=[];
 for(let i=0;i<teams.length;i+=2)r.push({id:uid(),a:teams[i]||null,b:teams[i+1]||null,sa:null,sb:null,mode});
 return {id:uid(),name,matches:r};
}
function winnerOf(m){
 if(m.sa==null)return null;
 if(m.a&&m.b)return m.sa>m.sb?m.a:m.b;
 return m.a||m.b||null;
}
function prepareFirstRound(r){
 r.matches.forEach(m=>{
  if(m.a&&m.b)return;
  // Einseitige Paarung = Freilos. Zwei leere Plätze sind ein leerer
  // Bracket-Slot und werden ebenfalls als abgeschlossen markiert.
  if(m.a||m.b){m.sa=m.a?Math.ceil(m.mode/2):0;m.sb=m.b?Math.ceil(m.mode/2):0;}
  else {m.sa=0;m.sb=0;m.bye=true;}
 });
}
function createKORounds(t,count,teams){
 t.ko.rounds=[];
 const firstTeams=[...teams];
 while(firstTeams.length<count)firstTeams.push(null);
 t.ko.rounds.push(makeRound(firstTeams,t.baseMode,roundName(count)));
 for(let size=count/2;size>=2;size/=2)
  t.ko.rounds.push(makeRound(Array(size).fill(null),modeForRound(t,size),roundName(size)));
 prepareFirstRound(t.ko.rounds[0]);
 propagateKO(t,0);
}
function propagateKO(t,ri){
 const r=t.ko.rounds[ri];
 if(!r)return;
 if(ri+1>=t.ko.rounds.length){
  if(r.matches.length===1&&r.matches[0].sa!=null&&winnerOf(r.matches[0]))
   t.ko.champion=winnerOf(r.matches[0]);
  return;
 }
 const next=t.ko.rounds[ri+1];
 let changed=false;
 for(let i=0;i<r.matches.length;i++){
  const m=r.matches[i];
  if(m.sa==null)continue;
  const w=winnerOf(m);
  const slot=Math.floor(i/2),side=i%2?"b":"a";
  if(w && !next.matches[slot][side]){next.matches[slot][side]=w;changed=true;}
 }
 // Ein Match der nächsten Runde ist erst dann automatisch ein Freilos,
 // wenn BEIDE Zubringer abgeschlossen sind. Dadurch funktionieren auch
 // 3, 5, 6, 7, 9 ... Teilnehmer/Qualifizierte korrekt.
 for(let i=0;i<next.matches.length;i++){
  const m=next.matches[i];
  if(m.sa!=null)continue;
  const left=r.matches[i*2],right=r.matches[i*2+1];
  if(!left||!right||left.sa==null||right.sa==null)continue;
  const lw=winnerOf(left),rw=winnerOf(right);
  if(lw&&rw)continue;
  if(lw||rw){
   m.a=lw||null;m.b=rw||null;
   m.sa=lw?Math.ceil(m.mode/2):0;
   m.sb=rw?Math.ceil(m.mode/2):0;
   changed=true;
  }else{
   m.a=null;m.b=null;m.sa=0;m.sb=0;m.bye=true;
   changed=true;
  }
 }
 if(changed)propagateKO(t,ri+1);
}
function buildKO(t){
 let count=1;while(count<t.players.length)count*=2;
 createKORounds(t,count,[...t.players]);
}
function openT(id){state.current=id;state.view="tournament";state.tab="overview";save();render()}
function delT(id){if(confirm("Turnier wirklich löschen?")){state.tournaments=state.tournaments.filter(t=>t.id!==id);if(state.current===id)state.current=null;save();render()}}

function tournament(){
 const t=current();if(!t)return home();
 const tab=state.tab||"overview";
 return `<div class="app">${header()}<div class="section"><div class="row between">
 <div><h1>${esc(t.name)}</h1><p class="muted">${t.players.length} Spieler · ${t.format==="groups"?"Gruppenphase + KO":"Direkt KO"}</p></div>
 <button class="danger small" onclick="delT('${t.id}')">Turnier löschen</button></div>
 <div class="tabs">${["overview",...(t.format==="groups"?["groups","matches","table"]:[]),"ko"].map(x=>
 `<button class="tab ${tab===x?"active":""}" onclick="state.tab='${x}';render()">${({overview:"Übersicht",groups:"Gruppen",matches:"Spiele",table:"Tabelle",ko:"KO-Baum"})[x]}</button>`).join("")}</div>
 ${tab==="overview"?overview(t):tab==="groups"?groups(t):tab==="matches"?matches(t):tab==="table"?tables(t):koView(t)}
 </div></div>`;
}
function allKOmatches(t){
 return (t.ko?.rounds||[]).flatMap(r=>r.matches||[]);
}
function playerStats(t){
 const stats=Object.fromEntries(t.players.map(p=>[p,{p,legs:0,won:0,lost:0,matches:0}]));
 const all=[...(t.matches||[]),...allKOmatches(t)];
 all.filter(m=>m.sa!=null&&m.sb!=null&&m.a&&m.b).forEach(m=>{
  const A=stats[m.a],B=stats[m.b]; if(!A||!B)return;
  A.legs+=m.sa+m.sb; B.legs+=m.sa+m.sb;
  A.won+=m.sa; A.lost+=m.sb; B.won+=m.sb; B.lost+=m.sa;
  A.matches++; B.matches++;
 });
 return Object.values(stats).map(x=>({...x,pct:x.legs?Math.round(x.won/x.legs*100):0})).sort((a,b)=>(b.pct-a.pct)||(b.won-a.won)||(b.legs-a.legs)||a.p.localeCompare(b.p));
}
function overview(t){
 const groupTotal=t.matches.length,groupDone=t.matches.filter(m=>m.sa!=null).length;
 const stats=playerStats(t);
 const groupFinished=t.format!=="groups"||groupDone===groupTotal;
 return `<div class="grid">
 <div class="card"><h3>Gruppenfortschritt</h3><div style="font-size:34px;font-weight:900">${groupDone}/${groupTotal}</div><p class="muted">${t.format==="groups"?"Gruppenspiele abgeschlossen":"Keine Gruppenphase"}</p></div>
 <div class="card"><h3>Spieler</h3><div style="font-size:34px;font-weight:900">${t.players.length}</div><p class="muted">${t.groups.length?t.groups.length+" Gruppen":"Direktes KO"}</p></div>
 <div class="card"><h3>Grundmodus</h3><div style="font-size:25px;font-weight:900">Best of ${t.baseMode}</div><p class="muted">Gruppen & übrige KO-Runden</p></div>
 <div class="card"><h3>Finalrunden</h3><p><b>Halbfinale:</b> Best of ${t.semiMode}<br><b>Finale:</b> Best of ${t.finalMode}</p></div>
 </div>
 ${groupFinished&&t.format==="groups"&&!t.ko.rounds.length?`<div class="card section success"><h3>KO-Phase wurde automatisch erstellt</h3><p>Die qualifizierten Spieler und alle möglichen KO-Spiele wurden direkt angelegt.</p><button class="primary" onclick="state.tab='ko';render()">KO-Baum anzeigen</button></div>`:""}
 ${t.ko.champion?`<div class="champion"><div class="pill">🏆 TURNIERSIEGER</div><h2>${esc(t.ko.champion)}</h2></div>`:""}
 <div class="card section"><div class="between row"><div><h3>Spielerübersicht</h3><p class="muted">Alle gespielten Legs aus Gruppen- und KO-Phase.</p></div></div><div class="tablewrap"><table class="overview-table">
 <tr><th>#</th><th>Spieler</th><th>Spiele</th><th>Legs ges.</th><th>Gewonnen</th><th>Verloren</th><th>Gewonnen %</th></tr>
 ${stats.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.p)}</b></td><td>${x.matches}</td><td>${x.legs}</td><td>${x.won}</td><td>${x.lost}</td><td><div class="percent-cell"><div class="percent-bar"><span style="width:${x.pct}%"></span></div><b>${x.pct}%</b></div></td></tr>`).join("")}
 </table></div></div>`;
}
function groups(t){return `<div class="grid">${t.groups.map(g=>`<div class="group"><div class="grouphead">${esc(g.name)} <span class="muted">· ${g.players.length} Spieler</span></div><div style="padding:12px">${g.players.map(p=>`<div class="player" style="margin:6px 0">${esc(p)}</div>`).join("")}</div></div>`).join("")}</div>`}
function matches(t){
 return `<div class="grid">${t.groups.map(g=>`<div class="card"><h3>${esc(g.name)}</h3>${t.matches.filter(m=>m.group===g.id).map(matchHTML).join("")}</div>`).join("")}</div>`;
}
function matchHTML(m){
 const winner=m.sa!=null?(m.sa>m.sb?m.a:m.b):null;
 return `<div class="match"><div class="match-top"><div class="teams">
 ${winner===m.a?`<span class="team-winner">✓ ${esc(m.a)}</span>`:m.sa!=null?`<span class="team-loser">${esc(m.a)}</span>`:`<b>${esc(m.a)}</b>`}
 <span class="muted"> vs. </span>
 ${winner===m.b?`<span class="team-winner">✓ ${esc(m.b)}</span>`:m.sa!=null?`<span class="team-loser">${esc(m.b)}</span>`:`<b>${esc(m.b)}</b>`}
 <br><span class="pill">Best of ${m.mode}</span></div>
 <div class="score"><input id="sa-${m.id}" type="number" min="0" value="${m.sa??""}" placeholder="0"><b>:</b><input id="sb-${m.id}" type="number" min="0" value="${m.sb??""}" placeholder="0">
 <button class="primary small" onclick="saveMatch('${m.id}')">${m.sa!=null?"Ändern":"OK"}</button></div></div></div>`;
}
function saveMatch(id){
 const t=current(),m=t.matches.find(x=>x.id===id),a=+$("#sa-"+id).value,b=+$("#sb-"+id).value,need=Math.ceil(m.mode/2);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0)return alert("Bitte beide Ergebnisse eingeben.");
 if(a===b||((a!==need)&&(b!==need))||Math.max(a,b)>need)return alert(`Ungültiges Ergebnis. Bei Best of ${m.mode} muss ein Spieler ${need} Legs gewinnen.`);
 m.sa=a;m.sb=b;
 if(t.format==="groups" && !t.ko.rounds.length && t.matches.every(x=>x.sa!=null)) {
   createKOFromGroups(t);
 }
 save();render();
}
function standings(t,g){
 const s=g.players.map(p=>({p,w:0,l:0,wl:0,ll:0,pts:0}));
 const map=Object.fromEntries(s.map(x=>[x.p,x]));
 t.matches.filter(m=>m.group===g.id&&m.sa!=null).forEach(m=>{
  const A=map[m.a],B=map[m.b];A.wl+=m.sa;A.ll+=m.sb;B.wl+=m.sb;B.ll+=m.sa;
  if(m.sa>m.sb){A.w++;B.l++;A.pts+=2}else{B.w++;A.l++;B.pts+=2}
 });
 return s.sort((a,b)=>(b.pts-a.pts)||((b.wl-b.ll)-(a.wl-a.ll))||(b.w-a.w));
}
function tables(t){
 return `<div class="grid">${t.groups.map(g=>{const s=standings(t,g);return `<div class="card"><h3>${esc(g.name)}</h3><div class="tablewrap"><table>
 <tr><th>#</th><th>Spieler</th><th>Sp</th><th>S</th><th>N</th><th>Legs</th><th>Pkt</th></tr>
 ${s.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.p)}</b></td><td>${x.w+x.l}</td><td>${x.w}</td><td>${x.l}</td><td>${x.wl}:${x.ll}</td><td><b>${x.pts}</b></td></tr>`).join("")}
 </table></div></div>`}).join("")}</div>`;
}
function createKOFromGroups(t){
 let teams=[];
 for(let rank=0;rank<t.q;rank++){
  const ranked=t.groups.map(g=>standings(t,g)[rank]).filter(Boolean);
  if(rank%2===1)ranked.reverse();
  teams.push(...ranked.map(x=>x.p));
 }
 if(teams.length<2)return false;
 let count=1;while(count<teams.length)count*=2;
 createKORounds(t,count,teams);
 return true;
}
function startKO(){
 const t=current();
 if(t.ko.rounds.length)return alert("Die KO-Phase wurde bereits erstellt.");
 if(t.format==="groups" && !t.matches.every(m=>m.sa!=null))return alert("Die Gruppenphase ist noch nicht abgeschlossen.");
 if(!createKOFromGroups(t))return alert("Es sind noch nicht genügend qualifizierte Spieler vorhanden.");
 save();state.tab="ko";render();
}
function koView(t){
 if(!t.ko.rounds.length)return `<div class="card"><h3>KO-Phase</h3><p class="muted">Noch nicht erstellt.</p></div>`;
 return `<div class="bracket">${t.ko.rounds.map((r,ri)=>`<div class="round"><h3>${esc(r.name)} · Best of ${r.matches[0]?.mode||t.baseMode}</h3>${r.matches.map((m,mi)=>koMatchHTML(ri,mi,m)).join("")}</div>`).join("")}</div>`;
}
function koMatchHTML(ri,mi,m){
 const finished=m.sa!=null,winner=finished?(m.sa>m.sb?m.a:m.b):null;
 return `<div class="node"><div class="teamline ${winner===m.a?"winner":""}"><span>${winner===m.a?"✓ ":""}${m.a?esc(m.a):"<span class='empty'>Noch offen</span>"}</span><b>${m.sa??"—"}</b></div>
 <div class="teamline ${winner===m.b?"winner":""}"><span>${winner===m.b?"✓ ":""}${m.b?esc(m.b):"<span class='empty'>Noch offen</span>"}</span><b>${m.sb??"—"}</b></div>
 ${m.a&&m.b&&!finished?`<div class="score" style="margin-top:8px"><input id="ksa-${ri}-${mi}" type="number" min="0"><b>:</b><input id="ksb-${ri}-${mi}" type="number" min="0"><button class="primary small" onclick="saveKO(${ri},${mi})">OK</button></div>`:""}</div>`;
}
function saveKO(ri,mi){
 const t=current(),r=t.ko.rounds[ri],m=r.matches[mi];
 if(!m.a||!m.b)return alert("Beide Spieler stehen noch nicht fest.");
 const a=+$("#ksa-"+ri+"-"+mi).value,b=+$("#ksb-"+ri+"-"+mi).value,need=Math.ceil(m.mode/2);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b||((a!==need)&&(b!==need))||Math.max(a,b)>need)
  return alert(`Ungültiges Ergebnis. Bei Best of ${m.mode} muss ein Spieler ${need} Legs gewinnen.`);
 m.sa=a;m.sb=b;
 propagateKO(t,ri);
 save();render();
}
window.nav=nav;window.addPlayer=()=>{};window.drawPlayers=drawPlayers;window.toggleFormat=toggleFormat;window.toggleSpecialModes=toggleSpecialModes;window.syncPlayerFields=syncPlayerFields;window.createTournament=createTournament;window.openT=openT;window.delT=delT;window.saveMatch=saveMatch;window.startKO=startKO;window.saveKO=saveKO;
render();
