/**
 * BookMind - STEP 1 메인 앱 로직
 * 탭 네비게이션 및 기본 렌더링만 구현
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

  // 오늘 복습할 책 (시뮬레이션)
  const reviewListEl = document.getElementById('review-list');
  if (books.length > 0) {
    const reviewItems = books.slice(0, 2).map(book => `
      <div class="review-item">
        <div>
          <p class="book-name">${book.title}</p>
          <p class="review-days">읽은 지 ${Math.floor(Math.random() * 30) + 1}일</p>
        </div>
      </div>
    `).join('');
    reviewListEl.innerHTML = reviewItems;
  } else {
    reviewListEl.innerHTML = '<p class="muted">복습할 책이 없습니다.</p>';
  }

  // 기억률 (시뮬레이션)
  const avgMemory = books.length > 0 ? Math.floor(Math.random() * 30) + 70 : 0;
  document.getElementById('avg-memory').textContent = avgMemory;
}

// ===== 내 책 탭 렌더링 =====
function renderBooks() {
  const books = storage.get('books') || [];
  const bookListEl = document.getElementById('book-list');

  if (books.length === 0) {
    bookListEl.innerHTML = '<p class="muted">등록된 책이 없습니다.</p>';
    return;
  }

  const bookHTML = books.map((book, idx) => `
    <div class="book-card">
      <div class="book-info">
        <p class="book-title">${book.title}</p>
        <p class="book-author">${book.author}</p>
        <span class="book-status">${book.status === 'reading' ? '읽는 중' : '완독'}</span>
      </div>
      <div class="book-actions">
        <button class="btn" onclick="deleteBook(${idx})" style="padding: 6px 8px; font-size: 12px;">삭제</button>
      </div>
    </div>
  `).join('');

  bookListEl.innerHTML = bookHTML;

  // 책 선택 드롭다운도 업데이트
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

  // 복습 스케줄
  const scheduleEl = document.getElementById('review-schedule');
  if (books.length === 0) {
    scheduleEl.innerHTML = '<p class="muted">복습할 책이 없습니다.</p>';
  } else {
    const scheduleHTML = books.map((book, idx) => {
      const reviewDays = [1, 3, 7, 14, 30];
      const randomDay = reviewDays[Math.floor(Math.random() * reviewDays.length)];
      return `
        <div class="schedule-item">
          <div class="schedule-info">
            <p class="book-name">${book.title}</p>
            <p class="schedule-days">${randomDay}일 뒤 복습 예정</p>
          </div>
          <button class="schedule-btn" onclick="alert('복습 기능은 STEP 2에서 구현됩니다.')">복습</button>
        </div>
      `;
    }).join('');
    scheduleEl.innerHTML = scheduleHTML;
  }

  // 책별 기억률
  const memoryListEl = document.getElementById('memory-list');
  if (books.length === 0) {
    memoryListEl.innerHTML = '<p class="muted">아직 분석 데이터가 없습니다.</p>';
  } else {
    const memoryHTML = books.map(book => {
      const memory = Math.floor(Math.random() * 100);
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
    const previewText = note.content?.substring(0, 60) || '';

    return `
      <div class="note-item">
        <p class="note-book">${bookTitle}</p>
        <p class="note-date">${new Date(note.date).toLocaleDateString('ko-KR')}</p>
        <p class="note-preview">${previewText}...</p>
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
  document.getElementById('stat-reviews').textContent = reviews.length;
}

// ===== 책 추가 폼 =====
function openAddBookForm() {
  document.getElementById('book-add-form').style.display = 'block';
  document.getElementById('book-title').focus();
}

function closeAddBookForm() {
  document.getElementById('book-add-form').style.display = 'none';
}

function saveBook() {
  const title = document.getElementById('book-title').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const startDate = document.getElementById('book-start-date').value;
  const status = document.getElementById('book-status').value;

  if (!title || !author) {
    alert('제목과 저자를 입력해주세요.');
    return;
  }

  const books = storage.get('books') || [];
  books.push({
    title,
    author,
    startDate: startDate || new Date().toISOString().split('T')[0],
    status,
    createdAt: new Date().toISOString()
  });

  storage.set('books', books);

  // 폼 초기화
  document.getElementById('book-title').value = '';
  document.getElementById('book-author').value = '';
  document.getElementById('book-start-date').value = '';
  document.getElementById('book-status').value = 'reading';

  closeAddBookForm();
  renderBooks();
  renderHome(); // 홈 화면도 업데이트

  alert('책이 저장되었습니다!');
}

function deleteBook(idx) {
  if (confirm('이 책을 삭제하시겠습니까?')) {
    const books = storage.get('books') || [];
    books.splice(idx, 1);
    storage.set('books', books);
    renderBooks();
    renderHome();
  }
}

// ===== 독서 기록 저장 =====
function saveNote() {
  const bookIdx = document.getElementById('note-book-select').value;
  const content = document.getElementById('note-content').value.trim();
  const impressive = document.getElementById('note-impressive').value.trim();
  const thoughts = document.getElementById('note-thoughts').value.trim();
  const rating = document.getElementById('note-rating').value;

  if (!bookIdx) {
    alert('책을 선택해주세요.');
    return;
  }

  if (!content && !impressive && !thoughts) {
    alert('최소 하나의 내용을 작성해주세요.');
    return;
  }

  const notes = storage.get('notes') || [];
  notes.push({
    bookIdx: parseInt(bookIdx),
    content,
    impressive,
    thoughts,
    rating: parseFloat(rating),
    date: new Date().toISOString()
  });

  storage.set('notes', notes);

  // 폼 초기화
  document.getElementById('note-book-select').value = '';
  document.getElementById('note-content').value = '';
  document.getElementById('note-impressive').value = '';
  document.getElementById('note-thoughts').value = '';
  document.getElementById('note-rating').value = 3;
  document.getElementById('rating-display').textContent = '⭐ 3.0';

  renderRecord();
  renderMy();

  alert('기록이 저장되었습니다!');
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
