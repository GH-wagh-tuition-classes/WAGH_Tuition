/* ==========================================================================
   FILE: admission_leads.gs
   PURPOSE: Admission capture, diagnostic report attribution and secure Admin follow-up.
   VERSION: 1.3A
   SAFETY: additive migration only; never clears existing lead data.
============================================================================ */
var WTC_ADMISSION_LEAD_HEADERS=[
  'leadId','createdAt','studentName','parentMobile','className','board','medium','subject','preferredTime','source','status','notes','deviceId','pageUrl','consent','updatedAt','demoDate','followUpDate','chapterId','chapterName','diagnosticScore','diagnosticTotal','diagnosticPercent','weakTopics','diagnosticTakenAt',
  'performanceLevel','strongTopics','recommendedAction','reportRequestedAt','trafficSource','campaign','campaignMedium','campaignContent','referrer','landingPage','lastContactedAt','conversionUpdatedAt'
];
var WTC_ADMISSION_STATUSES=['NEW','CONTACTED','DEMO_BOOKED','JOINED','NOT_INTERESTED'];

function installAdmissionLeadSystem(){var sheet=ensureAdmissionLeadsSheet_();return{success:true,message:'ADMISSION_LEADS v1.3A conversion fields are ready.',sheetName:sheet.getName(),columns:sheet.getLastColumn()};}
function installAdmissionLeadAdminSystem(){return installAdmissionLeadSystem();}
function installAdmissionLeadDiagnosticSystem(){return installAdmissionLeadSystem();}
function installAdmissionLeadConversionSystem(){return installAdmissionLeadSystem();}

