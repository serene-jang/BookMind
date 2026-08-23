/**
 * BookMind - STEP 3 메인 앱 로직
 * AI 퀴즈 + 서술형 개선 + PDF 지원
 */

// 알라딘 API 키는 서버(server.py)가 .env에서 읽어 보관하며 프론트엔드에는 노출되지 않는다

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

function calculateMemoryBreakdown(bookIdx) {
  const notes = storage.get('notes') || [];
  const quizzes = storage.get('quizzes') || [];
  const bookNotes = notes.filter(n => n.bookIdx === bookIdx);

  if (bookNotes.length === 0) {
    return {
      plot: 0,
      character: 0,
      detail: 0,
      concept: 0
    };
  }

  const withContent = bookNotes.filter(n => (n.content || '').trim().length > 15).length;
  const withImpressive = bookNotes.filter(n => (n.impressive || '').trim().length > 15).length;
  const withThoughts = bookNotes.filter(n => (n.thoughts || '').trim().length > 15).length;

  const bookQuizzes = quizzes.filter(q => q.bookIdx === bookIdx && q.userAnswer !== -1);
  const correct = bookQuizzes.filter(q => q.score === 10).length;
  const quizRate = bookQuizzes.length > 0 ? Math.round((correct / bookQuizzes.length) * 100) : 0;

  return {
    plot: Math.round((withContent / bookNotes.length) * 100),
    character: Math.round((withImpressive / bookNotes.length) * 100),
    detail: quizRate,
    concept: Math.round((withThoughts / bookNotes.length) * 100)
  };
}

function getReadingCoachMessage() {
  const books = storage.get('books') || [];
  const quizzes = storage.get('quizzes') || [];

  if (books.length === 0) {
    return '책을 먼저 등록해볼까요? 한 권을 시작하면 맞춤 코칭이 시작돼요.';
  }

  const latestBookIdx = books.length - 1;
  const latestBook = books[latestBookIdx];
  const breakdown = calculateMemoryBreakdown(latestBookIdx);
  const latestQuiz = quizzes.filter(q => q.bookIdx === latestBookIdx && q.userAnswer !== -1).slice(-5);
  const wrongCount = latestQuiz.filter(q => q.score !== 10).length;

  if (breakdown.detail < 60) {
    return `"${latestBook.title}"은 세부 사건 기억이 약해요. 짧은 퀴즈 3문제로 다시 확인해볼까요?`;
  }

  if (breakdown.character < 60) {
    return `"${latestBook.title}"은 인물/장면 근거를 다시 확인하면 더 오래 기억할 수 있어요.`;
  }

  if (wrongCount >= 3) {
    return `최근 퀴즈에서 헷갈린 부분이 있었어요. 틀린 문제 중심으로 복습해볼까요?`;
  }

  return `좋아요! "${latestBook.title}"의 핵심을 잘 이해하고 있어요. 오늘은 10분 필사로 기억을 고정해보세요.`;
}

function getNextReviewDate(startDate, reviewScheduleDay) {
  const start = new Date(startDate);
  const nextDate = new Date(start);
  nextDate.setDate(nextDate.getDate() + reviewScheduleDay);
  return nextDate.toISOString().split('T')[0];
}

const STOPWORDS = [
  '이것', '그것', '저것', '것', '겠', '했', '있', '되', '같', '또는', '그리고',
  '때문', '때문에', '중에', '처럼', '생각', '말', '일', '수', '들', '거', '명',
  '그', '그곳', '거기', '어디', '뭔가', '아무', '하다', '있다', '되다',
  '이다', '무엇', '무엇이', '누구', '몇', '어느', '안', '밖', '위', '아래',
  '앞', '뒤', '옆', '안다', '모르다', '싶다', '같다', '다르다', '높다', '낮다'
];

