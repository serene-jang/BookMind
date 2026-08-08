const screenInfo = {
  "book-add": {
    title: "책 등록 화면",
    description: "책 제목, 저자, 읽은 날짜를 입력하는 화면입니다.",
  },
  "book-list": {
    title: "읽은 책 목록 화면",
    description: "등록한 책 목록을 확인하는 화면입니다.",
  },
  "note-open": {
    title: "독서 노트 화면",
    description: "독서 노트를 작성하고 수정하는 화면입니다.",
  },
  "review-today": {
    title: "오늘 복습 시작 화면",
    description: "오늘 복습해야 할 내용이 모이는 화면입니다.",
  },
  "ai-note": {
    title: "AI 독서 노트 요약 화면",
    description: "작성한 노트를 AI가 요약해 주는 화면입니다.",
  },
  "ai-quiz": {
    title: "AI 독서 퀴즈 생성 화면",
    description: "책 내용을 바탕으로 퀴즈를 만드는 화면입니다.",
  },
  "memory-report": {
    title: "AI 기능 복습 화면",
    description: "복습 결과를 기반으로 기억률을 점검하는 화면입니다.",
  },
  "essay-refine": {
    title: "AI 독후감 도우미 화면",
    description: "내가 먼저 쓴 감상문을 AI가 다듬는 화면입니다.",
  },
  "load-file": {
    title: "AI 필사 불러오기 화면",
    description: "필사용 문서나 PDF를 불러오는 화면입니다.",
  },
  "save-copy": {
    title: "AI 필사 저장 화면",
    description: "작성한 필사 내용을 저장하는 화면입니다.",
  },
};

const STORAGE = {
  books: "bookmind.books",
  notes: "bookmind.notes",
  copies: "bookmind.copies",
  reviews: "bookmind.reviews",
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getBooks() {
  return readJson(STORAGE.books, []);
}

function saveBooks(books) {
  writeJson(STORAGE.books, books);
}

function getNotes() {
  return readJson(STORAGE.notes, {});
}

function saveNotes(notes) {
  writeJson(STORAGE.notes, notes);
}

function getCopies() {
  return readJson(STORAGE.copies, []);
}

function saveCopies(copies) {
  writeJson(STORAGE.copies, copies);
}

function getReviews() {
  return readJson(STORAGE.reviews, {});
}

function saveReviews(reviews) {
  writeJson(STORAGE.reviews, reviews);
}

function getScreenKey() {
  const query = new URLSearchParams(window.location.search);
  return query.get("screen") || "book-add";
}

function moveToScreen(key) {
  const safeKey = encodeURIComponent(key);
  window.location.href = `screen.html?screen=${safeKey}`;
}

function formatDate(iso) {
  if (!iso) {
    return "날짜 없음";
  }
  try {
    return new Date(iso).toLocaleDateString("ko-KR");
  } catch {
    return iso;
  }
}

function renderBookAdd() {
  const content = document.getElementById("screen-content");
  content.innerHTML = `
    <div class="panel">
      <div class="field">
        <label for="book-title">책 제목</label>
        <input class="input" id="book-title" placeholder="예: 어린 왕자" />
      </div>
      <div class="field">
        <label for="book-author">저자</label>
        <input class="input" id="book-author" placeholder="예: 생텍쥐페리" />
      </div>
      <div class="field">
        <label for="book-date">읽은 날짜</label>
        <input class="input" id="book-date" type="date" />
      </div>
      <div class="actions-row">
        <button class="btn btn-primary" id="save-book">책 저장하기</button>
      </div>
      <p class="muted" id="save-book-message"></p>
    </div>
  `;

  document.getElementById("save-book").addEventListener("click", () => {
    const title = document.getElementById("book-title").value.trim();
    const author = document.getElementById("book-author").value.trim();
    const readDate = document.getElementById("book-date").value;
    const msg = document.getElementById("save-book-message");

    if (!title) {
      msg.textContent = "책 제목을 입력해주세요.";
      return;
    }

    const books = getBooks();
    books.unshift({
      id: `${Date.now()}`,
      title,
      author,
      readDate,
      createdAt: new Date().toISOString(),
    });
    saveBooks(books);

    document.getElementById("book-title").value = "";
    document.getElementById("book-author").value = "";
    document.getElementById("book-date").value = "";
    msg.textContent = "저장 완료! 읽은 책 목록에서 확인할 수 있어요.";
  });
}

function renderBookList() {
  const content = document.getElementById("screen-content");
  const books = getBooks();

  if (!books.length) {
    content.innerHTML = `<div class="panel"><p class="muted">아직 저장된 책이 없습니다. 먼저 책 등록하기에서 추가해주세요.</p></div>`;
    return;
  }

  content.innerHTML = `
    <div class="list">
      ${books
        .map(
          (book) => `
        <article class="item-card" data-id="${book.id}">
          <h3 class="item-title">${book.title}</h3>
          <p class="item-meta">저자: ${book.author || "미입력"} | 읽은 날짜: ${formatDate(book.readDate)}</p>
          <div class="actions-row">
            <button class="btn" data-note="${book.id}">노트 열기</button>
            <button class="btn btn-danger" data-delete="${book.id}">삭제</button>
          </div>
        </article>
      `,
        )
        .join("")}
    </div>
  `;

  content.querySelectorAll("button[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-delete");
      const booksNext = getBooks().filter((book) => book.id !== id);
      saveBooks(booksNext);

      const notes = getNotes();
      delete notes[id];
      saveNotes(notes);

      renderBookList();
    });
  });

  content.querySelectorAll("button[data-note]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-note");
      window.location.href = `screen.html?screen=note-open&bookId=${encodeURIComponent(id)}`;
    });
  });
}