function saveAdmissionLead(d){
  d=d||{};
  var studentName=wtcLeadText_(d.studentName,80),parentMobile=String(d.parentMobile||'').replace(/\D/g,'');
  if(parentMobile.length===12&&parentMobile.indexOf('91')===0)parentMobile=parentMobile.slice(2);
  var className=wtcLeadText_(d.className,20),board=wtcLeadText_(d.board,20).toUpperCase(),medium=wtcLeadText_(d.medium,30),subject=wtcLeadText_(d.subject,60);
  var preferredTime=wtcLeadText_(d.preferredTime||'Any suitable time',40),source=wtcLeadText_(d.source||'DEMO_FORM',80),deviceId=wtcLeadText_(d.deviceId,100),pageUrl=wtcLeadText_(d.pageUrl,300);
  var consent=d.consent===true||['true','yes'].indexOf(String(d.consent||'').toLowerCase())!==-1;
  var chapterId=wtcLeadText_(d.chapterId,80),chapterName=wtcLeadText_(d.chapterName,160);
  var diagnosticTotal=wtcLeadInt_(d.diagnosticTotal,0,100),diagnosticScore=wtcLeadInt_(d.diagnosticScore,0,diagnosticTotal===''?100:diagnosticTotal);
  var diagnosticPercent=(diagnosticTotal!==''&&diagnosticTotal>0&&diagnosticScore!=='')?Math.round((diagnosticScore/diagnosticTotal)*100):'';
  var performanceLevel=diagnosticPercent===''?'':wtcAdmissionPerformanceLevel_(diagnosticPercent);
  var weakTopics=wtcLeadText_(d.weakTopics,500),strongTopics=wtcLeadText_(d.strongTopics,500),recommendedAction=wtcLeadText_(d.recommendedAction,600);
  var diagnosticTakenAt=wtcLeadText_(d.diagnosticTakenAt,50),reportRequestedAt=wtcLeadText_(d.reportRequestedAt,50);
  if(source==='DIAGNOSTIC_TEST'&&!reportRequestedAt)reportRequestedAt=new Date().toISOString();
  var trafficSource=wtcLeadText_(d.trafficSource||'Direct',80),campaign=wtcLeadText_(d.campaign,120),campaignMedium=wtcLeadText_(d.campaignMedium,80),campaignContent=wtcLeadText_(d.campaignContent,120),referrer=wtcLeadText_(d.referrer,160),landingPage=wtcLeadText_(d.landingPage||pageUrl,300);

  if(studentName.length<2)return{success:false,message:'Student name is required.'};
  if(!/^\d{10}$/.test(parentMobile))return{success:false,message:'Enter a valid 10-digit parent mobile number.'};
  if(['Class 5','Class 6','Class 7','Class 8','Class 9','Class 10'].indexOf(className)===-1)return{success:false,message:'Select a valid class.'};
  if(['CBSE','GSEB'].indexOf(board)===-1)return{success:false,message:'Select a valid board.'};
  if(['English Medium','Gujarati Medium'].indexOf(medium)===-1)return{success:false,message:'Select a valid medium.'};
  if(!subject)return{success:false,message:'Select a subject.'};
  if(!consent)return{success:false,message:'Contact consent is required.'};

  var cache=CacheService.getScriptCache();
  var rateIdentity=[parentMobile,(deviceId||'public').slice(0,40),(source||'direct').slice(0,40),(chapterId||'general').slice(0,40)].join('-').replace(/[^A-Za-z0-9_-]/g,'_');
  var rateKey='wtc-admission-'+rateIdentity;
  if(cache.get(rateKey))return{success:true,duplicate:true,message:'Your enquiry was already received recently.'};
  var lock=LockService.getScriptLock();if(!lock.tryLock(5000))return{success:false,message:'The enquiry service is busy. Please try again.'};
  try{
    ensureAdmissionLeadsSheet_();var timestamp=now();var leadId='LEAD-'+Utilities.formatDate(new Date(),IST,'yyyyMMdd-HHmmss')+'-'+Math.floor(100+Math.random()*900);
    append('ADMISSION_LEADS',{
      leadId:leadId,createdAt:timestamp,studentName:wtcLeadCell_(studentName),parentMobile:parentMobile,className:className,board:board,medium:medium,subject:wtcLeadCell_(subject),preferredTime:wtcLeadCell_(preferredTime),source:wtcLeadCell_(source),status:'NEW',notes:'',deviceId:wtcLeadCell_(deviceId),pageUrl:wtcLeadCell_(pageUrl),consent:'YES',updatedAt:timestamp,demoDate:'',followUpDate:'',chapterId:wtcLeadCell_(chapterId),chapterName:wtcLeadCell_(chapterName),diagnosticScore:diagnosticScore,diagnosticTotal:diagnosticTotal,diagnosticPercent:diagnosticPercent,weakTopics:wtcLeadCell_(weakTopics),diagnosticTakenAt:wtcLeadCell_(diagnosticTakenAt),performanceLevel:performanceLevel,strongTopics:wtcLeadCell_(strongTopics),recommendedAction:wtcLeadCell_(recommendedAction),reportRequestedAt:wtcLeadCell_(reportRequestedAt),trafficSource:wtcLeadCell_(trafficSource),campaign:wtcLeadCell_(campaign),campaignMedium:wtcLeadCell_(campaignMedium),campaignContent:wtcLeadCell_(campaignContent),referrer:wtcLeadCell_(referrer),landingPage:wtcLeadCell_(landingPage),lastContactedAt:'',conversionUpdatedAt:''
    });
    cache.put(rateKey,leadId,120);return{success:true,leadId:leadId,message:'Enquiry and report request saved successfully.'};
  }finally{lock.releaseLock();}
}

function adminGetAdmissionLeads(d){var request=d||{};wtcAdmissionRequireAdmin_(request);ensureAdmissionLeadsSheet_();var limit=Math.min(500,Math.max(1,Number(request.limit||300)));var all=rows('ADMISSION_LEADS').sort(function(a,b){return String(b.createdAt||'').localeCompare(String(a.createdAt||''));});return{success:true,leads:all.slice(0,limit).map(wtcAdmissionAdminView_),summary:wtcAdmissionSummary_(all),truncated:all.length>limit,totalAvailable:all.length};}

