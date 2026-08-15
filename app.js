/**
 * BookMind - STEP 2 메인 앱 로직
 * 실제 복습 일정 + 기억률 계산 + 책/기록 수정/삭제
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
          <button class="btn" onclick="editNote(${idx})" style="padding: 6px 8px; font-size: 12px;">수정</button>
          <button class="btn" onclick="deleteNote(${idx})" style="padding: 6px 8px; font-size: 12px;">삭제</button>
        </div>
      </div>
    `;
  }).join('');

  notesListEl.innerHTML = notesHTML;
}

// ===== 마이 탭 렌더링 =====
function renderMy() {
  const books = storage.get('books') || [];
  const notes = storage.get('notes') || [];
  const reviews = storage.get('reviews') || [];

  document.getElementById('stat-books').textContent = books.length;
  document.getElementById('stat-notes').textContent = notes.length;
  document.getElementById('stat-reviews').textContent = reviews.length || 0;
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

// ===== 앱 초기화 =====
window.addEventListener('DOMContentLoaded', () => {
  initData();
  switchTab('home');
});
