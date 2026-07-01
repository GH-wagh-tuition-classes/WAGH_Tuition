const SHEET_NAME = 'WTC_CONTENT_ENGINE';
const IST = 'Asia/Kolkata';

function doGet() {
  return json({ ok: true, app: 'WAGH Tuition Classes API v1.0' });
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const action = d.action;
    const map = {
      login, signupStudent, updateStudentProfile, getSubjects, getChapters,
      getChapterFeatures, getStudentProgress, logAccess, adminDashboard
    };
    if (!map[action]) return json({ success: false, message: 'Unknown action: ' + action });
    return json(map[action](d));
  } catch (err) {
    return json({ success: false, message: err.message });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sh(name) { return ss().getSheetByName(name); }
function nowIst() { return Utilities.formatDate(new Date(), IST, 'yyyy-MM-dd HH:mm:ss'); }
function rows(name) {
  const s = sh(name); if (!s) return [];
  const values = s.getDataRange().getValues(); if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.join('') !== '').map((r, i) => {
    const o = { _row: i + 2 };
    headers.forEach((h, j) => o[h] = r[j]);
    return o;
  });
}
function append(name, obj) {
  const s = sh(name); if (!s) throw new Error('Missing sheet: ' + name);
  const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(String);
  s.appendRow(headers.map(h => obj[h] || ''));
}
function updateRow(name, row, obj) {
  const s = sh(name); const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(String);
  headers.forEach((h, i) => { if (obj[h] !== undefined) s.getRange(row, i + 1).setValue(obj[h]); });
}

function login(d) {
  const mobile = String(d.mobile || '').trim();
  const password = String(d.password || '').trim();
  const pools = [
    { sheet: 'STUDENT_MASTER', role: 'Student', id: 'studentId' },
    { sheet: 'TEACHER_MASTER', role: 'Teacher', id: 'teacherId' },
    { sheet: 'ADMIN_MASTER', role: 'Admin', id: 'adminId' },
    { sheet: 'PARENT_ACCESS', role: 'Parent', id: 'parentId' }
  ];
  for (const p of pools) {
    const found = rows(p.sheet).find(x => String(x.mobile) === mobile && String(x.password) === password);
    if (found) {
      if (String(found.status || 'Active') !== 'Active') return { success:false, message:'Account is not active.' };
      const user = {
        id: found[p.id] || found.id || mobile,
        name: found.name || found.studentName || found.teacherName || 'User',
        mobile, role: p.role, board: found.board || '', className: found.className || found.class || '', medium: found.medium || '', status: found.status || 'Active'
      };
      logAccess({ userId:user.id, name:user.name, role:user.role, mobile, actionName:'Login', url:'index.html', deviceId:d.deviceId });
      return { success:true, user };
    }
  }
  return { success:false, message:'Invalid mobile or password.' };
}

function signupStudent(d) {
  const mobile = String(d.mobile || '').trim();
  if (rows('STUDENT_MASTER').some(x => String(x.mobile) === mobile)) return { success:false, message:'Mobile already registered.' };
  const id = 'STU-' + Date.now();
  append('STUDENT_MASTER', { studentId:id, name:d.name, mobile, password:d.password, board:d.board, className:d.className, medium:d.medium, status:'Active', deviceId:d.deviceId, createdAt:nowIst() });
  const user = { id, name:d.name, mobile, role:'Student', board:d.board, className:d.className, medium:d.medium, status:'Active' };
  logAccess({ userId:id, name:d.name, role:'Student', mobile, actionName:'Signup', url:'index.html', deviceId:d.deviceId });
  return { success:true, user };
}

function updateStudentProfile(d) {
  const list = rows('STUDENT_MASTER');
  const found = list.find(x => String(x.studentId || x.id) === String(d.studentId));
  if (!found) return { success:false, message:'Student not found.' };
  updateRow('STUDENT_MASTER', found._row, { name:d.name, mobile:d.mobile, board:d.board, className:d.className, medium:d.medium, password:d.password || found.password, updatedAt:nowIst() });
  return { success:true, message:'Profile updated.' };
}

function getSubjects(d) {
  const all = rows('SUBJECT_MASTER').filter(x => active(x) && match(x, d));
  return { success:true, subjects: all.map(x => ({ subjectId:x.subjectId || x.id, subjectName:x.subjectName || x.name, icon:x.icon || '📚' })) };
}
function getChapters(d) {
  const all = rows('CHAPTER_MASTER').filter(x => active(x) && match(x, d) && (!d.subjectId || String(x.subjectId) === String(d.subjectId) || String(x.subjectName) === String(d.subjectName)));
  return { success:true, chapters: all.map(x => ({ chapterId:x.chapterId || x.id, subjectId:x.subjectId, chapterNo:x.chapterNo, chapterName:x.chapterName || x.name, description:x.description })) };
}
function getChapterFeatures(d) {
  const all = rows('CHAPTER_LIST').filter(x => active(x) && String(x.chapterId) === String(d.chapterId));
  const features = [];
  const keys = [['lessonUrl','Lesson','📖'],['notesUrl','Notes','📚'],['mcqUrl','MCQ Test','📝'],['worksheetUrl','Worksheet','📄'],['answerWritingUrl','Answer Writing','✍️'],['videoUrl','Video','🎬'],['revisionUrl','Revision','🔁']];
  all.forEach(r => keys.forEach(k => { if (r[k[0]]) features.push({ featureName:k[1], icon:k[2], url:r[k[0]], type:k[1] }); }));
  return { success:true, features };
}
function getStudentProgress(d) {
  const p = rows('PROGRESS_TRACKER').find(x => String(x.studentId) === String(d.studentId));
  return { success:true, progress: p || { percent:0 } };
}
function logAccess(d) {
  try { append('ACCESS_LOGS', { logId:'LOG-' + Date.now(), timestamp:nowIst(), userId:d.userId, name:d.name, role:d.role, mobile:d.mobile, action:d.actionName || d.action, page:d.url, deviceId:d.deviceId }); } catch(e) {}
  return { success:true };
}
function adminDashboard() {
  return { success:true, totalStudents:rows('STUDENT_MASTER').length, totalTeachers:rows('TEACHER_MASTER').length, totalLogs:rows('ACCESS_LOGS').length };
}
function active(x) { return String(x.status || x.isActive || 'Active').toLowerCase() !== 'inactive' && String(x.status || '').toLowerCase() !== 'blocked'; }
function match(x, d) {
  return (!x.board || !d.board || String(x.board) === String(d.board)) && (!x.className || !d.className || String(x.className) === String(d.className)) && (!x.medium || !d.medium || String(x.medium) === String(d.medium));
}