function adminUpdateAdmissionLead(d){
  var request=d||{},admin=wtcAdmissionRequireAdmin_(request),leadId=wtcLeadText_(request.leadId,80),status=String(request.status||'NEW').trim().toUpperCase(),notes=wtcLeadText_(request.notes,1000),demoDate=wtcLeadDate_(request.demoDate),followUpDate=wtcLeadDate_(request.followUpDate);
  if(!leadId)return{success:false,message:'Lead ID is required.'};if(WTC_ADMISSION_STATUSES.indexOf(status)===-1)return{success:false,message:'Select a valid lead status.'};
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    ensureAdmissionLeadsSheet_();var lead=rows('ADMISSION_LEADS').filter(function(item){return norm(item.leadId)===norm(leadId);})[0];if(!lead)return{success:false,message:'Admission lead not found.'};
    var timestamp=now(),statusChanged=String(lead.status||'NEW').toUpperCase()!==status,contactActivity=status!=='NEW'||notes||demoDate||followUpDate;
    var updates={status:status,notes:wtcLeadCell_(notes),demoDate:demoDate,followUpDate:followUpDate,updatedAt:timestamp};
    if(contactActivity)updates.lastContactedAt=timestamp;if(statusChanged)updates.conversionUpdatedAt=timestamp;
    updateRow('ADMISSION_LEADS',lead._row,updates);
    logAccess({userId:admin.adminId||admin.mobile,name:admin.name,role:'Admin',mobile:admin.mobile,actionName:'Admission Lead Updated',url:leadId+' → '+status,deviceId:request.deviceId});
    var refreshed=rows('ADMISSION_LEADS'),updated=refreshed.filter(function(item){return norm(item.leadId)===norm(leadId);})[0];
    return{success:true,message:'Admission follow-up saved.',lead:wtcAdmissionAdminView_(updated||{}),summary:wtcAdmissionSummary_(refreshed)};
  }finally{lock.releaseLock();}
}

function adminDashboardWithAdmissionLeads(d){var summary=typeof adminDashboardWithProfileRequests==='function'?adminDashboardWithProfileRequests(d||{}):adminDashboard(d||{});try{ensureAdmissionLeadsSheet_();var leadSummary=wtcAdmissionSummary_(rows('ADMISSION_LEADS'));summary.totalAdmissionLeads=leadSummary.TOTAL;summary.newAdmissionLeads=leadSummary.NEW;summary.overdueAdmissionLeads=leadSummary.OVERDUE;}catch(error){summary.totalAdmissionLeads=0;summary.newAdmissionLeads=0;summary.overdueAdmissionLeads=0;}return summary;}

function ensureAdmissionLeadsSheet_(){
  var spreadsheet=ss(),sheet=spreadsheet.getSheetByName('ADMISSION_LEADS');if(!sheet)sheet=spreadsheet.insertSheet('ADMISSION_LEADS');
  var lastColumn=Math.max(sheet.getLastColumn(),WTC_ADMISSION_LEAD_HEADERS.length),currentHeaders=sheet.getLastRow()>0?sheet.getRange(1,1,1,lastColumn).getValues()[0].map(String):[];
  var needsHeader=sheet.getLastRow()===0||currentHeaders.join('').trim()==='';
  if(needsHeader){sheet.getRange(1,1,1,WTC_ADMISSION_LEAD_HEADERS.length).setValues([WTC_ADMISSION_LEAD_HEADERS]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');sheet.setFrozenRows(1);sheet.autoResizeColumns(1,WTC_ADMISSION_LEAD_HEADERS.length);}else{var missing=WTC_ADMISSION_LEAD_HEADERS.filter(function(header){return currentHeaders.indexOf(header)===-1;});if(missing.length){var startColumn=sheet.getLastColumn()+1;sheet.getRange(1,startColumn,1,missing.length).setValues([missing]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');}}
  SpreadsheetApp.flush();if(typeof clearRowsCache_==='function')clearRowsCache_('ADMISSION_LEADS');return sheet;
}

function wtcAdmissionRequireAdmin_(d){if(typeof wtcProfileRequireAdmin_==='function')return wtcProfileRequireAdmin_(d||{});var request=d||{},adminId=norm(request.adminId),adminMobile=norm(request.adminMobile),adminPassword=norm(request.adminPassword);if(!adminPassword)throw new Error('Admin password is required.');var admin=rows('ADMIN_MASTER').filter(function(item){var identityMatches=(adminId&&norm(item.adminId)===adminId)||(adminMobile&&norm(item.mobile)===adminMobile);return identityMatches&&norm(item.password)===adminPassword;})[0];if(!admin)throw new Error('Admin password verification failed.');if(!active(admin))throw new Error('Admin account is not active.');return admin;}

