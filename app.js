document.addEventListener('DOMContentLoaded', () => {
  // 1. 사이드바 메뉴 전환
  const menuItems = document.querySelectorAll('.menu-item');
  const sections = document.querySelectorAll('.content-section');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      sections.forEach(sec => sec.classList.remove('active'));
      const target = item.getAttribute('data-target');
      document.getElementById(target).classList.add('active');
    });
  });

  // 2. 모바일 헤더 토글
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const sidebar = document.getElementById('sidebar');
  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // 3. 토스트 피켓 피드백 함수 (0.5초)
  const saveBtn = document.getElementById('save-demo-btn');
  const toastPicket = document.getElementById('toast-picket');
  const toastMessage = document.getElementById('toast-message');

  function showToast(msg) {
    toastMessage.innerText = msg;
    toastPicket.classList.add('show');
    setTimeout(() => {
      toastPicket.classList.remove('show');
    }, 500);
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => showToast('저장 완료!'));
  }

  // 4. 자율 보행 & 드래그 인터랙션 포차코
  const pochacco = document.getElementById('pochacco');
  const bubble = document.getElementById('pochacco-bubble');

  let isDragging = false;
  let startX, startY;
  let currentX = window.innerWidth / 2 - 45;
  let currentY = window.innerHeight / 2 - 45;

  // 포차코 초기 위치 설정
  pochacco.style.left = `${currentX}px`;
  pochacco.style.top = `${currentY}px`;

  // 말풍선 출력 함수
  function showBubble(text, duration = 1500) {
    bubble.innerText = text;
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), duration);
  }

  // Pointer Events (PC 마우스 & 모바일 터치 통합)
  pochacco.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    pochacco.setPointerCapture(e.pointerId);
    showBubble('어라? 어딜 가려고!', 1000);
  });

  pochacco.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    pochacco.style.left = `${currentX}px`;
    pochacco.style.top = `${currentY}px`;
  });

  pochacco.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    pochacco.releasePointerCapture(e.pointerId);

    // 드래그 후 놓았을 때 어리둥절 피드백
    showBubble('??? (어리둥절)', 1500);
  });

  // 자율 보행 로직 (3초마다 무작위 이동)
  setInterval(() => {
    if (isDragging) return; // 드래그 중엔 보행 중단

    // 20% 확률로 돌발 표정 연출
    if (Math.random() < 0.2) {
      showBubble('신난다! 💖', 1200);
      return;
    }

    const mainWidth = window.innerWidth - 150;
    const mainHeight = window.innerHeight - 150;

    currentX = Math.max(50, Math.floor(Math.random() * mainWidth));
    currentY = Math.max(80, Math.floor(Math.random() * mainHeight));

    pochacco.style.transition = 'all 2s ease-in-out';
    pochacco.style.left = `${currentX}px`;
    pochacco.style.top = `${currentY}px`;

    setTimeout(() => {
      pochacco.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }, 2000);
  }, 4000);
});