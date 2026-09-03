// Practice Tab - Complete Implementation
// State Management
let practiceData = {};
let currentChapter = null;
let currentQuestions = [];
let filteredQuestions = [];
let currentPage = 1;
const questionsPerPage = 10;
let selectedQuestion = null;

// Chapter themes with icons and colors
const chapterThemes = {
  'Number System': { icon: '🔢', color: '#3b82f6', bgColor: '#eff6ff' },
  'Percentage & Ratio': { icon: '📊', color: '#8b5cf6', bgColor: '#f5f3ff' },
  'Profit & Loss': { icon: '💰', color: '#10b981', bgColor: '#ecfdf5' },
  'Time & Work': { icon: '⏱️', color: '#f59e0b', bgColor: '#fffbeb' },
  'Time & Distance': { icon: '🚗', color: '#ef4444', bgColor: '#fef2f2' },
  'Simple & Compound Interest': { icon: '💵', color: '#06b6d4', bgColor: '#ecfeff' },
  'Average': { icon: '📈', color: '#84cc16', bgColor: '#f7fee7' },
  'Algebra': { icon: '🔤', color: '#ec4899', bgColor: '#fdf2f8' },
  'Geometry': { icon: '📐', color: '#6366f1', bgColor: '#eef2ff' },
  'Probability': { icon: '🎲', color: '#14b8a6', bgColor: '#f0fdfa' },
  'Permutation & Combination': { icon: '🔀', color: '#f97316', bgColor: '#fff7ed' },
  'Statistics': { icon: '📉', color: '#06b6d4', bgColor: '#ecfeff' },
  'default': { icon: '📚', color: '#6b7280', bgColor: '#f9fafb' }
};

/**
 * Load practice data from API with caching
 */
async function loadPracticeData() {
  try {
    // Check if data is cached in localStorage
    const cachedData = localStorage.getItem('practiceDataCache');
    const cacheTimestamp = localStorage.getItem('practiceDataCacheTime');
    const currentTime = new Date().getTime();
    
    // Cache for 1 hour
    if (cachedData && cacheTimestamp && (currentTime - cacheTimestamp < 3600000)) {
      practiceData = JSON.parse(cachedData);
      console.log('Loaded practice data from cache');
    } else {
      // Fetch fresh data
      practiceData = await fetchAPI("/api/aptitude/practice");
      localStorage.setItem('practiceDataCache', JSON.stringify(practiceData));
      localStorage.setItem('practiceDataCacheTime', currentTime.toString());
      console.log('Loaded practice data from API');
    }
    
    renderChapterCards();
  } catch (error) {
    console.error('Error loading practice data:', error);
    if (typeof showToast === 'function') {
      showToast('Failed to load practice data. Please refresh the page.', 'danger');
    }
  }
}

/**
 * Render chapter cards in grid layout
 */
function renderChapterCards() {
  const container = document.getElementById("practiceChapters");
  const totalChaptersCount = document.getElementById("totalChaptersCount");
  
  if (!container || !totalChaptersCount) {
    console.error('Chapter containers not found');
    return;
  }
  
  const chapters = Object.keys(practiceData);
  totalChaptersCount.textContent = `${chapters.length} Chapters`;
  
  container.innerHTML = "";
  
  if (chapters.length === 0) {
    container.innerHTML = '<div class="col-12"><div class="alert alert-warning">No chapters available at the moment.</div></div>';
    return;
  }
  
  chapters.forEach(chapter => {
    const questions = practiceData[chapter];
    const theme = chapterThemes[chapter] || chapterThemes['default'];
    const questionCount = questions.length;
    
    // Calculate difficulty distribution
    const easyCount = Math.ceil(questionCount * 0.25);
    const moderateCount = Math.ceil(questionCount * 0.30);
    const hardCount = questionCount - easyCount - moderateCount;
    
    const chapterCard = document.createElement('div');
    chapterCard.className = 'col-12 col-md-6 col-lg-4';
    chapterCard.innerHTML = `
      <div class="chapter-card" 
           onclick="openChapter('${escapeHtml(chapter)}')" 
           role="button"
           tabindex="0"
           aria-label="Open ${escapeHtml(chapter)} chapter with ${questionCount} questions"
           style="border-left: 4px solid ${theme.color}; background: ${theme.bgColor};">
        <div class="chapter-icon" style="background: ${theme.color};">${theme.icon}</div>
        <div class="chapter-info">
          <h5 class="chapter-name">${escapeHtml(chapter)}</h5>
          <div class="chapter-meta">
            <span class="question-count">${questionCount} Questions</span>
            <div class="difficulty-badges mt-2">
              <span class="badge bg-success badge-sm">${easyCount} Easy</span>
              <span class="badge bg-warning badge-sm">${moderateCount} Moderate</span>
              <span class="badge bg-danger badge-sm">${hardCount} Hard</span>
            </div>
          </div>
        </div>
        <div class="chapter-arrow">→</div>
      </div>
    `;
    
    // Add keyboard support
    const card = chapterCard.querySelector('.chapter-card');
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openChapter(chapter);
      }
    });
    
    container.appendChild(chapterCard);
  });
}

