/**
 * BookMind - STEP 3 메인 앱 로직
 * AI 퀴즈 + 서술형 개선 + PDF 지원
 */

// ===== 저장소 유틸 =====
const storage = {
  get(key) {
    const data = localStorage.getItem(`bookmind_${key}`);
    return data ? JSON.parse(data) : null;
  },
  set(key, value) {
    localStorage.setItem(`bookmind_${key}`, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(`bookmind_${key}`);
  },
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('bookmind_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// ===== 유틸 함수 =====
function daysFromToday(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  const diffTime = date - today;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function calculateMemoryRate(bookIdx) {
  const notes = storage.get('notes') || [];
  const bookNotes = notes.filter(n => n.bookIdx === bookIdx);
  if (bookNotes.length === 0) return 0;
  
  const avgRating = bookNotes.reduce((sum, n) => sum + (n.rating || 0), 0) / bookNotes.length;
  return Math.round(avgRating * 20); // 5점 만점 * 20 = 100점 만점
}

function getNextReviewDate(startDate, reviewScheduleDay) {
  const start = new Date(startDate);
  const nextDate = new Date(start);
  nextDate.setDate(nextDate.getDate() + reviewScheduleDay);
  return nextDate.toISOString().split('T')[0];
}

// ===== STEP 3: AI 퀴즈 생성 =====
// ===== STEP 4: 개선된 AI 퀴즈 생성 (고도화) =====
function generateQuiz(bookIdx) {
  const notes = storage.get('notes') || [];
  const books = storage.get('books') || [];
  const bookNotes = notes.filter(n => n.bookIdx === bookIdx);
  
  if (bookNotes.length === 0) {
    alert('이 책의 기록이 없어서 퀴즈를 만들 수 없습니다.');
    return null;
  }

  // 확장된 불용어 리스트
  const stopwords = [
    '이것', '그것', '저것', '것', '겠', '했', '있', '되', '같', '또는', '그리고', 
    '때문', '때문에', '중에', '처럼', '생각', '말', '일', '수', '들', '거', '명',
    '그', '그곳', '거기', '어디', '뭔가', '뭔가', '아무', '하다', '있다', '되다',
    '이다', '무엇', '무엇이', '누구', '몇', '어느', '안', '밖', '위', '아래',
    '앞', '뒤', '옆', '안다', '모르다', '싶다', '같다', '다르다', '높다', '낮다'
  ];
  
  // 단어 빈도 분석을 위한 딕셔너리
  const wordFreq = {};
  
  bookNotes.forEach(note => {
    // content, impressive, thoughts 모두 분석
    const fullText = (note.content || '') + ' ' + (note.impressive || '') + ' ' + (note.thoughts || '');
    const words = fullText.toLowerCase().split(/[\s,。.!?();:\-]+/);
    
    words.forEach(word => {
      // 필터링: 한글/영문/숫자 포함, 길이 2-15, 불용어 제외
      if (word.length >= 2 && word.length <= 15 && 
          !stopwords.includes(word) &&
          word.match(/[가-힣a-zA-Z0-9]/)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
  });
  
  // 빈도 기반 정렬 (높은 빈도부터)
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])  // 빈도 내림차순
    .map(entry => entry[0])
    .slice(0, 20);  // 상위 20개
  
  if (sortedWords.length < 2) {
    alert('기록 내용이 너무 짧아서 퀴즈를 만들 수 없습니다.');
    return null;
  }

  // 정답: 빈도 높은 단어들 중에서 선택 (확률적)
  const correctAnswer = sortedWords[Math.floor(Math.random() * Math.min(5, sortedWords.length))];
  
  // 오답: 정답과 다른 단어들에서 선택
  const wrongAnswers = sortedWords
    .filter(w => w !== correctAnswer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  
  if (wrongAnswers.length < 3) {
    alert('선택지를 만들 수 없습니다. 더 많은 기록을 작성해주세요.');
    return null;
  }

  // 선택지 섞기
  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  const correctIdx = options.indexOf(correctAnswer);

  const book = books[bookIdx];
  const question = `'${book.title}'에서 배운 주요 내용은?`;

  return {
    bookIdx,
    question,
    options,
    correctIdx,
    userAnswer: -1,
    score: 0,
    date: new Date().toISOString()
  };
}

function saveQuizAnswer(quizIdx, selectedIdx) {
  const quizzes = storage.get('quizzes') || [];
  const quiz = quizzes[quizIdx];
  
  quiz.userAnswer = selectedIdx;
  quiz.score = selectedIdx === quiz.correctIdx ? 10 : 0;
  
  storage.set('quizzes', quizzes);
  return quiz.score;
}

// ===== STEP 4: 콘텐츠 기반 퀴즈 생성 (고도화) =====
function generateQuizFromContent() {
  const contentInput = document.getElementById('content-input').value.trim();
  
  if (contentInput.length < 30) {
    alert('최소 30자 이상 입력해주세요.');
    return;
  }
  
  // 확장된 불용어 리스트 (generateQuiz와 동일)
  const stopwords = [
    '이것', '그것', '저것', '것', '겠', '했', '있', '되', '같', '또는', '그리고', 
    '때문', '때문에', '중에', '처럼', '생각', '말', '일', '수', '들', '거', '명',
    '그', '그곳', '거기', '어디', '뭔가', '뭔가', '아무', '하다', '있다', '되다',
    '이다', '무엇', '무엇이', '누구', '몇', '어느', '안', '밖', '위', '아래',
    '앞', '뒤', '옆', '안다', '모르다', '싶다', '같다', '다르다', '높다', '낮다'
  ];
  
  // 단어 빈도 분석
  const wordFreq = {};
  const words = contentInput.toLowerCase().split(/[\s,。.!?();:\-]+/);
  
  words.forEach(word => {
    if (word.length >= 2 && word.length <= 15 && 
        !stopwords.includes(word) &&
        word.match(/[가-힣a-zA-Z0-9]/)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  // 빈도 기반 정렬
  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, 20);
  
  if (sortedWords.length < 4) {
    alert('내용에서 충분한 키워드를 찾을 수 없습니다. 더 자세한 텍스트를 입력해주세요.');
    return;
  }
  
  // 정답 선택 (빈도 높은 단어 우선)
  const correctAnswer = sortedWords[Math.floor(Math.random() * Math.min(5, sortedWords.length))];
  
  // 오답 생성
  const wrongAnswers = sortedWords
    .filter(w => w !== correctAnswer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  
  // 선택지 섞기
  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  const correctIdx = options.indexOf(correctAnswer);
  
  const question = '위 텍스트의 주요 내용으로 가장 적절한 것은?';
  
  // 퀴즈 저장
  const quiz = {
    question,
    options,
    correctIdx,
    userAnswer: -1,
    score: 0,
    date: new Date().toISOString(),
    sourceType: 'content',
    sourceText: contentInput.substring(0, 200)  // 처음 200자만 저장
  };
  
  const quizzes = storage.get('quizzes') || [];
  quizzes.push(quiz);
  storage.set('quizzes', quizzes);
  
  // 입력 필드 초기화
  document.getElementById('content-input').value = '';
  
  // 퀴즈 탭으로 자동 전환
  alert('✨ 퀴즈가 생성되었습니다! 퀴즈 탭에서 풀어보세요.');
  switchTab('quiz');
  renderQuiz();
}

// ===== STEP 3: 피드백 생성 =====
function generateFeedback(noteIdx) {
  const notes = storage.get('notes') || [];
  const note = notes[noteIdx];
  const text = note.content + ' ' + note.impressive + ' ' + note.thoughts;
  
  const issues = [];
  const suggestions = [];

  // 1. 문장 길이 분석
  const sentences = text.split(/[.!?。]/);
  const avgLength = text.length / sentences.length;
  if (avgLength > 100) {
    issues.push({ type: 'length', message: '문장이 너무 깁니다' });
    suggestions.push('문장을 더 짧게 나누어 쓰면 가독성이 좋아집니다.');
  } else if (avgLength < 20) {
    issues.push({ type: 'length', message: '내용이 너무 짧습니다' });
    suggestions.push('좀 더 자세히 설명하면 더 좋은 기록이 됩니다.');
  }

  // 2. 반복 단어 확인
  const words = text.toLowerCase().split(/[\s,。.!?]+/).filter(w => w.length > 2);
  const wordCount = {};
  words.forEach(w => {
    wordCount[w] = (wordCount[w] || 0) + 1;
  });

  const repeatedWords = Object.entries(wordCount)
    .filter(([w, count]) => count > 3)
    .map(([w]) => w);

  if (repeatedWords.length > 0) {
    issues.push({ type: 'repetition', message: `'${repeatedWords[0]}' 등이 반복됩니다` });
    suggestions.push('같은 단어를 반복하지 않고 다른 표현을 사용해보세요.');
  }

  // 3. 내용 풍부도
  const contentWords = words.length;
  if (contentWords < 20) {
    issues.push({ type: 'richness', message: '내용이 다소 부족합니다' });
    suggestions.push('더 많은 구체적인 예시나 생각을 덧붙여보세요.');
  }

  // 4. 긍정 피드백
  if (issues.length === 0) {
    suggestions.push('✨ 훌륭한 기록입니다! 이대로 계속 진행하세요.');
  } else {
    suggestions.push('💪 좋은 노력입니다. 위의 조언을 참고해서 더 나은 기록을 만들어보세요.');
  }

  return { issues, suggestions };
}

// ===== 초기 데이터 =====
function initData() {
  if (!storage.get('books')) {
    storage.set('books', []);
  }
  if (!storage.get('notes')) {
    storage.set('notes', []);
  }
  if (!storage.get('reviews')) {
    storage.set('reviews', []);
  }
  if (!storage.get('quizzes')) {
    storage.set('quizzes', []);
  }
}

// ===== 탭 전환 =====
function switchTab(tabName) {
  // 기존 탭 숨기기
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // 네비게이션 버튼 업데이트
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });

  // 새 탭 표시
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  // 네비게이션 버튼 활성화
  const navBtn = document.querySelector(`[data-tab="${tabName}"]`);
  if (navBtn) {
    navBtn.classList.add('active');
  }

  // 탭별 렌더링
  renderTab(tabName);
}

function renderTab(tabName) {
  switch (tabName) {
    case 'home':
      renderHome();
      break;
    case 'books':
      renderBooks();
      break;
    case 'memory':
      renderMemory();
      break;
    case 'record':
      renderRecord();
      break;
    case 'quiz':
      renderQuiz();
      break;
    case 'my':
      renderMy();
      break;
  }
}

// ===== 홈 화면 렌더링 =====
function renderHome() {
  const books = storage.get('books') || [];
  const notes = storage.get('notes') || [];

  // 오늘의 독서 (최근 추가된 책)
  const todayBookEl = document.getElementById('today-book');
  if (books.length > 0) {
    const latestBook = books[books.length - 1];
    todayBookEl.innerHTML = `
      <div style="text-align: left; width: 100%;">
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #2d2d3d;">${latestBook.title}</p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">${latestBook.author}</p>
      </div>
    `;
  } else {
    todayBookEl.innerHTML = '<p class="muted">아직 등록된 책이 없습니다.</p>';
  }

  // 오늘 복습할 책 (실제 일정 계산)
  const reviewListEl = document.getElementById('review-list');
  const reviewsToday = [];
  
  books.forEach((book, idx) => {
    const reviewSchedule = [1, 3, 7, 14, 30];
    reviewSchedule.forEach(day => {
      const nextReviewDate = getNextReviewDate(book.startDate, day);
      const daysDiff = daysFromToday(nextReviewDate);
      if (daysDiff <= 0 && daysDiff > -3) { // 오늘 또는 최근 복습 예정일
        reviewsToday.push({
          title: book.title,
          nextDate: nextReviewDate,
          daysDiff: daysDiff
        });
      }
    });
  });

  if (reviewsToday.length > 0) {
    const reviewItems = reviewsToday.slice(0, 3).map(review => {
      const dayText = review.daysDiff === 0 ? '오늘' : `${Math.abs(review.daysDiff)}일 전`;
      return `
        <div class="review-item">
          <div>
            <p class="book-name">${review.title}</p>
            <p class="review-days">${dayText} 복습 예정</p>
          </div>
        </div>
      `;
    }).join('');
    reviewListEl.innerHTML = reviewItems;
  } else {
    reviewListEl.innerHTML = '<p class="muted">복습할 책이 없습니다.</p>';
  }

  // 평균 기억률
  if (books.length > 0) {
    const memoryRates = books.map((_, idx) => calculateMemoryRate(idx));
    const avgMemory = memoryRates.length > 0 
      ? Math.round(memoryRates.reduce((a, b) => a + b) / memoryRates.length)
      : 0;
    document.getElementById('avg-memory').textContent = avgMemory;
  } else {
    document.getElementById('avg-memory').textContent = 0;
  }
}


// ===== 내 책 탭 렌더링 =====
function renderBooks() {
  const books = storage.get('books') || [];
  const bookListEl = document.getElementById('book-list');

  if (books.length === 0) {
    bookListEl.innerHTML = '<p class="muted">등록된 책이 없습니다.</p>';
    updateBookSelectList([]);
    return;
  }

  const bookHTML = books.map((book, idx) => `
    <div class="book-card">
      <div class="book-info">
        <p class="book-title">${book.title}</p>
        <p class="book-author">${book.author}</p>
        <div style="display: flex; gap: 6px; margin-top: 8px; font-size: 12px;">
          <span class="book-status">${book.status === 'reading' ? '읽는 중' : '완독'}</span>
          <span style="color: #7c5cde; font-weight: 600;">기억률: ${calculateMemoryRate(idx)}%</span>
        </div>
      </div>
      <div class="book-actions">
        <button class="btn" onclick="editBook(${idx})" style="padding: 6px 8px; font-size: 12px;">수정</button>
        <button class="btn" onclick="deleteBook(${idx})" style="padding: 6px 8px; font-size: 12px;">삭제</button>
      </div>
    </div>
  `).join('');

  bookListEl.innerHTML = bookHTML;
  updateBookSelectList(books);
}

function updateBookSelectList(books) {
  const select = document.getElementById('note-book-select');
  const options = books.map((book, idx) => `
    <option value="${idx}">${book.title}</option>
  `).join('');
  select.innerHTML = '<option value="">책을 선택하세요</option>' + options;
}

// ===== 기억 탭 렌더링 =====
function renderMemory() {
  const books = storage.get('books') || [];

  // 복습 스케줄 (실제 계산)
  const scheduleEl = document.getElementById('review-schedule');
  if (books.length === 0) {
    scheduleEl.innerHTML = '<p class="muted">복습할 책이 없습니다.</p>';
  } else {
    const scheduleHTML = books.map((book, idx) => {
      const reviewDays = [1, 3, 7, 14, 30];
      
      // 첫 번째 아직 완료 안 된 복습 찾기
      let nextReview = null;
      let nextReviewDay = null;
      
      for (let day of reviewDays) {
        const nextDate = getNextReviewDate(book.startDate, day);
        const daysDiff = daysFromToday(nextDate);
        if (daysDiff >= 0) {
          nextReview = nextDate;
          nextReviewDay = day;
          break;
        }
      }
      
      const dayText = nextReviewDay 
        ? `${nextReviewDay}일 차 복습 예정` 
        : '모든 복습 완료';

      return `
        <div class="schedule-item">
          <div class="schedule-info">
            <p class="book-name">${book.title}</p>
            <p class="schedule-days">${dayText}</p>
          </div>
          <button class="schedule-btn" onclick="reviewBook(${idx})">복습</button>
        </div>
      `;
    }).join('');
    scheduleEl.innerHTML = scheduleHTML;
  }

  // 책별 기억률 (정확한 계산)
  const memoryListEl = document.getElementById('memory-list');
  if (books.length === 0) {
    memoryListEl.innerHTML = '<p class="muted">아직 분석 데이터가 없습니다.</p>';
  } else {
    const memoryHTML = books.map((book, idx) => {
      const memory = calculateMemoryRate(idx);
      return `
        <div class="memory-card">
          <p class="book-name">${book.title}</p>
          <div class="memory-bar">
            <div class="memory-fill" style="width: ${memory}%"></div>
          </div>
          <div class="memory-value">기억률: ${memory}%</div>
        </div>
      `;
    }).join('');
    memoryListEl.innerHTML = memoryHTML;
  }
}


// ===== 기록 탭 렌더링 =====
function renderRecord() {
  const notes = storage.get('notes') || [];
  const notesListEl = document.getElementById('notes-list');

  if (notes.length === 0) {
    notesListEl.innerHTML = '<p class="muted">작성한 기록이 없습니다.</p>';
    return;
  }

  const notesHTML = notes.map((note, idx) => {
    const books = storage.get('books') || [];
    const book = books[note.bookIdx];
    const bookTitle = book ? book.title : '알 수 없는 책';
    const previewText = note.content?.substring(0, 50) || '';

    return `
      <div class="note-item">
        <div style="flex: 1;">
          <p class="note-book">${bookTitle}</p>
          <p class="note-date">${new Date(note.date).toLocaleDateString('ko-KR')}</p>
          <p class="note-preview">${previewText}...</p>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn" onclick="showFeedbackModal(${idx})" style="padding: 6px 8px; font-size: 12px;">🎯 피드백</button>
          <button class="btn" onclick="editNote(${idx})" style="padding: 6px 8px; font-size: 12px;">수정</button>
          <button class="btn" onclick="deleteNote(${idx})" style="padding: 6px 8px; font-size: 12px;">삭제</button>
        </div>
      </div>
    `;
  }).join('');

  notesListEl.innerHTML = notesHTML;
}

// ===== STEP 3: 퀴즈 탭 렌더링 =====
function renderQuiz() {
  const books = storage.get('books') || [];
  const quizzes = storage.get('quizzes') || [];
  const quizSectionEl = document.getElementById('quiz-section');

  if (books.length === 0) {
    quizSectionEl.innerHTML = '<p class="muted">먼저 책을 추가하고 기록을 작성해주세요.</p>';
    return;
  }

  // 책별 퀴즈 생성 버튼
  const bookSelectHTML = books.map((book, idx) => `
    <div style="margin-bottom: 12px;">
      <button class="btn btn-primary" onclick="startQuiz(${idx})" style="width: 100%;">
        🧠 ${book.title} - 퀴즈 시작
      </button>
    </div>
  `).join('');

  // 완료한 퀴즈 현황
  const completedQuizzes = quizzes.filter(q => q.userAnswer !== -1);
  let currentQuizHTML = '<p class="muted">풀이 중인 퀴즈가 없습니다.</p>';

  // 현재 진행 중인 퀴즈
  const activeQuizzes = quizzes.filter(q => q.userAnswer === -1);
  if (activeQuizzes.length > 0) {
    const quiz = activeQuizzes[0];
    const quizIdx = quizzes.indexOf(quiz);
    currentQuizHTML = `
      <div class="quiz-card">
        <h3>${quiz.question}</h3>
        <div class="quiz-options">
          ${quiz.options.map((opt, i) => `
            <button class="quiz-option" onclick="answerQuiz(${quizIdx}, ${i})">
              ${String.fromCharCode(65 + i)}. ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  quizSectionEl.innerHTML = `
    <div class="quiz-container">
      <h2 class="section-title">📚 풀이 중인 퀴즈</h2>
      ${currentQuizHTML}

      <h2 class="section-title" style="margin-top: 24px;">새로운 퀴즈 시작</h2>
      ${bookSelectHTML}

      <h2 class="section-title" style="margin-top: 24px;">✅ 완료한 퀴즈</h2>
      <div style="background: #f8f9fb; padding: 12px; border-radius: 10px;">
        <p style="margin: 0; color: #2d2d3d; font-weight: 600;">
          총 ${completedQuizzes.length}개 퀴즈 풀이 완료
        </p>
        <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">
          정답률: ${completedQuizzes.length > 0 
            ? Math.round(completedQuizzes.filter(q => q.score === 10).length / completedQuizzes.length * 100)
            : 0}%
        </p>
      </div>
    </div>
  `;
}

function startQuiz(bookIdx) {
  const quiz = generateQuiz(bookIdx);
  if (quiz) {
    const quizzes = storage.get('quizzes') || [];
    quizzes.push(quiz);
    storage.set('quizzes', quizzes);
    renderQuiz();
  }
}

function answerQuiz(quizIdx, selectedIdx) {
  const score = saveQuizAnswer(quizIdx, selectedIdx);
  const quizzes = storage.get('quizzes') || [];
  const quiz = quizzes[quizIdx];
  
  const resultText = score === 10 ? '🎉 정답입니다!' : '❌ 틀렸습니다. 다시 도전해보세요!';
  const correctText = `정답: ${String.fromCharCode(65 + quiz.correctIdx)}`;
  
  alert(`${resultText}\n${correctText}`);
  renderQuiz();
  renderMy();
}

// ===== 마이 탭 렌더링 =====
function renderMy() {
  const books = storage.get('books') || [];
  const notes = storage.get('notes') || [];
  const reviews = storage.get('reviews') || [];
  const quizzes = storage.get('quizzes') || [];

  document.getElementById('stat-books').textContent = books.length;
  document.getElementById('stat-notes').textContent = notes.length;
  document.getElementById('stat-reviews').textContent = reviews.length || 0;
  document.getElementById('stat-quizzes').textContent = quizzes.filter(q => q.userAnswer !== -1).length;

  // ===== STEP 5: 통계 심화 =====
  // 주별 성과
  const weeklyStats = calculateWeeklyStats();
  renderWeeklyChart(weeklyStats);
  
  // 월별 성과
  const monthlyStats = calculateMonthlyStats();
  renderMonthlyChart(monthlyStats);
}

// ===== STEP 5: 주별 성과 계산 =====
function calculateWeeklyStats() {
  const quizzes = storage.get('quizzes') || [];
  const stats = {};
  
  // 최근 4주 데이터
  for (let i = 0; i < 4; i++) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (3 - i) * 7);
    const weekKey = `W${i + 1}`;
    stats[weekKey] = { correct: 0, total: 0, rate: 0 };
  }
  
  quizzes.forEach(quiz => {
    if (quiz.date && quiz.userAnswer !== -1) {
      const quizDate = new Date(quiz.date);
      const today = new Date();
      const daysAgo = Math.floor((today - quizDate) / (1000 * 60 * 60 * 24));
      
      if (daysAgo < 28) {
        const weekIdx = Math.floor(daysAgo / 7);
        if (weekIdx < 4) {
          const weekKey = `W${4 - weekIdx}`;
          if (stats[weekKey]) {
            stats[weekKey].total++;
            if (quiz.userAnswer === quiz.correctIdx) {
              stats[weekKey].correct++;
            }
          }
        }
      }
    }
  });
  
  // 정답률 계산
  Object.keys(stats).forEach(key => {
    stats[key].rate = stats[key].total > 0 
      ? Math.round((stats[key].correct / stats[key].total) * 100)
      : 0;
  });
  
  return stats;
}

// ===== STEP 5: 월별 성과 계산 =====
function calculateMonthlyStats() {
  const quizzes = storage.get('quizzes') || [];
  const stats = {};
  
  // 최근 6개월
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    stats[monthKey] = { correct: 0, total: 0, rate: 0 };
  }
  
  quizzes.forEach(quiz => {
    if (quiz.date && quiz.userAnswer !== -1) {
      const quizDate = new Date(quiz.date);
      const monthKey = `${quizDate.getFullYear()}-${String(quizDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (stats[monthKey]) {
        stats[monthKey].total++;
        if (quiz.userAnswer === quiz.correctIdx) {
          stats[monthKey].correct++;
        }
      }
    }
  });
  
  // 정답률 계산
  Object.keys(stats).forEach(key => {
    stats[key].rate = stats[key].total > 0 
      ? Math.round((stats[key].correct / stats[key].total) * 100)
      : 0;
  });
  
  return stats;
}

// ===== STEP 5: 주별 차트 렌더링 =====
function renderWeeklyChart(stats) {
  const chartContainer = document.getElementById('weekly-chart');
  if (!chartContainer) return;
  
  let chartHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">📈 최근 4주 성과</h3>';
  chartHTML += '<div style="display: flex; gap: 8px; align-items: flex-end; height: 150px;">';
  
  Object.keys(stats).forEach(week => {
    const data = stats[week];
    const height = Math.max(data.rate * 1.5, 5); // 최소 높이 보장
    chartHTML += `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--brand);">${data.rate}%</div>
        <div style="width: 100%; height: ${height}px; background: linear-gradient(180deg, #7c5cde 0%, #6d4ed8 100%); border-radius: 4px 4px 0 0; transition: all 200ms;"></div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${week}</div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  chartContainer.innerHTML = chartHTML;
}

// ===== STEP 5: 월별 차트 렌더링 =====
function renderMonthlyChart(stats) {
  const chartContainer = document.getElementById('monthly-chart');
  if (!chartContainer) return;
  
  let chartHTML = '<h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">📊 최근 6개월 성과</h3>';
  chartHTML += '<div style="display: flex; gap: 6px; align-items: flex-end; height: 120px;">';
  
  Object.keys(stats).forEach(month => {
    const data = stats[month];
    const monthLabel = month.split('-')[1];
    const height = Math.max(data.rate * 1.2, 5);
    chartHTML += `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0;">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 2px; color: var(--brand);">${data.rate}%</div>
        <div style="width: 100%; height: ${height}px; background: linear-gradient(180deg, #7c5cde 0%, #9b8bd1 100%); border-radius: 3px 3px 0 0;"></div>
        <div style="font-size: 9px; color: var(--text-secondary); margin-top: 3px;">${monthLabel}월</div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  chartContainer.innerHTML = chartHTML;
}

// ===== 책 추가 폼 =====
function openAddBookForm() {
  document.getElementById('edit-book-idx').value = '';
  document.getElementById('book-title').value = '';
  document.getElementById('book-author').value = '';
  document.getElementById('book-start-date').value = '';
  document.getElementById('book-status').value = 'reading';
  document.getElementById('book-form-title').textContent = '책 추가';
  document.getElementById('book-add-form').style.display = 'block';
  document.getElementById('book-title').focus();
}

function closeAddBookForm() {
  document.getElementById('book-add-form').style.display = 'none';
}

function editBook(idx) {
  const books = storage.get('books') || [];
  const book = books[idx];
  
  document.getElementById('edit-book-idx').value = idx;
  document.getElementById('book-title').value = book.title;
  document.getElementById('book-author').value = book.author;
  document.getElementById('book-start-date').value = book.startDate;
  document.getElementById('book-status').value = book.status;
  document.getElementById('book-form-title').textContent = '책 수정';
  document.getElementById('book-add-form').style.display = 'block';
  document.getElementById('book-title').focus();
}

function saveBook() {
  const title = document.getElementById('book-title').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const startDate = document.getElementById('book-start-date').value;
  const status = document.getElementById('book-status').value;
  const editIdx = document.getElementById('edit-book-idx').value;

  if (!title || !author) {
    alert('제목과 저자를 입력해주세요.');
    return;
  }

  const books = storage.get('books') || [];

  if (editIdx !== '') {
    // 수정
    books[editIdx].title = title;
    books[editIdx].author = author;
    books[editIdx].startDate = startDate;
    books[editIdx].status = status;
    alert('책이 수정되었습니다!');
  } else {
    // 추가
    books.push({
      title,
      author,
      startDate: startDate || new Date().toISOString().split('T')[0],
      status,
      createdAt: new Date().toISOString()
    });
    alert('책이 저장되었습니다!');
  }

  storage.set('books', books);

  closeAddBookForm();
  renderBooks();
  renderHome();
  renderMemory();
}

function deleteBook(idx) {
  if (confirm('이 책을 삭제하시겠습니까?\n책의 모든 기록도 함께 삭제됩니다.')) {
    const books = storage.get('books') || [];
    const notes = storage.get('notes') || [];
    
    // 책의 모든 기록도 삭제
    const filteredNotes = notes.filter(n => n.bookIdx !== idx);
    storage.set('notes', filteredNotes);
    
    books.splice(idx, 1);
    storage.set('books', books);
    
    renderBooks();
    renderHome();
    renderRecord();
    renderMemory();
    renderMy();
  }
}


// ===== 독서 기록 저장/수정 =====
function saveNote() {
  const bookIdx = document.getElementById('note-book-select').value;
  const content = document.getElementById('note-content').value.trim();
  const impressive = document.getElementById('note-impressive').value.trim();
  const thoughts = document.getElementById('note-thoughts').value.trim();
  const rating = document.getElementById('note-rating').value;
  const editIdx = document.getElementById('edit-note-idx').value;

  if (!bookIdx) {
    alert('책을 선택해주세요.');
    return;
  }

  if (!content && !impressive && !thoughts) {
    alert('최소 하나의 내용을 작성해주세요.');
    return;
  }

  const notes = storage.get('notes') || [];

  if (editIdx !== '') {
    // 수정
    notes[editIdx].bookIdx = parseInt(bookIdx);
    notes[editIdx].content = content;
    notes[editIdx].impressive = impressive;
    notes[editIdx].thoughts = thoughts;
    notes[editIdx].rating = parseFloat(rating);
    alert('기록이 수정되었습니다!');
  } else {
    // 추가
    notes.push({
      bookIdx: parseInt(bookIdx),
      content,
      impressive,
      thoughts,
      rating: parseFloat(rating),
      date: new Date().toISOString()
    });
    alert('기록이 저장되었습니다!');
  }

  storage.set('notes', notes);

  // 폼 초기화
  document.getElementById('edit-note-idx').value = '';
  document.getElementById('note-book-select').value = '';
  document.getElementById('note-content').value = '';
  document.getElementById('note-impressive').value = '';
  document.getElementById('note-thoughts').value = '';
  document.getElementById('note-rating').value = 3;
  document.getElementById('rating-display').textContent = '⭐ 3.0';

  renderRecord();
  renderMy();
  renderHome();
  renderMemory();
}

function editNote(idx) {
  const notes = storage.get('notes') || [];
  const note = notes[idx];
  
  document.getElementById('edit-note-idx').value = idx;
  document.getElementById('note-book-select').value = note.bookIdx;
  document.getElementById('note-content').value = note.content;
  document.getElementById('note-impressive').value = note.impressive;
  document.getElementById('note-thoughts').value = note.thoughts;
  document.getElementById('note-rating').value = note.rating;
  document.getElementById('rating-display').textContent = `⭐ ${note.rating.toFixed(1)}`;
  
  // 스크롤해서 폼으로 이동
  document.getElementById('note-book-select').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('note-content').focus();
}

function deleteNote(idx) {
  if (confirm('이 기록을 삭제하시겠습니까?')) {
    const notes = storage.get('notes') || [];
    notes.splice(idx, 1);
    storage.set('notes', notes);
    renderRecord();
    renderMy();
    renderHome();
    renderMemory();
  }
}

// ===== 복습 기능 =====
function reviewBook(bookIdx) {
  if (confirm(`이 책을 복습했습니까?`)) {
    const reviews = storage.get('reviews') || [];
    reviews.push({
      bookIdx,
      date: new Date().toISOString(),
      completed: true
    });
    storage.set('reviews', reviews);
    renderMemory();
    renderHome();
    renderMy();
    alert('복습이 기록되었습니다!');
  }
}

// ===== 별점 입력 =====
document.addEventListener('DOMContentLoaded', () => {
  const ratingInput = document.getElementById('note-rating');
  if (ratingInput) {
    ratingInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('rating-display').textContent = `⭐ ${value.toFixed(1)}`;
    });
  }
});


// ===== 데이터 내보내기 =====
function exportData() {
  const data = {
    books: storage.get('books') || [],
    notes: storage.get('notes') || [],
    reviews: storage.get('reviews') || [],
    exportedAt: new Date().toISOString()
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookmind-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  alert('데이터가 내보내져졌습니다!');
}

// ===== 모든 데이터 삭제 =====
function clearAllData() {
  if (confirm('정말로 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
    storage.clear();
    initData();
    renderHome();
    renderBooks();
    renderRecord();
    renderMy();
    alert('모든 데이터가 삭제되었습니다.');
  }
}

// ===== STEP 4: 피드백 모달 =====
function showFeedbackModal(noteIdx) {
  const notes = storage.get('notes') || [];
  const note = notes[noteIdx];
  const feedback = generateFeedback(noteIdx);
  
  const modalEl = document.getElementById('feedback-modal');
  const issuesHTML = feedback.issues.map(issue => `
    <div class="issue-item">
      <strong>⚠️ ${issue.message}</strong>
    </div>
  `).join('');
  
  const suggestionsHTML = feedback.suggestions.map(suggestion => `
    <div class="suggestion-item">${suggestion}</div>
  `).join('');
  
  modalEl.innerHTML = `
    <div class="modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">📊 피드백 분석</h2>
        <button onclick="closeFeedbackModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 14px;">
          작성일: ${new Date(note.date).toLocaleDateString('ko-KR')}
        </p>
        <p style="color: #2d2d3d; line-height: 1.6; max-height: 100px; overflow-y: auto; background: #f8f7ff; padding: 12px; border-radius: 8px;">
          ${note.content}
        </p>
      </div>
      
      ${issuesHTML.length > 0 ? `
        <h3 style="margin: 20px 0 12px; color: #ef4444;">확인할 부분:</h3>
        <div style="margin-bottom: 20px;">
          ${issuesHTML}
        </div>
      ` : ''}
      
      <h3 style="margin: 20px 0 12px; color: #7c5cde;">개선 제안:</h3>
      <div>
        ${suggestionsHTML}
      </div>
      
      <button onclick="closeFeedbackModal()" class="btn btn-primary" style="width: 100%; margin-top: 20px;">닫기</button>
    </div>
  `;
  
  modalEl.classList.add('active');
}

function closeFeedbackModal() {
  const modalEl = document.getElementById('feedback-modal');
  modalEl.classList.remove('active');
}

// ===== STEP 5: AI 독후감 도우미 =====
function generateFeedbackReview() {
  const reviewText = document.getElementById('review-input').value.trim();
  
  if (reviewText.length < 50) {
    alert('최소 50자 이상 입력해주세요.');
    return;
  }

  // 독후감 분석
  const sentences = reviewText.split(/[.!?。!？]+/).filter(s => s.trim());
  
  // 개선 포인트 분석
  const improvements = [];
  const sentenceCount = sentences.length;
  
  // 체크 1: 문장 다양성
  if (sentenceCount < 3) {
    improvements.push({
      type: 'structure',
      message: '더 많은 문장으로 다양한 관점을 표현하면 좋습니다.'
    });
  }
  
  // 체크 2: 구체성
  if (reviewText.length < 100) {
    improvements.push({
      type: 'depth',
      message: '구체적인 예시나 이유를 추가하면 더 설득력 있습니다.'
    });
  }
  
  // 체크 3: 표현 다양성
  const commonWords = ['생각', '느껴', '좋아', '있다', '이다'];
  const hasCommon = commonWords.some(word => reviewText.includes(word));
  if (hasCommon) {
    improvements.push({
      type: 'expression',
      message: '더 구체적인 동사나 표현으로 다듬으면 좋습니다.'
    });
  }
  
  // 개선된 독후감 생성
  const improvedReview = enhanceReviewText(reviewText);
  
  // 모달에 표시
  const reviewModal = `
    <div class="modal-header">
      <h3>📝 AI와 함께 한 독후감 개선</h3>
      <button onclick="closeReviewModal()" class="close-btn">✕</button>
    </div>
    <div class="modal-content">
      <div class="review-comparison">
        <div class="review-comparison-item">
          <h4>원본</h4>
          <p>${reviewText}</p>
        </div>
        <div class="review-comparison-item" style="border-left-color: #7c5cde;">
          <h4>AI 개선본</h4>
          <p>${improvedReview}</p>
        </div>
      </div>
      
      ${improvements.length > 0 ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line);">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: var(--text-secondary);">
            💡 개선 제안
          </h4>
          ${improvements.map((imp, idx) => `
            <div class="suggestion-item" style="margin-bottom: 8px;">
              <strong>${imp.message}</strong>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="saveImprovedReview('${improvedReview.replace(/'/g, "\\'")}')" style="flex: 1;">
          💾 개선본 저장
        </button>
        <button class="btn" onclick="closeReviewModal()" style="flex: 1;">
          닫기
        </button>
      </div>
    </div>
  `;
  
  const modalEl = document.getElementById('feedback-modal');
  modalEl.innerHTML = reviewModal;
  modalEl.classList.add('active');
}

function enhanceReviewText(text) {
  // 기본 텍스트 개선 로직
  let enhanced = text;
  
  // 문장 구조 개선
  const sentences = text.split(/[.!?。!？]+/).filter(s => s.trim());
  
  if (sentences.length > 0) {
    enhanced = sentences
      .map((sentence, idx) => {
        let improved = sentence.trim();
        
        // 표현 개선 (간단한 예시)
        improved = improved
          .replace(/이 책은 /g, '이 저서는 ')
          .replace(/정말 좋았다/g, '매우 인상적이었다')
          .replace(/느껴졌다/g, '감지되었다')
          .replace(/생각해본다/g, '성찰해본다')
          .replace(/좋은 내용/g, '흥미로운 내용')
          .replace(/배웠다/g, '획득했다')
          .replace(/\.\.\./g, '—');
        
        // 첫 글자 대문자
        if (improved.length > 0) {
          improved = improved.charAt(0).toUpperCase() + improved.slice(1);
        }
        
        return improved;
      })
      .join('. ') + '.';
  }
  
  return enhanced;
}

function saveImprovedReview(improvedText) {
  const reviews = storage.get('reviews') || [];
  
  const review = {
    text: improvedText,
    date: new Date().toISOString(),
    original: document.getElementById('review-input').value,
    improved: true
  };
  
  reviews.push(review);
  storage.set('reviews', reviews);
  
  // 입력 필드 초기화
  document.getElementById('review-input').value = '';
  
  alert('✨ 개선된 독후감이 저장되었습니다!');
  closeReviewModal();
}

function closeReviewModal() {
  const modalEl = document.getElementById('feedback-modal');
  modalEl.classList.remove('active');
}

// ===== STEP 5: AI 필사 지원 =====
function generatePracticeQuote() {
  const notes = storage.get('notes') || [];
  
  if (notes.length === 0) {
    alert('기록이 없어서 필사할 문장을 찾을 수 없습니다. 먼저 책을 읽고 기록을 추가해주세요.');
    return;
  }
  
  // 모든 기록에서 문장 수집
  const sentences = [];
  notes.forEach(note => {
    const text = (note.content || '') + ' ' + (note.impressive || '');
    const parts = text.split(/[.!?。!？]+/).filter(s => s.trim());
    parts.forEach(part => {
      if (part.trim().length > 10) {
        sentences.push(part.trim());
      }
    });
  });
  
  if (sentences.length === 0) {
    alert('기록에서 필사할 문장을 찾을 수 없습니다.');
    return;
  }
  
  // 임의의 문장 선택
  const randomIdx = Math.floor(Math.random() * sentences.length);
  const selectedQuote = sentences[randomIdx];
  
  // 글로벌 변수에 저장 (검증용)
  window.currentPracticeQuote = selectedQuote;
  
  // UI 업데이트
  document.getElementById('practice-quote').innerHTML = `<p style="margin: 0; line-height: 1.6;">"${selectedQuote}"</p>`;
  document.getElementById('practice-input').value = '';
  document.getElementById('practice-input').focus();
}

function submitPractice() {
  const userText = document.getElementById('practice-input').value.trim();
  const originalText = window.currentPracticeQuote;
  
  if (!originalText) {
    alert('먼저 문장을 가져와주세요.');
    return;
  }
  
  if (userText.length === 0) {
    alert('필사 내용을 입력해주세요.');
    return;
  }
  
  // 정확도 계산
  const accuracy = calculateAccuracy(originalText, userText);
  
  // 결과 저장
  const practices = storage.get('practices') || [];
  practices.push({
    originalText: originalText,
    userText: userText,
    accuracy: accuracy,
    date: new Date().toISOString()
  });
  storage.set('practices', practices);
  
  // 피드백 표시
  let feedback = '';
  if (accuracy >= 90) {
    feedback = '🌟 완벽합니다! 매우 정확하게 필사했어요!';
  } else if (accuracy >= 80) {
    feedback = '👏 훌륭합니다! 거의 완벽해요!';
  } else if (accuracy >= 70) {
    feedback = '✅ 잘했습니다! 조금 더 집중하면 더 좋을 거예요.';
  } else if (accuracy >= 60) {
    feedback = '🎯 괜찮습니다. 한번 더 시도해보세요!';
  } else {
    feedback = '💪 처음이니까 괜찮아요. 계속 연습하면 좋아질 거예요!';
  }
  
  alert(`정확도: ${accuracy}%\n${feedback}\n\n다음 문장을 필사해보세요!`);
  
  // 입력 필드 초기화 및 다음 문장 로드
  document.getElementById('practice-input').value = '';
  generatePracticeQuote();
}

function calculateAccuracy(original, userText) {
  // 정확도 계산: 유사 문자 비교
  const orig = original.toLowerCase().replace(/\s/g, '');
  const user = userText.toLowerCase().replace(/\s/g, '');
  
  let matches = 0;
  const minLen = Math.min(orig.length, user.length);
  
  for (let i = 0; i < minLen; i++) {
    if (orig[i] === user[i]) {
      matches++;
    }
  }
  
  // 문자 수 차이 페널티
  const lengthPenalty = Math.abs(orig.length - user.length) * 0.5;
  const accuracy = Math.round((matches / Math.max(orig.length, user.length)) * 100);
  
  return Math.max(0, Math.min(100, accuracy));
}

window.addEventListener('DOMContentLoaded', () => {
  initData();
  switchTab('home');
});
