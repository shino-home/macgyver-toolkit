// 만능 계산기 전용 모듈 스크립트
(() => {
  // 탭 전환
  const calcTabBtns = document.querySelectorAll('.calc-tab-btn');
  const calcTabContents = document.querySelectorAll('.calc-tab-content');

  calcTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      calcTabBtns.forEach(b => b.classList.remove('active'));
      calcTabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(tabTarget)?.classList.add('active');
    });
  });

  // 1. 만 나이 & 연 나이 & 띠 계산
  const birthInput = document.getElementById('birth-date-input');
  birthInput?.addEventListener('change', () => {
    const birthDate = new Date(birthInput.value);
    if (isNaN(birthDate)) return;

    const today = new Date();
    
    // 만 나이
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    document.getElementById('res-legal-age').textContent = `${age}세`;

    // 연 나이
    const yearAge = today.getFullYear() - birthDate.getFullYear();
    document.getElementById('res-year-age').textContent = `${yearAge}세`;

    // 띠
    const zodiacs = ["원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"];
    document.getElementById('res-zodiac').textContent = `${zodiacs[birthDate.getFullYear() % 12]}띠`;

    // 다음 생일 D-Day
    let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (today > nextBirthday) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    const diffDays = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
    document.getElementById('res-next-birthday').textContent = diffDays === 0 ? "D-Day 🎉" : `D-${diffDays}`;
  });

  // 2. D-Day 등록
  const addDdayBtn = document.getElementById('add-dday-btn');
  const ddayTitle = document.getElementById('dday-title-input');
  const ddayDate = document.getElementById('dday-date-input');
  const ddayList = document.getElementById('dday-list');

  addDdayBtn?.addEventListener('click', () => {
    if (!ddayTitle.value || !ddayDate.value) return;

    const targetDate = new Date(ddayDate.value);
    const today = new Date();
    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);

    const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    const ddayText = diff === 0 ? "D-Day" : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;

    const card = document.createElement('div');
    card.className = 'dday-item-card';
    card.innerHTML = `
      <span class="dday-item-title">${ddayTitle.value}</span>
      <span class="dday-item-val">${ddayText}</span>
    `;
    ddayList.appendChild(card);

    ddayTitle.value = '';
    ddayDate.value = '';
  });

  // 3. 날짜 계산기
  const calcDateBtn = document.getElementById('calc-date-btn');
  calcDateBtn?.addEventListener('click', () => {
    const baseDateVal = document.getElementById('base-date-input').value;
    const calcType = document.getElementById('date-calc-type').value;
    const daysOffset = parseInt(document.getElementById('days-offset-input').value);

    if (!baseDateVal || isNaN(daysOffset)) return;

    const resultDate = new Date(baseDateVal);
    resultDate.setDate(resultDate.getDate() + (calcType === 'after' ? daysOffset : -daysOffset));

    document.getElementById('res-calculated-date').textContent = `${resultDate.getFullYear()}년 ${resultDate.getMonth() + 1}월 ${resultDate.getDate()}일`;
  });
})();