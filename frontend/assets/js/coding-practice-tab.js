/**
 * Coding Practice Tab - Complete Implementation
 * Identical UI/UX to Aptitude Practice with coding-specific data
 */

// State Management
let codingPracticeData = {};
let currentCodingChapter = null;
let currentCodingQuestions = [];
let filteredCodingQuestions = [];
let currentCodingPage = 1;
const codingQuestionsPerPage = 10;
let selectedCodingQuestion = null;
let codingPracticeModal = null;

// Language/Chapter themes with icons and colors
const codingChapterThemes = {
  'Python': { icon: '🐍', color: '#3776AB', bgColor: '#e3f2fd' },
  'Java': { icon: '☕', color: '#007396', bgColor: '#fff3e0' },
  'JavaScript': { icon: '📜', color: '#F7DF1E', bgColor: '#fffde7' },
  'C': { icon: '©️', color: '#A8B9CC', bgColor: '#e8eaf6' },
  'C++': { icon: '⚡', color: '#00599C', bgColor: '#e1f5fe' },
  'PHP': { icon: '🐘', color: '#777BB4', bgColor: '#f3e5f5' },
  'CSharp': { icon: '#️⃣', color: '#239120', bgColor: '#e8f5e9' },
  'SQL': { icon: '🗄️', color: '#336791', bgColor: '#e0f2f1' },
  'HTML': { icon: '🌐', color: '#E34F26', bgColor: '#ffebee' },
  'CSS': { icon: '🎨', color: '#1572B6', bgColor: '#e3f2fd' },
  'React': { icon: '⚛️', color: '#61DAFB', bgColor: '#e0f7fa' },
  'Node.js': { icon: '🟢', color: '#339933', bgColor: '#e8f5e9' },
  'default': { icon: '💻', color: '#6b7280', bgColor: '#f9fafb' }
};

/**
 * Load coding practice data from API with caching
 */
async function loadCodingPracticeData() {
  try {
    // Check if data is cached in localStorage
    const cachedData = localStorage.getItem('codingPracticeDataCache');
    const cacheTimestamp = localStorage.getItem('codingPracticeDataCacheTime');
    const currentTime = new Date().getTime();
    
    // Cache for 1 hour
    if (cachedData && cacheTimestamp && (currentTime - cacheTimestamp < 3600000)) {
      codingPracticeData = JSON.parse(cachedData);
      console.log('Loaded coding practice data from cache');
    } else {
      // Fetch fresh data
      codingPracticeData = await fetchAPI("/api/coding/practice");
      localStorage.setItem('codingPracticeDataCache', JSON.stringify(codingPracticeData));
      localStorage.setItem('codingPracticeDataCacheTime', currentTime.toString());
      console.log('Loaded coding practice data from API');
    }
    
    renderCodingChapterCards();
  } catch (error) {
    console.error('Error loading coding practice data:', error);
    showCodingPracticeError('Failed to load practice data. Please try again.');
  }
}

/**
 * Refresh data (clear cache and reload)
 */
function refreshCodingPractice() {
  localStorage.removeItem('codingPracticeDataCache');
  localStorage.removeItem('codingPracticeDataCacheTime');
  loadCodingPracticeData();
}

/**
 * Render chapter cards
 */
