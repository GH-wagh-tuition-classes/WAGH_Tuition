/* WAGH Tuition Classes — Admin Chapter Challenge Manager H1.3B-R1 */
window.WTC_DAILY_CHALLENGE_ADMIN = (() => {
  let user=null, data=null, opened=false;

  function open(){
    if(opened)return;
    opened=true;
    try{user=WTC_AUTH.getUser?.()||null;}catch(e){user=null;}
    bind();
    message('Enter the Admin password, then load the chapter catalogue.','info');
  }

  function bind(){
    byId('dcAdminLoad')?.addEventListener('click',load);
    byId('dcAdminSave')?.addEventListener('click',save);
    byId('dcAdminPrepare')?.addEventListener('click',prepare);
    ['dcBoard','dcClass','dcMedium','dcSubject'].forEach(id=>byId(id)?.addEventListener('change',()=>cascade(id)));
  }

  function identity(){return{adminId:user?.adminId||user?.id||'',adminMobile:user?.mobile||'',adminPassword:byId('dcAdminPassword')?.value||'',deviceId:WTC_AUTH.deviceId?.()||''};}

  async function load(){
    const button=byId('dcAdminLoad');setBusy(button,true,'Loading…');
    try{
      const result=await WTC_API.call({action:'adminGetDailyChallengeManager',...identity()});
      if(result?.success===false)throw new Error(result.message||'Could not load challenge manager.');
      data=result;renderSelectors();renderConfigs();message('Chapter catalogue loaded. Select a group, subject and chapter pool.','success');
    }catch(error){message(error.message||'Could not load challenge manager.','error');}
    finally{setBusy(button,false);}
  }

  function renderSelectors(){
    const subjects=data?.subjects||[];
    fill('dcBoard',unique(subjects.map(x=>x.board)),'Select board');
    cascade('dcBoard');
  }

  function cascade(changed){
    if(!data)return;
    const subjects=data.subjects||[];
    const board=val('dcBoard');
    if(changed==='dcBoard')fill('dcClass',unique(subjects.filter(x=>x.board===board).map(x=>x.className)),'Select class');
    const className=val('dcClass');
    if(changed==='dcBoard'||changed==='dcClass')fill('dcMedium',unique(subjects.filter(x=>x.board===board&&x.className===className).map(x=>x.medium)),'Select medium');
    const medium=val('dcMedium');
    if(['dcBoard','dcClass','dcMedium'].includes(changed))fillObjects('dcSubject',subjects.filter(x=>x.board===board&&x.className===className&&x.medium===medium),'subjectId','subjectName','Select subject');
    renderChapters();applyMatchingConfig();
  }

  function renderChapters(){
    const host=byId('dcChapterPool');if(!host)return;
    const list=(data?.chapters||[]).filter(x=>x.board===val('dcBoard')&&x.className===val('dcClass')&&x.medium===val('dcMedium')&&x.subjectId===val('dcSubject')).sort((a,b)=>a.sortOrder-b.sortOrder);
    if(!list.length){host.innerHTML='<div class="dc-empty">Select a complete academic group and subject.</div>';return;}
    host.innerHTML=list.map(ch=>`<label class="dc-chapter-option ${ch.publishedMcqCount>=20?'ready':'limited'}"><input type="checkbox" value="${attr(ch.chapterId)}"><span><b>${esc(ch.chapterName)}</b><small>${ch.publishedMcqCount} published MCQs${ch.publishedMcqCount>=20?' • Can run alone':' • Will combine with next selected chapter'}</small></span></label>`).join('');
  }

  function applyMatchingConfig(){
    if(!data)return;
    const config=(data.configs||[]).find(c=>c.board===val('dcBoard')&&c.className===val('dcClass')&&c.medium===val('dcMedium'));
    byId('dcConfigId').value=config?.configId||'';
    if(config){
      if(config.subjectId&&val('dcSubject')!==config.subjectId){byId('dcSubject').value=config.subjectId;renderChapters();}
      const selected=new Set(config.chapterIds||[]);document.querySelectorAll('#dcChapterPool input').forEach(input=>input.checked=selected.has(input.value));
      byId('dcRotationStart').value=(config.rotationStartDate||'').slice(0,10);
      byId('dcDuration').value=config.durationMin||20;
      byId('dcEnabled').checked=String(config.status||'').toUpperCase()==='ACTIVE';
      text('dcCurrentConfig',`Current configuration: ${config.status} • ${config.chapterIds.length} chapter(s) • Updated ${config.updatedAt||'—'}`);
    }else{
      if(!byId('dcRotationStart').value)byId('dcRotationStart').value=new Date().toISOString().slice(0,10);
      byId('dcEnabled').checked=true;text('dcCurrentConfig','No saved configuration for this group.');
    }
  }

  async function save(){
    const chapterIds=[...document.querySelectorAll('#dcChapterPool input:checked')].map(x=>x.value);
    if(!chapterIds.length)return message('Select at least one chapter.','error');
    const button=byId('dcAdminSave');setBusy(button,true,'Saving…');
    try{
      const result=await WTC_API.call({action:'adminSaveDailyChallengeConfig',...identity(),board:val('dcBoard'),className:val('dcClass'),medium:val('dcMedium'),subjectId:val('dcSubject'),chapterIds:JSON.stringify(chapterIds),rotationStartDate:val('dcRotationStart'),durationMin:val('dcDuration'),enabled:byId('dcEnabled').checked});
      if(result?.success===false)throw new Error(result.message||'Configuration could not be saved.');
      byId('dcConfigId').value=result.config?.configId||'';message(result.message||'Chapter rotation saved.','success');await load();
    }catch(error){message(error.message||'Configuration could not be saved.','error');}
    finally{setBusy(button,false);}
  }

  async function prepare(){
    const configId=val('dcConfigId');if(!configId)return message('Save the configuration before preparing today’s challenge.','error');
    const button=byId('dcAdminPrepare');setBusy(button,true,'Preparing…');
    try{
      const result=await WTC_API.call({action:'adminPrepareDailyChallenge',...identity(),configId,challengeDate:val('dcPreviewDate')||new Date().toISOString().slice(0,10)});
      if(result?.success===false)throw new Error(result.message||'Challenge could not be prepared.');
      renderPreview(result);message(result.message||'Challenge prepared.','success');
    }catch(error){message(error.message||'Challenge could not be prepared.','error');}
    finally{setBusy(button,false);}
  }

  function renderPreview(result){
    const c=result.challenge||{},host=byId('dcPreview');
    host.innerHTML=`<div class="dc-preview-head"><div><small>Frozen challenge</small><h3>${esc(c.testTitle||'Chapter Challenge')}</h3><p>${esc([c.className,c.board,c.medium,c.subjectName].filter(Boolean).join(' • '))}</p></div><b>${c.questionCount||20} MCQs</b></div><ol>${(result.preview||[]).map(q=>`<li><span>Q${q.questionNo}</span><div><b>${esc(q.text)}</b><small>${esc(q.chapterName||'')} • ${esc(q.topic||'General')} • ${esc(q.difficulty||'Medium')}</small></div></li>`).join('')}</ol>`;
  }

  function renderConfigs(){
    const host=byId('dcConfigList');if(!host)return;const configs=data?.configs||[];
    host.innerHTML=configs.length?configs.map(c=>`<button type="button" data-config="${attr(c.configId)}"><b>${esc([c.className,c.board,c.medium].filter(Boolean).join(' • '))}</b><small>${esc(c.subjectId)} • ${c.chapterIds.length} chapter(s) • ${esc(c.status)}</small></button>`).join(''):'<div class="dc-empty">No Chapter Challenge rotations have been saved.</div>';
    host.querySelectorAll('[data-config]').forEach(button=>button.addEventListener('click',()=>selectConfig(button.dataset.config)));
  }

  function selectConfig(id){const c=(data?.configs||[]).find(x=>x.configId===id);if(!c)return;byId('dcBoard').value=c.board;cascade('dcBoard');byId('dcClass').value=c.className;cascade('dcClass');byId('dcMedium').value=c.medium;cascade('dcMedium');byId('dcSubject').value=c.subjectId;renderChapters();applyMatchingConfig();}
  function message(value,type='info'){const el=byId('dcAdminStatus');if(el){el.textContent=value;el.className=`dc-status ${type}`;}}
  function fill(id,items,placeholder){const el=byId(id);if(!el)return;el.innerHTML=`<option value="">${esc(placeholder)}</option>`+items.map(x=>`<option value="${attr(x)}">${esc(x)}</option>`).join('');}
  function fillObjects(id,items,valueKey,labelKey,placeholder){const el=byId(id);if(!el)return;el.innerHTML=`<option value="">${esc(placeholder)}</option>`+items.sort((a,b)=>a.sortOrder-b.sortOrder).map(x=>`<option value="${attr(x[valueKey])}">${esc(x[labelKey])}</option>`).join('');}
  function unique(items){return[...new Set(items.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));}
  function val(id){return byId(id)?.value?.trim()||'';}function byId(id){return document.getElementById(id);}function text(id,v){const el=byId(id);if(el)el.textContent=String(v??'');}
  function setBusy(button,busy,label){if(!button)return;if(WTC_UI.setBusy)return WTC_UI.setBusy(button,busy,label);button.disabled=busy;}
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}function attr(v=''){return esc(v).replace(/`/g,'&#096;');}
  return{open,load};
})();