function wtcAdmissionSummary_(items){
  var summary={TOTAL:0,NEW:0,CONTACTED:0,DEMO_BOOKED:0,JOINED:0,NOT_INTERESTED:0,DUE_TODAY:0,OVERDUE:0,DIAGNOSTIC:0,REPORT_REQUESTED:0,CONVERSION_RATE:0,TOP_TRAFFIC_SOURCE:'—',TOP_CAMPAIGN:'—'};
  var today=Utilities.formatDate(new Date(),IST,'yyyy-MM-dd'),sources={},campaigns={};
  (items||[]).forEach(function(item){var status=String(item.status||'NEW').trim().toUpperCase();if(WTC_ADMISSION_STATUSES.indexOf(status)===-1)status='NEW';summary.TOTAL+=1;summary[status]+=1;if(String(item.source||'').toUpperCase()==='DIAGNOSTIC_TEST'||Number(item.diagnosticTotal||0)>0)summary.DIAGNOSTIC+=1;if(String(item.reportRequestedAt||'').trim())summary.REPORT_REQUESTED+=1;var closed=status==='JOINED'||status==='NOT_INTERESTED',due=String(item.followUpDate||'').slice(0,10);if(!closed&&due){if(due===today)summary.DUE_TODAY+=1;else if(due<today)summary.OVERDUE+=1;}var source=String(item.trafficSource||item.source||'Direct').trim()||'Direct';sources[source]=(sources[source]||0)+1;var campaign=String(item.campaign||'').trim();if(campaign)campaigns[campaign]=(campaigns[campaign]||0)+1;});
  summary.CONVERSION_RATE=summary.TOTAL?Math.round((summary.JOINED/summary.TOTAL)*100):0;summary.TOP_TRAFFIC_SOURCE=wtcAdmissionTopKey_(sources)||'—';summary.TOP_CAMPAIGN=wtcAdmissionTopKey_(campaigns)||'—';return summary;
}
function wtcAdmissionTopKey_(map){return Object.keys(map||{}).sort(function(a,b){return Number(map[b]||0)-Number(map[a]||0)||String(a).localeCompare(String(b));})[0]||'';}
function wtcAdmissionPerformanceLevel_(percent){var value=Number(percent||0);if(value>=80)return'Excellent';if(value>=60)return'Good';if(value>=40)return'Developing';return'Foundation';}

function wtcAdmissionAdminView_(item){return{
  leadId:item.leadId||'',createdAt:item.createdAt||'',studentName:item.studentName||'',parentMobile:String(item.parentMobile||''),className:item.className||'',board:item.board||'',medium:item.medium||'',subject:item.subject||'',preferredTime:item.preferredTime||'',source:item.source||'DEMO_FORM',status:String(item.status||'NEW').toUpperCase(),notes:item.notes||'',pageUrl:item.pageUrl||'',consent:item.consent||'',updatedAt:item.updatedAt||'',demoDate:item.demoDate||'',followUpDate:item.followUpDate||'',chapterId:item.chapterId||'',chapterName:item.chapterName||'',diagnosticScore:item.diagnosticScore===''?'':Number(item.diagnosticScore||0),diagnosticTotal:item.diagnosticTotal===''?'':Number(item.diagnosticTotal||0),diagnosticPercent:item.diagnosticPercent===''?'':Number(item.diagnosticPercent||0),weakTopics:item.weakTopics||'',diagnosticTakenAt:item.diagnosticTakenAt||'',performanceLevel:item.performanceLevel||'',strongTopics:item.strongTopics||'',recommendedAction:item.recommendedAction||'',reportRequestedAt:item.reportRequestedAt||'',trafficSource:item.trafficSource||'Direct',campaign:item.campaign||'',campaignMedium:item.campaignMedium||'',campaignContent:item.campaignContent||'',referrer:item.referrer||'',landingPage:item.landingPage||'',lastContactedAt:item.lastContactedAt||'',conversionUpdatedAt:item.conversionUpdatedAt||''
};}
function wtcLeadDate_(value){var text=String(value||'').trim();if(!text)return'';if(!/^\d{4}-\d{2}-\d{2}$/.test(text))throw new Error('Dates must use YYYY-MM-DD format.');return text;}
function wtcLeadText_(value,maxLength){return String(value||'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,maxLength||200);}
function wtcLeadInt_(value,minValue,maxValue){if(value===''||value===null||value===undefined)return'';var number=Math.round(Number(value));if(!isFinite(number))return'';var minimum=(minValue===undefined||minValue===null||minValue==='')?0:Number(minValue),maximum=(maxValue===undefined||maxValue===null||maxValue==='')?100:Number(maxValue);return Math.max(minimum,Math.min(maximum,number));}
function wtcLeadCell_(value){var text=String(value||'');return/^[=+\-@]/.test(text)?"'"+text:text;}