function extractTopKeywords(text, topN = 20) {
  const wordFreq = {};
  const words = (text || '').toLowerCase().split(/[\s,。.!?();:\-]+/);

  words.forEach(word => {
    if (
      word.length >= 2 &&
      word.length <= 15 &&
      !STOPWORDS.includes(word) &&
      word.match(/[가-힣a-zA-Z0-9]/)
    ) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, topN);
}

function getBookSourceMap() {
  return storage.get('bookSources') || {};
}

function getBookSource(book) {
  if (!book || !book.id) return null;
  const sourceMap = getBookSourceMap();
  return sourceMap[book.id] || null;
}

function upsertBookSource(bookId, sourceData) {
  const sourceMap = getBookSourceMap();
  sourceMap[bookId] = sourceData;
  storage.set('bookSources', sourceMap);
}

function ensureBookIds() {
  const books = storage.get('books') || [];
  let changed = false;

  books.forEach(book => {
    if (!book.id) {
      book.id = `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      changed = true;
    }
  });

  if (changed) {
    storage.set('books', books);
  }
}

// ===== STEP 3: AI 퀴즈 생성 =====
// ===== STEP 4: 개선된 AI 퀴즈 생성 (고도화) =====
function generateQuiz(bookIdx) {
  const notes = storage.get('notes') || [];
  const books = storage.get('books') || [];
  const book = books[bookIdx];
  const bookNotes = notes.filter(n => n.bookIdx === bookIdx);
  const source = getBookSource(book);

  if (bookNotes.length === 0 && !source?.text) {
    alert('이 책의 기록 또는 원본 자료가 없어 퀴즈를 만들 수 없습니다.');
    return null;
  }

  const sourceText = source?.text || '';
  const noteText = bookNotes
    .map(note => `${note.content || ''} ${note.impressive || ''} ${note.thoughts || ''}`)
    .join(' ');
  const analysisText = sourceText ? `${sourceText} ${noteText}` : noteText;
  if (!sourceText) {
    alert('이 퀴즈는 사용자 기록만을 근거로 생성됩니다. 가능하면 책 원본(PDF/TXT)을 업로드해 정확도를 높이세요.');
  }
  const sortedWords = extractTopKeywords(analysisText, 20);
  
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
  const question = `'${book.title}'에서 배운 주요 내용은?`;
  const evidenceSnippet = sourceText
    ? sourceText.substring(0, 180)
    : noteText.substring(0, 180);

  return {
    bookIdx,
    question,
    options,
    correctIdx,
    userAnswer: -1,
    score: 0,
    date: new Date().toISOString(),
    evidenceType: sourceText ? 'book_source' : 'user_notes',
    evidenceHint: sourceText
      ? '📖 사용자가 업로드한 책 원본 자료를 근거로 생성됨'
      : '⚠️ 사용자 기록만을 근거로 생성됨 (실제 책 내용과 다를 수 있음)',
    evidenceSnippet
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
  
  const sortedWords = extractTopKeywords(contentInput, 20);
  
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
    sourceText: contentInput.substring(0, 200),
    evidenceType: 'user_input',
    evidenceHint: '⚠️ 사용자 입력 텍스트를 근거로 생성됨 (실제 책 내용과 다를 수 있음)',
    evidenceSnippet: contentInput.substring(0, 180)
  };
  
  const quizzes = storage.get('quizzes') || [];
  quizzes.push(quiz);
  storage.set('quizzes', quizzes);
  
  // 입력 필드 초기화
  document.getElementById('content-input').value = '';
  
  // 퀴즈 탭으로 자동 전환
  alert('✨ 퀴즈가 생성되었습니다!\n※ 이 퀴즈는 사용자 입력 텍스트를 근거로 생성되었습니다.');
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
  if (!storage.get('bookSources')) {
    storage.set('bookSources', {});
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

  ensureBookIds();
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

  const coachEl = document.getElementById('home-coach');
  if (coachEl) {
    coachEl.innerHTML = `
      <div style="background: rgba(124, 92, 222, 0.08); border: 1px solid var(--line); border-radius: 10px; padding: 12px;">
        <p style="margin: 0; line-height: 1.6;">${getReadingCoachMessage()}</p>
      </div>
    `;
  }
}


// ===== 내 책 탭 렌더링 =====
// ===== STEP 6: 필터 상태 글로벌 변수 =====
let currentBookFilter = '';

function filterBooks(category) {
  currentBookFilter = category;
  
  // 필터 버튼 활성화 상태 업데이트
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes(category === '' ? '전체' : category)) {
      btn.classList.add('active');
    }
  });
  
  renderBooks();
}

function renderBooks() {
  const books = storage.get('books') || [];
  const bookListEl = document.getElementById('book-list');

  // 필터 적용
  let filteredBooks = books;
  if (currentBookFilter) {
    filteredBooks = books.filter(book => book.category === currentBookFilter);
  }

  if (filteredBooks.length === 0) {
    bookListEl.innerHTML = `<p class="muted">${currentBookFilter ? '해당 카테고리의' : '등록된'} 책이 없습니다.</p>`;
    updateBookSelectList(books);  // 전체 책으로 유지
    return;
  }

  const bookHTML = filteredBooks.map((book, origIdx) => {
    // 원래 인덱스 찾기
    const idx = books.indexOf(book);
    
    return `
    <div class="book-card">
      <div class="book-info">
        <p class="book-title">${book.title}</p>
        <p class="book-author">${book.author}</p>
        <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; font-size: 12px;">
          <span class="book-status">${book.status === 'reading' ? '읽는 중' : '완독'}</span>
          ${book.category ? `<span style="background: rgba(124, 92, 222, 0.1); color: var(--brand); padding: 2px 6px; border-radius: 4px;">${book.category}</span>` : ''}
          ${book.difficulty ? `<span style="color: #f59e0b;">⭐ ${book.difficulty}/5</span>` : ''}
          ${getBookSource(book) ? `<span style="background: rgba(16, 185, 129, 0.12); color: #047857; padding: 2px 6px; border-radius: 4px;">📖 원본 연결됨</span>` : `<span style="background: rgba(245, 158, 11, 0.12); color: #b45309; padding: 2px 6px; border-radius: 4px;">원본 없음</span>`}
          <span style="color: #7c5cde; font-weight: 600;">기억률: ${calculateMemoryRate(idx)}%</span>
        </div>
        ${book.tags && book.tags.length > 0 ? `
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
          ${book.tags.map(tag => `<span style="background: rgba(124, 92, 222, 0.08); padding: 2px 6px; border-radius: 4px; font-size: 11px; color: var(--text-secondary);">#${tag}</span>`).join('')}
        </div>
        ` : ''}
      </div>
      <div class="book-actions">
        <button class="btn" onclick="editBook(${idx})" style="padding: 6px 8px; font-size: 12px;">수정</button>
        <button class="btn" onclick="deleteBook(${idx})" style="padding: 6px 8px; font-size: 12px;">삭제</button>
      </div>
    </div>
  `}).join('');

  bookListEl.innerHTML = bookHTML;
  updateBookSelectList(books);
}

function updateBookSelectList(books) {
  const select = document.getElementById('note-book-select');
  const reviewSelect = document.getElementById('review-book-select');
  const practiceSelect = document.getElementById('practice-book-select');
  const options = books.map((book, idx) => `
    <option value="${idx}">${book.title}</option>
  `).join('');
  const base = '<option value="">책을 선택하세요</option>' + options;
  if (select) select.innerHTML = base;
  if (reviewSelect) reviewSelect.innerHTML = base;
  if (practiceSelect) practiceSelect.innerHTML = base;
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
      const breakdown = calculateMemoryBreakdown(idx);
      return `
        <div class="memory-card">
          <p class="book-name">${book.title}</p>
          <div class="memory-bar">
            <div class="memory-fill" style="width: ${memory}%"></div>
          </div>
          <div class="memory-value">기억률: ${memory}%</div>
          <div style="margin-top: 10px; font-size: 12px; color: var(--muted);">영역별 기억 상태</div>
          <div style="margin-top: 8px; display: grid; gap: 6px;">
            <div>줄거리 █${'█'.repeat(Math.round(breakdown.plot / 10))}${'░'.repeat(10 - Math.round(breakdown.plot / 10))} ${breakdown.plot}%</div>
            <div>등장인물 █${'█'.repeat(Math.round(breakdown.character / 10))}${'░'.repeat(10 - Math.round(breakdown.character / 10))} ${breakdown.character}%</div>
            <div>세부내용 █${'█'.repeat(Math.round(breakdown.detail / 10))}${'░'.repeat(10 - Math.round(breakdown.detail / 10))} ${breakdown.detail}%</div>
            <div>핵심개념 █${'█'.repeat(Math.round(breakdown.concept / 10))}${'░'.repeat(10 - Math.round(breakdown.concept / 10))} ${breakdown.concept}%</div>
          </div>
        </div>
      `;
    }).join('');
    memoryListEl.innerHTML = memoryHTML;
  }
}