/**
 * Open a specific chapter and show questions
 */
function openChapter(chapterName) {
  currentChapter = chapterName;
  currentQuestions = practiceData[chapterName] || [];
  
  if (currentQuestions.length === 0) {
    alert('No questions available for this chapter.');
    return;
  }
  
  // Reset filters and pagination
  currentPage = 1;
  const difficultyFilter = document.getElementById('difficultyFilter');
  const questionSearch = document.getElementById('questionSearch');
  
  if (difficultyFilter) difficultyFilter.value = '';
  if (questionSearch) questionSearch.value = '';
  
  // Add difficulty level to each question based on position
  currentQuestions = currentQuestions.map((q, idx) => {
    const total = currentQuestions.length;
    const easyThreshold = Math.ceil(total * 0.25);
    const moderateThreshold = easyThreshold + Math.ceil(total * 0.30);
    
    let difficulty = 'hard';
    if (idx < easyThreshold) difficulty = 'easy';
    else if (idx < moderateThreshold) difficulty = 'moderate';
    
    return { ...q, difficulty };
  });
  
  filteredQuestions = [...currentQuestions];
  
  // Update UI
  document.getElementById('chapterCardsView').style.display = 'none';
  document.getElementById('chapterDetailsView').style.display = 'block';
  document.getElementById('chapterTitle').textContent = chapterName;
  
  updateQuestionStats();
  renderQuestionList();
  renderPagination();
  
  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Go back to chapter cards view
 */
function backToChapters() {
  document.getElementById('chapterCardsView').style.display = 'block';
  document.getElementById('chapterDetailsView').style.display = 'none';
  currentChapter = null;
  closeQuestionModal();
}

/**
 * Update statistics display
 */
function updateQuestionStats() {
  const stats = document.getElementById('questionStats');
  const chapterStats = document.getElementById('chapterStats');
  
  const total = currentQuestions.length;
  const filtered = filteredQuestions.length;
  const easy = filteredQuestions.filter(q => q.difficulty === 'easy').length;
  const moderate = filteredQuestions.filter(q => q.difficulty === 'moderate').length;
  const hard = filteredQuestions.filter(q => q.difficulty === 'hard').length;
  
  chapterStats.textContent = `${filtered} of ${total} questions`;
  
  stats.innerHTML = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div><strong>Showing:</strong> ${filtered} questions</div>
      <div class="d-flex gap-2">
        <span class="badge bg-success">${easy} Easy</span>
        <span class="badge bg-warning text-dark">${moderate} Moderate</span>
        <span class="badge bg-danger">${hard} Hard</span>
      </div>
    </div>
  `;
}

/**
 * Render paginated question list
 */
function renderQuestionList() {
  const container = document.getElementById('questionList');
  const startIdx = (currentPage - 1) * questionsPerPage;
  const endIdx = startIdx + questionsPerPage;
  const pageQuestions = filteredQuestions.slice(startIdx, endIdx);
  
  if (pageQuestions.length === 0) {
    container.innerHTML = '<div class="alert alert-warning">No questions found matching your criteria.</div>';
    return;
  }
  
  container.innerHTML = '';
  
  pageQuestions.forEach((q, idx) => {
    const globalIdx = startIdx + idx;
    const difficultyClass = q.difficulty === 'easy' ? 'success' : q.difficulty === 'moderate' ? 'warning text-dark' : 'danger';
    
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    questionItem.setAttribute('data-question-id', q.id);
    
    questionItem.innerHTML = `
      <div class="question-header">
        <div class="d-flex align-items-start gap-3 flex-grow-1">
          <span class="question-number">${globalIdx + 1}</span>
          <div class="flex-grow-1">
            <div class="question-text">${escapeHtml(q.question)}</div>
          </div>
          <span class="badge bg-${difficultyClass} difficulty-badge">${q.difficulty}</span>
        </div>
      </div>
      <div class="question-actions">
        <button class="btn btn-sm btn-primary" onclick="openQuestionModal(${globalIdx})" aria-label="Practice question ${globalIdx + 1}">
          Practice
        </button>
      </div>
    `;
    
    container.appendChild(questionItem);
  });
}

/**
 * Render pagination controls
 */
function renderPagination() {
  const container = document.getElementById('pagination');
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let paginationHTML = '';
  
  // Previous button
  paginationHTML += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>
  `;
  
  // Page numbers with ellipsis
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1); return false;">1</a></li>`;
    if (startPage > 2) paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
  }
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
      </li>
    `;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a></li>`;
  }
  
  // Next button
  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>
  `;
  
  container.innerHTML = paginationHTML;
}

/**
 * Change to specific page
 */
function changePage(page) {
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderQuestionList();
  renderPagination();
  
  // Scroll to question list
  const questionList = document.getElementById('questionList');
  if (questionList) {
    questionList.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Apply search and filter
 */
function applyFilters() {
  const searchInput = document.getElementById('questionSearch');
  const difficultyFilter = document.getElementById('difficultyFilter');
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const difficultyValue = difficultyFilter ? difficultyFilter.value : '';
  
  filteredQuestions = currentQuestions.filter(q => {
    const matchesSearch = !searchTerm || 
      q.question.toLowerCase().includes(searchTerm) ||
      q.options.some(opt => opt.toLowerCase().includes(searchTerm));
    
    const matchesDifficulty = !difficultyValue || q.difficulty === difficultyValue;
    
    return matchesSearch && matchesDifficulty;
  });
  
  currentPage = 1;
  updateQuestionStats();
  renderQuestionList();
  renderPagination();
}

/**
 * Open question in modal for practice
 */
function openQuestionModal(questionIndex) {
  selectedQuestion = filteredQuestions[questionIndex];
  
  if (!selectedQuestion) {
    console.error('Question not found');
    return;
  }
  
  const modal = document.createElement('div');
  modal.id = 'questionModal';
  modal.className = 'question-modal-overlay';
  modal.innerHTML = `
    <div class="question-modal" role="dialog" aria-labelledby="modalQuestionTitle" aria-modal="true">
      <div class="modal-header-custom">
        <h5 id="modalQuestionTitle">Question ${questionIndex + 1}</h5>
        <button class="btn-close-custom" onclick="closeQuestionModal()" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body-custom">
        <div class="question-text-large">${escapeHtml(selectedQuestion.question)}</div>
        <div class="difficulty-badge-large">
          <span class="badge bg-${selectedQuestion.difficulty === 'easy' ? 'success' : selectedQuestion.difficulty === 'moderate' ? 'warning text-dark' : 'danger'}">
            ${selectedQuestion.difficulty.toUpperCase()}
          </span>
        </div>
        <div class="options-container" id="modalOptions">
          ${selectedQuestion.options.map((opt, i) => `
            <div class="option-item">
              <input 
                type="radio" 
                name="modalAnswer" 
                id="option_${i}" 
                value="${escapeHtml(opt)}" 
                class="option-radio"
              />
              <label for="option_${i}" class="option-label">${escapeHtml(opt)}</label>
            </div>
          `).join('')}
        </div>
        <div id="modalResult" class="modal-result"></div>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick="checkModalAnswer()">Submit Answer</button>
          <button class="btn btn-outline-secondary" onclick="showAnswer()">Show Answer</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  // Accessibility: focus on close button
  setTimeout(() => {
    const closeBtn = modal.querySelector('.btn-close-custom');
    if (closeBtn) closeBtn.focus();
  }, 100);
  
  // Close on Escape key
  modal.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeQuestionModal();
  });
  
  // Close on overlay click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeQuestionModal();
  });
}

