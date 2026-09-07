const KEY="dart-turnier-data-v2";
const $=s=>document.querySelector(s);
let state;
try {
 state=JSON.parse(localStorage.getItem(KEY)||'null')||{tournaments:[],current:null,view:"home",tab:"overview"};
} catch(e) {
 state={tournaments:[],current:null,view:"home",tab:"overview"};
}
let draftPlayers=[];
state.exportPreview = state.exportPreview || null;

function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state));}
 catch(e){console.warn("Speichern fehlgeschlagen:",e);}
}
function uid(){return Math.random().toString(36).slice(2,9)}
function nav(view){state.view=view;save();render()}
function current(){return state.tournaments.find(t=>t.id===state.current)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function modes(selected=3){return [1,3,5,7,9,11,13,15,17,19].map(n=>`<option value="${n}" ${n===selected?"selected":""}>Best of ${n}</option>`).join("")}
function header(back=true){return `<div class="top"><div class="brand">🎯 Dart Turnier</div><div class="top-actions">${back?'<button class="secondary small" onclick="nav(\'home\')">Startseite</button>':''}</div></div>`}

function applyBackground(){
 const bg=$("#bgLayer");
 if(!bg)return;
 bg.style.backgroundImage='url("dart-background.jpg")';
}

function render(){
 const app=$("#app");
 if(state.view==="home")app.innerHTML=home();
 else if(state.view==="new")app.innerHTML=newTournament();
 else app.innerHTML=tournament();
 if(state.view==="new"){drawPlayers();updateThirdPlaceOption();}
 if(state.exportPreview) app.insertAdjacentHTML("beforeend", exportPreviewModal(state.exportPreview));
 applyBackground();
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

function thirdPlaceAvailable(){
 const format=$("#format")?.value; const n=+( $("#pcount")?.value || 0 );
 if(format==="ko") return n>=4;
 const g=+( $("#gcount")?.value || 0 ); const q=+( $("#qcount")?.value || 0 );
 return n>=4 && g>=1 && q>=1 && g*q>=4 && q<=Math.floor(n/g);
}
function updateThirdPlaceOption(){
 const cb=$("#thirdPlace"); const wrap=$("#thirdPlaceWrap"); const hint=$("#thirdPlaceHint");
 if(!cb)return; const ok=thirdPlaceAvailable(); cb.disabled=!ok; wrap.classList.toggle("disabled",!ok);
 if(!ok){ cb.checked=false; hint.textContent="Nicht verfügbar: Es müssen mindestens 4 qualifizierte Spieler für zwei Halbfinals vorhanden sein."; }
 else hint.textContent="Die beiden Halbfinal-Verlierer spielen automatisch um Platz 3.";
}
function isPowerOfTwo(n){return n>=2 && (n&(n-1))===0}
function validQualifiers(groupCount,playerCount){
 const out=[];
 for(let q=1;q<=Math.floor(playerCount/groupCount);q++) if(isPowerOfTwo(groupCount*q) && groupCount*q<=playerCount) out.push(q);
 return out;
}
function validGroupCounts(playerCount){
 const out=[];
 for(let g=2;g<=Math.min(32,playerCount);g++) if(validQualifiers(g,playerCount).length) out.push(g);
 return out;
}
function groupOptions(selected){
 const n=+( $('#pcount')?.value || 2 );
 return validGroupCounts(n).map(g=>`<option value="${g}" ${g===selected?'selected':''}>${g} Gruppen</option>`).join('');
}
function qualifierOptions(groupCount,selected){
 const n=+( $('#pcount')?.value || 2 );
 return validQualifiers(groupCount,n).map(q=>`<option value="${q}" ${q===selected?'selected':''}>${q} Weiterkommer je Gruppe · ${groupCount*q} KO-Spieler</option>`).join('');
}
function refreshTournamentSetup(){
 const n=Math.max(2,Math.min(128,+$('#pcount')?.value||2));
 const gw=$('#gcount'), qw=$('#qcount');
 if(!gw||!qw)return;
 const oldG=+gw.value||2, oldQ=+qw.value||1;
 const gs=validGroupCounts(n);
 gw.innerHTML=gs.map(g=>`<option value="${g}" ${g===oldG?'selected':''}>${g} Gruppen</option>`).join('');
 if(!gs.includes(+gw.value)) gw.value=String(gs[0]||2);
 const g=+gw.value;
 const qs=validQualifiers(g,n);
 qw.innerHTML=qs.map(q=>`<option value="${q}" ${q===oldQ?'selected':''}>${q} Weiterkommer je Gruppe · ${g*q} KO-Spieler</option>`).join('');
 if(!qs.includes(+qw.value)) qw.value=String(qs[0]||1);
 updateThirdPlaceOption();
}
function newTournament(){
 while(draftPlayers.length<2)draftPlayers.push("");
 const n=Math.max(2,draftPlayers.length);
 const gs=validGroupCounts(n); const defaultG=gs.includes(2)?2:(gs[0]||2);
 const qs=validQualifiers(defaultG,n); const defaultQ=qs.includes(2)?2:(qs[0]||1);
 return `<div class="app">${header()}<div class="section"><h1>Neues Turnier</h1><div class="card">
 <div class="field"><label>Turniername</label><input id="tname" placeholder="z. B. Sommer-Cup"></div>
 <div class="field"><label>Turnierformat</label><select id="format" onchange="toggleFormat();updateThirdPlaceOption();refreshTournamentSetup()">
 <option value="groups">Gruppenphase → KO-Phase</option><option value="ko">Direkt KO-Phase</option></select></div>
 <div class="grid">
 <div class="field"><label>Anzahl Spieler</label><input id="pcount" type="number" min="2" max="128" value="${n}" oninput="syncPlayerFields();refreshTournamentSetup();updateThirdPlaceOption()"></div>
 <div class="field" id="gwrap"><label>Anzahl Gruppen</label><select id="gcount" onchange="refreshTournamentSetup()">${groupOptions(defaultG)}</select></div>
 <div class="field" id="qwrap"><label>Weiterkommer</label><select id="qcount" onchange="updateThirdPlaceOption()">${qualifierOptions(defaultG,defaultQ)}</select></div>
 </div>
 <div id="setupHint" class="notice">Die App lässt nur Kombinationen zu, die eine gültige KO-Phase mit 2, 4, 8, 16, 32, 64 oder 128 Spielern erzeugen.</div>
 <div class="field"><label>Grundmodus</label><select id="baseMode">${modes(3)}</select></div>
 <label class="check"><input id="useAverage" type="checkbox"> <span><b>📊 Average pro Spiel erfassen</b><small class="hint">Beim Eintragen eines Ergebnisses kann der Average beider Spieler angegeben werden. Daraus wird später der Turnierdurchschnitt berechnet.</small></span></label>
 <div class="notice">Der Grundmodus gilt für Gruppenspiele und für KO-Runden bis zum Halbfinale. Halbfinale und Finale können darunter separat eingestellt werden.</div>
 <div class="section"><h2>Halbfinale & Finale</h2>
 <label class="check"><input id="semiDifferent" type="checkbox" onchange="toggleSpecialModes()"> <span>Halbfinale soll einen anderen Modus haben</span></label>
 <div class="field" id="semiWrap" style="display:none"><label>Modus Halbfinale</label><select id="semiMode">${modes(5)}</select></div>
 <label class="check"><input id="finalDifferent" type="checkbox" onchange="toggleSpecialModes()"> <span>Finale soll einen anderen Modus haben</span></label>
 <label class="check optional-check" id="thirdPlaceWrap"><input id="thirdPlace" type="checkbox"> <span><b>🥉 Spiel um Platz 3</b><small id="thirdPlaceHint" class="hint">Die beiden Halbfinal-Verlierer spielen automatisch um Platz 3.</small></span></label>
 <div class="field" id="finalWrap" style="display:none"><label>Modus Finale</label><select id="finalMode">${modes(7)}</select></div>
 </div>
 <div class="section"><h2>Spieler</h2><p class="muted">Die Gruppen werden automatisch zufällig ausgelost.</p>
 <div id="players"></div></div>
 <button class="primary" onclick="createTournament()">Turnier erstellen</button>
 </div></div></div>`;
}
function toggleFormat(){
 const groups=$("#format").value==="groups";
 $("#gwrap").style.display=groups?"":"none";$("#qwrap").style.display=groups?"":"none";
 const hint=$("#setupHint"); if(hint) hint.textContent=groups?"Die App lässt nur Kombinationen zu, die eine gültige KO-Phase mit 2, 4, 8, 16, 32, 64 oder 128 Spielern erzeugen.":"Direkt KO ist nur mit einer Spielerzahl möglich, die selbst eine Zweierpotenz ist (2, 4, 8, 16, 32, 64, 128).";
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
function shuffle(arr){
 const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}
function createTournament(){
 const name=$("#tname").value.trim()||"Dart-Turnier";
 const n=+$("#pcount").value,format=$("#format").value,g=+$("#gcount").value,q=+$("#qcount").value;
 const baseMode=+$("#baseMode").value;
 const semiMode=$("#semiDifferent").checked?+$("#semiMode").value:baseMode;
 const finalMode=$("#finalDifferent").checked?+$("#finalMode").value:baseMode;
 if(n<2||n>128)return alert("Es sind 2 bis 128 Spieler möglich.");
 if(format==="ko"&&!isPowerOfTwo(n))return alert("Direkt KO ist nur mit 2, 4, 8, 16, 32, 64 oder 128 Spielern möglich.");
 if(format==="groups"&&(!validGroupCounts(n).includes(g)||!validQualifiers(g,n).includes(q)))return alert("Diese Gruppen-Konfiguration ist nicht möglich. Bitte eine gültige Kombination auswählen.");
 const qualified=n;
 const players=draftPlayers.slice(0,n).map((x,i)=>x.trim()||`Spieler ${i+1}`);
 const t={id:uid(),name,format,baseMode,semiMode,finalMode,players,groups:[],matches:[],ko:{rounds:[],champion:null,thirdPlace:null},created:Date.now(),q,thirdPlace:$("#thirdPlace")?.checked===true,useAverage:$("#useAverage")?.checked===true,placements:{}};
 if(format==="groups")buildGroups(t,g); else buildKO(t);
 state.tournaments.unshift(t);state.current=t.id;state.view="tournament";state.tab="overview";state.profilePlayer=null;draftPlayers=[];save();render();
}
function buildGroups(t,gcount){
 const shuffled=shuffle(t.players), base=Math.floor(shuffled.length/gcount), extra=shuffled.length%gcount; let idx=0;
 for(let i=0;i<gcount;i++){
  const size=base+(i<extra?1:0);
  t.groups.push({id:uid(),name:"Gruppe "+String.fromCharCode(65+i),players:shuffled.slice(idx,idx+size)}); idx+=size;
 }
 t.groups.forEach(gr=>{
  for(let i=0;i<gr.players.length;i++)for(let j=i+1;j<gr.players.length;j++)
   t.matches.push({id:uid(),group:gr.id,a:gr.players[i],b:gr.players[j],sa:null,sb:null,avgA:null,avgB:null,mode:t.baseMode});
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
function createKORounds(t,count,teams){
 if(!isPowerOfTwo(count)||teams.length!==count) return false;
 t.ko.rounds=[];
 t.ko.rounds.push(makeRound([...teams],t.baseMode,roundName(count)));
 for(let size=count/2;size>=2;size/=2)t.ko.rounds.push(makeRound(Array(size).fill(null),modeForRound(t,size),roundName(size)));
 return true;
}
function propagateKO(t,ri){
 const r=t.ko.rounds[ri]; if(!r)return;
 if(ri+1>=t.ko.rounds.length){if(r.matches.length===1&&r.matches[0].sa!=null)t.ko.champion=winnerOf(r.matches[0]);return;}
 const next=t.ko.rounds[ri+1];
 for(let i=0;i<r.matches.length;i++){const m=r.matches[i];if(m.sa==null)continue;const w=winnerOf(m);const slot=Math.floor(i/2),side=i%2?"b":"a";next.matches[slot][side]=w;}
}
function buildKO(t){ return createKORounds(t,t.players.length,[...t.players]); }
function openT(id){state.current=id;state.view="tournament";state.tab="overview";save();render()}
function delT(id){if(confirm("Turnier wirklich löschen?")){state.tournaments=state.tournaments.filter(t=>t.id!==id);if(state.current===id)state.current=null;save();render()}}

function tournament(){
 const t=current();if(!t)return home();
 const tab=state.tab||"overview";
 const modal=state.profilePlayer?playerProfileModal(t,state.profilePlayer):"";
 return `<div class="app">${header()}<div class="section"><div class="row between">
 <div><h1>${esc(t.name)}</h1><p class="muted">${t.players.length} Spieler · ${t.format==="groups"?"Gruppenphase + KO":"Direkt KO"}${t.useAverage?" · Average wird erfasst":""}</p></div>
 <button class="danger small" onclick="delT('${t.id}')">Turnier löschen</button></div>
 <div class="tabs">${["overview",...(t.format==="groups"?["groups","matches","table"]:[]),"ko"].map(x=>`<button class="tab ${tab===x?"active":""}" onclick="state.tab='${x}';state.profilePlayer=null;render()">${({overview:"Übersicht",groups:"Gruppen",matches:"Spiele",table:"Tabelle",ko:"KO-Baum"})[x]}</button>`).join("")}</div>
 ${tab==="overview"?overview(t):tab==="groups"?groups(t):tab==="matches"?matches(t):tab==="table"?tables(t):koView(t)}
 </div>${modal}</div>`;
}
function allKOmatches(t){return (t.ko?.rounds||[]).flatMap(r=>r.matches||[])}
function playerStats(t){
 const stats=Object.fromEntries(t.players.map(p=>[p,{p,legs:0,won:0,lost:0,matches:0,avgs:[]} ]));
 const all=[...(t.matches||[]),...allKOmatches(t),...(t.ko?.thirdPlace?[t.ko.thirdPlace]:[])];
 all.filter(m=>m.sa!=null&&m.sb!=null&&m.a&&m.b).forEach(m=>{
  const A=stats[m.a],B=stats[m.b]; if(!A||!B)return;
  A.legs+=m.sa+m.sb;B.legs+=m.sa+m.sb;A.won+=m.sa;A.lost+=m.sb;B.won+=m.sb;B.lost+=m.sa;A.matches++;B.matches++;
  if(t.useAverage){if(Number.isFinite(+m.avgA))A.avgs.push(+m.avgA);if(Number.isFinite(+m.avgB))B.avgs.push(+m.avgB);}
 });
 return Object.values(stats).map(x=>({...x,pct:x.legs?Math.round(x.won/x.legs*100):0,average:x.avgs.length?x.avgs.reduce((a,b)=>a+b,0)/x.avgs.length:null})).sort((a,b)=>(b.pct-a.pct)||(b.won-a.won)||(b.legs-a.legs)||a.p.localeCompare(b.p));
}
function playerButton(name){
 const safe=JSON.stringify(String(name)).replace(/</g,"\u003c").replace(/'/g,"&#39;");
 return `<button type="button" class="player-link" onclick='openProfile(${safe})'>${esc(name)}</button>`;
}
function overview(t){
 const groupTotal=t.matches.length,groupDone=t.matches.filter(m=>m.sa!=null).length,stats=playerStats(t),groupFinished=t.format!=="groups"||groupDone===groupTotal;
 const places=placementSummary(t);
 return `<div class="grid">
 <div class="card"><h3>${t.format==="groups"?"Gruppenfortschritt":"Turnierfortschritt"}</h3><div style="font-size:34px;font-weight:900">${groupDone}/${groupTotal}</div><p class="muted">${t.format==="groups"?"Gruppenspiele abgeschlossen":"Spiele mit Ergebnis"}</p></div>
 <div class="card"><h3>Spieler</h3><div style="font-size:34px;font-weight:900">${t.players.length}</div><p class="muted">${t.groups.length?t.groups.length+" Gruppen":"Direktes KO"}</p></div>
 <div class="card"><h3>Grundmodus</h3><div style="font-size:25px;font-weight:900">Best of ${t.baseMode}</div><p class="muted">Gruppen & übrige KO-Runden</p></div>
 <div class="card"><h3>Finalrunden</h3><p><b>Halbfinale:</b> Best of ${t.semiMode}<br><b>Finale:</b> Best of ${t.finalMode}</p></div>
 </div>
 ${groupFinished&&t.format==="groups"&&!t.ko.rounds.length?`<div class="card section success"><h3>KO-Phase wurde automatisch erstellt</h3><p>${t.q*t.groups.length} Spieler qualifiziert – eine gültige Zweierpotenz.</p><button class="primary" onclick="state.tab='ko';render()">KO-Baum anzeigen</button></div>`:""}
 ${t.ko.champion?`<div class="champion"><div class="pill">🏆 TURNIERSIEGER</div><h2>${playerButton(t.ko.champion)}</h2>${places.second?`<p>🥈 ${playerButton(places.second)}</p>`:""}${places.third?`<p>🥉 ${playerButton(places.third)}</p>`:""}</div>`:""}
 ${placementCard(t)}
 <div class="card section export-card"><div class="between row"><div><h3>📸 Turnier als Bild</h3><p class="muted">Erstellt ein vollständiges Turnierposter mit Gruppen, allen Spielen, KO-Baum, Platzierungen und Spielerstatistiken.</p></div><button class="primary" onclick="generateTournamentImage()">📸 Bild erstellen</button></div></div>
 <div class="card section"><div class="between row"><div><h3>Spielerübersicht</h3><p class="muted">Spieler anklicken für das Profil.</p></div></div><div class="tablewrap"><table class="overview-table">
 <tr><th>#</th><th>Spieler</th><th>Spiele</th><th>Legs</th><th>S</th><th>N</th>${t.useAverage?"<th>Average</th>":""}<th>Gewonnen %</th></tr>
 ${stats.map((x,i)=>`<tr><td>${i+1}</td><td>${playerButton(x.p)}</td><td>${x.matches}</td><td>${x.legs}</td><td>${x.won}</td><td>${x.lost}</td>${t.useAverage?`<td>${x.average!=null?x.average.toFixed(2):"—"}</td>`:""}<td><div class="percent-cell"><div class="percent-bar"><span style="width:${x.pct}%"></span></div><b>${x.pct}%</b></div></td></tr>`).join("")}
 </table></div></div>`;
}
function groups(t){return `<div class="grid groups-page">${t.groups.map(g=>{const s=standings(t,g);return `<div class="group"><div class="grouphead"><span>${esc(g.name)}</span><span class="group-count">${g.players.length} Spieler</span></div><div class="group-body">${s.map((x,i)=>`<div class="group-player"><span class="rank ${i<t.q?'qualified':''}">${i+1}</span>${playerButton(x.p)}</div>`).join("")}</div></div>`}).join("")}</div>`}
function matches(t){return `<div class="grid">${t.groups.map(g=>`<div class="card"><h3>${esc(g.name)}</h3>${t.matches.filter(m=>m.group===g.id).map(matchHTML).join("")}</div>`).join("")}</div>`}
function matchHTML(m){
 const t=current(),winner=m.sa!=null?(m.sa>m.sb?m.a:m.b):null;
 return `<div class="match"><div class="match-top"><div class="teams">
 ${winner===m.a?`<span class="team-winner">✓ ${playerButton(m.a)}</span>`:m.sa!=null?`<span class="team-loser">${playerButton(m.a)}</span>`:playerButton(m.a)}
 <span class="muted"> vs. </span>
 ${winner===m.b?`<span class="team-winner">✓ ${playerButton(m.b)}</span>`:m.sa!=null?`<span class="team-loser">${playerButton(m.b)}</span>`:playerButton(m.b)}
 <br><span class="pill">Best of ${m.mode}</span>${t.useAverage&&m.sa!=null?` <span class="avg-pill">Ø ${m.avgA!=null?Number(m.avgA).toFixed(1):"—"} / ${m.avgB!=null?Number(m.avgB).toFixed(1):"—"}</span>`:""}</div>
 <div class="score"><input id="sa-${m.id}" type="number" min="0" value="${m.sa??""}" placeholder="0"><b>:</b><input id="sb-${m.id}" type="number" min="0" value="${m.sb??""}" placeholder="0">${t.useAverage?`<input id="avga-${m.id}" class="avg-input" type="number" min="0" max="200" step="0.01" value="${m.avgA??""}" placeholder="Avg A"><input id="avgb-${m.id}" class="avg-input" type="number" min="0" max="200" step="0.01" value="${m.avgB??""}" placeholder="Avg B">`:""}
 <button class="primary small" onclick="saveMatch('${m.id}')">${m.sa!=null?"Ändern":"OK"}</button></div></div></div>`;
}
function saveMatch(id){
 const t=current(),m=t.matches.find(x=>x.id===id),a=+$("#sa-"+id).value,b=+$("#sb-"+id).value,need=Math.ceil(m.mode/2);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0)return alert("Bitte beide Ergebnisse eingeben.");
 if(a===b||((a!==need)&&(b!==need))||Math.max(a,b)>need)return alert(`Ungültiges Ergebnis. Bei Best of ${m.mode} muss ein Spieler ${need} Legs gewinnen.`);
 if(t.useAverage){const va=$("#avga-"+id)?.value.trim(),vb=$("#avgb-"+id)?.value.trim(),aa=Number(va),bb=Number(vb);if(!va||!vb||!Number.isFinite(aa)||!Number.isFinite(bb)||aa<=0||bb<=0||aa>200||bb>200)return alert("Bitte beide Averages eingeben.");m.avgA=aa;m.avgB=bb;}
 m.sa=a;m.sb=b;
 if(t.format==="groups" && !t.ko.rounds.length && t.matches.every(x=>x.sa!=null))createKOFromGroups(t);
 save();render();
}
function standings(t,g){
 const s=g.players.map(p=>({p,w:0,l:0,wl:0,ll:0,pts:0})),map=Object.fromEntries(s.map(x=>[x.p,x]));
 t.matches.filter(m=>m.group===g.id&&m.sa!=null).forEach(m=>{const A=map[m.a],B=map[m.b];A.wl+=m.sa;A.ll+=m.sb;B.wl+=m.sb;B.ll+=m.sa;if(m.sa>m.sb){A.w++;B.l++;A.pts+=2}else{B.w++;A.l++;B.pts+=2}});
 return s.sort((a,b)=>(b.pts-a.pts)||((b.wl-b.ll)-(a.wl-a.ll))||(b.w-a.w)||a.p.localeCompare(b.p));
}
function tables(t){
 return `<div class="grid professional-tables">${t.groups.map(g=>{const s=standings(t,g);return `<div class="card table-card"><div class="table-title"><div><h3>${esc(g.name)}</h3><p class="muted">${g.players.length} Spieler · ${s.filter((_,i)=>i<t.q).length} qualifizieren sich</p></div><span class="pill">Top ${t.q}</span></div><div class="tablewrap"><table>
 <tr><th>#</th><th>Spieler</th><th>Sp</th><th>S</th><th>N</th><th>Legs</th><th>Diff.</th><th>Pkt</th></tr>
 ${s.map((x,i)=>`<tr class="${i<t.q?'qualified-row':''}"><td><span class="table-rank ${i<t.q?'qualified':''}">${i+1}</span></td><td>${playerButton(x.p)}</td><td>${x.w+x.l}</td><td>${x.w}</td><td>${x.l}</td><td>${x.wl}:${x.ll}</td><td>${x.wl-x.ll>0?"+":""}${x.wl-x.ll}</td><td><b>${x.pts}</b></td></tr>`).join("")}
 </table></div></div>`}).join("")}</div>`;
}
function placementSummary(t){
 const out={}; if(!t.ko?.rounds?.length)return out; const final=t.ko.rounds[t.ko.rounds.length-1]?.matches?.[0];
 if(final?.sa!=null){out.first=winnerOf(final);out.second=final.sa>final.sb?final.b:final.a;}
 const semi=t.ko.rounds.find(r=>r.name==="Halbfinale");
 if(semi?.matches?.length>=2 && semi.matches.every(m=>m.sa!=null)){
  const losers=semi.matches.map(m=>m.sa>m.sb?m.b:m.a);
  if(t.ko.thirdPlace?.sa!=null){out.third=t.ko.thirdPlace.sa>t.ko.thirdPlace.sb?t.ko.thirdPlace.a:t.ko.thirdPlace.b;out.fourth=t.ko.thirdPlace.sa>t.ko.thirdPlace.sb?t.ko.thirdPlace.b:t.ko.thirdPlace.a;}
  else {out.third=null;out.fourth=null;out.unplayedLosers=losers;}
 }
 return out;
}
function placementCard(t){
 const p=placementSummary(t); if(!p.first&&!p.second&&!p.third&&!p.fourth)return "";
 return `<div class="card placement-card"><div class="section-head"><div><h3>🏆 Platzierungen</h3><p class="muted">Die ersten vier Plätze des Turniers.</p></div></div><div class="placements"><div class="place gold"><span>🥇</span><b>${p.first?playerButton(p.first):"—"}</b><small>1. Platz</small></div><div class="place silver"><span>🥈</span><b>${p.second?playerButton(p.second):"—"}</b><small>2. Platz</small></div><div class="place bronze"><span>🥉</span><b>${p.third?playerButton(p.third):(p.unplayedLosers?p.unplayedLosers.map(playerButton).join(" / "):"—")}</b><small>${p.third?"3. Platz":"3. Platz · nicht ausgespielt"}</small></div><div class="place fourth"><span>4️⃣</span><b>${p.fourth?playerButton(p.fourth):(p.unplayedLosers?p.unplayedLosers.map(playerButton).join(" / "):"—")}</b><small>${p.fourth?"4. Platz":"4. Platz · nicht ausgespielt"}</small></div></div></div>`;
}
function createKOFromGroups(t){
 let teams=[];for(let rank=0;rank<t.q;rank++){const ranked=t.groups.map(g=>standings(t,g)[rank]).filter(Boolean);if(rank%2===1)ranked.reverse();teams.push(...ranked.map(x=>x.p));}
 if(!isPowerOfTwo(teams.length))return false;
 return createKORounds(t,teams.length,teams);
}
function startKO(){
 const t=current();
 if(t.ko.rounds.length)return alert("Die KO-Phase wurde bereits erstellt.");
 if(t.format==="groups" && !t.matches.every(m=>m.sa!=null))return alert("Die Gruppenphase ist noch nicht abgeschlossen.");
 if(!createKOFromGroups(t))return alert("Es sind noch nicht genügend qualifizierte Spieler vorhanden.");
 save();state.tab="ko";render();
}
function loserOf(m){
 if(m.sa==null||m.sb==null||!m.a||!m.b)return null;
 return m.sa<m.sb?m.a:m.b;
}
function syncThirdPlace(t){
 if(!t.thirdPlace || !t.ko?.rounds?.length) return;
 const semi=t.ko.rounds.find(r=>r.name==="Halbfinale");
 if(!semi || semi.matches.length!==2) return;
 const a=loserOf(semi.matches[0]), b=loserOf(semi.matches[1]);
 if(!a || !b) return;
 const mode=t.semiMode;
 const same=t.ko.thirdPlace && t.ko.thirdPlace.a===a && t.ko.thirdPlace.b===b;
 if(!same){
   t.ko.thirdPlace={id:uid(),name:"Spiel um Platz 3",a,b,sa:null,sb:null,avgA:null,avgB:null,mode};
 }
}
function thirdPlaceHTML(t){
 const m=t.ko.thirdPlace; if(!m)return "";
 const finished=m.sa!=null,winner=finished?(m.sa>m.sb?m.a:m.b):null;
 return `<div class="card third-place-card"><div class="between row"><div><h3>🥉 Spiel um Platz 3</h3><p class="muted">Best of ${m.mode} · die beiden Halbfinal-Verlierer</p></div><span class="pill">${finished?"Abgeschlossen":"Offen"}</span></div><div class="third-place-match"><div class="teamline ${winner===m.a?"winner":""}"><span>${winner===m.a?"✓ ":""}${playerButton(m.a)}</span><b>${m.sa??"—"}</b></div><div class="teamline ${winner===m.b?"winner":""}"><span>${winner===m.b?"✓ ":""}${playerButton(m.b)}</span><b>${m.sb??"—"}</b></div>${!finished?`<div class="score third-score"><input id="tpa-${m.id}" type="number" min="0"><b>:</b><input id="tpb-${m.id}" type="number" min="0">${t.useAverage?`<input id="tpavga-${m.id}" class="avg-input" type="number" min="0.01" max="200" step="0.01" placeholder="Avg ${esc(m.a)}"><input id="tpavgb-${m.id}" class="avg-input" type="number" min="0.01" max="200" step="0.01" placeholder="Avg ${esc(m.b)}">`:""}<button class="primary small" onclick="saveThirdPlace()">OK</button></div>`:t.useAverage?`<div class="avg-result">Average: ${m.avgA!=null?Number(m.avgA).toFixed(2):"—"} · ${m.avgB!=null?Number(m.avgB).toFixed(2):"—"}</div>`:""}</div></div>`;
}
function saveThirdPlace(){
 const t=current(),m=t.ko.thirdPlace; if(!m)return;
 const a=+$("#tpa-"+m.id).value,b=+$("#tpb-"+m.id).value,need=Math.ceil(m.mode/2);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b||((a!==need)&&(b!==need))||Math.max(a,b)>need) return alert(`Ungültiges Ergebnis. Bei Best of ${m.mode} muss ein Spieler ${need} Legs gewinnen.`);
 if(t.useAverage){
   const va=$("#tpavga-"+m.id)?.value.trim(),vb=$("#tpavgb-"+m.id)?.value.trim();
   const aa=Number(va),bb=Number(vb);
   if(!va||!vb||!Number.isFinite(aa)||!Number.isFinite(bb)||aa<=0||bb<=0||aa>200||bb>200)return alert("Bitte beide Averages eingeben.");
   m.avgA=aa;m.avgB=bb;
 }
 m.sa=a;m.sb=b;save();render();
}
function koView(t){
 syncThirdPlace(t);
 if(!t.ko.rounds.length)return `<div class="card"><h3>KO-Phase</h3><p class="muted">Noch nicht erstellt.</p></div>`;
 const firstCount=t.ko.rounds[0]?.matches.length||1;
 return `${thirdPlaceHTML(t)}<div class="ko-board"><div class="bracket" style="--bracket-rows:${firstCount*2};--rounds:${t.ko.rounds.length}">${t.ko.rounds.map((r,ri)=>`<div class="round round-${ri}" style="--round-span:${Math.pow(2,ri)}"><h3>${esc(r.name)} · Best of ${r.matches[0]?.mode||t.baseMode}</h3>${r.matches.map((m,mi)=>`<div class="bracket-match">${koMatchHTML(ri,mi,m)}</div>`).join("")}</div>`).join("")}</div></div>`;
}
function koMatchHTML(ri,mi,m){
 const t=current(),finished=m.sa!=null,winner=finished?(m.sa>m.sb?m.a:m.b):null;
 return `<div class="node"><div class="teamline ${winner===m.a?"winner":""}"><span>${winner===m.a?"✓ ":""}${m.a?playerButton(m.a):"<span class='empty'>Noch offen</span>"}</span><b>${m.sa??"—"}</b></div>
 <div class="teamline ${winner===m.b?"winner":""}"><span>${winner===m.b?"✓ ":""}${m.b?playerButton(m.b):"<span class='empty'>Noch offen</span>"}</span><b>${m.sb??"—"}</b></div>
 ${m.a&&m.b&&!finished?`<div class="score" style="margin-top:8px"><input id="ksa-${ri}-${mi}" type="number" min="0"><b>:</b><input id="ksb-${ri}-${mi}" type="number" min="0">${t.useAverage?`<input id="kavga-${ri}-${mi}" class="avg-input" type="number" min="0" max="200" step="0.01" placeholder="Avg A"><input id="kavgb-${ri}-${mi}" class="avg-input" type="number" min="0" max="200" step="0.01" placeholder="Avg B">`:""}<button class="primary small" onclick="saveKO(${ri},${mi})">OK</button></div>`:""}
 ${t.useAverage&&finished?`<div class="avg-result">Average: ${m.avgA!=null?Number(m.avgA).toFixed(2):"—"} · ${m.avgB!=null?Number(m.avgB).toFixed(2):"—"}</div>`:""}</div>`;
}
function saveKO(ri,mi){
 const t=current(),r=t.ko.rounds[ri],m=r.matches[mi];
 if(!m.a||!m.b)return alert("Beide Spieler stehen noch nicht fest.");
 const a=+$("#ksa-"+ri+"-"+mi).value,b=+$("#ksb-"+ri+"-"+mi).value,need=Math.ceil(m.mode/2);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b||((a!==need)&&(b!==need))||Math.max(a,b)>need)return alert(`Ungültiges Ergebnis. Bei Best of ${m.mode} muss ein Spieler ${need} Legs gewinnen.`);
 if(t.useAverage){const va=$("#kavga-"+ri+"-"+mi)?.value.trim(),vb=$("#kavgb-"+ri+"-"+mi)?.value.trim(),aa=Number(va),bb=Number(vb);if(!va||!vb||!Number.isFinite(aa)||!Number.isFinite(bb)||aa<=0||bb<=0||aa>200||bb>200)return alert("Bitte beide Averages eingeben.");m.avgA=aa;m.avgB=bb;}
 m.sa=a;m.sb=b;propagateKO(t,ri);syncThirdPlace(t);save();render();
}

function exportMatchLabel(m){
 const a=m.a||"Noch offen",b=m.b||"Noch offen";
 const score=m.sa!=null&&m.sb!=null?`${m.sa} : ${m.sb}`:"offen";
 let extra="";
 if(current()?.useAverage) extra=` · Avg ${m.avgA!=null?Number(m.avgA).toFixed(1):"—"} / ${m.avgB!=null?Number(m.avgB).toFixed(1):"—"}`;
 return `${a} – ${b} · ${score}${extra}`;
}
function allTournamentMatches(t){
 const group=t.matches||[];
 const ko=(t.ko?.rounds||[]).flatMap(r=>r.matches.map(m=>({...m,roundName:r.name})));
 const third=t.ko?.thirdPlace?[{...t.ko.thirdPlace,roundName:"Spiel um Platz 3"}]:[];
 return [...group.map(m=>({...m,roundName:m.group?((t.groups.find(g=>g.id===m.group)||{}).name||"Gruppe"):"Gruppenphase"})),...ko,...third];
}
function exportPreviewModal(data){
 return `<div class="modal-backdrop export-modal" onclick="closeExportPreview()"><div class="export-modal-card" onclick="event.stopPropagation()"><div class="row between"><div><span class="pill">TURNIERPOSTER</span><h2>Dein Turnierbild</h2></div><button class="secondary small" onclick="closeExportPreview()">Schließen</button></div><div class="export-preview-wrap"><img src="${data}" alt="Turnierposter Vorschau"></div><div class="row export-actions"><button class="primary" onclick="shareTournamentImage()">↗️ Teilen / speichern</button><button class="secondary" onclick="downloadTournamentImage()">⬇️ PNG speichern</button></div><p class="hint">Das Bild wird vollständig auf diesem Gerät erzeugt. Es werden keine Turnierdaten hochgeladen.</p></div></div>`;
}
function closeExportPreview(){state.exportPreview=null;state.exportImageBlob=null;state.exportImageData=null;save();render();}
function dataUrlToBlob(dataUrl){const [head,b64]=dataUrl.split(',');const mime=(head.match(/:(.*?);/)||[])[1]||'image/png';const bin=atob(b64);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});}
async function posterCanvas(t){
 const W=2400, pad=90, gap=42, colW=(W-pad*2-gap)/2;
 const stats=playerStats(t), groups=t.groups||[], groupRows=groups.map(g=>standings(t,g));
 const all=allTournamentMatches(t);
 const matchCount=all.length;
 const groupLineH=44, groupHead=92, groupTableHead=54;
 const groupHeights=groupRows.map(rows=>groupHead+groupTableHead+rows.length*groupLineH+28);
 const groupCols=groups.length>2?2:Math.max(1,groups.length);
 let groupSectionH=0;
 if(groups.length){for(let r=0;r<Math.ceil(groups.length/groupCols);r++){let rowH=0;for(let ci=0;ci<groupCols;ci++){const gi=r*groupCols+ci;rowH=Math.max(rowH,groupHeights[gi]||0)}groupSectionH+=rowH+26}groupSectionH+=80;}
 const koRounds=t.ko?.rounds||[];
 const koH=koRounds.length?Math.max(420,koRounds[0].matches.length*105+150):0;
 const statsRows=Math.ceil(stats.length/2), statsH=Math.max(220,110+statsRows*62);
 const matchCols=matchCount>160?4:matchCount>80?3:2;
 const matchRows=Math.ceil(matchCount/matchCols), matchRowH=46, matchesH=120+matchRows*matchRowH;
 const thirdH=t.ko?.thirdPlace?205:0;
 const totalH=420+groupSectionH+(koRounds.length?koH+50:0)+thirdH+matchesH+statsH+220;
 const c=document.createElement('canvas');c.width=W;c.height=Math.max(1600,Math.min(totalH,32000));const ctx=c.getContext('2d');
 ctx.imageSmoothingEnabled=true;
 const bg=new Image();bg.src='dart-background.jpg';
 try{if(bg.decode) await bg.decode();else await new Promise((resolve,reject)=>{bg.onload=resolve;bg.onerror=reject});}catch(e){}
 let y=0;
 function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
 function panel(x,y,w,h,alpha=.86){roundedRect(x,y,w,h,28);ctx.fillStyle=`rgba(5,10,20,${alpha})`;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=2;ctx.stroke()}
 function text(txt,x,y,size=30,weight='600',color='#fff',align='left'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(txt),x,y)}
 function line(x1,y1,x2,y2,color='rgba(255,255,255,.14)',width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
 function fit(txt,max,size=28,weight='600'){let fs=size;while(fs>14){ctx.font=`${weight} ${fs}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;if(ctx.measureText(String(txt)).width<=max)return fs;fs-=1}return fs}
 ctx.fillStyle='#07101b';ctx.fillRect(0,0,W,c.height);
 if(bg.complete&&bg.naturalWidth){const scale=Math.max(W/bg.naturalWidth,c.height/bg.naturalHeight);const iw=bg.naturalWidth*scale,ih=bg.naturalHeight*scale;ctx.globalAlpha=.34;ctx.drawImage(bg,(W-iw)/2,(c.height-ih)/2,iw,ih);ctx.globalAlpha=1}
 ctx.fillStyle='rgba(2,7,15,.48)';ctx.fillRect(0,0,W,c.height);
 panel(pad,55,W-pad*2,260,.78);text('🎯 DART-TURNIER',pad+40,115,54,'950','#fff');text(t.name,pad+40,185,42,'800','#f8fafc');
 const info=[`${t.players.length} Spieler`,`${t.groups.length?t.groups.length+' Gruppen':'Direkt KO'}`,`${matchCount} Spiele`,t.useAverage?'Average erfasst':'Average nicht erfasst'];
 info.forEach((v,i)=>text(v,W-pad-40-i*300,115,25,'800',i===0?'#fed7aa':'#e5e7eb','right'));
 const places=placementSummary(t);if(places.first)text(`🏆 ${places.first}`,W-pad-40,185,32,'900','#fbbf24','right');
 y=355;
 if(places.first||places.second||places.third||places.fourth){panel(pad,y,W-pad*2,180,.86);text('PLATZIERUNGEN',pad+30,y+42,27,'900','#fed7aa');[['🥇',places.first],['🥈',places.second],['🥉',places.third],['4️⃣',places.fourth]].forEach((it,i)=>{const x=pad+30+i*((W-pad*2-60)/4);text(it[0],x,y+105,30,'900');text(it[1]||'—',x+48,y+105,24,'800','#fff')});y+=215}
 if(groups.length){text('GRUPPENPHASE',pad,y+25,34,'950','#fff');y+=70;for(let r=0;r<Math.ceil(groups.length/groupCols);r++){let rowH=0;for(let ci=0;ci<groupCols;ci++){const gi=r*groupCols+ci;rowH=Math.max(rowH,groupHeights[gi]||0)}for(let ci=0;ci<groupCols;ci++){const gi=r*groupCols+ci;if(gi>=groups.length)continue;const x=pad+ci*(colW+gap),rows=groupRows[gi],gh=groupHeights[gi];panel(x,y,colW,gh,.88);text(groups[gi].name,x+28,y+38,28,'900','#fff');text(`Top ${t.q}`,x+colW-28,y+38,20,'800','#fed7aa','right');line(x+22,y+70,x+colW-22,y+70);['#','Spieler','Sp','S','N','Legs','Diff.','Pkt'].forEach((h,ii)=>{const xs=[x+25,x+75,x+colW-380,x+colW-320,x+colW-260,x+colW-195,x+colW-105,x+colW-28][ii];text(h,xs,y+88,15,'900','#aeb9c8',ii>1?'right':'left')});rows.forEach((st,i)=>{const yy=y+125+i*groupLineH;if(i<t.q){ctx.fillStyle='rgba(249,115,22,.10)';ctx.fillRect(x+15,yy-18,colW-30,36)}text(i+1,x+25,yy,18,'900',i<t.q?'#fed7aa':'#cbd5e1');text(st.p,x+75,yy,fit(st.p,colW-500,19,'700'),'700','#fff');text(st.w+st.l,x+colW-380,yy,18,'700','#fff','right');text(st.w,x+colW-320,yy,18,'700','#fff','right');text(st.l,x+colW-260,yy,18,'700','#fff','right');text(`${st.wl}:${st.ll}`,x+colW-195,yy,18,'700','#fff','right');text((st.wl-st.ll>0?'+':'')+(st.wl-st.ll),x+colW-105,yy,18,'700','#fff','right');text(st.pts,x+colW-28,yy,18,'900','#fff','right')})}y+=rowH+26}y+=28}
 if(koRounds.length){text('KO-PHASE',pad,y+25,34,'950','#fff');y+=70;const x=pad,w=W-pad*2;panel(x,y,w,koH,.88);const roundW=(w-60-(koRounds.length-1)*28)/koRounds.length;koRounds.forEach((r,ri)=>{const rx=x+30+ri*(roundW+28);text(r.name,rx,y+34,20,'900','#fed7aa');const matches=r.matches;const spacing=(koH-95)/Math.max(1,matches.length);matches.forEach((m,mi)=>{const my=y+72+mi*spacing,h=Math.min(92,Math.max(58,spacing-14));roundedRect(rx,my,roundW,h,14);ctx.fillStyle='rgba(2,6,23,.78)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.18)';ctx.stroke();text(m.a||'Noch offen',rx+16,my+24,fit(m.a||'Noch offen',roundW-85,17,'700'),'700',winnerOf(m)===m.a?'#86efac':'#f8fafc');text(m.sa!=null?m.sa:'—',rx+roundW-16,my+24,20,'900','#fff','right');text(m.b||'Noch offen',rx+16,my+h-24,fit(m.b||'Noch offen',roundW-85,17,'700'),'700',winnerOf(m)===m.b?'#86efac':'#f8fafc');text(m.sb!=null?m.sb:'—',rx+roundW-16,my+h-24,20,'900','#fff','right')});if(ri<koRounds.length-1)line(rx+roundW,y+koH/2,rx+roundW+28,y+koH/2,'rgba(251,146,60,.55)',3)});y+=koH+50}
 if(t.ko?.thirdPlace){panel(pad,y,W-pad*2,170,.9);text('🥉 SPIEL UM PLATZ 3',pad+30,y+40,27,'900','#fed7aa');text(`${t.ko.thirdPlace.a||'—'}  ${t.ko.thirdPlace.sa??'—'} : ${t.ko.thirdPlace.sb??'—'}  ${t.ko.thirdPlace.b||'—'}`,pad+30,y+100,25,'800');if(t.useAverage)text(`Avg ${t.ko.thirdPlace.avgA!=null?Number(t.ko.thirdPlace.avgA).toFixed(1):'—'} / ${t.ko.thirdPlace.avgB!=null?Number(t.ko.thirdPlace.avgB).toFixed(1):'—'}`,W-pad-30,y+100,20,'700','#cbd5e1','right');y+=205}
 text('ALLE GESPIELTEN BEGEGNUNGEN',pad,y+25,34,'950','#fff');y+=70;panel(pad,y,W-pad*2,matchesH,.88);const mw=(W-pad*2-70)/matchCols;all.forEach((m,i)=>{const col=i%matchCols,row=Math.floor(i/matchCols),xx=pad+25+col*mw,yy=y+48+row*matchRowH;const label=m.roundName||'Spiel';text(label,xx,yy,14,'800','#fed7aa');text(`${m.a||'—'} – ${m.b||'—'}`,xx+95,yy,fit(`${m.a||'—'} – ${m.b||'—'}`,mw-260,15,'700'),'700','#fff');text(m.sa!=null?`${m.sa} : ${m.sb}`:'offen',xx+mw-110,yy,15,'900','#fff','right');if(t.useAverage)text(`${m.avgA!=null?Number(m.avgA).toFixed(1):'—'} / ${m.avgB!=null?Number(m.avgB).toFixed(1):'—'}`,xx+mw-10,yy,13,'700','#cbd5e1','right');line(xx,yy+19,xx+mw-10,yy+19)});y+=matchesH+50;
 text('SPIELERSTATISTIK',pad,y+25,34,'950','#fff');y+=70;panel(pad,y,W-pad*2,statsH,.88);stats.forEach((st,i)=>{const col=i%2,row=Math.floor(i/2),sx=pad+30+col*(W-pad*2-60)/2,sy=y+70+row*62,boxW=(W-pad*2-90)/2;roundedRect(sx,sy-24,boxW,48,12);ctx.fillStyle='rgba(255,255,255,.045)';ctx.fill();text(`${i+1}. ${st.p}`,sx+15,sy,fit(`${i+1}. ${st.p}`,boxW-500,18,'800'),'800','#fff');text(`${st.matches} Sp. · ${st.won}:${st.lost} Legs`,sx+boxW-(t.useAverage?180:15),sy,17,'700','#cbd5e1','right');if(t.useAverage)text(`Avg ${st.average!=null?st.average.toFixed(2):'—'}`,sx+boxW-15,sy,18,'900','#fed7aa','right')});
 text('Erstellt lokal in Dart Turnier',W-pad,c.height-38,17,'700','rgba(255,255,255,.65)','right');
 return c;
}
async function generateTournamentImage(){
 const t=current();if(!t)return;
 const c=await posterCanvas(t);
 c.toBlob(blob=>{if(!blob)return;const reader=new FileReader();reader.onload=()=>{state.exportImageBlob=blob;state.exportImageData=reader.result;state.exportPreview=reader.result;render()};reader.readAsDataURL(blob)},'image/png');
}
function downloadTournamentImage(){
 if(!state.exportImageBlob)return;const url=URL.createObjectURL(state.exportImageBlob);const a=document.createElement('a');a.href=url;a.download=`${(current()?.name||'Dart-Turnier').replace(/[^a-z0-9äöüß _-]/gi,'').trim().replace(/\s+/g,'-')||'dart-turnier'}-ergebnis.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function shareTournamentImage(){
 if(!state.exportImageBlob)return;
 const t=current(),name=`${(t?.name||'Dart-Turnier').replace(/[^a-z0-9äöüß _-]/gi,'').trim().replace(/\s+/g,'-')||'dart-turnier'}-ergebnis.png`;
 try{const file=new File([state.exportImageBlob],name,{type:'image/png'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:t?.name||'Dart-Turnier',text:'Turnierergebnis',files:[file]});}else downloadTournamentImage();}catch(e){if(e?.name!=='AbortError')downloadTournamentImage();}
}
function openProfile(player){state.profilePlayer=player;save();render()}
function closeProfile(){state.profilePlayer=null;save();render()}
function playerProfileModal(t,p){
 const stats=playerStats(t).find(x=>x.p===p);if(!stats)return "";
 const all=[...(t.matches||[]),...allKOmatches(t),...(t.ko?.thirdPlace?[t.ko.thirdPlace]:[])].filter(m=>m.a===p||m.b===p);
 return `<div class="modal-backdrop" onclick="closeProfile()"><div class="profile-modal" onclick="event.stopPropagation()"><div class="row between"><div><span class="pill">SPIELERPROFIL</span><h2>${esc(p)}</h2></div><button class="secondary small" onclick="closeProfile()">Schließen</button></div><div class="profile-stats"><div><b>${stats.matches}</b><small>Spiele</small></div><div><b>${stats.won}</b><small>Legs gewonnen</small></div><div><b>${stats.lost}</b><small>Legs verloren</small></div><div><b>${stats.pct}%</b><small>Leg-Winrate</small></div>${t.useAverage?`<div><b>${stats.average!=null?stats.average.toFixed(2):"—"}</b><small>Ø Average</small></div>`:""}</div><div class="card profile-history"><h3>Spiele</h3>${all.length?all.map(m=>{const other=m.a===p?m.b:m.a,me=m.a===p?m.sa:m.sb,opp=m.a===p?m.sb:m.sa;return `<div class="history-row"><span>${playerButton(other||"Noch offen")}</span><b>${me!=null?`${me}:${opp}`:"offen"}</b>${t.useAverage?`<small>${m.a===p?(m.avgA!=null?Number(m.avgA).toFixed(2):"—"):(m.avgB!=null?Number(m.avgB).toFixed(2):"—")}</small>`:""}</div>`}).join(""):"<p class='muted'>Noch keine Spiele.</p>"}</div></div></div>`;
}
window.nav=nav;window.addPlayer=()=>{};window.openProfile=openProfile;window.closeProfile=closeProfile;window.drawPlayers=drawPlayers;window.toggleFormat=toggleFormat;window.toggleSpecialModes=toggleSpecialModes;window.syncPlayerFields=syncPlayerFields;window.createTournament=createTournament;window.openT=openT;window.delT=delT;window.saveMatch=saveMatch;window.startKO=startKO;window.saveKO=saveKO;window.saveThirdPlace=saveThirdPlace;window.updateThirdPlaceOption=updateThirdPlaceOption;window.generateTournamentImage=generateTournamentImage;window.closeExportPreview=closeExportPreview;window.downloadTournamentImage=downloadTournamentImage;window.shareTournamentImage=shareTournamentImage;
render();