// ===== 기록 탭 렌더링 =====
function renderRecord() {
  const books = storage.get('books') || [];
  updateBookSelectList(books);

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
        <div class="quiz-evidence">
          <strong>문제 출처:</strong> ${quiz.evidenceHint || '정보 없음'}
          ${quiz.evidenceSnippet ? `<div style="margin-top: 6px; color: var(--muted);">근거 미리보기: ${quiz.evidenceSnippet}...</div>` : ''}
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
  
  const isCorrect = score === 10;
  const resultText = isCorrect ? '🎉 정답입니다!' : '❌ 틀렸습니다.';
  const correctText = `정답: ${String.fromCharCode(65 + quiz.correctIdx)}`;
  const selectedText = `선택: ${String.fromCharCode(65 + selectedIdx)}`;
  
  // 결과 모달 표시
  const quizResultModal = `
    <div class="modal-header">
      <h3>🎯 퀴즈 결과</h3>
      <button onclick="closeReviewModal()" class="close-btn">✕</button>
    </div>
    <div class="modal-content">
      <div style="margin-bottom: 16px; padding: 12px; background: ${isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 107, 107, 0.1)'}; border-radius: 8px; border-left: 4px solid ${isCorrect ? '#10b981' : '#ff6b6b'}; text-align: center;">
        <div style="font-size: 24px; font-weight: 700; margin-bottom: 4px; color: ${isCorrect ? '#10b981' : '#ff6b6b'};">${resultText}</div>
        <div style="font-size: 14px; color: var(--text-secondary);">${correctText}</div>
        ${!isCorrect ? `<div style="font-size: 14px; color: var(--text-secondary);">${selectedText}</div>` : ''}
      </div>
      
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">📌 문제</h4>
        <p style="margin: 0; padding: 8px; background: var(--bg); border-radius: 4px; color: var(--text);">${quiz.question}</p>
      </div>

      <div class="quiz-evidence" style="margin-bottom: 16px;">
        <strong>문제 출처:</strong> ${quiz.evidenceHint || '정보 없음'}
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="shareQuizResult('${quiz.question.replace(/'/g, "\\'")}', ${quiz.correctIdx}, ${selectedIdx}, ${score})" style="flex: 1;">
          📤 공유
        </button>
        <button class="btn" onclick="closeReviewModal(); renderQuiz();" style="flex: 1;">
          ➡️ 다음
        </button>
        <button class="btn" onclick="closeReviewModal()" style="flex: 1;">
          닫기
        </button>
      </div>
    </div>
  `;
  
  const modalEl = document.getElementById('feedback-modal');
  modalEl.innerHTML = quizResultModal;
  modalEl.classList.add('active');
  
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
  
  // ===== STEP 6: 백업 정보 표시 =====
  updateBackupInfo();
}

