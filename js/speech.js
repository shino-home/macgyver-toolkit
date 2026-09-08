// 스피치 테라피 전용 모듈 스크립트
(() => {
  let allWordData = {};
  let currentCategory = "basic";

  let clockMode = "stopwatch";
  let timerInterval = null;
  let swSeconds = 0;
  let tmTotalSeconds = 300;
  let isTimerMinimized = false;
  let hasTimerRun = false; // 타이머나 스톱워치를 사용(시작)했는지 여부

  let calendarViewMode = 'week';

  const wordGrid = document.getElementById("word-grid");
  const fontSlider = document.getElementById("font-size-slider");
  const timerWidget = document.getElementById("timer-widget");
  const toggleTimerBtn = document.getElementById("toggle-timer-btn");
  const headerTimerText = document.getElementById("header-timer-text");
  const minimizeBtn = document.getElementById("minimize-timer-btn");
  const clockDisplay = document.getElementById("clock-display");

  const attendanceModal = document.getElementById("attendance-modal");
  const streakBadgeBtn = document.getElementById("streak-badge-btn");
  const closeCalBtn = document.getElementById("close-cal-btn");
  const viewWeekBtn = document.getElementById("view-week-btn");
  const viewMonthBtn = document.getElementById("view-month-btn");
  const calendarGrid = document.getElementById("calendar-grid");

  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  async function loadWordData() {
    try {
      const response = await fetch('words.json');
      allWordData = await response.json();
      renderWords(currentCategory);
      checkAndRecordAttendance();
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    }
  }

  function adjustFontSizeForCard(card, textSpan, forceSingleLine = false) {
    if (!card || !textSpan || !fontSlider) return;
    const baseSize = parseFloat(fontSlider.value);
    textSpan.style.fontSize = `${baseSize}rem`;

    const maxWidth = card.clientWidth - 8;
    const maxHeight = card.clientHeight - 8;
    let currentSize = baseSize;

    while (
      (textSpan.scrollWidth > maxWidth || 
       textSpan.scrollHeight > maxHeight || 
       (forceSingleLine && textSpan.offsetWidth > maxWidth)) && 
      currentSize > 0.5
    ) {
      currentSize -= 0.05;
      textSpan.style.fontSize = `${currentSize}rem`;
    }
  }

  function renderWords(category) {
    if (!wordGrid) return;
    wordGrid.innerHTML = "";
    wordGrid.className = `word-grid ${category}`;

    if (category === 'basic') {
      const list = allWordData.basic || [];
      list.forEach(text => { createCard(text, "basic-card", false); });
      return;
    }

    if (category === 'wordRepeat') {
      const data = allWordData.wordRepeat || { len3: [], len4: [], len5: [] };
      const len3List = [...data.len3].sort(() => Math.random() - 0.5);
      const len4List = [...data.len4].sort(() => Math.random() - 0.5);
      const len5List = [...data.len5].sort(() => Math.random() - 0.5);

      const rowCount = Math.max(len3List.length, len4List.length, len5List.length);

      for (let i = 0; i < rowCount; i++) {
        if (len3List[i]) createCard(len3List[i], "repeat-card", true);
        if (len4List[i]) createCard(len4List[i], "repeat-card", true);
        if (len5List[i]) createCard(len5List[i], "repeat-card", true);
      }
      return;
    }

    let list = allWordData[category] ? [...allWordData[category]] : [];
    list.sort(() => Math.random() - 0.5);

    const isSentence = category === 'sentence';
    list.forEach(text => { createCard(text, isSentence ? "sentence-card" : "normal-card", false); });
  }

  function createCard(text, cardClass, forceSingleLine) {
    const card = document.createElement("div");
    card.className = `word-card ${cardClass}`;
    
    const textSpan = document.createElement("span");
    textSpan.innerText = text;
    if (forceSingleLine) textSpan.style.whiteSpace = "nowrap";

    card.appendChild(textSpan);
    card.addEventListener("click", () => card.classList.toggle("active"));
    wordGrid.appendChild(card);

    setTimeout(() => adjustFontSizeForCard(card, textSpan, forceSingleLine), 0);
  }

  // 탭 전환
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      currentCategory = e.target.dataset.cat;
      renderWords(currentCategory);
    });
  });

  // 상단 '시간측정' 버튼 클릭 시 타이머 위젯 토글
  toggleTimerBtn?.addEventListener("click", () => {
    if (isTimerMinimized) {
      isTimerMinimized = false;
      timerWidget.classList.remove("hidden");
      toggleTimerBtn.classList.remove("minimized-mode");
      toggleTimerBtn.classList.add("active");
      headerTimerText.innerText = "시간측정";
    } else {
      const isHidden = timerWidget.classList.toggle("hidden");
      toggleTimerBtn.classList.toggle("active", !isHidden);
    }
  });

  // 타이머 최소화 버튼 (-) 클릭 시
  minimizeBtn?.addEventListener("click", () => {
    isTimerMinimized = true;
    timerWidget.classList.add("hidden");
    toggleTimerBtn.classList.remove("active");

    // 타이머나 스톱워치를 한 번이라도 사용(시작)했을 때만 시각 표시, 아니면 '시간측정' 유지
    if (hasTimerRun) {
      toggleTimerBtn.classList.add("minimized-mode");
      headerTimerText.innerText = clockDisplay.innerText;
    } else {
      toggleTimerBtn.classList.remove("minimized-mode");
      headerTimerText.innerText = "시간측정";
    }
  });

  fontSlider?.addEventListener("input", (e) => {
    document.getElementById("font-size-val").innerText = e.target.value;
    const isSingleLine = currentCategory === 'wordRepeat';
    document.querySelectorAll(".word-card").forEach(card => {
      const span = card.querySelector("span");
      if (span) adjustFontSizeForCard(card, span, isSingleLine);
    });
  });

  document.getElementById("toggle-settings-btn")?.addEventListener("click", () => {
    document.getElementById("settings-drawer").classList.toggle("hidden");
  });
  document.getElementById("close-drawer-btn")?.addEventListener("click", () => {
    document.getElementById("settings-drawer").classList.add("hidden");
  });

  document.getElementById("shuffle-btn")?.addEventListener("click", () => {
    renderWords(currentCategory);
  });

  // 다크모드 토글
  themeToggleBtn?.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-theme");
    themeToggleBtn.innerText = isDark ? "☀️ 라이트 모드 전환" : "🌙 다크 모드 전환";
    localStorage.setItem("speech_theme", isDark ? "dark" : "light");
  });

  if (localStorage.getItem("speech_theme") === "dark") {
    document.body.classList.add("dark-theme");
    if (themeToggleBtn) themeToggleBtn.innerText = "☀️ 라이트 모드 전환";
  }

  // 출석 체크 및 플로팅 달력
  function checkAndRecordAttendance() {
    const today = new Date().toISOString().slice(0, 10);
    let attendanceHistory = JSON.parse(localStorage.getItem("speech_attendance") || "[]");

    if (!attendanceHistory.includes(today)) {
      attendanceHistory.push(today);
      localStorage.setItem("speech_attendance", JSON.stringify(attendanceHistory));
    }

    let streak = 0;
    let checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (attendanceHistory.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const streakCount = document.getElementById("streak-count");
    if (streakCount) streakCount.innerText = streak;
  }

  streakBadgeBtn?.addEventListener("click", () => {
    attendanceModal.classList.toggle("hidden");
    renderCalendar(calendarViewMode);
  });

  closeCalBtn?.addEventListener("click", () => {
    attendanceModal.classList.add("hidden");
  });

  viewWeekBtn?.addEventListener("click", () => {
    calendarViewMode = 'week';
    viewWeekBtn.classList.add("active");
    viewMonthBtn.classList.remove("active");
    renderCalendar('week');
  });

  viewMonthBtn?.addEventListener("click", () => {
    calendarViewMode = 'month';
    viewMonthBtn.classList.add("active");
    viewWeekBtn.classList.remove("active");
    renderCalendar('month');
  });

  function renderCalendar(mode) {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = "";
    const attendanceHistory = JSON.parse(localStorage.getItem("speech_attendance") || "[]");
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (mode === 'week') {
      document.getElementById("cal-month-title").innerText = "주간 출석 현황";
      const currentDayOfWeek = today.getDay();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - currentDayOfWeek);

      for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        const dStr = d.toISOString().slice(0, 10);

        const cell = document.createElement("div");
        cell.className = "cal-day-cell";
        cell.innerText = d.getDate();

        if (dStr === todayStr) cell.classList.add("today");
        if (attendanceHistory.includes(dStr)) cell.classList.add("attended");

        calendarGrid.appendChild(cell);
      }
    } else {
      const year = today.getFullYear();
      const month = today.getMonth();
      document.getElementById("cal-month-title").innerText = `${month + 1}월 출석 현황`;

      const firstDay = new Date(year, month, 1).getDay();
      const lastDate = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "cal-day-cell other-month";
        calendarGrid.appendChild(emptyCell);
      }

      for (let day = 1; day <= lastDate; day++) {
        const d = new Date(year, month, day);
        const offset = d.getTimezoneOffset() * 60000;
        const dStr = new Date(d.getTime() - offset).toISOString().slice(0, 10);

        const cell = document.createElement("div");
        cell.className = "cal-day-cell";
        cell.innerText = day;

        if (dStr === todayStr) cell.classList.add("today");
        if (attendanceHistory.includes(dStr)) cell.classList.add("attended");

        calendarGrid.appendChild(cell);
      }
    }
  }

  // 타이머 작동 로직
  document.querySelectorAll("input[name='clock-mode']").forEach(radio => {
    radio.addEventListener("change", (e) => {
      clockMode = e.target.value;
      resetClock();
      if (clockMode === "stopwatch") {
        document.getElementById("timer-input-group").classList.add("hidden");
      } else {
        document.getElementById("timer-input-group").classList.remove("hidden");
        updateTimerInputSeconds();
      }
    });
  });

  function updateTimerInputSeconds() {
    const min = parseInt(document.getElementById("timer-min").value) || 0;
    const sec = parseInt(document.getElementById("timer-sec").value) || 0;
    tmTotalSeconds = (min * 60) + sec;
    renderClockDisplay(tmTotalSeconds);
  }

  document.getElementById("timer-min")?.addEventListener("change", updateTimerInputSeconds);
  document.getElementById("timer-sec")?.addEventListener("change", updateTimerInputSeconds);

  function renderClockDisplay(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    const timeText = `${m}:${s}`;
    if (clockDisplay) clockDisplay.innerText = timeText;

    if (isTimerMinimized && hasTimerRun && headerTimerText) {
      headerTimerText.innerText = timeText;
    }
  }

  document.getElementById("start-btn")?.addEventListener("click", () => {
    if (timerInterval) return;
    hasTimerRun = true; // 타이머가 실행됨으로 표시
    timerWidget.classList.remove("timer-finished");

    if (clockMode === "stopwatch") {
      timerInterval = setInterval(() => { swSeconds++; renderClockDisplay(swSeconds); }, 1000);
    } else {
      if (tmTotalSeconds <= 0) updateTimerInputSeconds();
      timerInterval = setInterval(() => {
        if (tmTotalSeconds > 0) {
          tmTotalSeconds--; renderClockDisplay(tmTotalSeconds);
        } else {
          clearInterval(timerInterval); timerInterval = null;
          if (isTimerMinimized) {
            isTimerMinimized = false;
            timerWidget.classList.remove("hidden");
            toggleTimerBtn.classList.remove("minimized-mode");
            headerTimerText.innerText = "시간측정";
          }
          timerWidget.classList.add("timer-finished");
        }
      }, 1000);
    }
  });

  document.getElementById("pause-btn")?.addEventListener("click", () => {
    clearInterval(timerInterval); timerInterval = null;
  });

  function resetClock() {
    clearInterval(timerInterval); timerInterval = null;
    timerWidget.classList.remove("timer-finished");
    swSeconds = 0;
    hasTimerRun = false; // 리셋 시 사용 여부도 초기화
    if (clockMode === "stopwatch") renderClockDisplay(0);
    else updateTimerInputSeconds();
  }

  document.getElementById("reset-btn")?.addEventListener("click", resetClock);

  // 상단 탭 스크롤 및 드래그
  const navTabs = document.getElementById("category-tabs");
  let isDownNav = false, startXNav, scrollLeftNav;

  if (navTabs) {
    navTabs.addEventListener('mousedown', (e) => {
      isDownNav = true; startXNav = e.pageX - navTabs.offsetLeft; scrollLeftNav = navTabs.scrollLeft;
    });
    navTabs.addEventListener('mouseleave', () => { isDownNav = false; });
    navTabs.addEventListener('mouseup', () => { isDownNav = false; });
    navTabs.addEventListener('mousemove', (e) => {
      if (!isDownNav) return; e.preventDefault();
      const x = e.pageX - navTabs.offsetLeft;
      navTabs.scrollLeft = scrollLeftNav - (x - startXNav) * 1.5;
    });
  }

  function setupDraggable(element, handle) {
    if (!element || !handle) return;
    let isDragging = false, startX, startY, initialLeft, initialTop;

    function onDragStart(e) {
      if (e.target.classList.contains('mini-btn') || e.target.classList.contains('close-btn') || e.target.classList.contains('cal-toggle-btn')) return;
      isDragging = true;
      element.style.transition = 'none';

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX; startY = clientY;

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left; initialTop = rect.top;

      document.addEventListener(e.touches ? 'touchmove' : 'mousemove', onDragMove);
      document.addEventListener(e.touches ? 'touchend' : 'mouseup', onDragEnd);
    }

    function onDragMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      let newLeft = initialLeft + (clientX - startX);
      let newTop = initialTop + (clientY - startY);

      const maxLeft = window.innerWidth - element.offsetWidth - 10;
      const maxTop = window.innerHeight - element.offsetHeight - 10;

      element.style.left = `${Math.max(10, Math.min(newLeft, maxLeft))}px`;
      element.style.top = `${Math.max(10, Math.min(newTop, maxTop))}px`;
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);
    }

    handle.addEventListener('mousedown', onDragStart);
    handle.addEventListener('touchstart', onDragStart, { passive: true });
  }

  setupDraggable(timerWidget, document.getElementById("timer-drag-handle"));
  setupDraggable(attendanceModal, document.getElementById("calendar-drag-handle"));

  window.addEventListener('resize', () => {
    const isSingleLine = currentCategory === 'wordRepeat';
    document.querySelectorAll(".word-card").forEach(card => {
      const span = card.querySelector("span");
      if (span) adjustFontSizeForCard(card, span, isSingleLine);
    });
  });

  loadWordData();
})();