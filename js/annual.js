(() => {

  const STORAGE_KEY = 'macgyver_household_account_v2';

  const CATEGORY_TAGS = {
    '생활비': ['식비', '간식비', '쇼핑', '기타'],
    '고정지출': ['보험', '통신', '구독', '주유비', '기타'],
    '준비지출': ['축의금', '조의금', '어머니아버지 생신용돈', '명절용돈', '기타'],
    '특별소비': ['여행', '선물', '대형수리', '기타']
  };

  const INCOME_CATEGORIES = ['수당', '월급', '보너스'];

  const HELP_TEXT = {
    living: {
      title: '생활비',
      content: '식비·간식비·쇼핑 등 평소 생활하면서 사용하는 돈입니다. 월 목표금액을 기준으로 관리합니다.'
    },
    fixed: {
      title: '고정지출',
      content: '보험·통신·구독·주유비처럼 생활하면서 반복적으로 발생하는 지출입니다. 월 목표금액을 기준으로 관리합니다.'
    },
    prepare: {
      title: '준비지출',
      content: '축의금·조의금·부모님 생신 및 명절 용돈처럼 매년 어느 정도 발생할 것으로 예상해 미리 준비하는 지출입니다. 연간 목표금액으로 관리합니다.'
    },
    special: {
      title: '특별소비',
      content: '평소 생활비와 별도로 발생하는 큰 지출입니다. 선물·여행·대형 차량수리처럼 특별히 계획하거나 갑자기 발생하는 소비를 기록합니다.'
    }
  };


  let currentDate = new Date();

  let currentYear = currentDate.getFullYear();
  let currentMonth = currentDate.getMonth() + 1;

  let currentMainTab = 'monthly';

let state = defaultState();

let cloudSync = null;
let cloudSyncInitialized = false;


  /* ==================================================
     초기화
  ================================================== */

  init();

async function init() {

  ensureState();

  bindEvents();

  renderAll();

  await initializeCloudSync();

}
async function initializeCloudSync() {

  try {

    cloudSync =
      await import('./household-sync.js');


    const result =
      await cloudSync.loadHouseholdState();


    // 로그인하지 않은 경우
    if (!result.loggedIn) {

      updateCloudStatus('로그인 필요');

      return;

    }


    // ==========================================
    // Firebase에 가계부가 아직 없는 경우
    // → 새 가계부 생성
    // ==========================================

    if (!result.exists) {

      state = defaultState();

      ensureState();

      cloudSyncInitialized = true;

      const saveResult =
        await cloudSync.saveHouseholdState(state);


      if (saveResult.success) {

        updateCloudStatus('클라우드 가계부 생성됨');

      } else {

        updateCloudStatus('클라우드 저장 실패');

      }

    }


    // ==========================================
    // Firebase에 기존 가계부가 있는 경우
    // ==========================================

    else {

      if (result.state) {

        state = result.state;

        ensureState();

        renderAll();

      }

      cloudSyncInitialized = true;

      updateCloudStatus('클라우드 동기화됨');

    }


    // ==========================================
    // 다른 기기의 변경사항 실시간 반영
    // ==========================================

    await cloudSync.watchHouseholdState(
      remoteState => {

        if (!remoteState) {
          return;
        }


        state = remoteState;

        ensureState();

        renderAll();

        updateCloudStatus('클라우드 동기화됨');

      }
    );


  } catch (error) {

    console.error(
      '가계부 클라우드 동기화 초기화 실패:',
      error
    );

    updateCloudStatus('클라우드 연결 확인 필요');

  }

}

  /* ==================================================
     데이터
  ================================================== */

  function defaultState() {

    return {
      expenses: [],
      incomes: [],

      goals: {
        living: {},
        fixed: {},
        prepare: {}
      },

      forecasts: {}

    };

  }


  function loadState() {

    try {

      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return defaultState();
      }

      const parsed = JSON.parse(raw);

      return parsed || defaultState();

    } catch (error) {

      console.error('가계부 데이터를 불러오지 못했습니다.', error);

      return defaultState();

    }

  }


  function ensureState() {

    if (!state || typeof state !== 'object') {
      state = defaultState();
    }

    if (!Array.isArray(state.expenses)) {
      state.expenses = [];
    }

    if (!Array.isArray(state.incomes)) {
      state.incomes = [];
    }

    if (!state.goals || typeof state.goals !== 'object') {
      state.goals = {};
    }

    if (!state.goals.living) state.goals.living = {};
    if (!state.goals.fixed) state.goals.fixed = {};
    if (!state.goals.prepare) state.goals.prepare = {};

    if (!state.forecasts || typeof state.forecasts !== 'object') {
      state.forecasts = {};
    }

    /*
      기존 데이터 호환 처리

      예전 버전에서 사용했을 가능성이 있는
      다양한 필드명을 내용(content)으로 통일한다.
    */
    state.expenses = state.expenses.map((item, index) => {

      const expense = { ...item };

      expense.id = expense.id || createId();

      expense.date =
        expense.date ||
        expense.expenseDate ||
        todayString();

      expense.content =
        expense.content ||
        expense.description ||
        expense.memo ||
        expense.title ||
        expense.name ||
        '';

      expense.amount =
        toNumber(expense.amount) ||
        toNumber(expense.price) ||
        toNumber(expense.cost);

      expense.category =
        normalizeCategory(expense.category || expense.type);

      expense.tag =
        expense.tag ||
        expense.subTag ||
        expense.detailTag ||
        '';

      /*
        입력순 보존.
        기존 데이터에는 inputOrder가 없을 수 있으므로
        배열 순서를 이용해 최초 입력순을 부여한다.
      */
      if (!expense.inputOrder) {
        expense.inputOrder = index + 1;
      }

      return expense;

    });


    state.incomes = state.incomes.map((item, index) => {

      const income = { ...item };

      income.id = income.id || createId();

      income.date =
        income.date ||
        income.incomeDate ||
        todayString();

      income.content =
        income.content ||
        income.description ||
        income.memo ||
        income.title ||
        income.name ||
        '';

      income.amount =
        toNumber(income.amount) ||
        toNumber(income.price);

      income.category =
        normalizeIncomeCategory(
          income.category || income.type
        );

      if (!income.inputOrder) {
        income.inputOrder = index + 1;
      }

      return income;

    });


    saveState();

  }
function updateCloudStatus(message) {

  const element =
    document.getElementById(
      'household-cloud-status'
    );

  if (element) {
    element.textContent = message;
  }

}

function saveState() {

  if (!cloudSyncInitialized || !cloudSync) {
    return;
  }


  cloudSync
    .saveHouseholdState(state)

    .then(result => {

      if (result.success) {

        updateCloudStatus('클라우드 저장됨');

      }

    })

    .catch(error => {

      console.error(
        '클라우드 저장 실패:',
        error
      );

      updateCloudStatus('클라우드 저장 실패');

    });

}


  /* ==================================================
     이벤트
  ================================================== */

  function bindEvents() {

    /* 메인 탭 */

    document.querySelectorAll('.annual-main-tab')
      .forEach(button => {

        button.addEventListener('click', () => {

          const tab = button.dataset.mainTab;

          currentMainTab = tab;

          document.querySelectorAll('.annual-main-tab')
            .forEach(btn => {
              btn.classList.toggle(
                'active',
                btn.dataset.mainTab === tab
              );
            });

          document.getElementById('monthly-view')
            .classList.toggle(
              'hidden',
              tab !== 'monthly'
            );

          document.getElementById('yearly-view')
            .classList.toggle(
              'hidden',
              tab !== 'yearly'
            );

          renderAll();

        });

      });


    /* 월 이동 */

    document.getElementById('prev-month-btn')
      ?.addEventListener('click', () => {

        currentMonth--;

        if (currentMonth < 1) {
          currentMonth = 12;
          currentYear--;
        }

        renderAll();

      });


    document.getElementById('next-month-btn')
      ?.addEventListener('click', () => {

        currentMonth++;

        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }

        renderAll();

      });


    /* 월 선택 */

    document.getElementById('month-picker-btn')
      ?.addEventListener('click', () => {

        const panel =
          document.getElementById('month-picker-panel');

        panel.classList.toggle('hidden');

        populateYearPicker();

      });


    document.getElementById('apply-month-btn')
      ?.addEventListener('click', () => {

        const year =
          Number(document.getElementById('picker-year').value);

        const month =
          Number(document.getElementById('picker-month').value);

        if (!year || !month) return;

        currentYear = year;
        currentMonth = month;

        document.getElementById('month-picker-panel')
          .classList.add('hidden');

        renderAll();

      });


    /* 연도 이동 */

    document.getElementById('prev-year-btn')
      ?.addEventListener('click', () => {

        currentYear--;

        renderAll();

      });


    document.getElementById('next-year-btn')
      ?.addEventListener('click', () => {

        currentYear++;

        renderAll();

      });


    /* 지출 추가 */

    document.getElementById('add-expense-btn')
      ?.addEventListener('click', () => {

        openExpenseModal();

      });


    /* 수입 추가 */

    document.getElementById('add-income-btn')
      ?.addEventListener('click', () => {

        openIncomeModal();

      });


    /* 수입 내역 */

    document.getElementById('income-history-btn')
      ?.addEventListener('click', () => {

        openIncomeHistoryModal();

      });


    /* 지출 정렬 */

    document.getElementById('expense-sort-select')
      ?.addEventListener('change', renderExpenseList);


    /* 지출 카테고리 변경 */

    document.getElementById('expense-category')
      ?.addEventListener('change', () => {

        updateTagOptions();

      });


    /* 지출 저장 */

    document.getElementById('expense-form')
      ?.addEventListener('submit', handleExpenseSubmit);


    /* 수입 저장 */

    document.getElementById('income-form')
      ?.addEventListener('submit', handleIncomeSubmit);


    /* 목표 저장 */

    document.getElementById('goal-form')
      ?.addEventListener('submit', handleGoalSubmit);


    /* 예상금액 */

    document.getElementById('edit-forecast-btn')
      ?.addEventListener('click', openForecastModal);

    document.getElementById('forecast-form')
      ?.addEventListener('submit', handleForecastSubmit);


    /* 모달 닫기 */

    document.querySelectorAll('[data-close-modal]')
      .forEach(button => {

        button.addEventListener('click', () => {

          closeModal(
            button.dataset.closeModal
          );

        });

      });


    document.querySelectorAll('.annual-modal-backdrop')
      .forEach(backdrop => {

        backdrop.addEventListener('click', () => {

          const modal =
            backdrop.closest('.annual-modal');

          if (modal) {
            closeModal(modal.id);
          }

        });

      });


    /* 금액 자동 콤마 */

    document.querySelectorAll(
      '#expense-amount, #income-amount, #goal-amount, #forecast-income-input, #forecast-expense-input'
    ).forEach(input => {

      input.addEventListener('input', () => {

        const number =
          toNumber(input.value);

        input.value =
          number ? number.toLocaleString('ko-KR') : '';

      });

    });


    /* 설명 */

    document.querySelectorAll('.category-help-btn')
      .forEach(button => {

        button.addEventListener('click', () => {

          openHelpModal(
            button.dataset.help
          );

        });

      });
/* 목표 수정 - 생활비 / 고정지출 / 준비지출 카드 클릭 */

document.querySelectorAll('.monthly-category-card')
  .forEach(card => {

    card.addEventListener('click', event => {

      /* 카드 안의 ? 설명 버튼을 누른 경우에는 목표 팝업을 열지 않는다. */
      if (event.target.closest('.category-help-btn')) return;

      if (card.classList.contains('living-card')) {
        openGoalModal('생활비');
        return;
      }

      if (card.classList.contains('fixed-card')) {
        openGoalModal('고정지출');
        return;
      }

      if (card.classList.contains('prepare-card')) {
        openGoalModal('준비지출');
      }

    });

  });

    /* 통계 펼치기 */

    document.querySelectorAll('.expand-section-btn')
      .forEach(button => {

        button.addEventListener('click', () => {

          const targetId =
            button.dataset.expandTarget;

          const target =
            document.getElementById(targetId);

          if (!target) return;

          target.classList.toggle('hidden');

          button.classList.toggle(
            'expanded'
          );

        });

      });

  }


  /* ==================================================
     렌더링
  ================================================== */

  function renderAll() {

    updateMonthTitle();

    updateYearTitle();

    renderMonthlySummary();

    renderExpenseList();

    renderYearlySummary();

    renderIncomeHistory();

    populateYearPicker();

  }


  function updateMonthTitle() {

    const button =
      document.getElementById('month-picker-btn');

    if (button) {

      button.textContent =
        `${currentYear}년 ${currentMonth}월`;

    }

  }


  function updateYearTitle() {

    const title =
      document.getElementById('year-title');

    if (title) {
      title.textContent =
        `${currentYear}년`;
    }

  }


  /* ==================================================
     월별 계산
  ================================================== */

  function getMonthExpenses() {

    const prefix =
      `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    return state.expenses.filter(expense => {

      return normalizeDate(expense.date)
        .startsWith(prefix);

    });

  }


  function getYearExpenses(year = currentYear) {

    return state.expenses.filter(expense => {

      return normalizeDate(expense.date)
        .startsWith(`${year}-`);

    });

  }


  function getMonthIncomes() {

    const prefix =
      `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    return state.incomes.filter(income => {

      return normalizeDate(income.date)
        .startsWith(prefix);

    });

  }


  function getYearIncomes(year = currentYear) {

    return state.incomes.filter(income => {

      return normalizeDate(income.date)
        .startsWith(`${year}-`);

    });

  }


  function sumByCategory(expenses, category) {

    return expenses
      .filter(item => normalizeCategory(item.category) === category)
      .reduce((sum, item) => {
        return sum + toNumber(item.amount);
      }, 0);

  }


  function renderMonthlySummary() {

    const expenses =
      getMonthExpenses();

    const yearExpenses =
      getYearExpenses();


    const living =
      sumByCategory(expenses, '생활비');

    const fixed =
      sumByCategory(expenses, '고정지출');

    const prepare =
      sumByCategory(expenses, '준비지출');

    const special =
      sumByCategory(expenses, '특별소비');


    /*
      월별 총지출
      = 모든 지출 카테고리 합계
    */

    const monthlyTotal =
      living +
      fixed +
      prepare +
      special;


    /*
      준비지출은 연간 누적 기준
    */

    const yearlyPrepare =
      sumByCategory(yearExpenses, '준비지출');


    const livingGoal =
      getGoal('living', currentYear, currentMonth, 1600000);

    const fixedGoal =
      getGoal('fixed', currentYear, currentMonth, 0);

    const prepareGoal =
      getGoal('prepare', currentYear, currentMonth, 2400000);


    const livingPercent =
      percent(living, livingGoal);

    const fixedPercent =
      percent(fixed, fixedGoal);

    const preparePercent =
      percent(yearlyPrepare, prepareGoal);


    /* 최상단 총 생활비 */

    setText(
      'monthly-living-total',
      formatWon(living)
    );

    setText(
      'monthly-living-goal',
      formatWon(livingGoal)
    );

    setText(
      'monthly-living-percent',
      `${formatPercent(livingPercent)}%`
    );

    setWidth(
      'living-progress-bar',
      livingPercent
    );


    /* 생활비 카드 */

    setText(
      'living-card-total',
      formatWon(living)
    );

    setText(
      'living-card-goal',
      formatWon(livingGoal)
    );

    setText(
      'living-card-percent',
      `${formatPercent(livingPercent)}%`
    );

    setWidth(
      'living-card-progress',
      livingPercent
    );


    /* 고정지출 */

    setText(
      'fixed-card-total',
      formatWon(fixed)
    );

    setText(
      'fixed-card-goal',
      formatWon(fixedGoal)
    );

    setText(
      'fixed-card-percent',
      fixedGoal > 0
        ? `${formatPercent(fixedPercent)}%`
        : '목표 없음'
    );

    setWidth(
      'fixed-card-progress',
      fixedPercent
    );


    /* 준비지출 */

    setText(
      'prepare-card-total',
      formatWon(prepare)
    );

    setText(
      'prepare-card-goal',
      formatWon(prepareGoal)
    );

    setText(
      'prepare-card-percent',
      `연 누적 ${formatPercent(preparePercent)}%`
    );

    setWidth(
      'prepare-card-progress',
      preparePercent
    );


    /* 특별소비 */

    setText(
      'special-card-total',
      formatWon(special)
    );


    /* 월별 총지출 */

    setText(
      'monthly-total-expense',
      formatWon(monthlyTotal)
    );

  }


  /* ==================================================
     지출 목록
  ================================================== */

  function renderExpenseList() {

    const container =
      document.getElementById('expense-list');

    if (!container) return;


    const expenses =
      [...getMonthExpenses()];


    const sortType =
      document.getElementById('expense-sort-select')
        ?.value || 'date-desc';


    if (sortType === 'input-desc') {

      expenses.sort((a, b) => {

        return toNumber(b.inputOrder) -
               toNumber(a.inputOrder);

      });

    } else {

      expenses.sort((a, b) => {

        const dateCompare =
          normalizeDate(b.date)
            .localeCompare(normalizeDate(a.date));

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return toNumber(b.inputOrder) -
               toNumber(a.inputOrder);

      });

    }


    if (expenses.length === 0) {

      container.innerHTML = `
        <div class="empty-expense">
          아직 등록된 지출이 없습니다.
        </div>
      `;

      return;

    }


    container.innerHTML =
      expenses.map(expense => {

        const category =
          normalizeCategory(expense.category);

        const isLiving =
          category === '생활비';


        return `
          <div class="expense-record ${isLiving ? 'living-record' : ''}">

            <div class="expense-record-date">
              ${formatDate(expense.date)}
            </div>

            <div class="expense-record-main">

              <div class="expense-record-content">
                ${escapeHtml(
                  expense.content || '(내용 없음)'
                )}
              </div>

              <div class="expense-record-meta">
                <span class="expense-category-label">
                  ${escapeHtml(category)}
                </span>

                ${
                  expense.tag
                    ? `<span>${escapeHtml(expense.tag)}</span>`
                    : ''
                }
              </div>

            </div>

            <strong class="expense-record-amount">
              ${formatWon(toNumber(expense.amount))}
            </strong>

            <div class="record-actions">

              <button
                type="button"
                class="record-edit-btn"
                data-edit-expense="${escapeHtml(expense.id)}"
              >
                수정
              </button>

              <button
                type="button"
                class="record-delete-btn"
                data-delete-expense="${escapeHtml(expense.id)}"
              >
                삭제
              </button>

            </div>

          </div>
        `;

      }).join('');


    /* 수정 */

    container.querySelectorAll(
      '[data-edit-expense]'
    ).forEach(button => {

      button.addEventListener('click', () => {

        openExpenseModal(
          button.dataset.editExpense
        );

      });

    });


    /* 삭제 */

    container.querySelectorAll(
      '[data-delete-expense]'
    ).forEach(button => {

      button.addEventListener('click', () => {

        deleteExpense(
          button.dataset.deleteExpense
        );

      });

    });

  }


  /* ==================================================
     수입 내역
  ================================================== */

  function renderIncomeHistory() {

    const container =
      document.getElementById('income-history-list');

    if (!container) return;


    const incomes =
      [...getMonthIncomes()];


    incomes.sort((a, b) => {

      const dateCompare =
        normalizeDate(b.date)
          .localeCompare(normalizeDate(a.date));

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return toNumber(b.inputOrder) -
             toNumber(a.inputOrder);

    });


    if (incomes.length === 0) {

      container.innerHTML = `
        <div class="empty-income">
          이번 달 수입내역이 없습니다.
        </div>
      `;

      return;

    }


    container.innerHTML =
      incomes.map(income => {

        return `
          <div class="income-record">

            <div>
              <div class="income-record-content">
                ${escapeHtml(
                  income.content || '(내용 없음)'
                )}
              </div>

              <div class="income-record-meta">
                ${formatDate(income.date)}
                ·
                ${escapeHtml(
                  normalizeIncomeCategory(income.category)
                )}
              </div>
            </div>

            <strong>
              ${formatWon(toNumber(income.amount))}
            </strong>

            <div class="record-actions">

              <button
                type="button"
                class="record-edit-btn"
                data-edit-income="${escapeHtml(income.id)}"
              >
                수정
              </button>

              <button
                type="button"
                class="record-delete-btn"
                data-delete-income="${escapeHtml(income.id)}"
              >
                삭제
              </button>

            </div>

          </div>
        `;

      }).join('');


    container.querySelectorAll(
      '[data-edit-income]'
    ).forEach(button => {

      button.addEventListener('click', () => {

        openIncomeModal(
          button.dataset.editIncome
        );

      });

    });


    container.querySelectorAll(
      '[data-delete-income]'
    ).forEach(button => {

      button.addEventListener('click', () => {

        deleteIncome(
          button.dataset.deleteIncome
        );

      });

    });

  }


  function openIncomeHistoryModal() {

    const period =
      document.getElementById(
        'income-history-period'
      );

    if (period) {

      period.textContent =
        `${currentYear}년 ${currentMonth}월`;

    }

    renderIncomeHistory();

    openModal('income-history-modal');

  }


  /* ==================================================
     연간
  ================================================== */

  function renderYearlySummary() {

    const expenses =
      getYearExpenses();

    const incomes =
      getYearIncomes();


    const totalIncome =
      incomes.reduce(
        (sum, item) =>
          sum + toNumber(item.amount),
        0
      );


    const totalExpense =
      expenses.reduce(
        (sum, item) =>
          sum + toNumber(item.amount),
        0
      );


    const balance =
      totalIncome - totalExpense;


    setText(
      'year-total-income',
      formatWon(totalIncome)
    );

    setText(
      'year-total-expense',
      formatWon(totalExpense)
    );

    setText(
      'year-balance',
      formatWon(balance)
    );


    const living =
      sumByCategory(expenses, '생활비');

    const fixed =
      sumByCategory(expenses, '고정지출');

    const prepare =
      sumByCategory(expenses, '준비지출');

    const special =
      sumByCategory(expenses, '특별소비');


    const livingGoal =
      getGoal('living', currentYear, 12, 1600000) * 12;

    const fixedGoal =
      getAnnualFixedGoal(currentYear);

    const prepareGoal =
      getGoal('prepare', currentYear, 12, 2400000);


    const livingPercent =
      percent(living, livingGoal);

    const fixedPercent =
      percent(fixed, fixedGoal);

    const preparePercent =
      percent(prepare, prepareGoal);


    setText(
      'year-living-total',
      formatWon(living)
    );

    setText(
      'year-living-goal',
      formatWon(livingGoal)
    );

    setText(
      'year-living-percent',
      `${formatPercent(livingPercent)}%`
    );

    setWidth(
      'year-living-progress',
      livingPercent
    );


    setText(
      'year-fixed-total',
      formatWon(fixed)
    );

    setText(
      'year-fixed-goal',
      formatWon(fixedGoal)
    );

    setText(
      'year-fixed-percent',
      fixedGoal > 0
        ? `${formatPercent(fixedPercent)}%`
        : '목표 없음'
    );

    setWidth(
      'year-fixed-progress',
      fixedPercent
    );


    setText(
      'year-prepare-total',
      formatWon(prepare)
    );

    setText(
      'year-prepare-goal',
      formatWon(prepareGoal)
    );

    setText(
      'year-prepare-percent',
      `${formatPercent(preparePercent)}%`
    );

    setWidth(
      'year-prepare-progress',
      preparePercent
    );


    setText(
      'year-special-total',
      formatWon(special)
    );


    renderTagStatistics(expenses);

    renderMonthlyStatistics();

    renderForecast();

  }


  /* ==================================================
     목표
  ================================================== */

  function getGoal(
    category,
    year,
    month,
    defaultValue
  ) {

    const history =
      state.goals?.[category] || {};


    /*
      해당 월 이전까지 등록된 가장 최근 목표를 찾는다.

      예:
      1~8월 160만원
      9월 180만원 수정
      → 9~12월 180만원

      1~8월은 그대로 160만원.
    */

    let result = defaultValue;

    let latestKey = null;

    Object.keys(history)
      .forEach(key => {

        const parts =
          key.split('-');

        if (parts.length !== 2) return;

        const keyYear =
          Number(parts[0]);

        const keyMonth =
          Number(parts[1]);

        if (
          keyYear < year ||
          (
            keyYear === year &&
            keyMonth <= month
          )
        ) {

          if (
            latestKey === null ||
            keyYear > Number(latestKey.split('-')[0]) ||
            (
              keyYear === Number(latestKey.split('-')[0]) &&
              keyMonth > Number(latestKey.split('-')[1])
            )
          ) {

            latestKey = key;

          }

        }

      });


    if (latestKey !== null) {

      result =
        toNumber(history[latestKey]);

    }


    return result;

  }


  function getAnnualFixedGoal(year) {

    let total = 0;

    for (let month = 1; month <= 12; month++) {

      total += getGoal(
        'fixed',
        year,
        month,
        0
      );

    }

    return total;

  }


  function openGoalModal(category = '생활비') {

    document.getElementById(
      'goal-category'
    ).value =
      category;

    const key =
      `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let goalValue = 0;

    if (category === '생활비') {

      goalValue =
        getGoal(
          'living',
          currentYear,
          currentMonth,
          1600000
        );

    } else if (category === '고정지출') {

      goalValue =
        getGoal(
          'fixed',
          currentYear,
          currentMonth,
          0
        );

    } else if (category === '준비지출') {

      goalValue =
        getGoal(
          'prepare',
          currentYear,
          currentMonth,
          2400000
        );

    }

    document.getElementById(
      'goal-amount'
    ).value =
      goalValue
        ? goalValue.toLocaleString('ko-KR')
        : '';

    document.getElementById(
      'goal-form'
    ).dataset.editKey =
      key;

    openModal('goal-modal');

  }


  function handleGoalSubmit(event) {

    event.preventDefault();

    const category =
      document.getElementById(
        'goal-category'
      ).value;

    const amount =
      toNumber(
        document.getElementById(
          'goal-amount'
        ).value
      );


    if (amount < 0) {

      alert('목표금액을 확인해주세요.');

      return;

    }


    let key =
      `${currentYear}-${String(currentMonth).padStart(2, '0')}`;


    if (!state.goals[categoryMap(category)]) {

      state.goals[categoryMap(category)] = {};

    }


    state.goals[
      categoryMap(category)
    ][key] = amount;


    saveState();

    closeModal('goal-modal');

    renderAll();

  }


  function categoryMap(category) {

    if (category === '생활비') return 'living';
    if (category === '고정지출') return 'fixed';
    if (category === '준비지출') return 'prepare';

    return category;

  }


  /* ==================================================
     지출 입력
  ================================================== */

  function openExpenseModal(id = null) {

    const form =
      document.getElementById(
        'expense-form'
      );

    form.reset();


    document.getElementById(
      'expense-edit-id'
    ).value =
      id || '';


    document.getElementById(
      'expense-modal-title'
    ).textContent =
      id ? '지출 수정' : '지출 추가';


    if (id) {

      const expense =
        state.expenses.find(
          item => String(item.id) === String(id)
        );


      if (!expense) return;


      document.getElementById(
        'expense-date'
      ).value =
        normalizeDate(expense.date);


      document.getElementById(
        'expense-content'
      ).value =
        expense.content || '';


      document.getElementById(
        'expense-amount'
      ).value =
        toNumber(expense.amount)
          .toLocaleString('ko-KR');


      document.getElementById(
        'expense-category'
      ).value =
        normalizeCategory(expense.category);


      updateTagOptions(
        expense.tag
      );

    } else {

      document.getElementById(
        'expense-date'
      ).value =
        todayString();

      document.getElementById(
        'expense-category'
      ).value =
        '생활비';

      updateTagOptions();

    }


    openModal('expense-modal');

  }


  function updateTagOptions(selectedTag = '') {

    const category =
      document.getElementById(
        'expense-category'
      ).value;


    const tagSelect =
      document.getElementById(
        'expense-tag'
      );


    const tags =
      CATEGORY_TAGS[category] ||
      ['기타'];


    tagSelect.innerHTML =
      tags.map(tag => {

        return `
          <option value="${escapeHtml(tag)}">
            ${escapeHtml(tag)}
          </option>
        `;

      }).join('');


    if (selectedTag && tags.includes(selectedTag)) {

      tagSelect.value =
        selectedTag;

    }

  }


  function handleExpenseSubmit(event) {

    event.preventDefault();


    const editId =
      document.getElementById(
        'expense-edit-id'
      ).value;


    const date =
      document.getElementById(
        'expense-date'
      ).value;


    const content =
      document.getElementById(
        'expense-content'
      ).value.trim();


    const amount =
      toNumber(
        document.getElementById(
          'expense-amount'
        ).value
      );


    const category =
      document.getElementById(
        'expense-category'
      ).value;


    const tag =
      document.getElementById(
        'expense-tag'
      ).value;


    if (!date || !content || amount <= 0) {

      alert(
        '날짜, 내용, 금액을 확인해주세요.'
      );

      return;

    }


    if (editId) {

      const index =
        state.expenses.findIndex(
          item =>
            String(item.id) === String(editId)
        );


      if (index !== -1) {

        state.expenses[index] = {
          ...state.expenses[index],
          date,
          content,
          amount,
          category,
          tag
        };

      }

    } else {

      const maxOrder =
        state.expenses.reduce(
          (max, item) =>
            Math.max(
              max,
              toNumber(item.inputOrder)
            ),
          0
        );


      state.expenses.push({

        id: createId(),

        date,

        content,

        amount,

        category,

        tag,

        inputOrder:
          maxOrder + 1,

        createdAt:
          new Date().toISOString()

      });

    }


    saveState();

    closeModal('expense-modal');

    renderAll();

  }


  /* ==================================================
     지출 삭제
  ================================================== */

  function deleteExpense(id) {

    const expense =
      state.expenses.find(
        item =>
          String(item.id) === String(id)
      );


    if (!expense) return;


    const confirmed =
      confirm(
        `다음 지출을 삭제할까요?\n\n${expense.content || '(내용 없음)'}\n${formatWon(expense.amount)}`
      );


    if (!confirmed) return;


    state.expenses =
      state.expenses.filter(
        item =>
          String(item.id) !== String(id)
      );


    saveState();

    renderAll();

  }


  /* ==================================================
     수입 입력
  ================================================== */

  function openIncomeModal(id = null) {

    const form =
      document.getElementById(
        'income-form'
      );

    form.reset();


    document.getElementById(
      'income-edit-id'
    ).value =
      id || '';


    document.getElementById(
      'income-modal-title'
    ).textContent =
      id ? '수입 수정' : '수입 추가';


    if (id) {

      const income =
        state.incomes.find(
          item =>
            String(item.id) === String(id)
        );


      if (!income) return;


      document.getElementById(
        'income-date'
      ).value =
        normalizeDate(income.date);


      document.getElementById(
        'income-content'
      ).value =
        income.content || '';


      document.getElementById(
        'income-amount'
      ).value =
        toNumber(income.amount)
          .toLocaleString('ko-KR');


      document.getElementById(
        'income-category'
      ).value =
        normalizeIncomeCategory(
          income.category
        );

    } else {

      document.getElementById(
        'income-date'
      ).value =
        todayString();

    }
/* 수입내역에서 수정할 때는 수입내역 팝업을 먼저 닫는다. */
if (id) {
  closeModal('income-history-modal');
}

    openModal('income-modal');

  }


  function handleIncomeSubmit(event) {

    event.preventDefault();


    const editId =
      document.getElementById(
        'income-edit-id'
      ).value;


    const date =
      document.getElementById(
        'income-date'
      ).value;


    const content =
      document.getElementById(
        'income-content'
      ).value.trim();


    const amount =
      toNumber(
        document.getElementById(
          'income-amount'
        ).value
      );


    const category =
      document.getElementById(
        'income-category'
      ).value;


    if (!date || !content || amount <= 0) {

      alert(
        '날짜, 내용, 금액을 확인해주세요.'
      );

      return;

    }


    if (editId) {

      const index =
        state.incomes.findIndex(
          item =>
            String(item.id) === String(editId)
        );


      if (index !== -1) {

        state.incomes[index] = {
          ...state.incomes[index],
          date,
          content,
          amount,
          category
        };

      }

    } else {

      const maxOrder =
        state.incomes.reduce(
          (max, item) =>
            Math.max(
              max,
              toNumber(item.inputOrder)
            ),
          0
        );


      state.incomes.push({

        id: createId(),

        date,

        content,

        amount,

        category,

        inputOrder:
          maxOrder + 1,

        createdAt:
          new Date().toISOString()

      });

    }


    saveState();

    closeModal('income-modal');

    renderAll();

  }


  function deleteIncome(id) {

    const income =
      state.incomes.find(
        item =>
          String(item.id) === String(id)
      );


    if (!income) return;


    const confirmed =
      confirm(
        `다음 수입을 삭제할까요?\n\n${income.content || '(내용 없음)'}\n${formatWon(income.amount)}`
      );


    if (!confirmed) return;


    state.incomes =
      state.incomes.filter(
        item =>
          String(item.id) !== String(id)
      );


    saveState();

    renderAll();

  }


  /* ==================================================
     예상금액
  ================================================== */

  function openForecastModal() {

    const forecast =
      state.forecasts[currentYear] || {
        income: 0,
        expense: 0
      };


    document.getElementById(
      'forecast-income-input'
    ).value =
      forecast.income
        ? Number(forecast.income)
          .toLocaleString('ko-KR')
        : '';


    document.getElementById(
      'forecast-expense-input'
    ).value =
      forecast.expense
        ? Number(forecast.expense)
          .toLocaleString('ko-KR')
        : '';


    openModal('forecast-modal');

  }


  function handleForecastSubmit(event) {

    event.preventDefault();


    state.forecasts[currentYear] = {

      income:
        toNumber(
          document.getElementById(
            'forecast-income-input'
          ).value
        ),

      expense:
        toNumber(
          document.getElementById(
            'forecast-expense-input'
          ).value
        )

    };


    saveState();

    closeModal('forecast-modal');

    renderAll();

  }


  function renderForecast() {

    const forecast =
      state.forecasts[currentYear] || {
        income: 0,
        expense: 0
      };


    setText(
      'forecast-income',
      formatWon(forecast.income)
    );

    setText(
      'forecast-expense',
      formatWon(forecast.expense)
    );

  }


  /* ==================================================
     태그 통계
  ================================================== */

  function renderTagStatistics(expenses) {

    const container =
      document.getElementById(
        'tag-statistics-list'
      );

    if (!container) return;


    const totals = {};


    expenses.forEach(expense => {

      const category =
        normalizeCategory(expense.category);

      const tag =
        expense.tag || '기타';

      const key =
        `${category} · ${tag}`;


      totals[key] =
        (totals[key] || 0) +
        toNumber(expense.amount);

    });


    const rows =
      Object.entries(totals)
        .sort((a, b) => b[1] - a[1]);


    if (rows.length === 0) {

      container.innerHTML =
        '<p class="empty-statistics">등록된 지출이 없습니다.</p>';

      return;

    }


    container.innerHTML =
      rows.map(([label, amount]) => {

        return `
          <div class="statistics-row">
            <span>${escapeHtml(label)}</span>
            <strong>${formatWon(amount)}</strong>
          </div>
        `;

      }).join('');

  }


  /* ==================================================
     월별 통계
  ================================================== */

  function renderMonthlyStatistics() {

    const container =
      document.getElementById(
        'monthly-statistics-list'
      );

    if (!container) return;


    const rows = [];


    for (let month = 1; month <= 12; month++) {

      const prefix =
        `${currentYear}-${String(month).padStart(2, '0')}`;


      const expenses =
        state.expenses.filter(
          expense =>
            normalizeDate(expense.date)
              .startsWith(prefix)
        );


      const income =
        state.incomes
          .filter(
            item =>
              normalizeDate(item.date)
                .startsWith(prefix)
          )
          .reduce(
            (sum, item) =>
              sum + toNumber(item.amount),
            0
          );


      const expenseTotal =
        expenses.reduce(
          (sum, item) =>
            sum + toNumber(item.amount),
          0
        );


      rows.push({

        month,

        income,

        expense: expenseTotal

      });

    }


    container.innerHTML =
      rows.map(row => {

        return `
          <div class="statistics-row monthly-stat-row">

            <span>${row.month}월</span>

            <span>
              수입 ${formatWon(row.income)}
            </span>

            <strong>
              지출 ${formatWon(row.expense)}
            </strong>

          </div>
        `;

      }).join('');

  }


  /* ==================================================
     월 선택
  ================================================== */

  function populateYearPicker() {

    const select =
      document.getElementById(
        'picker-year'
      );

    if (!select) return;


    const years = new Set();


    const startYear =
      Math.min(
        currentYear - 5,
        ...state.expenses.map(
          item =>
            Number(
              normalizeDate(item.date)
                .slice(0, 4)
            ) || currentYear
        ),
        ...state.incomes.map(
          item =>
            Number(
              normalizeDate(item.date)
                .slice(0, 4)
            ) || currentYear
        )
      );


    const endYear =
      Math.max(
        currentYear + 5,
        ...state.expenses.map(
          item =>
            Number(
              normalizeDate(item.date)
                .slice(0, 4)
            ) || currentYear
        ),
        ...state.incomes.map(
          item =>
            Number(
              normalizeDate(item.date)
                .slice(0, 4)
            ) || currentYear
        )
      );


    for (
      let year = startYear;
      year <= endYear;
      year++
    ) {

      years.add(year);

    }


    select.innerHTML =
      [...years]
        .sort((a, b) => a - b)
        .map(year => {

          return `
            <option value="${year}">
              ${year}년
            </option>
          `;

        }).join('');


    select.value =
      String(currentYear);


    document.getElementById(
      'picker-month'
    ).value =
      String(currentMonth);

  }


  /* ==================================================
     도움말
  ================================================== */

  function openHelpModal(type) {

    const data =
      HELP_TEXT[type];

    if (!data) return;


    setText(
      'help-modal-title',
      data.title
    );

    setText(
      'help-modal-content',
      data.content
    );


    openModal('help-modal');

  }


  /* ==================================================
     모달
  ================================================== */

  function openModal(id) {

    const modal =
      document.getElementById(id);

    if (!modal) return;

    modal.classList.remove('hidden');

  }


  function closeModal(id) {

    const modal =
      document.getElementById(id);

    if (!modal) return;

    modal.classList.add('hidden');

  }


  /* ==================================================
     유틸리티
  ================================================== */

  function createId() {

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

  }


  function todayString() {

    const now =
      new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1)
        .padStart(2, '0'),
      String(now.getDate())
        .padStart(2, '0')
    ].join('-');

  }


  function normalizeDate(value) {

    if (!value) {
      return '';
    }


    const text =
      String(value);


    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }


    const date =
      new Date(value);


    if (Number.isNaN(date.getTime())) {
      return '';
    }


    return [
      date.getFullYear(),
      String(date.getMonth() + 1)
        .padStart(2, '0'),
      String(date.getDate())
        .padStart(2, '0')
    ].join('-');

  }


  function normalizeCategory(value) {

    const category =
      String(value || '');


    if (
      category === '비정기지출' ||
      category === '비정기' ||
      category === '비정기 지출'
    ) {

      /*
        과거 비정기지출 데이터가 있다면
        태그를 보고 준비/특별소비로 최대한 분류.
      */

      return '준비지출';

    }


    if (
      ['생활비', '고정지출', '준비지출', '특별소비']
        .includes(category)
    ) {

      return category;

    }


    if (category === '경조사') {
      return '준비지출';
    }

    if (category === '빅이벤트') {
      return '특별소비';
    }


    return '생활비';

  }


  function normalizeIncomeCategory(value) {

    const category =
      String(value || '');


    if (INCOME_CATEGORIES.includes(category)) {
      return category;
    }


    return '보너스';

  }


  function toNumber(value) {

    if (typeof value === 'number') {

      return Number.isFinite(value)
        ? value
        : 0;

    }


    if (value === null || value === undefined) {
      return 0;
    }


    const cleaned =
      String(value)
        .replace(/[^\d.-]/g, '');


    const number =
      Number(cleaned);


    return Number.isFinite(number)
      ? number
      : 0;

  }


  function formatWon(value) {

    return `${Math.round(toNumber(value))
      .toLocaleString('ko-KR')}원`;

  }


  function formatPercent(value) {

    if (!Number.isFinite(value)) {
      return '0';
    }


    return Number(value)
      .toFixed(1)
      .replace(/\.0$/, '');

  }


  function percent(value, goal) {

    if (!goal || goal <= 0) {
      return 0;
    }


    return Math.min(
      (value / goal) * 100,
      100
    );

  }


  function formatDate(value) {

    const date =
      normalizeDate(value);

    if (!date) {
      return '';
    }


    const parts =
      date.split('-');


    return `${Number(parts[1])}.${Number(parts[2])}`;

  }


  function setText(id, value) {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
    }

  }


  function setWidth(id, percentValue) {

    const element =
      document.getElementById(id);

    if (element) {

      element.style.width =
        `${Math.min(
          Math.max(percentValue, 0),
          100
        )}%`;

    }

  }


  function escapeHtml(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }


})();
