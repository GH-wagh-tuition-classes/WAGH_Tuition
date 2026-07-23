const WTC_SHEETS={STUDENT_MASTER:['studentId','name','mobile','password','board','className','medium','status','deviceId','createdAt','updatedAt','studentType'],TEACHER_MASTER:['teacherId','name','mobile','password','subject','className','status','createdAt','updatedAt'],ADMIN_MASTER:['adminId','name','mobile','password','status','createdAt'],SUBJECT_MASTER:['subjectId','subjectName','icon','board','className','medium','description','status','sortOrder'],CHAPTER_MASTER:['chapterId','subjectId','chapterNo','chapterName','board','className','medium','description','status','sortOrder'],CHAPTER_LIST:['chapterId','lessonUrl','notesUrl','mcqUrl','worksheetUrl','answerWritingUrl','videoUrl','revisionUrl','solutionUrl','status','updatedAt'],ACCESS_LOGS:['logId','timestamp','userId','name','role','mobile','action','page','deviceId'],TEST_RESULTS:['resultId','studentId','chapterId','testType','score','total','percent','createdAt'],PROGRESS_TRACKER:['studentId','percent','lastSubjectId','lastChapterId','updatedAt'],PARENT_ACCESS:['parentId','name','mobile','password','studentId','status','createdAt'],GAMIFICATION_DATA:['studentId','xp','level','badges','streak','updatedAt'],ADMISSION_LEADS:['leadId','createdAt','studentName','parentMobile','className','board','medium','subject','preferredTime','source','status','notes','deviceId','pageUrl','consent','updatedAt']};
const IST='Asia/Kolkata';
function doGet(e) {
  var action = e && e.parameter ? String(e.parameter.action || '') : '';

  if (action) {
    var request = Object.assign({}, e.parameter, { action: action });
    return json(wtcRouteApiRequest_(request));
  }

  return json(wtcApiEnvelope_({
    ok: true,
    success: true,
    app: WTC_BACKEND.APP_NAME,
    message: 'API is live'
  }));
}
function doPost(e) {
  try {
    var request = JSON.parse((e.postData && e.postData.contents) || '{}');
    return json(wtcRouteApiRequest_(request));
  } catch (error) {
    return json(wtcApiEnvelope_({
      success: false,
      message: error.message || 'Invalid request body.'
    }));
  }
}
function setupWTCContentEngine(){const ss=SpreadsheetApp.getActiveSpreadsheet();Object.keys(WTC_SHEETS).forEach(name=>{let s=ss.getSheetByName(name);if(!s)s=ss.insertSheet(name);s.clear();s.getRange(1,1,1,WTC_SHEETS[name].length).setValues([WTC_SHEETS[name]]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');s.setFrozenRows(1);s.autoResizeColumns(1,WTC_SHEETS[name].length);});seedSampleData();}
function seedSampleData(){append('ADMIN_MASTER',{adminId:'ADM001',name:'Admin',mobile:'9999999999',password:'admin123',status:'Active',createdAt:now()});append('TEACHER_MASTER',{teacherId:'TCH001',name:'Demo Teacher',mobile:'8888888888',password:'teacher123',subject:'Science',className:'Class 10',status:'Active',createdAt:now()});
append('STUDENT_MASTER',{
  studentId:'STU001',
  name:'Demo Student',
  mobile:'7777777777',
  password:'student123',
  board:'CBSE',
  className:'Class 10',
  medium:'English Medium',
  status:'Active',
  createdAt:now(),
  studentType:'GENERAL_STUDENT'
});
append('SUBJECT_MASTER',{subjectId:'SCI10',subjectName:'Science',icon:'🔬',board:'CBSE',className:'Class 10',medium:'English Medium',description:'Science chapters',status:'Active',sortOrder:1});append('SUBJECT_MASTER',{subjectId:'MATH10',subjectName:'Mathematics',icon:'➗',board:'CBSE',className:'Class 10',medium:'English Medium',description:'Mathematics chapters',status:'Active',sortOrder:2});append('CHAPTER_MASTER',{chapterId:'SCI10CH1',subjectId:'SCI10',chapterNo:'1',chapterName:'Chemical Reactions and Equations',board:'CBSE',className:'Class 10',medium:'English Medium',description:'Class 10 Science Chapter 1',status:'Active',sortOrder:1});append('CHAPTER_LIST',{chapterId:'SCI10CH1',lessonUrl:'chapters/cbse/sci10-ch1.html',notesUrl:'notes/pdf/sci10-ch1.pdf',mcqUrl:'tests/mcq/sci10-ch1.html',worksheetUrl:'tests/online-test/sci10-ch1.html',answerWritingUrl:'tests/answer-writing/sci10-ch1.html',videoUrl:'',revisionUrl:'',status:'Active',updatedAt:now()});append('PROGRESS_TRACKER',{studentId:'STU001',percent:25,lastSubjectId:'SCI10',lastChapterId:'SCI10CH1',updatedAt:now()});}
function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}function ss(){return SpreadsheetApp.getActiveSpreadsheet();}function sh(n){let s=ss().getSheetByName(n);if(!s)throw new Error('Missing sheet: '+n);return s;}function now(){return Utilities.formatDate(new Date(),IST,'yyyy-MM-dd HH:mm:ss');}
var WTC_CODE_ROWS_CACHE={};
function clearRowsCache_(n){delete WTC_CODE_ROWS_CACHE[n];if(typeof WTC_WorkbookRepository!=='undefined'&&WTC_WorkbookRepository.clearRowsCache)WTC_WorkbookRepository.clearRowsCache(WTC_BACKEND.WORKBOOK_KEYS.CONTENT,n);}
function rows(n){if(WTC_CODE_ROWS_CACHE[n])return WTC_CODE_ROWS_CACHE[n];const s=sh(n);const v=s.getDataRange().getValues();if(v.length<2)return WTC_CODE_ROWS_CACHE[n]=[];const h=v[0].map(String);return WTC_CODE_ROWS_CACHE[n]=v.slice(1).filter(r=>r.join('')!=='').map((r,i)=>{const o={_row:i+2};h.forEach((k,j)=>o[k]=r[j]);return o;});}
function append(n,obj){const s=sh(n),h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);s.getRange(s.getLastRow()+1,1,1,h.length).setValues([h.map(k=>obj[k]!==undefined?obj[k]:'')]);clearRowsCache_(n);}
function updateRow(n,row,obj){const s=sh(n),h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String),values=s.getRange(row,1,1,h.length).getValues()[0];h.forEach((k,i)=>{if(obj[k]!==undefined)values[i]=obj[k];});s.getRange(row,1,1,h.length).setValues([values]);clearRowsCache_(n);}
function norm(v){return String(v||'').trim();}function active(x){return !['blocked','inactive','no','false'].includes(String(x.status||x.isActive||'Active').toLowerCase());}function match(x,d){return(!x.board||!d.board||norm(x.board)===norm(d.board))&&(!x.className||!d.className||norm(x.className)===norm(d.className))&&(!x.medium||!d.medium||norm(x.medium)===norm(d.medium));}
function publicUser(u,role,idKey){
  return{
    id:u[idKey]||u.id||u.mobile,
    studentId:u.studentId||'',
    teacherId:u.teacherId||'',
    adminId:u.adminId||'',
    name:u.name||u.studentName||u.teacherName||'User',
    mobile:u.mobile,
    role,
    board:u.board||'',
    className:u.className||u.class||'',
    medium:u.medium||'',
    status:u.status||'Active',
    studentType:u.studentType||''
  };
}
function login(d){const mobile=norm(d.mobile),password=norm(d.password),role=norm(d.role||'Student');const pools={Student:['STUDENT_MASTER','studentId'],Teacher:['TEACHER_MASTER','teacherId'],Admin:['ADMIN_MASTER','adminId'],Parent:['PARENT_ACCESS','parentId']};const p=pools[role]||pools.Student;const found=rows(p[0]).find(x=>norm(x.mobile)===mobile&&norm(x.password)===password);if(!found)return{success:false,message:'Invalid '+role+' mobile or password.'};if(!active(found))return{success:false,message:'Account is not active.'};const user=publicUser(found,role,p[1]);logAccess({userId:user.id,name:user.name,role:user.role,mobile:user.mobile,actionName:'Login',url:role+' portal',deviceId:d.deviceId});return{success:true,user};}
function signupStudent(d){const mobile=norm(d.mobile);if(rows('STUDENT_MASTER').some(x=>norm(x.mobile)===mobile))return{success:false,message:'Mobile already registered.'};const id='STU'+Date.now();append('STUDENT_MASTER',{
  studentId:id,
  name:d.name,
  mobile,
  password:d.password,
  board:d.board,
  className:d.className,
  medium:d.medium,
  status:'Active',
  deviceId:d.deviceId,
  createdAt:now(),
  studentType:'GENERAL_STUDENT'
});append('PROGRESS_TRACKER',{studentId:id,percent:0,updatedAt:now()});
const user={
  id,
  studentId:id,
  name:d.name,
  mobile,
  role:'Student',
  board:d.board,
  className:d.className,
  medium:d.medium,
  status:'Active',
  studentType:'GENERAL_STUDENT'
};
logAccess({userId:id,name:d.name,role:'Student',mobile,actionName:'Signup',url:'index.html',deviceId:d.deviceId});return{success:true,user};}
function updateStudentProfile(d){const found=rows('STUDENT_MASTER').find(x=>norm(x.studentId)===norm(d.studentId));if(!found)return{success:false,message:'Student not found.'};const obj={name:d.name,mobile:d.mobile,board:d.board,className:d.className,medium:d.medium,updatedAt:now()};if(d.password)obj.password=d.password;updateRow('STUDENT_MASTER',found._row,obj);return{success:true,message:'Profile updated.'};}
function getSubjects(d){const list=rows('SUBJECT_MASTER').filter(x=>active(x)&&match(x,d)).sort((a,b)=>(Number(a.sortOrder)||99)-(Number(b.sortOrder)||99));return{success:true,subjects:list};}
function getChapters(d){const list=rows('CHAPTER_MASTER').filter(x=>active(x)&&match(x,d)&&(!d.subjectId||norm(x.subjectId)===norm(d.subjectId))).sort((a,b)=>(Number(a.sortOrder)||99)-(Number(b.sortOrder)||99));return{success:true,chapters:list};}
function getChapterFeatures(d){const rs=rows('CHAPTER_LIST').filter(x=>active(x)&&norm(x.chapterId)===norm(d.chapterId));const names=[['lessonUrl','Lesson','📖','Lesson'],['notesUrl','Notes','📚','Notes'],['mcqUrl','MCQ Test','📝','Test'],['worksheetUrl','Worksheet','📄','Worksheet'],['answerWritingUrl','Answer Writing','✍️','Practice'],['videoUrl','Video','🎬','Video'],['revisionUrl','Revision','🔁','Revision'],['solutionUrl','Solution','📘','Solution']];const features=[];rs.forEach(r=>names.forEach(n=>{if(r[n[0]])features.push({featureName:n[1],icon:n[2],type:n[3],url:r[n[0]]});}));return{success:true,features};}
function getStudentProgress(d){const p=rows('PROGRESS_TRACKER').find(x=>norm(x.studentId)===norm(d.studentId));return{success:true,progress:p||{percent:0}};}
function logAccess(d){try{append('ACCESS_LOGS',{logId:'LOG'+Date.now(),timestamp:now(),userId:d.userId,name:d.name,role:d.role,mobile:d.mobile,action:d.actionName||d.action,page:d.url||d.page,deviceId:d.deviceId});}catch(e){}return{success:true};}
function adminDashboard(){return{success:true,totalStudents:rows('STUDENT_MASTER').length,totalTeachers:rows('TEACHER_MASTER').length,totalLogs:rows('ACCESS_LOGS').length};}

/*function to get subjects from admin subject manager */

function adminGetSubjects(d){
  const list=rows('SUBJECT_MASTER')
    .sort((a,b)=>(Number(a.sortOrder)||99)-(Number(b.sortOrder)||99));
  return {success:true,subjects:list};
}

function adminSaveSubject(d){
  if(!d.subjectId)return{success:false,message:'Subject ID is required.'};

  const subject={
    subjectId:norm(d.subjectId),
    subjectName:norm(d.subjectName),
    icon:norm(d.icon),
    board:norm(d.board),
    className:norm(d.className),
    medium:norm(d.medium),
    description:norm(d.description),
    status:norm(d.status||'Active'),
    sortOrder:d.sortOrder||''
  };

  const found=rows('SUBJECT_MASTER').find(x=>norm(x.subjectId)===subject.subjectId);

  if(found){
    updateRow('SUBJECT_MASTER',found._row,subject);
    return{success:true,message:'Subject updated successfully.'};
  }

  append('SUBJECT_MASTER',subject);
  return{success:true,message:'Subject added successfully.'};
}

/* function for admin to update chaper excel sheet */

function adminGetChapters(d){
  const list=rows('CHAPTER_MASTER')
    .sort((a,b)=>(Number(a.sortOrder)||99)-(Number(b.sortOrder)||99));

  return {success:true,chapters:list};
}

function adminSaveChapter(d){
  if(!d.chapterId)return{success:false,message:'Chapter ID is required.'};
  if(!d.subjectId)return{success:false,message:'Subject ID is required.'};

  const chapter={
    chapterId:norm(d.chapterId),
    subjectId:norm(d.subjectId),
    chapterNo:norm(d.chapterNo),
    chapterName:norm(d.chapterName),
    board:norm(d.board),
    className:norm(d.className),
    medium:norm(d.medium),
    description:norm(d.description),
    status:norm(d.status||'Active'),
    sortOrder:d.sortOrder||''
  };

  const found=rows('CHAPTER_MASTER').find(x=>norm(x.chapterId)===chapter.chapterId);

  if(found){
    updateRow('CHAPTER_MASTER',found._row,chapter);
    return{success:true,message:'Chapter updated successfully.'};
  }

  append('CHAPTER_MASTER',chapter);
  return{success:true,message:'Chapter added successfully.'};
}
/* function to update chapter feature data to excel by admin */
function adminGetChapterFeatures(d){
  if(!d.chapterId)return{success:false,message:'Chapter ID is required.'};

  const found=rows('CHAPTER_LIST').find(x=>norm(x.chapterId)===norm(d.chapterId));

  return{
    success:true,
    features:found||{
      chapterId:norm(d.chapterId),
      lessonUrl:'',
      notesUrl:'',
      mcqUrl:'',
      worksheetUrl:'',
      answerWritingUrl:'',
      videoUrl:'',
      revisionUrl:'',
      solutionUrl:'',
      status:'Active',
      updatedAt:''
    }
  };
}

function adminSaveChapterFeatures(d){
  if(!d.chapterId)return{success:false,message:'Chapter ID is required.'};

  const item={
    chapterId:norm(d.chapterId),
    lessonUrl:norm(d.lessonUrl),
    notesUrl:norm(d.notesUrl),
    mcqUrl:norm(d.mcqUrl),
    worksheetUrl:norm(d.worksheetUrl),
    answerWritingUrl:norm(d.answerWritingUrl),
    videoUrl:norm(d.videoUrl),
    revisionUrl:norm(d.revisionUrl),
    solutionUrl:norm(d.solutionUrl),
    status:norm(d.status||'Active'),
    updatedAt:now()
  };

  const found=rows('CHAPTER_LIST').find(x=>norm(x.chapterId)===item.chapterId);

  if(found){
    updateRow('CHAPTER_LIST',found._row,item);
    return{success:true,message:'Feature URLs updated successfully.'};
  }

  append('CHAPTER_LIST',item);
  return{success:true,message:'Feature URLs added successfully.'};
}