function renderNoteOpen() {
  const content = document.getElementById("screen-content");
  const books = getBooks();

  if (!books.length) {
    content.innerHTML = `<div class="panel"><p class="muted">먼저 책을 등록해주세요.</p></div>`;
    return;
  }

  const query = new URLSearchParams(window.location.search);
  const selectedId = query.get("bookId") || books[0].id;
  const notes = getNotes();
  const currentNote = notes[selectedId] || "";

  content.innerHTML = `
    <div class="panel">
      <div class="field">
        <label for="note-book">책 선택</label>
        <select class="select" id="note-book">
          ${books
            .map(
              (book) =>
                `<option value="${book.id}" ${book.id === selectedId ? "selected" : ""}>${book.title}</option>`,
            )
            .join("")}
        </select>
      </div>
      <div class="field">
        <label for="note-text">독서 노트</label>
        <textarea class="textarea" id="note-text" placeholder="핵심 내용, 느낀 점을 적어보세요.">${currentNote}</textarea>
      </div>
      <div class="actions-row">
        <button class="btn btn-primary" id="save-note">노트 저장</button>
      </div>
      <p class="muted" id="note-message"></p>
    </div>
  `;

  document.getElementById("note-book").addEventListener("change", (e) => {
    const id = e.target.value;
    window.location.href = `screen.html?screen=note-open&bookId=${encodeURIComponent(id)}`;
  });

  document.getElementById("save-note").addEventListener("click", () => {
    const id = document.getElementById("note-book").value;
    const text = document.getElementById("note-text").value.trim();
    const data = getNotes();
    data[id] = text;
    saveNotes(data);
    document.getElementById("note-message").textContent = "노트 저장 완료";
  });
}

