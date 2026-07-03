document.addEventListener('DOMContentLoaded', initAdminDashboard);

async function initAdminDashboard() {
  const user = WTC_AUTH.requireRole('Admin');
  if (!user) return;

  fillAdminHeader(user);
  await loadAdminDashboardStats();
}

function fillAdminHeader(user) {
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = user.name || 'Admin';
  });

  document.querySelectorAll('[data-user-avatar]').forEach(el => {
    el.textContent = WTC_UI.initials(user.name || 'Admin');
  });
}

async function loadAdminDashboardStats() {
  try {
    const data = await WTC_API.call({ action: 'adminDashboard' });

    document.getElementById('studentTotal').textContent = data.totalStudents || 0;
    document.getElementById('teacherTotal').textContent = data.totalTeachers || 0;
    document.getElementById('logTotal').textContent = data.totalLogs || 0;
  } catch (err) {
    WTC_UI.toast(err.message || 'Admin dashboard failed to load.', 'error');
  }
}
