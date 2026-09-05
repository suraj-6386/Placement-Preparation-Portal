(() => {
  const $ = (id) => document.getElementById(id);
  const token = () => getAuthToken();
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  let hrQuestions = [];
  let technicalCategories = [];
  let selectedCategory = '';
  let selectedDifficulty = 'Basic';

  function showError(message) {
    const box = $('interviewError'); box.textContent = message; box.classList.remove('d-none');
  }
  function clearError() { $('interviewError').classList.add('d-none'); }
  function requireLogin() { if (!token()) { showError('Please log in to use Gemini answer evaluation and best-answer generation.'); return false; } return true; }
  function buttonLoading(button, loading) { button.disabled = loading; button.dataset.originalText ||= button.innerHTML; button.innerHTML = loading ? '<span class="spinner-border spinner-border-sm me-2"></span>Working...' : button.dataset.originalText; }

  function resultHtml(result, best = false) {
    if (best) return `<div class="ai-result"><h4><i class="bi bi-stars me-2"></i>Suggested answer</h4><p>${escapeHtml(result.answer).replace(/\n/g, '<br>')}</p>${result.tips?.length ? `<h4>Make it yours</h4><ul>${result.tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>` : ''}</div>`;
    return `<div class="ai-result"><div class="ai-score"><strong>${result.score}/100</strong><span class="text-muted small">AI answer review</span></div><h4>Feedback</h4><p>${escapeHtml(result.feedback)}</p>${result.strengths?.length ? `<h4>What worked</h4><ul>${result.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}${result.improvements?.length ? `<h4>Improve next</h4><ul>${result.improvements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</div>`;
  }

  async function callInterviewAI(endpoint, payload) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Interview AI is unavailable.');
    return data;
  }

  function attachAnswerActions(container, questions, category, difficulty) {
    container.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', async () => {
      clearError(); if (!requireLogin()) return;
      const index = Number(button.dataset.index); const question = questions[index]; const answer = container.querySelector(`[data-answer="${index}"]`).value.trim();
      if (button.dataset.action === 'evaluate' && !answer) { showError('Write an answer before checking it.'); return; }
      buttonLoading(button, true);
      try {
        const result = await callInterviewAI(button.dataset.action === 'evaluate' ? '/api/interview/evaluate' : '/api/interview/best-answer', { question, answer, category, difficulty });
        container.querySelector(`[data-result="${index}"]`).innerHTML = resultHtml(result, button.dataset.action !== 'evaluate');
      } catch (error) { showError(error.message || 'Interview AI is unavailable.'); }
      finally { buttonLoading(button, false); }
    }));
  }

  function renderQuestions(container, questions, category, difficulty) {
    container.innerHTML = questions.map((question, index) => `<article class="interview-card" data-card="${index}"><button class="interview-question-button" type="button" data-toggle="${index}"><span class="question-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(question)}</span><i class="bi bi-chevron-down question-chevron"></i></button><div class="interview-answer"><label class="form-label" for="answer-${category}-${difficulty}-${index}">Your answer</label><textarea class="form-control answer-textarea" data-answer="${index}" id="answer-${category}-${difficulty}-${index}" placeholder="Write your answer naturally. Use a specific example where possible."></textarea><div class="answer-actions"><span class="text-muted small"><i class="bi bi-shield-lock me-1"></i>Evaluated privately for your session</span><span class="d-flex gap-2"><button class="btn btn-outline-primary" type="button" data-action="best" data-index="${index}"><i class="bi bi-stars me-1"></i>View Best Answer</button><button class="btn btn-primary" type="button" data-action="evaluate" data-index="${index}"><i class="bi bi-check2-circle me-1"></i>Check Answer</button></span></div><div data-result="${index}"></div></div></article>`).join('');
    container.querySelectorAll('[data-toggle]').forEach((button) => button.addEventListener('click', () => { const card = button.closest('.interview-card'); card.classList.toggle('open'); }));
    attachAnswerActions(container, questions, category, difficulty);
  }

  async function loadHR() {
    const container = $('hrQuestions');
    try { const response = await fetch('/api/interview/hr'); hrQuestions = await response.json(); $('hrCount').textContent = `${hrQuestions.length} questions`; renderQuestions(container, hrQuestions, 'HR', 'General'); }
    catch (error) { container.innerHTML = '<div class="empty-state-interview">Unable to load HR questions. Please refresh and try again.</div>'; }
  }

  function renderCategories() {
    $('technicalCategories').innerHTML = technicalCategories.map((category) => `<button class="tech-category-card ${category === selectedCategory ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}"><strong>${escapeHtml(category)}</strong><span>Basic · Medium · Hard</span></button>`).join('');
    $('technicalCategories').querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { selectedCategory = button.dataset.category; renderCategories(); loadTechnicalQuestions(); }));
  }

  async function loadTechnicalQuestions() {
    if (!selectedCategory) return;
    const container = $('technicalQuestions'); $('technicalTitle').textContent = selectedCategory; $('technicalLoading').classList.remove('d-none'); container.innerHTML = '';
    try {
      const response = await fetch(`/api/interview/questions?category=${encodeURIComponent(selectedCategory)}&difficulty=${encodeURIComponent(selectedDifficulty)}`); const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Question bank could not be loaded.');
      $('technicalSource').textContent = data.source === 'ai-cache' ? 'Cached AI question bank' : data.source === 'ai' ? 'AI-generated question bank' : 'Prepared fallback question bank';
      $('technicalCount').textContent = `${data.questions.length} questions`; renderQuestions(container, data.questions, selectedCategory, selectedDifficulty); if (typeof recordActivity === 'function') recordActivity('interview_viewed', 'interview', `${selectedCategory}-${selectedDifficulty}`);
    } catch (error) { showError(error.message || 'Question bank could not be loaded.'); container.innerHTML = '<div class="empty-state-interview">Question bank unavailable. Try another difficulty or retry.</div>'; }
    finally { $('technicalLoading').classList.add('d-none'); }
  }

  async function loadCatalog() {
    try { const response = await fetch('/api/interview/catalog'); const data = await response.json(); technicalCategories = (data.categories || []).filter((category) => category !== 'Go'); selectedCategory = technicalCategories[0] || ''; renderCategories(); loadTechnicalQuestions(); }
    catch (error) { showError('Technical categories could not be loaded.'); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadAuthModals(); checkAuth(); loadHR(); loadCatalog();
    document.querySelectorAll('[data-interview-tab]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-interview-tab]').forEach((item) => item.classList.remove('active')); document.querySelectorAll('.interview-view').forEach((view) => view.classList.add('d-none')); button.classList.add('active'); $(button.dataset.interviewTab).classList.remove('d-none'); }));
    document.querySelectorAll('[data-difficulty]').forEach((button) => button.addEventListener('click', () => { selectedDifficulty = button.dataset.difficulty; document.querySelectorAll('[data-difficulty]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); loadTechnicalQuestions(); }));
  });
})();