function renderReviewToday() {
  const content = document.getElementById("screen-content");
  const books = getBooks();
  if (!books.length) {
    content.innerHTML = `<div class="panel"><p class="muted">복습할 책이 없습니다. 먼저 책을 등록해주세요.</p></div>`;
    return;
  }

  const reviews = getReviews();
  content.innerHTML = `
    <div class="list">
      ${books
        .map((book) => {
          const last = reviews[book.id]?.lastReviewedAt;
          return `
            <article class="item-card">
              <h3 class="item-title">${book.title}</h3>
              <p class="item-meta">최근 복습: ${last ? formatDate(last) : "아직 없음"}</p>
              <div class="actions-row">
                <button class="btn btn-primary" data-review="${book.id}">오늘 복습 완료</button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  content.querySelectorAll("button[data-review]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-review");
      const data = getReviews();
      data[id] = {
        lastReviewedAt: new Date().toISOString(),
      };
      saveReviews(data);
      renderReviewToday();
    });
  });
}

function renderEssayRefine() {
  const content = document.getElementById("screen-content");
  content.innerHTML = `
    <div class="panel">
      <div class="field">
        <label for="essay-input">내가 먼저 쓴 감상문</label>
        <textarea class="textarea" id="essay-input" placeholder="여기에 감상문을 써주세요."></textarea>
      </div>
      <div class="actions-row">
        <button class="btn btn-primary" id="refine-essay">AI 다듬기</button>
      </div>
      <div class="field" style="margin-top:12px;">
        <label for="essay-output">다듬은 감상문</label>
        <textarea class="textarea" id="essay-output" readonly></textarea>
      </div>
    </div>
  `;

  document.getElementById("refine-essay").addEventListener("click", () => {
    const input = document.getElementById("essay-input").value.trim();
    if (!input) {
      document.getElementById("essay-output").value = "먼저 감상문을 입력해주세요.";
      return;
    }
    const refined = input
      .replace(/\s+/g, " ")
      .replace(/\.(?=\S)/g, ". ")
      .trim();
    document.getElementById("essay-output").value = `나는 이 책을 통해 많은 것을 배웠다. ${refined}`;
  });
}

function renderMemoryReport() {
  const content = document.getElementById("screen-content");
  const books = getBooks();
  const reviews = getReviews();
  const reviewedCount = books.filter((book) => reviews[book.id]).length;
  const rate = books.length ? Math.round((reviewedCount / books.length) * 100) : 0;

  content.innerHTML = `
    <div class="panel">
      <p><strong>등록한 책:</strong> ${books.length}권</p>
      <p><strong>복습 완료 책:</strong> ${reviewedCount}권</p>
      <p><strong>현재 복습률:</strong> ${rate}%</p>
      <p class="muted">지금은 간단한 계산 방식으로 보여주고, 이후 AI 분석으로 확장할 수 있습니다.</p>
    </div>
  `;
}

function renderLoadFile() {
  const content = document.getElementById("screen-content");
  content.innerHTML = `
    <div class="panel">
      <div class="field">
        <label for="copy-file">문서/PDF 선택</label>
        <input class="input" id="copy-file" type="file" accept=".txt,.pdf,.md" />
      </div>
      <div class="field">
        <label for="copy-preview">불러온 내용</label>
        <textarea class="textarea" id="copy-preview" placeholder="파일을 불러오면 여기에 미리보기가 표시됩니다."></textarea>
      </div>
      <p class="muted">PDF는 브라우저 기본 읽기만 지원될 수 있어요. 텍스트(.txt, .md) 파일이 가장 안정적입니다.</p>
    </div>
  `;

  document.getElementById("copy-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const preview = document.getElementById("copy-preview");
    if (file.type === "text/plain" || file.name.endsWith(".md")) {
      preview.value = await file.text();
      return;
    }
    preview.value = `${file.name} 파일이 선택되었습니다. (현재는 텍스트 파일 미리보기에 최적화)`;
  });
}