// ===== 알라딘 도서 검색 API (서버 프록시 경유) =====
async function searchAladinBooks() {
  const query = document.getElementById('book-title').value.trim();
  const resultsEl = document.getElementById('aladin-search-results');

  if (!query) {
    alert('검색할 책 제목을 입력해주세요.');
    return;
  }

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = '<p class="muted" style="margin: 8px;">검색 중...</p>';

  try {
    const response = await fetch(`/api/search-book?query=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      resultsEl.innerHTML = `<p class="muted" style="margin: 8px; color: #dc2626;">검색 실패: ${data.error || '알 수 없는 오류'}</p>`;
      return;
    }

    if (data.errorCode) {
      resultsEl.innerHTML = `<p class="muted" style="margin: 8px; color: #dc2626;">검색 실패: ${data.errorMessage || '알 수 없는 오류'}</p>`;
      return;
    }

    const items = data.item || [];
    if (items.length === 0) {
      resultsEl.innerHTML = '<p class="muted" style="margin: 8px;">검색 결과가 없습니다.</p>';
      return;
    }

    window.__aladinSearchItems = items;

    resultsEl.innerHTML = items.map((item, idx) => `
      <div class="aladin-result-item" onclick="selectAladinResult(${idx})">
        ${item.cover ? `<img src="${item.cover}" alt="" class="aladin-result-cover">` : ''}
        <div class="aladin-result-info">
          <p class="aladin-result-title">${item.title || ''}</p>
          <p class="aladin-result-meta">${(item.author || '').split(',')[0]} · ${item.publisher || ''}</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    resultsEl.innerHTML = `<p class="muted" style="margin: 8px; color: #dc2626;">검색 중 오류가 발생했습니다: ${error.message} (server.py로 실행 중인지 확인하세요)</p>`;
  }
}

function selectAladinResult(idx) {
  const items = window.__aladinSearchItems || [];
  const item = items[idx];
  if (!item) return;

  document.getElementById('book-title').value = (item.title || '').split('-')[0].trim();
  document.getElementById('book-author').value = (item.author || '').split('(')[0].trim();

  const categoryGuess = guessCategoryFromAladin(item.categoryName || '');
  if (categoryGuess) {
    document.getElementById('book-category').value = categoryGuess;
  }

  const resultsEl = document.getElementById('aladin-search-results');
  resultsEl.style.display = 'none';
  resultsEl.innerHTML = '';
}

function guessCategoryFromAladin(categoryName) {
  const map = {
    '소설': '소설',
    '시/에세이': '소설',
    '역사': '역사',
    '과학': '과학',
    '자기계발': '자기개발',
    '경제경영': '자기개발',
    '컴퓨터': '기술',
    'IT': '기술',
    '예술': '예술',
    '만화': '예술'
  };

  const found = Object.keys(map).find(key => categoryName.includes(key));
  return found ? map[found] : '';
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

async function extractTextFromPdf(file) {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF 파서를 불러오지 못했습니다.');
  }

  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.6.82/pdf.worker.min.js';
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pageTexts.push(text);
  }

  return pageTexts.join('\n');
}

async function parseBookSourceFile(file) {
  const ext = file.name.toLowerCase().split('.').pop();

  if (ext === 'txt') {
    return await file.text();
  }

  if (ext === 'pdf') {
    return await extractTextFromPdf(file);
  }

  throw new Error('지원하지 않는 파일 형식입니다. PDF 또는 TXT를 사용해주세요.');
}

function updateBookSourceStatus(book) {
  const statusEl = document.getElementById('book-source-status');
  if (!statusEl) return;

  const source = getBookSource(book);
  if (!source) {
    statusEl.textContent = '아직 업로드된 원본이 없습니다.';
    return;
  }

  const chars = (source.text || '').length;
  const updated = new Date(source.updatedAt).toLocaleDateString('ko-KR');
  statusEl.textContent = `업로드됨: ${source.fileName} · ${chars.toLocaleString()}자 · ${updated}`;
}

async function handleBookSourceUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const editIdx = document.getElementById('edit-book-idx').value;
  if (editIdx === '') {
    alert('먼저 책 정보를 저장한 뒤 원본 파일을 업로드해주세요.');
    event.target.value = '';
    return;
  }

  const books = storage.get('books') || [];
  const book = books[editIdx];
  if (!book || !book.id) {
    alert('책 정보를 찾을 수 없습니다. 다시 시도해주세요.');
    event.target.value = '';
    return;
  }

  try {
    const text = await parseBookSourceFile(file);
    const normalized = (text || '').replace(/\s+/g, ' ').trim();

    if (normalized.length < 100) {
      alert('텍스트가 너무 짧습니다. 본문이 포함된 파일을 업로드해주세요.');
      event.target.value = '';
      return;
    }

    upsertBookSource(book.id, {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      text: normalized,
      updatedAt: new Date().toISOString()
    });

    updateBookSourceStatus(book);
    alert('원본 자료 업로드가 완료되었습니다. 이제 퀴즈가 원본을 근거로 생성됩니다.');
  } catch (error) {
    alert(`파일 처리 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    event.target.value = '';
  }
}

// ===== 책 추가 폼 =====
function openAddBookForm() {
  document.getElementById('edit-book-idx').value = '';
  document.getElementById('book-title').value = '';
  document.getElementById('book-author').value = '';
  document.getElementById('book-start-date').value = '';
  document.getElementById('book-status').value = 'reading';
  document.getElementById('book-category').value = '';
  document.getElementById('book-difficulty').value = '3';
  document.getElementById('difficulty-display').textContent = '3';
  document.getElementById('book-tags').value = '';
  document.getElementById('book-source-group').style.display = 'none';
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
  document.getElementById('book-category').value = book.category || '';
  document.getElementById('book-difficulty').value = book.difficulty || '3';
  document.getElementById('difficulty-display').textContent = book.difficulty || '3';
  document.getElementById('book-tags').value = (book.tags || []).join(', ');
  document.getElementById('book-source-group').style.display = 'block';
  updateBookSourceStatus(book);
  document.getElementById('book-form-title').textContent = '책 수정';
  document.getElementById('book-add-form').style.display = 'block';
  document.getElementById('book-title').focus();
}

function saveBook() {
  const title = document.getElementById('book-title').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const startDate = document.getElementById('book-start-date').value;
  const status = document.getElementById('book-status').value;
  const category = document.getElementById('book-category').value;
  const difficulty = parseInt(document.getElementById('book-difficulty').value);
  const tagsStr = document.getElementById('book-tags').value.trim();
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
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
    books[editIdx].category = category;
    books[editIdx].difficulty = difficulty;
    books[editIdx].tags = tags;
    alert('책이 수정되었습니다!');
  } else {
    // 추가
    books.push({
      id: `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      author,
      startDate: startDate || new Date().toISOString().split('T')[0],
      status,
      category,
      difficulty,
      tags,
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
    const sourceMap = getBookSourceMap();
    const targetBook = books[idx];
    
    // 책의 모든 기록도 삭제
    const filteredNotes = notes.filter(n => n.bookIdx !== idx);
    storage.set('notes', filteredNotes);

    if (targetBook?.id && sourceMap[targetBook.id]) {
      delete sourceMap[targetBook.id];
      storage.set('bookSources', sourceMap);
    }
    
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
  // STEP 6: 다크모드 초기화
  initTheme();
  
  const ratingInput = document.getElementById('note-rating');
  if (ratingInput) {
    ratingInput.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('rating-display').textContent = `⭐ ${value.toFixed(1)}`;
    });
  }

  const practiceInput = document.getElementById('practice-input');
  if (practiceInput) {
    practiceInput.addEventListener('input', updatePracticeLiveFeedback);
  }
});