function renderCodingChapterCards() {
  const container = document.getElementById('codingPracticeChapterCards');
  if (!container) return;
  
  container.innerHTML = '';
  
  const chapters = Object.keys(codingPracticeData);
  
  if (chapters.length === 0) {
    container.innerHTML = '<div class="col-12"><p class="text-center text-muted">No practice questions available.</p></div>';
    return;
  }
  
  chapters.forEach(chapter => {
    const questions = codingPracticeData[chapter];
    const questionCount = questions.length;
    const theme = codingChapterThemes[chapter] || codingChapterThemes['default'];
    
    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4';
    card.innerHTML = `
      <div class="chapter-card" style="background-color: ${theme.bgColor}; border-left: 4px solid ${theme.color};">
        <div class="chapter-card-icon" style="color: ${theme.color};">${theme.icon}</div>
        <h5 class="chapter-card-title">${chapter}</h5>
        <div class="chapter-card-stats">
          <span class="badge bg-primary">${questionCount} Questions</span>
          <span class="badge bg-secondary">Easy → Hard</span>
        </div>
        <button 
          class="btn btn-sm mt-3" 
          style="background-color: ${theme.color}; color: white; border: none;"
          onclick="openCodingChapter('${chapter}')"
          aria-label="Open ${chapter} practice questions"
        >
          Start Practice <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Open a chapter
 */
function openCodingChapter(chapter) {
  currentCodingChapter = chapter;
  currentCodingQuestions = codingPracticeData[chapter] || [];
  
  // Assign difficulty based on question order if not present
  currentCodingQuestions = currentCodingQuestions.map((q, index) => {
    if (!q.difficulty) {
      const total = currentCodingQuestions.length;
      if (index < total * 0.25) {
        q.difficulty = 'Easy';
      } else if (index < total * 0.55) {
        q.difficulty = 'Moderate';
      } else {
        q.difficulty = 'Hard';
      }
    }
    return q;
  });
  
  // Reset filters
  document.getElementById('codingPracticeSearchInput').value = '';
  document.getElementById('codingPracticeDifficultyFilter').value = 'all';
  currentCodingPage = 1;
  
  // Update UI
  document.getElementById('codingPracticeChapterCardsView').style.display = 'none';
  document.getElementById('codingPracticeChapterDetailsView').style.display = 'block';
  
  const theme = codingChapterThemes[chapter] || codingChapterThemes['default'];
  document.getElementById('codingPracticeChapterTitle').innerHTML = `
    <span style="font-size: 2rem; margin-right: 0.5rem;">${theme.icon}</span>
    ${chapter} Practice
  `;
  
  // Apply filters and render
  applyCodingFilters();
  
  // Setup event listeners
  setupCodingPracticeEventListeners();
}

/**
 * Back to chapter cards
 */
function backToCodingPracticeChapters() {
  document.getElementById('codingPracticeChapterDetailsView').style.display = 'none';
  document.getElementById('codingPracticeChapterCardsView').style.display = 'block';
  currentCodingChapter = null;
}

/**
 * Setup event listeners
 */
function setupCodingPracticeEventListeners() {
  const searchInput = document.getElementById('codingPracticeSearchInput');
  const difficultyFilter = document.getElementById('codingPracticeDifficultyFilter');
  
  // Remove existing listeners
  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);
  
  const newDifficultyFilter = difficultyFilter.cloneNode(true);
  difficultyFilter.parentNode.replaceChild(newDifficultyFilter, difficultyFilter);
  
  // Add new listeners with debounce
  document.getElementById('codingPracticeSearchInput').addEventListener('input', debounce(() => {
    currentCodingPage = 1;
    applyCodingFilters();
  }, 300));
  
  document.getElementById('codingPracticeDifficultyFilter').addEventListener('change', () => {
    currentCodingPage = 1;
    applyCodingFilters();
  });
}

/**
 * Apply filters
 */
function applyCodingFilters() {
  const searchTerm = document.getElementById('codingPracticeSearchInput').value.toLowerCase();
  const difficulty = document.getElementById('codingPracticeDifficultyFilter').value;
  
  filteredCodingQuestions = currentCodingQuestions.filter(q => {
    const matchesSearch = !searchTerm || 
      q.question.toLowerCase().includes(searchTerm) ||
      (q.options && q.options.some(opt => opt.toLowerCase().includes(searchTerm)));
    
    const matchesDifficulty = difficulty === 'all' || 
      q.difficulty.toLowerCase() === difficulty.toLowerCase();
    
    return matchesSearch && matchesDifficulty;
  });
  
  updateCodingQuestionCount();
  renderCodingQuestions();
  renderCodingPagination();
}

/**
 * Update question count badge
 */
function updateCodingQuestionCount() {
  const badge = document.getElementById('codingPracticeQuestionCount');
  const total = filteredCodingQuestions.length;
  badge.textContent = `${total} Question${total !== 1 ? 's' : ''}`;
}

/**
 * Render questions for current page
 */
function renderCodingQuestions() {
  const container = document.getElementById('codingPracticeQuestionsList');
  container.innerHTML = '';
  
  if (filteredCodingQuestions.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i>
        No questions match your search criteria.
      </div>
    `;
    return;
  }
  
  const start = (currentCodingPage - 1) * codingQuestionsPerPage;
  const end = start + codingQuestionsPerPage;
  const pageQuestions = filteredCodingQuestions.slice(start, end);
  
  pageQuestions.forEach((question, index) => {
    const globalIndex = start + index;
    const difficultyClass = question.difficulty.toLowerCase();
    const difficultyColors = {
      'easy': 'success',
      'moderate': 'warning',
      'hard': 'danger'
    };
    
    const questionCard = document.createElement('div');
    questionCard.className = 'question-item';
    questionCard.innerHTML = `
      <div class="question-item-header">
        <div class="question-item-number">${globalIndex + 1}</div>
        <div class="question-item-content">
          <div class="question-item-text">${question.question}</div>
          <div class="question-item-meta">
            <span class="badge bg-${difficultyColors[difficultyClass]}">${question.difficulty}</span>
          </div>
        </div>
        <button 
          class="btn btn-primary btn-sm question-item-action"
          onclick="openCodingQuestion(${globalIndex})"
          aria-label="Practice question ${globalIndex + 1}"
        >
          Practice <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    `;
    
    container.appendChild(questionCard);
  });
}

/**
 * Render pagination
 */
function renderCodingPagination() {
  const totalPages = Math.ceil(filteredCodingQuestions.length / codingQuestionsPerPage);
  const paginationContainer = document.getElementById('codingPracticePaginationContainer');
  const pagination = document.getElementById('codingPracticePagination');
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'block';
  pagination.innerHTML = '';
  
  // Previous button
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentCodingPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `
    <a class="page-link" href="#" onclick="changeCodingPage(${currentCodingPage - 1}); return false;" aria-label="Previous">
      <span aria-hidden="true">&laquo;</span>
    </a>
  `;
  pagination.appendChild(prevLi);
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentCodingPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentCodingPage ? 'active' : ''}`;
    li.innerHTML = `
      <a class="page-link" href="#" onclick="changeCodingPage(${i}); return false;">${i}</a>
    `;
    pagination.appendChild(li);
  }
  
  // Next button
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentCodingPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `
    <a class="page-link" href="#" onclick="changeCodingPage(${currentCodingPage + 1}); return false;" aria-label="Next">
      <span aria-hidden="true">&raquo;</span>
    </a>
  `;
  pagination.appendChild(nextLi);
}

/**
 * Change page
 */
function changeCodingPage(page) {
  const totalPages = Math.ceil(filteredCodingQuestions.length / codingQuestionsPerPage);
  if (page < 1 || page > totalPages) return;
  
  currentCodingPage = page;
  renderCodingQuestions();
  renderCodingPagination();
  
  // Scroll to top of questions list
  document.getElementById('codingPracticeQuestionsList').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Open question in modal
 */
function openCodingQuestion(index) {
  selectedCodingQuestion = filteredCodingQuestions[index];
  
  const modalContent = document.getElementById('codingPracticeQuestionContent');
  const difficultyColors = {
    'easy': 'success',
    'moderate': 'warning',
    'hard': 'danger'
  };
  const difficultyClass = selectedCodingQuestion.difficulty.toLowerCase();
  
  modalContent.innerHTML = `
    <div class="mb-3">
      <span class="badge bg-${difficultyColors[difficultyClass]} mb-2">${selectedCodingQuestion.difficulty}</span>
      <h5>${selectedCodingQuestion.question}</h5>
    </div>
    
    <div class="mb-3">
      <h6>Options:</h6>
      <div id="codingPracticeOptions">
        ${selectedCodingQuestion.options.map((option, i) => `
          <div class="form-check mb-2">
            <input 
              class="form-check-input" 
              type="radio" 
              name="codingPracticeAnswer" 
              id="codingOption${i}" 
              value="${option}"
            />
            <label class="form-check-label" for="codingOption${i}">
              ${option}
            </label>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div id="codingPracticeResult" class="mt-3" style="display: none;">
      <!-- Result will be shown here -->
    </div>
  `;
  
  // Reset buttons
  document.getElementById('codingPracticeSubmitBtn').style.display = 'inline-block';
  document.getElementById('codingPracticeShowAnswerBtn').style.display = 'inline-block';
  
  // Initialize and show modal
  if (!codingPracticeModal) {
    codingPracticeModal = new bootstrap.Modal(document.getElementById('codingPracticeQuestionModal'));
  }
  codingPracticeModal.show();
}

/**
 * Check answer
 */
function checkCodingPracticeAnswer() {
  const selectedOption = document.querySelector('input[name="codingPracticeAnswer"]:checked');
  
  if (!selectedOption) {
    alert('Please select an answer');
    return;
  }
  
  const userAnswer = selectedOption.value;
  const correctAnswer = selectedCodingQuestion.answer;
  const isCorrect = userAnswer === correctAnswer;
  recordActivity('practice_answered', 'coding', selectedCodingQuestion.id, isCorrect ? 100 : 0, {
    language: currentCodingChapter || ''
  });
  
  const resultDiv = document.getElementById('codingPracticeResult');
  resultDiv.style.display = 'block';
  resultDiv.className = `alert alert-${isCorrect ? 'success' : 'danger'}`;
  resultDiv.innerHTML = `
    <h6><i class="bi bi-${isCorrect ? 'check-circle' : 'x-circle'}"></i> ${isCorrect ? 'Correct!' : 'Incorrect'}</h6>
    <p class="mb-0">
      ${isCorrect ? 'Well done!' : `The correct answer is: <strong>${correctAnswer}</strong>`}
    </p>
  `;
  
  // Disable further submission
  document.getElementById('codingPracticeSubmitBtn').style.display = 'none';
  document.getElementById('codingPracticeShowAnswerBtn').style.display = 'none';
  
  // Highlight correct answer
  document.querySelectorAll('input[name="codingPracticeAnswer"]').forEach(input => {
    input.disabled = true;
    const label = input.nextElementSibling;
    if (input.value === correctAnswer) {
      label.style.color = '#28a745';
      label.style.fontWeight = 'bold';
    }
  });
}

/**
 * Show answer without selecting
 */
function showCodingPracticeAnswer() {
  const correctAnswer = selectedCodingQuestion.answer;
  
  const resultDiv = document.getElementById('codingPracticeResult');
  resultDiv.style.display = 'block';
  resultDiv.className = 'alert alert-info';
  resultDiv.innerHTML = `
    <h6><i class="bi bi-info-circle"></i> Answer Revealed</h6>
    <p class="mb-0">The correct answer is: <strong>${correctAnswer}</strong></p>
  `;
  
  // Highlight correct answer
  document.querySelectorAll('input[name="codingPracticeAnswer"]').forEach(input => {
    const label = input.nextElementSibling;
    if (input.value === correctAnswer) {
      label.style.color = '#17a2b8';
      label.style.fontWeight = 'bold';
    }
  });
  
  // Hide buttons
  document.getElementById('codingPracticeSubmitBtn').style.display = 'none';
  document.getElementById('codingPracticeShowAnswerBtn').style.display = 'none';
}

/**
 * Show error message
 */
function showCodingPracticeError(message) {
  const container = document.getElementById('codingPracticeChapterCards');
  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        ${message}
      </div>
    </div>
  `;
}

/**
 * Initialize on tab activation
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load when practice tab is shown
  const practiceTab = document.getElementById('practice-tab');
  if (practiceTab) {
    practiceTab.addEventListener('shown.bs.tab', () => {
      if (Object.keys(codingPracticeData).length === 0) {
        loadCodingPracticeData();
      }
    });
    
    // Fallback: load on click
    practiceTab.addEventListener('click', () => {
      setTimeout(() => {
        if (Object.keys(codingPracticeData).length === 0) {
          loadCodingPracticeData();
        }
      }, 100);
    });
  }
});

// Export functions
window.loadCodingPracticeData = loadCodingPracticeData;
window.refreshCodingPractice = refreshCodingPractice;
window.openCodingChapter = openCodingChapter;
window.backToCodingPracticeChapters = backToCodingPracticeChapters;
window.openCodingQuestion = openCodingQuestion;
window.changeCodingPage = changeCodingPage;
window.checkCodingPracticeAnswer = checkCodingPracticeAnswer;
window.showCodingPracticeAnswer = showCodingPracticeAnswer;