function renderSaveCopy() {
  const content = document.getElementById("screen-content");
  const copies = getCopies();
  content.innerHTML = `
    <div class="panel">
      <div class="field">
        <label for="copy-text">필사 내용 입력</label>
        <textarea class="textarea" id="copy-text" placeholder="필사한 내용을 입력하세요."></textarea>
      </div>
      <div class="actions-row">
        <button class="btn btn-primary" id="save-copy-item">필사 저장</button>
      </div>
      <p class="muted" id="copy-message"></p>
    </div>
    <div class="panel" style="margin-top: 10px;">
      <h3 class="item-title" style="margin-top:0;">최근 저장된 필사</h3>
      <div class="list" id="copy-list">
        ${
          copies.length
            ? copies
                .slice(0, 5)
                .map(
                  (item) =>
                    `<article class="item-card"><p class="item-meta">${formatDate(item.savedAt)}</p><p>${item.text}</p></article>`,
                )
                .join("")
            : '<p class="muted">아직 저장된 필사가 없습니다.</p>'
        }
      </div>
    </div>
  `;

  document.getElementById("save-copy-item").addEventListener("click", () => {
    const text = document.getElementById("copy-text").value.trim();
    const msg = document.getElementById("copy-message");
    if (!text) {
      msg.textContent = "필사 내용을 먼저 입력해주세요.";
      return;
    }
    const data = getCopies();
    data.unshift({ text, savedAt: new Date().toISOString() });
    saveCopies(data);
    msg.textContent = "필사 저장 완료";
    renderSaveCopy();
  });
}

function renderAiQuiz() {
  const content = document.getElementById("screen-content");
  const books = getBooks();
  const base = books[0];
  content.innerHTML = `
    <div class="panel">
      <p><strong>샘플 퀴즈</strong></p>
      <ol>
        <li>최근에 등록한 책 제목은 무엇인가요?</li>
        <li>그 책의 저자는 누구인가요?</li>
        <li>그 책에서 기억에 남는 문장을 한 줄로 적어보세요.</li>
      </ol>
      <p class="muted">기준 책: ${base ? `${base.title} (${base.author || "저자 미입력"})` : "등록된 책 없음"}</p>
    </div>
  `;
}

function renderAiNote() {
  const content = document.getElementById("screen-content");
  const notes = getNotes();
  const first = Object.values(notes).find((value) => value && value.trim());
  const summary = first
    ? first
        .split(/[.!?]\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(". ")
    : "저장된 노트가 없습니다. 노트를 먼저 작성해 주세요.";

  content.innerHTML = `
    <div class="panel">
      <p><strong>AI 노트 요약 결과(샘플)</strong></p>
      <p>${summary}</p>
      <p class="muted">지금은 간단 요약 규칙으로 동작하며, 이후 실제 AI API로 연결 가능합니다.</p>
    </div>
  `;
}

function renderDynamicContent(key) {
  switch (key) {
    case "book-add":
      renderBookAdd();
      break;
    case "book-list":
      renderBookList();
      break;
    case "note-open":
      renderNoteOpen();
      break;
    case "review-today":
      renderReviewToday();
      break;
    case "essay-refine":
      renderEssayRefine();
      break;
    case "memory-report":
      renderMemoryReport();
      break;
    case "load-file":
      renderLoadFile();
      break;
    case "save-copy":
      renderSaveCopy();
      break;
    case "ai-quiz":
      renderAiQuiz();
      break;
    case "ai-note":
      renderAiNote();
      break;
    default:
      document.getElementById("screen-content").innerHTML = `<div class="panel"><p class="muted">준비 중인 기능입니다.</p></div>`;
  }
}

function renderScreen() {
  const key = getScreenKey();
  const info = screenInfo[key] || {
    title: "알 수 없는 화면",
    description: "요청한 화면 정보를 찾을 수 없습니다.",
  };

  const titleEl = document.getElementById("screen-title");
  const descEl = document.getElementById("screen-description");

  titleEl.textContent = info.title;
  descEl.textContent = info.description;

  document.querySelectorAll(".menu-item[data-screen]").forEach((button) => {
    const target = button.getAttribute("data-screen");
    button.classList.toggle("active", target === key);
    button.addEventListener("click", () => moveToScreen(target));
  });

  renderDynamicContent(key);
}

document.getElementById("go-home").addEventListener("click", () => {
  window.location.href = "index.html";
});

renderScreen();
