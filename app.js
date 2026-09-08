document.addEventListener('DOMContentLoaded', () => {
  const workspace = document.getElementById('workspace-container');
  const navBtns = document.querySelectorAll('.nav-btn');
  const goHomeBtn = document.getElementById('go-home-btn');

  // 모듈을 동적으로 불러오는 메인 함수
  async function loadModule(moduleName, subTabId = null) {
    try {
      // 1. 사이드바 버튼 활성화 상태 표시
      navBtns.forEach(btn => {
        if (btn.getAttribute('data-module') === moduleName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // 2. 홈 대시보드 처리
      if (moduleName === 'home') {
        renderHomeDashboard();
        return;
      }

      // 3. modules/폴더에서 해당 HTML 조각 파일 가져오기
      const response = await fetch(`./modules/${moduleName}.html`);
      if (!response.ok) throw new Error(`모듈 불러오기 실패: ${moduleName}`);
      
      const html = await response.text();
      workspace.innerHTML = html;

      // 4. js/폴더의 모듈 전용 스크립트 파일 동적 불러오기 및 실행
      loadScript(`./js/${moduleName}.js`, () => {
        // 소메뉴 탭 자동 전환 처리 (있을 경우)
        if (subTabId) {
          const targetSubBtn = document.querySelector(`[data-tab="${subTabId}"]`);
          if (targetSubBtn) targetSubBtn.click();
        }
      });

    } catch (error) {
      console.error(error);
      workspace.innerHTML = `<div class="error-msg">⚠️ 모듈을 불러오는 중 오류가 발생했습니다. (${moduleName})</div>`;
    }
  }

  // 동적 스크립트 로더
  function loadScript(scriptUrl, callback) {
    // 기존에 생성된 동적 스크립트가 있다면 제거 후 새로 로드
    const existingScript = document.querySelector(`script[data-dynamic="true"]`);
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-dynamic', 'true');
    script.onload = () => { if (callback) callback(); };
    script.onerror = () => { console.log(`스크립트 없음 또는 로드 생략: ${scriptUrl}`); };
    document.body.appendChild(script);
  }

  // 홈 대시보드 렌더링 함수
  function renderHomeDashboard() {
    navBtns.forEach(btn => btn.classList.remove('active'));
    workspace.innerHTML = `
      <section id="home-section" class="content-section active">
        <div class="dashboard-top">
          <div class="healing-card">
            <div class="healing-header">
              <span class="healing-tag">☁️ 오늘의 몽글 한마디</span>
              <button id="refresh-quote" title="새 문구 불러오기">🔄</button>
            </div>
            <p id="quote-text" class="quote-text">오늘 하루도 차근차근 잘해내고 있어요! ✨</p>
          </div>

          <div class="quickpass-card">
            <div class="quickpass-header">
              <span class="quickpass-tag">⚡ 마시멜로 퀵패스</span>
              <span class="quickpass-sub">자주 가는 소메뉴</span>
            </div>
            <div class="quickpass-grid">
              <button class="qp-btn" data-module="board" data-sub="wedding-hall">💒 웨딩 홀 예약</button>
              <button class="qp-btn" data-module="board" data-sub="sdm">📸 스드메 체크</button>
              <button class="qp-btn" data-module="calc" data-sub="tab-age">🧮 만 나이 계산기</button>
              <button class="qp-btn" data-module="memo" data-sub="secret">📝 비밀 메모장</button>
            </div>
          </div>
        </div>

        <div class="treasure-wrapper">
          <div class="treasure-box" id="treasure-box">
            <div class="chest-lid">🎁</div>
            <div class="chest-body">🧰</div>
            <div class="floating-icons">
              <span class="f-icon i1">🧮</span>
              <span class="f-icon i2">🗣️</span>
              <span class="f-icon i3">💍</span>
              <span class="f-icon i4">📝</span>
            </div>
          </div>
          <p class="treasure-hint">보물상자에 마우스를 올려보세요!</p>
        </div>
      </section>
    `;

    initHomeEvents();
  }

  // 홈 대시보드 이벤트 바인딩
  function initHomeEvents() {
    const quotes = [
      "오늘 하루도 차근차근 잘해내고 있어요! ✨",
      "잠시 쉬어가도 괜찮아요, 마음의 여유를 가져봐요. ☁️",
      "작은 걸음들이 모여 멋진 결과를 만든답니다. 🍀",
      "오늘의 당신은 그 자체로 이미 충분해요! 💖",
      "소중한 사람과 함께하는 오늘 하루도 행복하게! 💍",
      "복잡한 일은 잠시 두고 몽글몽글 편안한 시간을 가져요. 🧸"
    ];

    document.getElementById('refresh-quote')?.addEventListener('click', () => {
      const qText = document.getElementById('quote-text');
      if (qText) qText.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    });

    document.querySelectorAll('.qp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const module = btn.getAttribute('data-module');
        const sub = btn.getAttribute('data-sub');
        loadModule(module, sub);
      });
    });
  }

  // 사이드바 버튼 클릭 이벤트
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const moduleName = btn.getAttribute('data-module');
      loadModule(moduleName);
    });
  });

  // 브랜드 로고 클릭 시 홈으로
  goHomeBtn?.addEventListener('click', () => {
    loadModule('home');
  });

  // 앱 첫 실행 시 홈 대시보드 표시
  loadModule('home');
});