// ===== 데이터 내보내기 =====
function exportData() {
  const data = {
    version: '0.6.0',
    exportedAt: new Date().toISOString(),
    books: storage.get('books') || [],
    notes: storage.get('notes') || [],
    reviews: storage.get('reviews') || [],
    quizzes: storage.get('quizzes') || [],
    practices: storage.get('practices') || []
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookmind-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // 백업 날짜 저장
  const backupDate = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  storage.set('lastBackupDate', backupDate);
  updateBackupInfo();
  
  showShareNotification('백업 완료! 🎉');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      
      // 데이터 검증
      if (!importedData.books || !importedData.notes) {
        alert('유효하지 않은 백업 파일입니다.');
        return;
      }
      
      // 충돌 해결 방식 확인
      const overwrite = confirm('기존 데이터를 덮어쓸까요?\n\n「아니오」를 선택하면 데이터를 병합합니다.');
      
      if (overwrite) {
        // 덮어쓰기
        storage.set('books', importedData.books || []);
        storage.set('notes', importedData.notes || []);
        storage.set('reviews', importedData.reviews || []);
        storage.set('quizzes', importedData.quizzes || []);
        storage.set('practices', importedData.practices || []);
      } else {
        // 병합 - 배열 병합
        const existingBooks = storage.get('books') || [];
        const existingNotes = storage.get('notes') || [];
        const existingReviews = storage.get('reviews') || [];
        const existingQuizzes = storage.get('quizzes') || [];
        const existingPractices = storage.get('practices') || [];
        
        // 중복 제거를 위한 간단한 로직 (title 기준)
        const newBooks = importedData.books || [];
        const mergedBooks = [...existingBooks];
        
        newBooks.forEach(newBook => {
          if (!mergedBooks.find(b => b.title === newBook.title && b.author === newBook.author)) {
            mergedBooks.push(newBook);
          }
        });
        
        storage.set('books', mergedBooks);
        storage.set('notes', [...existingNotes, ...(importedData.notes || [])]);
        storage.set('reviews', [...existingReviews, ...(importedData.reviews || [])]);
        storage.set('quizzes', [...existingQuizzes, ...(importedData.quizzes || [])]);
        storage.set('practices', [...existingPractices, ...(importedData.practices || [])]);
      }
      
      // 백업 날짜 업데이트
      const backupDate = new Date(importedData.exportedAt || Date.now()).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      storage.set('lastBackupDate', backupDate);
      updateBackupInfo();
      
      // UI 새로고침
      renderHome();
      renderBooks();
      renderRecord();
      renderMemory();
      renderQuiz();
      renderMy();
      
      showShareNotification('데이터 복원 완료! 🎉');
    } catch (error) {
      alert('파일을 읽는 중 오류가 발생했습니다.');
      console.error(error);
    }
  };
  reader.readAsText(file);
  
  // 파일 입력 초기화
  event.target.value = '';
}

