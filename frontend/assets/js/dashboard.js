(() => {
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const iconFor = (category) => ({ aptitude: 'bi-calculator', coding: 'bi-code-slash', coding_challenge: 'bi-braces', interview: 'bi-chat-square-text', resume: 'bi-file-earmark-text', aptitude_mock: 'bi-stopwatch', coding_mock: 'bi-stopwatch' }[category] || 'bi-check2-circle');
  const relativeDate = (value) => { if (!value) return ''; const date = new Date(value); return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

  function renderProgressModules(items) {
    $('progressModules').innerHTML = items.map((item) => `<div class="progress-module"><div class="progress-module-header"><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a><span class="progress-module-meta">${item.completed.toLocaleString()} / ${item.total.toLocaleString()}</span></div><div class="progress-track" role="progressbar" aria-valuenow="${item.value}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(item.label)}"><div class="progress-fill" style="width:${item.value}%"></div></div></div>`).join('');
  }

  function renderChart(days) {
    const max = Math.max(...days.map((day) => day.count), 1);
    $('activityChart').innerHTML = days.map((day) => `<div class="activity-bar-wrap"><span class="activity-bar-value">${day.count || ''}</span><div class="activity-bar" style="height:${Math.max(5, Math.round(day.count / max * 105))}px" title="${day.count} activities on ${day.date}"></div><span class="activity-bar-label">${escapeHtml(day.label)}</span></div>`).join('');
    $('chartEmpty').classList.toggle('d-none', days.some((day) => day.count > 0));
  }

  function renderRecommendations(items) {
    $('recommendations').innerHTML = items.length ? items.map((item) => `<a class="recommendation" href="${escapeHtml(item.href)}"><span class="recommendation-icon"><i class="bi bi-arrow-up-right"></i></span><span class="recommendation-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></span><i class="bi bi-chevron-right"></i></a>`).join('') : '<div class="empty-dashboard-note"><i class="bi bi-check-circle me-2"></i>You have covered the current recommendations. Keep your streak going.</div>';
  }

  function renderAchievements(items) {
    $('achievements').innerHTML = items.map((item) => `<div class="achievement ${item.earned ? 'earned' : ''}"><i class="achievement-icon bi ${item.earned ? 'bi-award-fill' : 'bi-lock'}"></i><span class="achievement-copy"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.description)}</span></span>${item.earned ? '<i class="bi bi-check-circle-fill text-success"></i>' : ''}</div>`).join('');
  }

  function renderRecent(items, count) {
    $('recentActivityCount').textContent = count ? `${count} recorded` : '';
    $('recentActivity').innerHTML = items.length ? items.map((item) => `<div class="activity-row"><span class="activity-copy"><span class="activity-icon"><i class="bi ${iconFor(item.category)}"></i></span><span><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.item_key)} · ${relativeDate(item.created_at)}</span></span></span><span class="activity-score">${item.score !== null && item.score !== undefined ? `${item.score}%` : ''}</span></div>`).join('') : '<div class="empty-dashboard-note"><i class="bi bi-clock-history me-2"></i>Your completed activities will appear here.</div>';
  }

  function renderDashboard(data) {
    $('dashboardUserName').textContent = data.user.name || 'Learner';
    $('overallProgress').textContent = `${data.overall_progress}%`;
    $('progressRing').style.background = `conic-gradient(var(--primary-color) ${data.overall_progress * 3.6}deg, var(--border-color) 0deg)`;
    $('progressRing').querySelector('span').textContent = `${data.overall_progress}%`;
    $('activeStreak').textContent = data.kpis.active_streak;
    $('activityCount').textContent = data.kpis.activity_count;
    $('questionsAnswered').textContent = data.kpis.questions_answered;
    $('correctAnswers').textContent = data.kpis.correct_answers;
    $('challengesCompleted').textContent = data.kpis.challenges_completed;
    $('resumeReviews').textContent = data.kpis.resume_reviews;
    renderProgressModules(data.progress); renderChart(data.daily_activity); renderRecommendations(data.recommendations); renderAchievements(data.achievements); renderRecent(data.recent_activity, data.kpis.activity_count);
    $('newUserNotice').classList.toggle('d-none', !data.is_new_user);
    $('dashboardLoading').classList.add('d-none'); $('dashboardContent').classList.remove('d-none');
  }

  async function loadDashboard() {
    $('dashboardLoading').classList.remove('d-none'); $('dashboardError').classList.add('d-none');
    const token = getAuthToken();
    if (!token) { $('dashboardLoading').classList.add('d-none'); $('dashboardLoggedOut').classList.remove('d-none'); return; }
    try {
      const response = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Please try again.');
      renderDashboard(data);
    } catch (error) { $('dashboardLoading').classList.add('d-none'); $('dashboardErrorMessage').textContent = error.message || 'Please try again.'; $('dashboardError').classList.remove('d-none'); }
  }

  document.addEventListener('DOMContentLoaded', () => { loadAuthModals(); checkAuth(); loadDashboard(); $('retryDashboard').addEventListener('click', loadDashboard); });
})();
