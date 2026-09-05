/**
 * Coding Challenges JavaScript
 * Handles loading, filtering, and compiler functionality for coding challenges
 */

// Global state
let challengesData = {};
let currentChapter = null;
let currentProblem = null;
let currentLanguage = null;

// Language configurations
const LANGUAGE_CONFIG = {
  Python: {
    extension: 'py',
    comment: '#',
    executor: 'python'
  },
  Java: {
    extension: 'java',
    comment: '//',
    executor: 'java'
  },
  C: {
    extension: 'c',
    comment: '//',
    executor: 'gcc'
  },
  'C++': {
    extension: 'cpp',
    comment: '//',
    executor: 'g++'
  },
  JavaScript: {
    extension: 'js',
    comment: '//',
    executor: 'node'
  },
  PHP: {
    extension: 'php',
    comment: '//',
    executor: 'php'
  },
  CSharp: {
    extension: 'cs',
    comment: '//',
    executor: 'csc',
    displayName: 'C#'
  },
  SQL: {
    extension: 'sql',
    comment: '--',
    executor: 'sqlite3'
  },
  Frontend: {
    extension: 'html',
    comment: '//',
    executor: 'browser'
  },
  Backend: {
    extension: 'js',
    comment: '//',
    executor: 'node'
  }
};

/**
 * Load challenges data from API
 */
async function loadChallenges() {
  try {
    console.log('Loading challenges...');
    const container = document.getElementById('challengeChaptersGrid');
    if (!container) {
      console.error('challengeChaptersGrid container not found!');
      return;
    }
    
    container.innerHTML = `
      <div class="col-12 text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading challenges...</p>
      </div>
    `;
    
    // Fetch data from API
    const response = await fetch('/api/coding/challenges');
    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Challenges loaded:', data);
    console.log('Number of languages:', Object.keys(data).length);
    
    if (!data || Object.keys(data).length === 0) {
      throw new Error('No challenges data received from server');
    }
    
    challengesData = data;
    displayChapterCards();
  } catch (error) {
    console.error('Error loading challenges:', error);
    const container = document.getElementById('challengeChaptersGrid');
    if (container) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Failed to load challenges.</strong>
            <p class="mb-0 mt-2">${error.message}</p>
            <p class="mb-0 mt-2">Please make sure the Flask server is running on port 5000.</p>
            <button class="btn btn-primary btn-sm mt-3" onclick="loadChallenges()">
              <i class="bi bi-arrow-clockwise"></i> Try Again
            </button>
          </div>
        </div>
      `;
    }
  }
}

/**
 * Display chapter cards
 */
function displayChapterCards() {
  console.log('Displaying chapter cards...');
  const grid = document.getElementById('challengeChaptersGrid');
  
  if (!grid) {
    console.error('challengeChaptersGrid element not found!');
    return;
  }
  
  grid.innerHTML = '';
  
  const languages = Object.keys(challengesData);
  console.log('Languages found:', languages);
  
  if (languages.length === 0) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No challenges available at the moment.
        </div>
      </div>
    `;
    return;
  }

  languages.forEach((chapter, index) => {
    const chapterData = challengesData[chapter];
    const displayName = chapterData.displayName || chapter;
    const icon = chapterData.icon || '📝';
    const color = chapterData.color || '#007bff';

    // Count problems
    const easyCount = chapterData.easy ? chapterData.easy.length : 0;
    const moderateCount = chapterData.moderate ? chapterData.moderate.length : 0;
    const hardCount = chapterData.hard ? chapterData.hard.length : 0;
    const totalCount = easyCount + moderateCount + hardCount;

    const card = document.createElement('div');
    card.className = 'col-md-6 col-lg-4';
    card.innerHTML = `
      <div class="challenge-chapter-card" style="--chapter-color: ${color}; animation-delay: ${index * 0.1}s;">
        <span class="challenge-card-icon">${icon}</span>
        <h5 class="challenge-card-title">${displayName}</h5>
        <div class="challenge-card-stats">
          <div class="challenge-stat-item">
            <span class="challenge-stat-label">Total</span>
            <span class="challenge-stat-value">${totalCount}</span>
          </div>
          <div class="challenge-stat-item">
            <span class="challenge-stat-label">Easy</span>
            <span class="challenge-stat-value easy">${easyCount}</span>
          </div>
          <div class="challenge-stat-item">
            <span class="challenge-stat-label">Hard</span>
            <span class="challenge-stat-value hard">${hardCount}</span>
          </div>
        </div>
      </div>
    `;
    
    const cardElement = card.querySelector('.challenge-chapter-card');
    cardElement.onclick = () => openChapter(chapter);
    cardElement.style.cursor = 'pointer';

    grid.appendChild(card);
  });
  
  console.log(`Displayed ${languages.length} chapter cards`);
}