function updateBackupInfo() {
  const lastBackup = storage.get('lastBackupDate');
  const backupEl = document.getElementById('last-backup');
  if (backupEl) {
    backupEl.textContent = lastBackup ? `최근 백업: ${lastBackup}` : '최근 백업: 없음';
  }
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
function compareTextWithBookSource(userText, sourceText) {
  if (!sourceText) {
    return {
      matched: [],
      review: [],
      mismatch: [],
      hasSource: false
    };
  }

  const normalizedSource = sourceText.toLowerCase().replace(/\s+/g, '');
  const sentences = (userText || '')
    .split(/[.!?。!？]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 8)
    .slice(0, 8);

  const matched = [];
  const review = [];
  const mismatch = [];

  sentences.forEach(sentence => {
    const normalizedSentence = sentence.toLowerCase().replace(/\s+/g, '');
    if (!normalizedSentence) return;

    if (normalizedSource.includes(normalizedSentence)) {
      matched.push(sentence);
      return;
    }

    const keywords = extractTopKeywords(sentence, 4);
    const hitCount = keywords.filter(k => sourceText.toLowerCase().includes(k)).length;

    if (hitCount >= 2) {
      review.push(sentence);
    } else {
      mismatch.push(sentence);
    }
  });

  return {
    matched,
    review,
    mismatch,
    hasSource: true
  };
}

function showFeedbackModal(noteIdx) {
  const notes = storage.get('notes') || [];
  const books = storage.get('books') || [];
  const note = notes[noteIdx];
  const book = books[note.bookIdx];
  const feedback = generateFeedback(noteIdx);
  const sourceText = getBookSource(book)?.text || '';
  const compareTarget = `${note.content || ''} ${note.impressive || ''} ${note.thoughts || ''}`;
  const compare = compareTextWithBookSource(compareTarget, sourceText);
  
  const modalEl = document.getElementById('feedback-modal');
  const issuesHTML = feedback.issues.map(issue => `
    <div class="issue-item">
      <strong>⚠️ ${issue.message}</strong>
    </div>
  `).join('');
  
  const suggestionsHTML = feedback.suggestions.map(suggestion => `
    <div class="suggestion-item">${suggestion}</div>
  `).join('');

  const compareHTML = compare.hasSource
    ? `
      <h3 style="margin: 20px 0 10px; color: var(--brand);">📖 원본과 비교</h3>
      <div style="background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 12px;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: var(--muted);">AI가 단정하지 않고, 확인 힌트로 안내합니다.</p>
        <p style="margin: 6px 0;">✓ 일치 가능: ${compare.matched.length}개</p>
        <p style="margin: 6px 0;">△ 확인 필요: ${compare.review.length}개</p>
        <p style="margin: 6px 0;">✗ 다를 가능성: ${compare.mismatch.length}개</p>
        ${compare.review.length > 0 ? `<p style="margin: 10px 0 0 0; font-size: 13px; color: var(--text);">확인 필요 예시: "${compare.review[0]}"</p>` : ''}
        ${compare.mismatch.length > 0 ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #b45309;">다를 가능성 예시: "${compare.mismatch[0]}"</p>` : ''}
      </div>
    `
    : `
      <h3 style="margin: 20px 0 10px; color: var(--brand);">📖 원본과 비교</h3>
      <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 12px; color: #92400e;">
        이 책은 아직 원본 자료가 없어 비교를 확인할 수 없습니다.
      </div>
    `;
  
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

      ${compareHTML}
      
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
  const reviewBookIdx = document.getElementById('review-book-select').value;
  const books = storage.get('books') || [];
  const selectedBook = reviewBookIdx !== '' ? books[parseInt(reviewBookIdx, 10)] : null;
  const sourceText = selectedBook ? (getBookSource(selectedBook)?.text || '') : '';
  const compare = compareTextWithBookSource(reviewText, sourceText);

  if (reviewBookIdx === '') {
    alert('독후감 대상 책을 먼저 선택해주세요.');
    return;
  }
  
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

  if (!sourceText) {
    improvements.push({
      type: 'source',
      message: '원본 자료가 없어 사실 일치 여부를 충분히 확인할 수 없습니다.'
    });
  }
  
  // 개선된 독후감 생성
  const improvedReview = enhanceReviewText(reviewText);
  const modelReview = generateModelReview(reviewText, sourceText, selectedBook?.title || '선택한 책');

  const compareSummary = sourceText
    ? `
      <div style="margin-top: 16px; padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--line);">
        <h4 style="margin: 0 0 8px 0; font-size: 13px;">📖 원본 비교 결과</h4>
        <p style="margin: 4px 0;">✓ 일치 가능: ${compare.matched.length}개</p>
        <p style="margin: 4px 0;">△ 확인 필요: ${compare.review.length}개</p>
        <p style="margin: 4px 0;">✗ 다를 가능성: ${compare.mismatch.length}개</p>
        ${compare.mismatch[0] ? `<p style="margin: 8px 0 0 0; color: #b45309; font-size: 13px;">다를 가능성 문장: "${compare.mismatch[0]}"</p>` : ''}
      </div>
    `
    : `
      <div style="margin-top: 16px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.25); color: #92400e;">
        이 독후감은 사용자의 입력 기반으로만 분석되었습니다. 원본 파일을 연결하면 사실 확인 정확도가 올라갑니다.
      </div>
    `;
  
  // 모달에 표시
  const reviewModal = `
    <div class="modal-header">
      <h3>📝 AI 독후감 코칭 (7단계)</h3>
      <button onclick="closeReviewModal()" class="close-btn">✕</button>
    </div>
    <div class="modal-content">
      <div style="margin-bottom: 12px; font-size: 12px; color: var(--muted);">
        1) 사용자 작성 → 2) 구조 분석 → 3) 원본 비교 → 4) 일치/확인/주의 분류 → 5) 문체 유지 첨삭 → 6) 사용자 확인 → 7) 참고용 모범 감상문
      </div>

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

      ${compareSummary}

      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line);">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: var(--text-secondary);">
          📚 참고용 모범 감상문
        </h4>
        <div class="review-comparison-item" style="border-left-color: #10b981;">
          <p>${modelReview}</p>
        </div>
      </div>
      
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="saveImprovedReview('${improvedReview.replace(/'/g, "\\'")}')" style="flex: 1;">
          💾 개선본 저장
        </button>
        <button class="btn" onclick="shareReview('${improvedReview.replace(/'/g, "\\'")}')" style="flex: 1;">
          📤 공유
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

