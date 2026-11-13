import{l as Ze,O as s,V as he,B as et,a as tt,G as X,D as Z,x as at,y as me,z as ee,C as nt,F as it,H as ot,g as te,I as be,i as c,J as lt,s as fe,K as ye,L as st,M as we,P as Te,n as Ee,A as xe,N as rt,Q as dt,b as Se,c as Ae,R as ct}from"./shared-D36BjWKf.js";let i=[],g=!1,r=Ze(),ae=0,V=[],ke="",Le="",Re;function ut(){return Object.keys(we).map(h=>{const t=Object.entries(Te).filter(([,u])=>u.group===h).map(([u,m])=>`<option value="${u}">${m.label}</option>`).join("");return`<optgroup label="${we[h]}">${t}</optgroup>`}).join("")}function pt(){const h=document.querySelector("#app");h.innerHTML=`
    <main>
      <header>
        <h1>Dynamic <span>Auras & Lights</span></h1>
        <div class="header-right">
          <label class="switch" title="Ativar ou desativar aura">
            <input id="active" type="checkbox" />
            <span class="track"></span>
            <span class="switch-text">Ativo</span>
          </label>
          <button id="close" class="icon-btn" title="Fechar painel">✕</button>
        </div>
      </header>

      <section class="panel" id="globalPanel">
        <div>
          <p class="empty-title">Ambiente global</p>
          <p class="hint">Aplica iluminação, escuridão e tonalidade sobre o mapa e os tokens.</p>
        </div>
        <label class="switch">
          <input id="globalEnabled" type="checkbox" />
          <span class="track"></span>
          <span class="switch-text">Ativar ambiente</span>
        </label>
        <div>
          <label for="globalBrightness">Brilho global <output id="globalBrightnessValue"></output></label>
          <input id="globalBrightness" type="range" min="0" max="2" step="0.01" />
          <p class="hint">0 = escuro · 1 = normal · 2 = mais claro</p>
        </div>
        <div class="row">
          <div class="grow">
            <label for="globalTint">Temperatura / tonalidade</label>
            <input id="globalTint" type="color" />
          </div>
          <div class="grow">
            <label for="globalTintStrength">Força da tonalidade <output id="globalTintStrengthValue"></output></label>
            <input id="globalTintStrength" type="range" min="0" max="1" step="0.01" />
          </div>
        </div>
        <p id="globalStatus" class="hint"></p>
      </section>

      <section id="empty" class="panel">
        <p class="empty-title">Nenhum token selecionado</p>
        <p class="hint">Selecione um token ou um desenho no mapa para configurar suas auras e luzes.</p>
        <label for="pick">Ou escolha pela lista</label>
        <select id="pick"><option value="">— escolher —</option></select>
      </section>

      <section id="editor" class="panel" hidden>
        <div class="sel" id="selInfo"></div>

        <div class="dashboard-grid">
          <!-- Coluna Esquerda -->
          <div style="display: grid; gap: 10px;">
            <div>
              <label for="preset">Efeito / Preset</label>
              <select id="preset">${ut()}</select>
            </div>

            <div class="row">
              <div class="grow">
                <label for="color">Cor</label>
                <input id="color" type="color" />
              </div>
              <div class="grow">
                <label for="radius" id="radiusLabel">Raio</label>
                <input id="radius" type="number" min="0.5" max="20" step="0.5" />
              </div>
            </div>

            <div class="row">
              <div class="grow">
                <label class="switch" style="margin: 4px 0;">
                  <input id="gradientEnabled" type="checkbox" />
                  <span class="track"></span>
                  <span class="switch-text">Gradiente</span>
                </label>
              </div>
              <div class="grow">
                <label for="gradientColor">Cor final</label>
                <input id="gradientColor" type="color" />
              </div>
            </div>
            <div id="gradientAngleRow">
              <label for="gradientAngle">Direção do gradiente <output id="gradientAngleValue"></output></label>
              <input id="gradientAngle" type="range" min="0" max="360" step="5" />
            </div>

            <div class="row">
              <div class="grow" id="shapeField">
                <label for="shape">Formato</label>
                <select id="shape">
                  <option value="circle">Círculo</option>
                  <option value="square">Quadrado</option>
                  <option value="cone">Cone</option>
                  <option value="line">Linha</option>
                </select>
              </div>
              <div class="grow">
                <label for="placement">Posição</label>
                <select id="placement">
                  <option value="below">Abaixo</option>
                  <option value="above">Acima</option>
                </select>
              </div>
            </div>

            <div id="coneRow" hidden>
              <label for="angle">Abertura do cone <output id="angleValue"></output></label>
              <input id="angle" type="range" min="10" max="170" step="1" />
            </div>

            <div id="lineRow" hidden>
              <label for="width">Largura da linha</label>
              <input id="width" type="number" min="0.1" max="10" step="0.1" />
            </div>

            <div id="dirRow" hidden>
              <label for="direction">Direção <output id="directionValue"></output></label>
              <input id="direction" type="range" min="-180" max="180" step="5" />
            </div>
          </div>

          <!-- Coluna Direita -->
          <div style="display: grid; gap: 10px;">
            <div>
              <label for="blend">Modo de mistura</label>
              <select id="blend">
                ${et.map(e=>`<option value="${e.value}">${e.label}</option>`).join("")}
              </select>
            </div>

            <div>
              <label for="softness">Suavidade <output id="softnessValue"></output></label>
              <input id="softness" type="range" min="0" max="1" step="0.01" />
            </div>

            <div>
              <label for="intensity">Intensidade <output id="intensityValue"></output></label>
              <input id="intensity" type="range" min="0.1" max="1.5" step="0.01" />
            </div>

            <div>
              <label for="speed">Velocidade <output id="speedValue"></output></label>
              <input id="speed" type="range" min="0" max="8" step="0.1" />
            </div>

            <div id="fogRow">
              <label for="fog">Luz no Fog (Dynamic Fog)</label>
              <select id="fog">
                <option value="off">Desligada</option>
                <option value="primary">Primária</option>
                <option value="secondary">Secundária</option>
                <option value="auxiliary">Auxiliar</option>
              </select>
            </div>
          </div>
        </div>

        <div id="scheduleRow" class="full-width">
          <label for="schedule">Quando acende (Dynamic Day Cycle)</label>
          <select id="schedule">
            <option value="always">Sempre acesa</option>
            <option value="night">Só à noite</option>
            <option value="day">Só de dia</option>
          </select>
        </div>

        <details class="mine full-width">
          <summary>Meus presets salvos</summary>
          <select id="mine"><option value="">— meus presets —</option></select>
          <div class="btnrow" style="margin-top:6px;">
            <button id="mineApply" type="button">Aplicar</button>
            <button id="mineDelete" type="button">Apagar</button>
          </div>
          <input id="mineName" type="text" maxlength="40" placeholder="Nome do preset" />
          <div class="btnrow">
            <button id="mineSave" type="button">Salvar atual</button>
            <button id="mineIO" type="button">Exportar/Importar</button>
          </div>
          <div id="ioBox" hidden>
            <textarea id="mineText" rows="4" spellcheck="false"></textarea>
            <button id="mineImport" type="button">Importar texto</button>
          </div>
        </details>

        <label class="switch" id="hideRow" hidden style="margin-top: 4px;">
          <input id="hide" type="checkbox" />
          <span class="track"></span>
          <span class="switch-text">Esconder o desenho (opacidade 0)</span>
        </label>
        <p id="status" class="status" hidden></p>
      </section>

      <section class="panel" style="padding: 10px 14px;">
        <details class="mine">
          <summary>Desempenho e Ajustes</summary>
          <div class="row" style="margin-top: 8px;">
            <div class="grow">
              <label for="quality">Qualidade</label>
              <select id="quality">
                <option value="high">Alta (todos)</option>
                <option value="medium">Média (simples)</option>
                <option value="low">Baixa (sombras)</option>
              </select>
            </div>
            <div class="grow">
              <label for="fogOffset">Ajuste cone no fog (°)</label>
              <input id="fogOffset" type="number" min="-180" max="180" step="5" />
            </div>
          </div>
        </details>
      </section>

      <details class="diag panel" style="padding: 10px 14px;">
        <summary>Diagnóstico</summary>
        <pre id="diagText"></pre>
      </details>
      <footer>Dynamic Auras & Lights v${he}</footer>
    </main>
  `;const t=e=>h.querySelector(e),u=t("#globalEnabled"),m=t("#globalBrightness"),$=t("#globalTint"),O=t("#globalTintStrength"),De=t("#globalBrightnessValue"),Ne=t("#globalTintStrengthValue"),ne=t("#globalStatus"),Ve=t("#empty"),$e=t("#editor"),Oe=t("#selInfo"),C=t("#active"),b=t("#preset"),I=t("#color"),B=t("#gradientEnabled"),M=t("#gradientColor"),f=t("#gradientAngle"),Ce=t("#gradientAngleValue"),y=t("#radius"),w=t("#shape"),P=t("#placement"),j=t("#blend"),E=t("#softness"),x=t("#intensity"),S=t("#speed"),Ie=t("#softnessValue"),Be=t("#intensityValue"),Me=t("#speedValue"),ie=t("#status"),Pe=t("#radiusLabel"),je=t("#hideRow"),q=t("#hide"),F=t("#pick"),qe=t("#diagText"),Fe=t("#close"),Ge=t("#shapeField"),_e=t("#coneRow"),Ue=t("#lineRow"),Ke=t("#dirRow"),ze=t("#fogRow"),A=t("#angle"),G=t("#width"),k=t("#direction"),_=t("#fog"),U=t("#schedule"),He=t("#angleValue"),Qe=t("#directionValue"),v=t("#mine"),oe=t("#mineName"),K=t("#ioBox"),le=t("#mineText"),z=t("#quality"),H=t("#fogOffset");Fe.addEventListener("click",()=>{s.popover.close(tt).catch(()=>{}),s.action.close().catch(()=>{})});function d(e){ie.textContent=e,ie.hidden=!e}function L(e){const a=Ee(e);u.checked=a.enabled,m.value=String(a.brightness),$.value=a.tint,O.value=String(a.tintStrength),De.value=a.brightness.toFixed(2),Ne.value=`${Math.round(a.tintStrength*100)}%`,ne.textContent=a.enabled?"O ambiente será aplicado a todos os participantes.":"Ambiente global desativado."}async function se(){const e=Ee({enabled:u.checked,brightness:Number(m.value),tint:$.value,tintStrength:Number(O.value)});L(e);try{await s.scene.setMetadata({[X]:e})}catch(a){console.error(a),ne.textContent="Não foi possível salvar o ambiente global."}}for(const e of[m,$,O])e.addEventListener("input",se);u.addEventListener("change",se),s.scene.getMetadata().then(e=>L(e[X]??Z)).catch(()=>L(Z)),s.scene.onMetadataChange(e=>L(e[X]??Z));function re(){Ie.value=`${Math.round(Number(E.value)*100)}%`,Be.value=`${Math.round(Number(x.value)*100)}%`,Me.value=S.value,Ce.value=`${f.value}°`,He.value=`${A.value}°`,Qe.value=`${k.value}°`}function de(){const e=i.length>0&&i.every(c),a=w.value;_e.hidden=e||a!=="cone",Ue.hidden=e||a!=="line",Ke.hidden=e||a!=="cone"&&a!=="line",Ge.hidden=e,ze.hidden=e}function R(e){b.value=e.preset,I.value=e.color,B.checked=e.gradientEnabled,M.value=e.gradientColor,f.value=String(e.gradientAngle),y.value=String(e.radius),w.value=e.shape,P.value=e.placement,j.value=e.blendMode,E.value=String(e.softness),x.value=String(e.intensity),S.value=String(e.speed),A.value=String(e.angle),G.value=String(e.width),k.value=String(e.direction),_.value=e.fog,U.value=e.schedule,re(),de()}function T(){return ee({preset:b.value,color:I.value,gradientEnabled:B.checked,gradientColor:M.value,gradientAngle:Number(f.value),radius:Number(y.value),shape:w.value,placement:P.value,blendMode:j.value,softness:Number(E.value),intensity:Number(x.value),speed:Number(S.value),angle:Number(A.value),width:Number(G.value),direction:Number(k.value),fog:_.value,schedule:U.value})}function ce(e){const a=i.length>0;if(Ve.hidden=a,$e.hidden=!a,!a)return;Oe.textContent=i.length===1?i[0].name||(c(i[0])?"Desenho sem nome":"Token sem nome"):`${i.length} itens selecionados`;const n=i.filter(c),o=n.length===i.length;Pe.textContent=o?"Expansão":"Raio",y.min=o?"0":"0.5",je.hidden=n.length===0,q.checked=n.length>0&&n.every(ct),C.checked=g,e?R(r):de()}async function ue(e){if(i.length)try{await s.scene.items.updateItems(i,a=>{for(const n of a)n.metadata[xe]={...e}}),d("")}catch(a){console.error(a),d("Não foi possível salvar.")}}async function Ye(){if(i.length)try{await s.scene.items.updateItems(i,e=>{for(const a of e)delete a.metadata[xe],c(a)&&fe(a)}),d("")}catch(e){console.error(e),d("Não foi possível remover.")}}function Q(e){qe.textContent=Object.entries(e).map(([a,n])=>`${a}: ${n}`).join(`
`)}async function Je(){const e=(await s.scene.items.getItems()).filter(Se),a=e.map(n=>n.id).join(",");a!==Le&&(Le=a,F.innerHTML='<option value="">— escolher —</option>'+e.map(n=>{const o=(n.name||(c(n)?"Desenho":"Token")).replace(/[<>&"]/g,"");return`<option value="${n.id}">${o} · ${n.id.slice(0,4)}</option>`}).join(""))}async function p(e){const a={versão:he,qualidade:te().quality};for(const[n,o]of Object.entries(rt()))a[n]=o;try{const n=await s.scene.isReady();if(a["cena pronta"]=n?"sim":"NÃO",!n){i=[],g=!1,ce(!0),Q(a);return}let o=[],N="nenhuma";try{const l=await s.player.getSelection();a["seleção (painel)"]=String((l==null?void 0:l.length)??0),l!=null&&l.length&&(o=l,N="painel")}catch(l){a["erro getSelection"]=String(l)}if(!o.length){const l=dt();a["seleção (fundo)"]=String(l.length),l.length&&(o=l,N="fundo")}!o.length&&V.length&&(o=V,N="lista"),a["fonte usada"]=N;const ve=o.join(",");if(e==="poll"&&ve===ke){Q(a);return}ke=ve;const J=o.length?await s.scene.items.getItems(o):[];a["itens encontrados"]=`${J.length} de ${o.length}`,a["tipo/camada"]=J.map(l=>`${l.type}/${l.layer}`).join(", ")||"-",i=J.filter(Se),a["alvos válidos"]=String(i.length);const W=i.find(l=>Ae(l));g=!!W;const Xe=Date.now()-ae>700,ge=e==="force"||e==="poll"||Xe;W&&ge&&(r=ee(Ae(W))),ce(ge),i.length||await Je()}catch(n){console.error(n),a.erro=String(n)}Q(a)}function Y(){ae=Date.now(),ye(r),g&&(window.clearTimeout(Re),Re=window.setTimeout(()=>{ue(r)},40))}function pe(){r=T(),re(),Y()}function We(){const e=Te[b.value],a=i.length>0&&i.every(c);r={...T(),color:e.color,intensity:e.intensity,speed:e.speed,softness:e.softness,...e.radius!==void 0&&!a?{radius:e.radius}:{}},R(r),Y()}for(const e of[I,M,f,y,E,x,S,A,G,k])e.addEventListener("input",pe);for(const e of[B,w,P,j,_,U])e.addEventListener("change",pe);function D(){v.innerHTML="",v.append(new Option("— meus presets —",""));for(const e of me())v.append(new Option(e.name,e.id))}D(),t("#mineSave").addEventListener("click",()=>{const e=at(oe.value,T());oe.value="",D(),d(`Preset salvo (${e.length} no total).`)}),t("#mineApply").addEventListener("click",()=>{const e=me().find(a=>a.id===v.value);if(!e){d("Escolha um preset da lista.");return}r=ee(e.config),R(r),Y(),d(`Preset "${e.name}" aplicado.`)}),t("#mineDelete").addEventListener("click",()=>{if(!v.value){d("Escolha um preset da lista.");return}nt(v.value),D(),d("Preset apagado.")}),t("#mineIO").addEventListener("click",()=>{K.hidden=!K.hidden,K.hidden||(le.value=it())}),t("#mineImport").addEventListener("click",()=>{const e=ot(le.value);D(),d(e?`${e} preset(s) importado(s).`:"Texto inválido: nada foi importado.")}),z.value=te().quality,H.value=String(te().fogOffset),z.addEventListener("change",()=>be({quality:z.value})),H.addEventListener("change",()=>be({fogOffset:Number(H.value)||0})),b.addEventListener("change",We),q.addEventListener("change",async()=>{const e=i.filter(c);if(!e.length)return;const a=q.checked;try{await s.scene.items.updateItems(e,n=>{for(const o of n)c(o)&&(a?lt(o):fe(o))}),d("")}catch(n){console.error(n),d("Não foi possível alterar o desenho.")}}),C.addEventListener("change",async()=>{ae=Date.now(),C.checked?(g=!0,r=T(),ye(r),await ue(r)):(g=!1,await Ye())}),s.player.onChange(()=>{V=[],p("force")}),s.scene.items.onChange(()=>{p("soft")}),s.scene.onReadyChange(()=>{p("force")}),window.addEventListener("storage",e=>{e.key===st&&p("force")}),F.addEventListener("change",()=>{const e=F.value;e&&(V=[e],s.player.select([e]).catch(()=>{}),p("force"))}),window.setInterval(()=>{p("poll")},1e3),R(r),p("force")}s.onReady(()=>{document.body.classList.add("obr-ready"),pt()});