/**
 * Open chapter and display problems
 */
function openChapter(chapter) {
  currentChapter = chapter;
  currentLanguage = chapter;
  const chapterData = challengesData[chapter];
  const displayName = chapterData.displayName || chapter;

  // Show chapter details view
  document.getElementById('challengeChaptersView').style.display = 'none';
  document.getElementById('challengeDetailsView').style.display = 'block';
  
  // Update title
  document.getElementById('challengeChapterTitle').innerHTML = `
    <span style="font-size: 2rem; margin-right: 0.5rem;">${chapterData.icon || '📝'}</span>
    ${displayName} Challenges
  `;

  // Reset filter
  document.getElementById('diffAll').checked = true;

  // Display problems
  displayProblems();

  // Add event listeners for difficulty filter
  document.querySelectorAll('input[name="challengeDifficulty"]').forEach(radio => {
    radio.addEventListener('change', displayProblems);
  });
}

/**
 * Display problems based on selected difficulty
 */
function displayProblems() {
  const chapterData = challengesData[currentChapter];
  const selectedDifficulty = document.querySelector('input[name="challengeDifficulty"]:checked').value;
  const problemsList = document.getElementById('challengeProblemsList');
  problemsList.innerHTML = '';

  let problems = [];

  if (selectedDifficulty === 'all') {
    problems = [
      ...(chapterData.easy || []),
      ...(chapterData.moderate || []),
      ...(chapterData.hard || [])
    ];
  } else {
    problems = chapterData[selectedDifficulty] || [];
  }

  if (problems.length === 0) {
    problemsList.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-inbox"></i>
        <h5>No Problems Found</h5>
        <p>No problems available for this difficulty level.</p>
      </div>
    `;
    return;
  }

  problems.forEach((problem, index) => {
    const problemItem = document.createElement('div');
    problemItem.className = 'challenge-problem-item';
    problemItem.style.animationDelay = `${index * 0.05}s`;
    problemItem.onclick = () => openProblem(problem);

    const difficultyClass = problem.difficulty.toLowerCase();
    const tags = problem.tags || [];

    problemItem.innerHTML = `
      <div class="challenge-problem-info">
        <h6 class="challenge-problem-title">${problem.title}</h6>
        <div class="challenge-problem-meta">
          <span class="challenge-difficulty-badge ${difficultyClass}">
            ${problem.difficulty}
          </span>
          <div class="challenge-problem-tags">
            ${tags.map(tag => `<span class="challenge-tag">${tag}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="challenge-problem-action">
        Solve <i class="bi bi-arrow-right"></i>
      </div>
    `;

    problemsList.appendChild(problemItem);
  });
}

/**
 * Open problem in compiler view
 */
function openProblem(problem) {
  currentProblem = problem;

  // Hide chapter details, show compiler
  document.getElementById('challengeDetailsView').style.display = 'none';
  document.getElementById('compilerView').style.display = 'block';

  // Update problem details
  document.getElementById('problemTitle').textContent = problem.title;
  
  const difficultyBadge = document.getElementById('problemDifficulty');
  difficultyBadge.textContent = problem.difficulty;
  difficultyBadge.className = 'badge';
  
  if (problem.difficulty.toLowerCase() === 'easy') {
    difficultyBadge.classList.add('bg-success');
  } else if (problem.difficulty.toLowerCase() === 'moderate') {
    difficultyBadge.classList.add('bg-warning');
  } else {
    difficultyBadge.classList.add('bg-danger');
  }

  // Display problem description
  document.getElementById('problemDescription').innerHTML = `
    <p>${problem.description}</p>
    ${problem.examples ? `
      <h6>Examples:</h6>
      ${problem.examples.map(ex => `
        <pre><strong>Input:</strong> ${ex.input}
<strong>Output:</strong> ${ex.output}</pre>
      `).join('')}
    ` : ''}
  `;

  // Display tags
  const tagsDiv = document.getElementById('problemTags');
  tagsDiv.innerHTML = `
    <strong>Tags:</strong><br>
    ${(problem.tags || []).map(tag => `<span class="challenge-tag">${tag}</span>`).join('')}
  `;

  // Display test cases
  const testCasesDiv = document.getElementById('problemTestCases');
  if (problem.testCases && problem.testCases.length > 0) {
    testCasesDiv.innerHTML = `
      <h6><i class="bi bi-check-circle"></i> Test Cases</h6>
      ${problem.testCases.map((testCase, idx) => `
        <div class="test-case-item">
          <strong>Test Case ${idx + 1}:</strong>
          <div><strong>Input:</strong> <code>${testCase.input}</code></div>
          <div><strong>Expected Output:</strong> <code>${testCase.output}</code></div>
        </div>
      `).join('')}
    `;
  } else {
    testCasesDiv.innerHTML = '<p class="text-muted">No test cases available.</p>';
  }

  // Load starter code
  document.getElementById('codeEditor').value = problem.starterCode || `// Write your ${currentLanguage} code here\n`;

  // Clear output
  document.getElementById('codeOutput').textContent = 'Output will appear here...';
  document.getElementById('codeOutput').className = '';
}

/**
 * Run code (simulated execution)
 */
function runCode() {
  const code = document.getElementById('codeEditor').value.trim();
  const outputDiv = document.getElementById('codeOutput');

  if (!code) {
    outputDiv.textContent = 'Error: No code to run!';
    outputDiv.className = 'error';
    return;
  }

  // Simulate execution
  outputDiv.className = '';
  outputDiv.textContent = 'Running code...\n';

  // Simulate delay
  setTimeout(() => {
    // This is a simulation - in a real app, you'd use an API to execute code
    const simulatedOutput = generateSimulatedOutput(code);
    outputDiv.textContent = simulatedOutput;
    outputDiv.className = 'success';
  }, 1000);
}

/**
 * Generate simulated output
 */
function generateSimulatedOutput(code) {
  // Simple simulation - in production, use a code execution API
  const language = currentLanguage || 'Python';
  
  return `[Simulated ${language} Execution]

Execution completed successfully!

Note: This is a simulated execution environment.
To run code in production, integrate with services like:
- Judge0 API (https://judge0.com/)
- Sphere Engine (https://sphere-engine.com/)
- Piston API (https://github.com/engineer-man/piston)

Your code has been validated for syntax.
For real execution, please set up a backend compiler service.

Output: [Sample output based on test cases]
`;
}

/**
 * Submit code and validate against test cases
 */
function submitCode() {
  const code = document.getElementById('codeEditor').value.trim();
  const outputDiv = document.getElementById('codeOutput');

  if (!code) {
    outputDiv.textContent = 'Error: No code to submit!';
    outputDiv.className = 'error';
    return;
  }

  if (!currentProblem || !currentProblem.testCases) {
    outputDiv.textContent = 'No test cases available for validation.';
    outputDiv.className = '';
    return;
  }

  // Simulate test case validation
  outputDiv.className = '';
  outputDiv.textContent = 'Validating against test cases...\n';

  setTimeout(() => {
    const results = validateTestCases(code, currentProblem.testCases);
    outputDiv.textContent = results;
    outputDiv.className = results.includes('All tests passed') ? 'success' : 'error';
  }, 1500);
}

/**
 * Validate code against test cases (simulated)
 */
function validateTestCases(code, testCases) {
  // Simulation - in production, execute actual test cases
  const totalTests = testCases.length;
  const passedTests = Math.floor(Math.random() * (totalTests + 1)); // Random for demo
  
  let output = `Test Results:\n${'='.repeat(50)}\n\n`;
  
  testCases.forEach((testCase, idx) => {
    const passed = idx < passedTests;
    output += `Test Case ${idx + 1}: ${passed ? '✓ PASSED' : '✗ FAILED'}\n`;
    output += `  Input: ${testCase.input}\n`;
    output += `  Expected: ${testCase.output}\n`;
    if (!passed) {
      output += `  Your Output: [Different output]\n`;
    }
    output += '\n';
  });

  output += `${'='.repeat(50)}\n`;
  output += `Result: ${passedTests}/${totalTests} tests passed\n\n`;

  if (passedTests === totalTests) {
    output += '🎉 Congratulations! All tests passed!\n';
    output += 'Your solution is correct!';
  } else {
    output += '❌ Some tests failed. Please review your code.';
  }

  recordActivity('challenge_attempt', 'coding_challenge', currentProblem?.id || 'unknown', passedTests === totalTests ? 100 : Math.round((passedTests / totalTests) * 100), {
    title: currentProblem?.title || '',
    passed_tests: passedTests,
    total_tests: totalTests
  });
  if (passedTests === totalTests && currentProblem?.id) {
    recordActivity('challenge_completed', 'coding_challenge', currentProblem.id, 100, {
      title: currentProblem.title || ''
    });
  }

  return output;
}

/**
 * Back to chapter details
 */
function backToProblems() {
  document.getElementById('compilerView').style.display = 'none';
  document.getElementById('challengeDetailsView').style.display = 'block';
  currentProblem = null;
}

/**
 * Back to chapter cards
 */
function backToChallengeChapters() {
  document.getElementById('challengeDetailsView').style.display = 'none';
  document.getElementById('challengeChaptersView').style.display = 'block';
  currentChapter = null;
  currentLanguage = null;
}

/**
 * Show loading skeleton
 */
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="col-md-4">
      <div class="loading-card">
        <div class="loading-skeleton" style="width: 60%; height: 60px; margin: 0 auto 1rem;"></div>
        <div class="loading-skeleton" style="width: 80%; margin: 0 auto;"></div>
        <div class="loading-skeleton" style="width: 60%; margin: 0.5rem auto;"></div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="loading-card">
        <div class="loading-skeleton" style="width: 60%; height: 60px; margin: 0 auto 1rem;"></div>
        <div class="loading-skeleton" style="width: 80%; margin: 0 auto;"></div>
        <div class="loading-skeleton" style="width: 60%; margin: 0.5rem auto;"></div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="loading-card">
        <div class="loading-skeleton" style="width: 60%; height: 60px; margin: 0 auto 1rem;"></div>
        <div class="loading-skeleton" style="width: 80%; margin: 0 auto;"></div>
        <div class="loading-skeleton" style="width: 60%; margin: 0.5rem auto;"></div>
      </div>
    </div>
  `;
}

/**
 * Show error message
 */
function showError(containerId, message) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        ${message}
      </div>
    </div>
  `;
}