function generateModelReview(userText, sourceText, bookTitle) {
  const highlights = extractTopKeywords(userText, 5);
  const sourceHints = sourceText ? extractTopKeywords(sourceText, 3) : [];
  const keywordLine = highlights.length > 0 ? highlights.join(', ') : '핵심 내용';
  const sourceLine = sourceHints.length > 0 ? sourceHints.join(', ') : '확인할 수 없습니다';

  return `"${bookTitle}"을 읽으며 ${keywordLine}에 특히 주목했다. 내용을 따라가며 단순한 줄거리 이해를 넘어서 인물의 선택과 그 배경을 생각하게 되었고, 나의 경험과 연결해 해석할 수 있었다. 특히 ${sourceLine}와 관련된 부분은 다시 읽을수록 의미가 선명해졌고, 앞으로의 독서에서도 근거를 확인하며 읽는 습관이 중요하다는 점을 배웠다.`;
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
  const reviewBookIdx = document.getElementById('review-book-select').value;
  
  const review = {
    text: improvedText,
    date: new Date().toISOString(),
    original: document.getElementById('review-input').value,
    improved: true,
    bookIdx: reviewBookIdx === '' ? null : parseInt(reviewBookIdx, 10)
  };
  
  reviews.push(review);
  storage.set('reviews', reviews);
  
  // 입력 필드 초기화
  document.getElementById('review-input').value = '';
  document.getElementById('review-book-select').value = '';
  
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
  const books = storage.get('books') || [];
  const selectedBookIdx = document.getElementById('practice-book-select').value;

  if (selectedBookIdx === '') {
    alert('필사할 책을 먼저 선택해주세요.');
    return;
  }

  const bookIdx = parseInt(selectedBookIdx, 10);
  const selectedBook = books[bookIdx];

  if (!selectedBook) {
    alert('선택한 책 정보를 찾을 수 없습니다.');
    return;
  }

  const sourceText = getBookSource(selectedBook)?.text || '';

  // 원본 자료 우선, 없으면 노트에서 문장 수집
  const sentences = [];
  if (sourceText) {
    sourceText.split(/[.!?。!？]+/).forEach(part => {
      if (part.trim().length > 14) {
        sentences.push(part.trim());
      }
    });
  } else {
    const relatedNotes = notes.filter(note => note.bookIdx === bookIdx);
    relatedNotes.forEach(note => {
      const text = (note.content || '') + ' ' + (note.impressive || '');
      text.split(/[.!?。!？]+/).forEach(part => {
        if (part.trim().length > 10) {
          sentences.push(part.trim());
        }
      });
    });
  }
  
  if (sentences.length === 0) {
    alert('기록에서 필사할 문장을 찾을 수 없습니다.');
    return;
  }
  
  // 임의의 문장 선택
  const randomIdx = Math.floor(Math.random() * sentences.length);
  const selectedQuote = sentences[randomIdx];
  
  // 글로벌 변수에 저장 (검증용)
  window.currentPracticeQuote = selectedQuote;
  window.currentPracticeSource = sourceText ? 'book_source' : 'note_only';
  
  // UI 업데이트
  document.getElementById('practice-quote').innerHTML = `<p style="margin: 0; line-height: 1.6;">"${selectedQuote}"</p>`;
  document.getElementById('practice-input').value = '';
  document.getElementById('practice-typo-box').style.display = 'none';
  document.getElementById('practice-coach-question').style.display = 'none';
  updatePracticeLiveFeedback();
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
  const typoInfo = buildTypoFeedback(originalText, userText);
  const progress = Math.min(100, Math.round((userText.length / Math.max(1, originalText.length)) * 100));
  const quickQuestion = buildQuickMemoryQuestion(originalText);
  const coachQuestionEl = document.getElementById('practice-coach-question');
  if (coachQuestionEl) {
    coachQuestionEl.style.display = 'block';
    coachQuestionEl.innerHTML = `<strong>🧠 기억 확인 질문:</strong> ${quickQuestion}`;
  }
  
  // 결과 저장
  const practices = storage.get('practices') || [];
  practices.push({
    originalText: originalText,
    userText: userText,
    accuracy: accuracy,
    typoCount: typoInfo.typoCount,
    progress,
    charCount: userText.length,
    sourceType: window.currentPracticeSource || 'note_only',
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
  
  // 결과 모달에 표시
  const practiceResultModal = `
    <div class="modal-header">
      <h3>✍️ 필사 연습 결과</h3>
      <button onclick="closeReviewModal()" class="close-btn">✕</button>
    </div>
    <div class="modal-content">
      <div class="review-comparison">
        <div class="review-comparison-item">
          <h4>📖 원문</h4>
          <p>${originalText}</p>
        </div>
        <div class="review-comparison-item" style="border-left-color: #10b981;">
          <h4>✍️ 당신의 필사</h4>
          <p>${userText}</p>
        </div>
      </div>
      
      <div style="margin-top: 16px; padding: 12px; background: rgba(124, 92, 222, 0.1); border-radius: 8px; border-left: 4px solid var(--brand);">
        <div style="text-align: center;">
          <div style="font-size: 32px; font-weight: 700; color: var(--brand); margin-bottom: 4px;">${accuracy}%</div>
          <div style="font-size: 14px; font-weight: 600;">${feedback}</div>
          <div style="font-size: 13px; color: var(--muted); margin-top: 6px;">오타/차이: ${typoInfo.typoCount}개 · 입력: ${userText.length}자</div>
        </div>
      </div>

      <div style="margin-top: 12px; padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--line);">
        <h4 style="margin: 0 0 8px 0; font-size: 13px;">🧠 기억 확인 질문</h4>
        <p style="margin: 0; line-height: 1.6;">${quickQuestion}</p>
      </div>
      
      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="sharePracticeResult('${originalText.replace(/'/g, "\\'")}', '${userText.replace(/'/g, "\\'")}', ${accuracy})" style="flex: 1;">
          📤 공유
        </button>
        <button class="btn" onclick="closeReviewModal(); generatePracticeQuote();" style="flex: 1;">
          ➡️ 다음
        </button>
        <button class="btn" onclick="closeReviewModal()" style="flex: 1;">
          닫기
        </button>
      </div>
    </div>
  `;
  
  const modalEl = document.getElementById('feedback-modal');
  modalEl.innerHTML = practiceResultModal;
  modalEl.classList.add('active');
  
  // 데이터 저장
  document.getElementById('practice-input').value = '';
  updatePracticeLiveFeedback();
}

function buildTypoFeedback(original, userText) {
  const maxLen = Math.max(original.length, userText.length);
  const parts = [];
  let typoCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const o = original[i] || '';
    const u = userText[i] || '';

    if (!u) {
      if (o) {
        typoCount++;
        parts.push(`<span class="typo-miss">${o}</span>`);
      }
      continue;
    }

    if (o === u) {
      parts.push(`<span class="typo-ok">${u}</span>`);
    } else {
      typoCount++;
      parts.push(`<span class="typo-wrong">${u}</span>`);
    }
  }

  return {
    typoCount,
    html: parts.join('')
  };
}

function updatePracticeLiveFeedback() {
  const originalText = window.currentPracticeQuote || '';
  const userText = document.getElementById('practice-input')?.value || '';
  const typoBox = document.getElementById('practice-typo-box');
  const progressFill = document.getElementById('practice-progress-fill');
  const progressLabel = document.getElementById('practice-progress-label');
  const charMeta = document.getElementById('practice-char-meta');

  if (!progressFill || !progressLabel || !charMeta || !typoBox) return;

  const progress = originalText
    ? Math.min(100, Math.round((userText.length / originalText.length) * 100))
    : 0;
  progressFill.style.width = `${progress}%`;
  progressLabel.textContent = `진행률: ${progress}%`;
  charMeta.textContent = `입력 글자 수: ${userText.length}자`;

  if (!originalText || userText.length === 0) {
    typoBox.style.display = 'none';
    return;
  }

  const typoInfo = buildTypoFeedback(originalText, userText);
  typoBox.style.display = 'block';
  typoBox.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 6px;">오타/차이 미리보기 (${typoInfo.typoCount}개)</div>
    <div style="line-height: 1.7; word-break: break-word;">${typoInfo.html}</div>
  `;
}

function buildQuickMemoryQuestion(text) {
  const keywords = extractTopKeywords(text, 2);
  if (keywords.length === 0) {
    return '방금 필사한 문장의 핵심 의미를 한 문장으로 말해볼까요?';
  }
  return `방금 필사한 내용에서 "${keywords[0]}"와 "${keywords[1] || keywords[0]}"가 왜 중요한지 짧게 설명해보세요.`;
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

// ===== STEP 6: 소셜 공유 기능 =====
function shareReview(reviewText) {
  const books = storage.get('books') || [];
  const currentBook = books.length > 0 ? books[0].title : '한 권의 책';
  
  const shareText = `📚 독후감 공유
  
책: "${currentBook}"

📝 ${reviewText.substring(0, 200)}...

💾 BookMind로 공유됨
https://github.com/serene-jang/BookMind`;

  copyToClipboard(shareText);
}

// ===== STEP 6: 다크모드 설정 =====
function applyTheme(theme) {
  const htmlEl = document.documentElement;
  
  if (theme === 'dark') {
    htmlEl.classList.add('dark-mode');
    storage.set('theme', 'dark');
    document.getElementById('theme-light').classList.remove('btn-primary');
    document.getElementById('theme-dark').classList.add('btn-primary');
    document.getElementById('theme-light').style.borderColor = 'var(--line)';
    document.getElementById('theme-dark').style.borderColor = 'var(--brand)';
    document.getElementById('theme-dark').style.borderWidth = '2px';
  } else {
    htmlEl.classList.remove('dark-mode');
    storage.set('theme', 'light');
    document.getElementById('theme-dark').classList.remove('btn-primary');
    document.getElementById('theme-light').classList.add('btn-primary');
    document.getElementById('theme-dark').style.borderColor = 'var(--line)';
    document.getElementById('theme-light').style.borderColor = 'var(--brand)';
    document.getElementById('theme-light').style.borderWidth = '2px';
  }
}

function initTheme() {
  const savedTheme = storage.get('theme') || 'light';
  applyTheme(savedTheme);
}

// ===== STEP 6: 소셜 공유 기능 (계속) =====

function sharePracticeResult(originalText, userText, accuracy) {
  const shareText = `✍️ 필사 연습 결과
  
📖 원문: ${originalText.substring(0, 100)}...
📝 필사: ${userText.substring(0, 100)}...
⭐ 정확도: ${accuracy}%

💾 BookMind로 공유됨
https://github.com/serene-jang/BookMind`;

  copyToClipboard(shareText);
}

function shareQuizResult(question, correctIdx, userAnswer, score) {
  const result = userAnswer === correctIdx ? '✅ 정답!' : '❌ 오답';
  
  const shareText = `🎯 퀴즈 결과

📌 문제: ${question.substring(0, 100)}...
${result}
📊 점수: ${score}점

💾 BookMind로 공유됨
https://github.com/serene-jang/BookMind`;

  copyToClipboard(shareText);
}

function copyToClipboard(text) {
  // 클립보드 복사 API 사용
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showShareNotification('복사됨! 🎉');
    }).catch(() => {
      fallbackCopyToClipboard(text);
    });
  } else {
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  // 구형 브라우저 대응
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showShareNotification('복사됨! 🎉');
  } catch (err) {
    alert('클립보드 복사에 실패했습니다.');
  }
  document.body.removeChild(textarea);
}

function showShareNotification(message) {
  // 토스트 알림 표시
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--brand);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 2000;
    font-weight: 600;
    animation: slideUp 0.3s ease;
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 2000);
}

window.addEventListener('DOMContentLoaded', () => {
  initData();
  switchTab('home');
});
