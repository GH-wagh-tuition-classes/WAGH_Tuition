const WTC_API = (() => {
  async function raw(payload){
    if(!WTC_CONFIG.API_URL || WTC_CONFIG.API_URL.includes('PASTE_YOUR')) throw new Error('API URL not set in assets/js/config.js');
    const res = await fetch(WTC_CONFIG.API_URL, { method:'POST', body:JSON.stringify(payload) });
    return await res.json();
  }
  async function fallback(){ const r=await fetch(WTC_CONFIG.FALLBACK_CONTENT_URL); return await r.json(); }
  async function call(payload, fallbackKey=null){
    try{ const d=await raw(payload); if(d && d.success!==false) return d; throw new Error(d.message||'API failed'); }
    catch(e){ console.warn('WTC API fallback:',e.message); if(!fallbackKey) throw e; const f=await fallback(); return {success:true,[fallbackKey]:f[fallbackKey]||[]}; }
  }
  return {
    call,
    login:(mobile,password,role)=>raw({action:'login',mobile,password,role,deviceId:WTC_AUTH.deviceId()}),
    signupStudent:(student)=>raw({action:'signupStudent',...student,deviceId:WTC_AUTH.deviceId()}),
    updateProfile:(profile)=>raw({action:'updateStudentProfile',...profile,deviceId:WTC_AUTH.deviceId()}),
    getSubjects:(student)=>call({action:'getSubjects',...student},'subjects'),
    getChapters:(params)=>call({action:'getChapters',...params},'chapters'),
    getFeatures:(params)=>call({action:'getChapterFeatures',...params},'features'),
    getProgress:(studentId)=>call({action:'getStudentProgress',studentId},'progress'),
    logAccess:(data)=>raw({action:'logAccess',...data,deviceId:WTC_AUTH.deviceId()}),
    adminDashboard:()=>raw({action:'adminDashboard'}),
    adminListStudents:()=>raw({action:'adminListStudents'}),
    adminListTeachers:()=>raw({action:'adminListTeachers'}),
    adminListContent:()=>raw({action:'adminListContent'}),
    adminAddSubject:(data)=>raw({action:'adminAddSubject',...data}),
    adminAddChapter:(data)=>raw({action:'adminAddChapter',...data}),
    adminAddFeature:(data)=>raw({action:'adminAddFeature',...data}),
    adminUpdateUserStatus:(data)=>raw({action:'adminUpdateUserStatus',...data}),
    teacherDashboard:(teacherId)=>raw({action:'teacherDashboard',teacherId})
  };
})();