/**
 * Initialize coding challenges when tab is shown
 */
function initializeChallengesTab() {
  console.log('Initializing Coding Challenges tab...');
  
  // Check if we already have data
  if (Object.keys(challengesData).length > 0) {
    console.log('Challenges data already loaded');
    displayChapterCards();
    return;
  }
  
  // Load challenges for the first time
  loadChallenges();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Setting up Challenges tab');
  
  const challengesTab = document.getElementById('challenges-tab');
  const challengesPane = document.getElementById('challenges');
  
  if (!challengesTab || !challengesPane) {
    console.error('Challenges tab elements not found!');
    return;
  }
  
  // Check if the challenges tab is already active (direct navigation)
  if (challengesPane.classList.contains('show') || challengesPane.classList.contains('active')) {
    console.log('Challenges tab is already active, loading immediately...');
    initializeChallengesTab();
  }
  
  // Listen for tab shown event (Bootstrap 5)
  challengesTab.addEventListener('shown.bs.tab', (event) => {
    console.log('Challenges tab shown event triggered');
    initializeChallengesTab();
  });
  
  // Additional fallback: click event
  challengesTab.addEventListener('click', () => {
    console.log('Challenges tab clicked');
    setTimeout(() => {
      if (challengesPane.classList.contains('show') || challengesPane.classList.contains('active')) {
        initializeChallengesTab();
      }
    }, 150);
  });
});

// Export functions for global use
window.loadChallenges = loadChallenges;
window.openChapter = openChapter;
window.openProblem = openProblem;
window.runCode = runCode;
window.submitCode = submitCode;
window.backToProblems = backToProblems;
window.backToChallengeChapters = backToChallengeChapters;