/**
 * Close question modal
 */
function closeQuestionModal() {
  const modal = document.getElementById('questionModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
  selectedQuestion = null;
}

/**
 * Check submitted answer
 */
function checkModalAnswer() {
  const selected = document.querySelector('input[name="modalAnswer"]:checked');
  const resultDiv = document.getElementById('modalResult');
  
  if (!selected) {
    resultDiv.innerHTML = '<div class="alert alert-warning">⚠️ Please select an answer first.</div>';
    return;
  }
  
  const isCorrect = selected.value === selectedQuestion.answer;
  
  if (isCorrect) {
    resultDiv.innerHTML = `
      <div class="alert alert-success">
        <strong>✓ Correct!</strong> Well done! You got it right.
      </div>
    `;
  } else {
    resultDiv.innerHTML = `
      <div class="alert alert-danger">
        <strong>✗ Incorrect.</strong> The correct answer is: <strong>${escapeHtml(selectedQuestion.answer)}</strong>
      </div>
    `;
  }
  
  // Disable all options after submission
  document.querySelectorAll('input[name="modalAnswer"]').forEach(input => {
    input.disabled = true;
    if (input.value === selectedQuestion.answer) {
      input.parentElement.classList.add('correct-answer');
    }
  });
}

/**
 * Show correct answer without submitting
 */
function showAnswer() {
  const resultDiv = document.getElementById('modalResult');
  resultDiv.innerHTML = `
    <div class="alert alert-info">
      <strong>💡 Answer:</strong> ${escapeHtml(selectedQuestion.answer)}
    </div>
  `;
  
  // Highlight correct answer
  document.querySelectorAll('input[name="modalAnswer"]').forEach(input => {
    if (input.value === selectedQuestion.answer) {
      input.parentElement.classList.add('correct-answer');
    }
  });
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Initialize event listeners when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('questionSearch');
  const difficultyFilter = document.getElementById('difficultyFilter');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(applyFilters, 300));
  }
  
  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', applyFilters);
  }
});

// Export functions for use in HTML
window.loadPracticeData = loadPracticeData;
window.openChapter = openChapter;
window.backToChapters = backToChapters;
window.changePage = changePage;
window.openQuestionModal = openQuestionModal;
window.closeQuestionModal = closeQuestionModal;
window.checkModalAnswer = checkModalAnswer;
window.showAnswer = showAnswer;
