(() => {
  const allowedExtensions = ['pdf', 'doc', 'docx'];
  const maxFileSize = 5 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);
  const token = () => getAuthToken();

  const escapeText = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const scoreClass = (score) => score >= 80 ? 'strong' : score >= 60 ? 'steady' : 'needs-work';
  const listBlock = (title, icon, items, tone) => {
    if (!Array.isArray(items) || !items.length) return '';
    return `<section class="feedback-block ${tone || ''}"><div class="feedback-title"><span class="feedback-icon"><i class="bi ${icon}"></i></span><h3>${title}</h3><span class="feedback-count">${items.length}</span></div><ul>${items.map((item) => `<li>${escapeText(item)}</li>`).join('')}</ul></section>`;
  };

  function showError(message) {
    const box = $('analysisError');
    box.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i><span>${escapeText(message)}</span>`;
    box.classList.remove('d-none');
  }

  function clearError() { $('analysisError').classList.add('d-none'); }

  function setSelectedFile(file) {
    const name = $('analysisFileName');
    if (!file) {
      name.classList.add('d-none');
      name.querySelector('span').textContent = '';
      return;
    }
    name.querySelector('span').textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    name.classList.remove('d-none');
  }

  function validateFile(file) {
    if (!file) return 'Choose a PDF, DOC, or DOCX file first.';
    const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    if (!allowedExtensions.includes(extension)) return 'This file type is not supported. Upload a PDF, DOC, or DOCX resume.';
    if (file.size === 0) return 'This file is empty. Choose a resume with readable content.';
    if (file.size > maxFileSize) return 'This file is too large. Resume uploads must be 5 MB or smaller.';
    return '';
  }

  function renderReview(review) {
    const overall = Number(review.overall_score) || 0;
    const ats = Number(review.ats_readability_score) || 0;
    const overallAngle = Math.round(overall * 3.6);
    $('reviewResult').innerHTML = `<div class="result-card"><div class="result-heading"><div><span class="section-label">02 / Results</span><h2>Your resume snapshot</h2><p>Here is what the reviewer noticed, with the highest-impact fixes first.</p></div><span class="review-badge"><i class="bi bi-check2-circle"></i> AI review complete</span></div><div class="score-summary"><div class="main-score"><div class="score-ring ${scoreClass(overall)}" style="--score-angle:${overallAngle}deg"><div><strong>${overall}</strong><span>/ 100</span></div></div><div><h3>Overall score</h3><p>How ready your resume is for a first review.</p></div></div><div class="metric-card"><div class="metric-top"><span>ATS &amp; readability</span><strong>${ats}<small>/100</small></strong></div><div class="metric-track"><span style="width:${ats}%"></span></div><p>Structure, scanability, and parsing signal.</p></div><div class="metric-card metric-card-soft"><div class="metric-top"><span>Review focus</span><i class="bi bi-lightbulb"></i></div><p>Use the suggestions below to turn this score into a stronger application.</p></div></div><div class="feedback-grid">${listBlock('Strengths', 'bi-check2', review.strengths, 'positive')}${listBlock('Weaknesses', 'bi-arrow-down-right', review.weaknesses, 'negative')}${listBlock('Missing or improvable sections', 'bi-layout-text-sidebar-reverse', review.missing_sections, 'warning')}${listBlock('Specific suggestions', 'bi-arrow-up-right', review.suggestions, 'action')}</div></div>`;
    $('reviewEmpty').classList.add('d-none');
    $('analysisLoading').classList.add('d-none');
    $('reviewResult').classList.remove('d-none');
  }

  async function analyze() {
    clearError();
    const file = $('analysisFile').files[0];
    const validationMessage = validateFile(file);
    if (validationMessage) { showError(validationMessage); return; }
    $('analyzeButton').disabled = true;
    $('reviewEmpty').classList.add('d-none');
    $('reviewResult').classList.add('d-none');
    $('analysisLoading').classList.remove('d-none');
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch('/api/resume/analyze', { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: form });
      let data;
      try { data = await response.json(); } catch { throw new Error('The server returned an invalid response. Please try again.'); }
      if (!response.ok || !data.success || !data.review) throw new Error(data.message || 'Resume analysis failed. Please try again.');
      renderReview(data.review);
    } catch (error) {
      $('analysisLoading').classList.add('d-none');
      $('reviewEmpty').classList.remove('d-none');
      showError(error.message || 'Resume analysis failed. Please try again.');
    } finally { $('analyzeButton').disabled = false; }
  }

  function chooseFile(file) {
    if (!file) return;
    clearError();
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    $('analysisFile').files = dataTransfer.files;
    setSelectedFile(file);
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadAuthModals();
    checkAuth();
    if (!token()) $('notLoggedIn').classList.remove('d-none');
    else $('resumeWorkspace').classList.remove('d-none');

    const input = $('analysisFile');
    const zone = $('uploadZone');
    input.addEventListener('change', () => { const file = input.files[0]; setSelectedFile(file); clearError(); });
    $('clearFileButton').addEventListener('click', () => { input.value = ''; setSelectedFile(null); clearError(); });
    $('analyzeButton').addEventListener('click', analyze);
    zone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
    ['dragenter', 'dragover'].forEach((eventName) => zone.addEventListener(eventName, (event) => { event.preventDefault(); zone.classList.add('is-dragging'); }));
    ['dragleave', 'drop'].forEach((eventName) => zone.addEventListener(eventName, (event) => { event.preventDefault(); zone.classList.remove('is-dragging'); }));
    zone.addEventListener('drop', (event) => chooseFile(event.dataTransfer.files[0]));
  });
})();