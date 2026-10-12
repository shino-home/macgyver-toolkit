document.addEventListener('DOMContentLoaded', () => {
  const workspace = document.getElementById('workspace-container');
  const navMenu = document.querySelector('.nav-menu');
  const goHomeBtn = document.getElementById('go-home-btn');
  const mobileHomeBtn = document.getElementById('mobile-home-btn');
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const buildVersion = '20261014';

  function setMobileMenuOpen(open) {
    const wasOpen = document.body.classList.contains('mobile-menu-open');
    if (wasOpen === open) return;
    document.body.classList.toggle('mobile-menu-open', open);
    menuToggle?.setAttribute('aria-expanded', String(open));
    menuToggle?.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    if (menuToggle) menuToggle.textContent = open ? '×' : '☰';
    if (open) sidebar?.querySelector('.nav-btn')?.focus({ preventScroll: true });
    else menuToggle?.focus({ preventScroll: true });
  }

  menuToggle?.addEventListener('click', () => {
    setMobileMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  backdrop?.addEventListener('click', () => setMobileMenuOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('mobile-menu-open')) {
      setMobileMenuOpen(false);
    }
  });

  async function loadModule(moduleName) {
    try {
      navMenu?.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.module === moduleName);
      });
      setMobileMenuOpen(false);

      if (moduleName === 'home') {
        renderHomeDashboard();
        return;
      }

      const response = await fetch(`./modules/${encodeURIComponent(moduleName)}.html?v=${buildVersion}`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`모듈 불러오기 실패: ${moduleName} (${response.status})`);
      workspace.innerHTML = await response.text();
      loadScript(`./js/${encodeURIComponent(moduleName)}.js?v=${buildVersion}`);
    } catch (error) {
      console.error(error);
      workspace.innerHTML = `<div class="error-msg" role="alert">⚠️ 화면을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>`;
    }
  }

  function loadScript(scriptUrl) {
    document.querySelector('script[data-dynamic="true"]')?.remove();
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.dataset.dynamic = 'true';
    script.onerror = () => {
      workspace.innerHTML = '<div class="error-msg" role="alert">⚠️ 화면 기능을 불러오지 못했습니다. 연결 상태를 확인해 주세요.</div>';
    };
    document.body.appendChild(script);
  }

  function renderHomeDashboard() {
    navMenu?.querySelectorAll('.nav-btn').forEach(button => button.classList.remove('active'));
    const features = Array.from(navMenu?.querySelectorAll('.nav-btn') || [], button => {
      const icon = button.querySelector('.icon-box')?.textContent.trim() || '';
      const title = button.querySelector('.main-label')?.textContent.trim() || '';
      const subtitle = button.dataset.module === 'speech' ? '말하기 연습과 타이머' : '웨딩홀 견적 비교 및 보관';
      return `<button class="home-feature" type="button" data-module="${button.dataset.module}"><span class="home-feature-icon">${icon}</span><span><strong>${title}</strong><small>${subtitle}</small></span><span class="home-feature-arrow" aria-hidden="true">→</span></button>`;
    }).join('');
    workspace.innerHTML = `
      <section id="home-section" class="content-section active home-dashboard">
        <header class="home-heading"><p class="eyebrow">Car's DESK</p><h1>오늘도 차근차근</h1><p>필요한 도구를 골라 바로 시작해 보세요.</p></header>
        <div class="home-feature-grid">${features}</div>
        <div class="home-note"><span aria-hidden="true">✦</span><p>작은 준비가 오늘의 여유를 만듭니다.</p></div>
      </section>`;
    workspace.querySelectorAll('[data-module]').forEach(button => button.addEventListener('click', () => loadModule(button.dataset.module)));
  }

  document.addEventListener('sidebarorderchange', () => {
    if (workspace.querySelector('#home-section')) renderHomeDashboard();
  });

  navMenu?.addEventListener('click', event => {
    const button = event.target.closest('.nav-btn');
    if (button) loadModule(button.dataset.module);
  });
  function goHome() { loadModule('home'); }
  goHomeBtn?.addEventListener('click', goHome);
  goHomeBtn?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); goHome(); }
  });
  mobileHomeBtn?.addEventListener('click', goHome);

  loadModule('home');
});
