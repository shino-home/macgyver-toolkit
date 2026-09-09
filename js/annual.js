(() => {
  const STORAGE_KEY = 'macgyver_household_account_v2';

  const today = new Date();

  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth() + 1;

  let currentView = 'monthly';

  let pendingDelete = null;

  let data = loadData();

  const TAGS = {
    living: [
      { value: 'food', label: '식비' },
      { value: 'snack', label: '간식비' },
      { value: 'shopping', label: '쇼핑' },
      { value: 'etc', label: '기타' }
    ],

    fixed: [
      { value: 'insurance', label: '보험' },
      { value: 'communication', label: '통신' },
      { value: 'subscription', label: '구독' },
      { value: 'fuel', label: '주유비' },
      { value: 'etc', label: '기타' }
    ],

    irregular: [
      { value: 'prepared', label: '준비지출' },
      { value: 'special', label: '특별소비' }
    ]
  };


  const TAG_HINTS = {
    living: {
      food: '식사, 장보기 등 음식과 관련된 생활비입니다.',
      snack: '커피, 디저트, 간식 등입니다.',
      shopping: '평소 생활에 필요한 물건이나 쇼핑입니다.',
      etc: '로또 결제 등 위 항목에 넣기 애매한 생활비입니다.'
    },

    fixed: {
      insurance: '매월 또는 정기적으로 납부하는 보험료입니다.',
      communication: '휴대전화, 인터넷 등 통신비입니다.',
      subscription: '정기 구독 서비스 비용입니다.',
      fuel: '평소 차량 운행에 필요한 주유비입니다.',
      etc: '기타 반복적인 고정지출입니다.'
    },

    irregular: {
      prepared: '축의금·조의금·부모님 용돈·명절 용돈·예상 가능한 차량 유지비 등 매년 어느 정도 준비하는 지출입니다.',
      special: '선물·여행·대형 차량수리 등 평소 생활비와 별도로 발생하는 큰 지출입니다.'
    }
  };


  /* =========================================================
     초기화
     ========================================================= */

  function init() {
    populateYearSelect();
    bindEvents();
    renderAll();
  }


  /* =========================================================
     데이터
     ========================================================= */

  function defaultData() {
    return {
      expenses: [],
      incomes: [],

      goals: {
        living: [
          {
            from: '2000-01',
            amount: 1600000
          }
        ],

        fixed: [
          {
            from: '2000-01',
            amount: 0
          }
        ],

        prepared: [
          {
            from: '2000-01',
            amount: 2400000
          }
        ]
      },

      assets: [
        {
          from: '2000-01',
          amount: 0
        }
      ],

      forecasts: {}
    };
  }


  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return defaultData();
      }

      const parsed = JSON.parse(saved);

      const result = defaultData();

      if (Array.isArray(parsed.expenses)) {
        result.expenses = parsed.expenses;
      }

      if (Array.isArray(parsed.incomes)) {
        result.incomes = parsed.incomes;
      }

      if (parsed.goals) {
        result.goals = {
          ...result.goals,
          ...parsed.goals
        };
      }

      if (Array.isArray(parsed.assets)) {
        result.assets = parsed.assets;
      }

      if (parsed.forecasts) {
        result.forecasts = parsed.forecasts;
      }

      /*
       * 이전 버전에서 goals가 단순 객체 형태였던 경우도
       * 최대한 이어받는다.
       */
      ['living', 'fixed', 'prepared'].forEach(type => {
        if (!Array.isArray(result.goals[type])) {
          const oldValue = result.goals[type];

          result.goals[type] = [
            {
              from: '2000-01',
              amount: Number(oldValue) || 0
            }
          ];
        }
      });

      if (!Array.isArray(result.assets)) {
        result.assets = [
          {
            from: '2000-01',
            amount: 0
          }
        ];
      }

      return result;

    } catch (error) {
      console.error('가계부 데이터를 불러오지 못했습니다.', error);
      return defaultData();
    }
  }


  function saveData() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  }


  /* =========================================================
     날짜 / 금액
     ========================================================= */

  function pad2(value) {
    return String(value).padStart(2, '0');
  }


  function monthKey(year, month) {
    return `${year}-${pad2(month)}`;
  }


  function dateKey(dateString) {
    return dateString.slice(0, 7);
  }


  function todayString() {
    return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  }


  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }


  function formatWon(value) {
    return `${formatNumber(value)}원`;
  }


  function parseMoney(value) {
    if (typeof value === 'number') {
      return value;
    }

    return Number(
      String(value || '')
        .replace(/,/g, '')
        .replace(/[^\d]/g, '')
    ) || 0;
  }


  function bindMoneyInput(input) {
    if (!input) return;

    input.addEventListener('input', () => {
      const number = parseMoney(input.value);

      input.value = number
        ? formatNumber(number)
        : '';
    });

    input.addEventListener('focus', () => {
      input.select();
    });
  }


  /* =========================================================
     연도 선택
     ========================================================= */

  function populateYearSelect() {
    const select = document.getElementById('year-select');

    if (!select) return;

    const startYear = Math.min(
      2020,
      currentYear - 3
    );

    const endYear = Math.max(
      currentYear + 5,
      currentYear + 1
    );

    select.innerHTML = '';

    for (let year = startYear; year <= endYear; year++) {
      const option = document.createElement('option');

      option.value = year;
      option.textContent = `${year}년`;

      select.appendChild(option);
    }

    select.value = String(currentYear);
    document.getElementById('month-select').value =
      String(currentMonth);
  }


  /* =========================================================
     목표값
     ========================================================= */

  function getEffectiveSetting(history, key) {
    if (!Array.isArray(history) || history.length === 0) {
      return 0;
    }

    const sorted = [...history].sort(
      (a, b) => a.from.localeCompare(b.from)
    );

    let result = sorted[0].amount || 0;

    for (const item of sorted) {
      if (item.from <= key) {
        result = Number(item.amount) || 0;
      }
    }

    return result;
  }


  function setFutureSetting(type, amount, key) {
    if (!Array.isArray(data.goals[type])) {
      data.goals[type] = [];
    }

    /*
     * 같은 시작월의 설정이 있다면 덮어쓰기.
     */
    const existingIndex = data.goals[type].findIndex(
      item => item.from === key
    );

    if (existingIndex >= 0) {
      data.goals[type][existingIndex].amount = amount;
    } else {
      data.goals[type].push({
        from: key,
        amount
      });
    }

    data.goals[type].sort(
      (a, b) => a.from.localeCompare(b.from)
    );
  }


  function getGoal(type, year = currentYear, month = currentMonth) {
    return getEffectiveSetting(
      data.goals[type],
      monthKey(year, month)
    );
  }


  function getAssetAmount(year = currentYear, month = currentMonth) {
    return getEffectiveSetting(
      data.assets,
      monthKey(year, month)
    );
  }


  function setAssetAmount(amount) {
    const key = monthKey(currentYear, currentMonth);

    const existingIndex = data.assets.findIndex(
      item => item.from === key
    );

    if (existingIndex >= 0) {
      data.assets[existingIndex].amount = amount;
    } else {
      data.assets.push({
        from: key,
        amount
      });
    }

    data.assets.sort(
      (a, b) => a.from.localeCompare(b.from)
    );
  }


  /* =========================================================
     월별 계산
     ========================================================= */

  function getMonthlyExpenses(year, month) {
    const key = monthKey(year, month);

    return data.expenses.filter(
      expense => dateKey(expense.date) === key
    );
  }


  function getMonthlyIncomes(year, month) {
    const key = monthKey(year, month);

    return data.incomes.filter(
      income => dateKey(income.date) === key
    );
  }


  function sumByCategory(expenses, category) {
    return expenses
      .filter(item => item.category === category)
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );
  }


  function getMonthlySummary() {
    const expenses = getMonthlyExpenses(
      currentYear,
      currentMonth
    );

    const living = sumByCategory(expenses, 'living');
    const fixed = sumByCategory(expenses, 'fixed');
    const irregular = sumByCategory(expenses, 'irregular');

    const prepared = expenses
      .filter(
        item =>
          item.category === 'irregular' &&
          item.tag === 'prepared'
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

    const special = expenses
      .filter(
        item =>
          item.category === 'irregular' &&
          item.tag === 'special'
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

    const income = getMonthlyIncomes(
      currentYear,
      currentMonth
    ).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    return {
      living,
      fixed,
      irregular,
      prepared,
      special,
      income
    };
  }


  /* =========================================================
     월별 화면
     ========================================================= */

  function renderMonthly() {
    const summary = getMonthlySummary();

    document.getElementById(
      'monthly-living-total'
    ).textContent = formatWon(summary.living);

    document.getElementById(
      'monthly-fixed-total'
    ).textContent = formatWon(summary.fixed);

    document.getElementById(
      'monthly-irregular-total'
    ).textContent = formatWon(summary.irregular);

    document.getElementById(
      'monthly-living-goal'
    ).textContent = formatWon(
      getGoal('living')
    );

    document.getElementById(
      'monthly-fixed-goal'
    ).textContent = formatWon(
      getGoal('fixed')
    );

    document.getElementById(
      'monthly-prepared-goal'
    ).textContent = formatWon(
      getGoal('prepared')
    );

    document.getElementById(
      'monthly-asset-total'
    ).textContent = formatWon(
      getAssetAmount()
    );

    renderExpenseList();
  }


  /* =========================================================
     지출 목록
     ========================================================= */

  function renderExpenseList() {
    const container = document.getElementById(
      'expense-list'
    );

    if (!container) return;

    const sortType =
      document.getElementById('expense-sort-select')?.value ||
      'date';

    let expenses = getMonthlyExpenses(
      currentYear,
      currentMonth
    );

    expenses = sortRecords(
      expenses,
      sortType
    );

    if (expenses.length === 0) {
      container.innerHTML = `
        <div class="empty-record">
          <div class="empty-record-icon">🧾</div>
          <strong>아직 지출내역이 없습니다.</strong>
          <span>지출 추가 버튼으로 이번 달 지출을 기록해보세요.</span>
        </div>
      `;

      return;
    }

    container.innerHTML = expenses
      .map(expense => {
        const categoryLabel =
          getCategoryLabel(expense.category);

        const tagLabel =
          getTagLabel(
            expense.category,
            expense.tag
          );

        const livingClass =
          expense.category === 'living'
            ? 'living-record'
            : '';

        return `
          <div
            class="finance-record ${livingClass}"
            data-record-id="${expense.id}"
          >

            <div class="record-date">
              ${formatShortDate(expense.date)}
            </div>

            <div class="record-main">
              <div class="record-description">
                ${escapeHtml(expense.description)}
              </div>

              <div class="record-meta">
                <span class="category-badge category-${expense.category}">
                  ${categoryLabel}
                </span>

                <span class="tag-badge">
                  ${tagLabel}
                </span>
              </div>
            </div>

            <div class="record-amount">
              ${formatWon(expense.amount)}
            </div>

            <div class="record-actions">
              <button
                type="button"
                class="record-edit-btn"
                data-action="edit-expense"
                data-id="${expense.id}"
              >
                수정
              </button>

              <button
                type="button"
                class="record-delete-btn"
                data-action="delete-expense"
                data-id="${expense.id}"
              >
                삭제
              </button>
            </div>

          </div>
        `;
      })
      .join('');
  }


  function sortRecords(records, type) {
    return [...records].sort((a, b) => {

      if (type === 'input') {
        return (
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
        );
      }

      const dateCompare =
        String(b.date).localeCompare(
          String(a.date)
        );

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return (
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
      );
    });
  }


  function formatShortDate(dateString) {
    if (!dateString) return '';

    const parts = dateString.split('-');

    return `${Number(parts[1])}/${Number(parts[2])}`;
  }


  /* =========================================================
     카테고리
     ========================================================= */

  function getCategoryLabel(category) {
    return {
      living: '생활비',
      fixed: '고정지출',
      irregular: '비정기지출'
    }[category] || category;
  }


  function getTagLabel(category, tag) {
    const item = TAGS[category]?.find(
      item => item.value === tag
    );

    return item?.label || tag || '';
  }


  function updateTagOptions(selectedTag = '') {
    const category =
      document.getElementById(
        'expense-category'
      ).value;

    const select =
      document.getElementById(
        'expense-tag'
      );

    const tags = TAGS[category] || [];

    select.innerHTML = tags
      .map(tag => `
        <option value="${tag.value}">
          ${tag.label}
        </option>
      `)
      .join('');

    if (
      selectedTag &&
      tags.some(tag => tag.value === selectedTag)
    ) {
      select.value = selectedTag;
    }

    updateTagHint();
  }


  function updateTagHint() {
    const category =
      document.getElementById(
        'expense-category'
      ).value;

    const tag =
      document.getElementById(
        'expense-tag'
      ).value;

    const hint =
      document.getElementById(
        'expense-tag-hint'
      );

    hint.textContent =
      TAG_HINTS[category]?.[tag] || '';
  }


  /* =========================================================
     지출 팝업
     ========================================================= */

  function openExpenseModal(expense = null) {
    const modal =
      document.getElementById('expense-modal');

    const title =
      document.getElementById(
        'expense-modal-title'
      );

    const editId =
      document.getElementById(
        'expense-edit-id'
      );

    const date =
      document.getElementById(
        'expense-date'
      );

    const description =
      document.getElementById(
        'expense-description'
      );

    const amount =
      document.getElementById(
        'expense-amount'
      );

    const category =
      document.getElementById(
        'expense-category'
      );

    if (expense) {
      title.textContent = '지출 수정';

      editId.value = expense.id;
      date.value = expense.date;
      description.value = expense.description;
      amount.value = formatNumber(expense.amount);
      category.value = expense.category;

      updateTagOptions(expense.tag);

    } else {
      title.textContent = '지출 추가';

      editId.value = '';
      date.value = todayString();
      description.value = '';
      amount.value = '';

      category.value = 'living';

      updateTagOptions('food');
    }

    openModal('expense-modal');

    setTimeout(() => {
      description.focus();
    }, 50);
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

    const description =
      document.getElementById(
        'expense-description'
      ).value.trim();

    const amount =
      parseMoney(
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

    if (!date || !description || amount <= 0) {
      alert('날짜, 내용, 금액을 확인해주세요.');
      return;
    }

    if (editId) {
      const target = data.expenses.find(
        item => item.id === editId
      );

      if (target) {
        target.date = date;
        target.description = description;
        target.amount = amount;
        target.category = category;
        target.tag = tag;
      }

    } else {
      data.expenses.push({
        id: createId('expense'),
        date,
        description,
        amount,
        category,
        tag,
        createdAt: Date.now()
      });
    }

    saveData();

    closeModal('expense-modal');
    renderAll();
  }


  /* =========================================================
     수입
     ========================================================= */

  function openIncomeModal(income = null) {
    const modal =
      document.getElementById('income-modal');

    const title =
      document.getElementById(
        'income-modal-title'
      );

    const editId =
      document.getElementById(
        'income-edit-id'
      );

    const date =
      document.getElementById(
        'income-date'
      );

    const description =
      document.getElementById(
        'income-description'
      );

    const amount =
      document.getElementById(
        'income-amount'
      );

    const category =
      document.getElementById(
        'income-category'
      );

    if (income) {
      title.textContent = '수입 수정';

      editId.value = income.id;
      date.value = income.date;
      description.value = income.description;
      amount.value = formatNumber(income.amount);
      category.value = income.category;

    } else {
      title.textContent = '수입 추가';

      editId.value = '';
      date.value = todayString();
      description.value = '';
      amount.value = '';

      category.value = 'salary';
    }

    openModal('income-modal');

    setTimeout(() => {
      description.focus();
    }, 50);
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

    const description =
      document.getElementById(
        'income-description'
      ).value.trim();

    const amount =
      parseMoney(
        document.getElementById(
          'income-amount'
        ).value
      );

    const category =
      document.getElementById(
        'income-category'
      ).value;

    if (!date || !description || amount <= 0) {
      alert('날짜, 내용, 금액을 확인해주세요.');
      return;
    }

    if (editId) {
      const target = data.incomes.find(
        item => item.id === editId
      );

      if (target) {
        target.date = date;
        target.description = description;
        target.amount = amount;
        target.category = category;
      }

    } else {
      data.incomes.push({
        id: createId('income'),
        date,
        description,
        amount,
        category,
        createdAt: Date.now()
      });
    }

    saveData();

    closeModal('income-modal');
    renderAll();

    /*
     * 수입 팝업이 열려 있었다면 최신 내용으로 갱신
     */
    if (
      !document
        .getElementById('income-history-modal')
        .classList.contains('hidden')
    ) {
      renderIncomeHistory();
    }
  }


  function renderIncomeHistory() {
    const container =
      document.getElementById(
        'income-history-list'
      );

    const title =
      document.getElementById(
        'income-history-title'
      );

    title.textContent =
      `${currentMonth}월 수입 내역`;

    const sortType =
      document.getElementById(
        'income-sort-select'
      )?.value || 'date';

    let incomes =
      getMonthlyIncomes(
        currentYear,
        currentMonth
      );

    incomes = sortRecords(
      incomes,
      sortType
    );

    if (incomes.length === 0) {
      container.innerHTML = `
        <div class="empty-record">
          <div class="empty-record-icon">💰</div>
          <strong>아직 수입내역이 없습니다.</strong>
          <span>수입 추가 버튼으로 수입을 기록해보세요.</span>
        </div>
      `;

      return;
    }

    const total = incomes.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

    container.innerHTML = `
      <div class="income-history-total">
        <span>이번 달 수입 합계</span>
        <strong>${formatWon(total)}</strong>
      </div>

      ${incomes.map(income => `
        <div
          class="finance-record income-record"
          data-record-id="${income.id}"
        >

          <div class="record-date">
            ${formatShortDate(income.date)}
          </div>

          <div class="record-main">

            <div class="record-description">
              ${escapeHtml(income.description)}
            </div>

            <div class="record-meta">
              <span class="category-badge income-category-badge">
                ${getIncomeCategoryLabel(income.category)}
              </span>
            </div>

          </div>

          <div class="record-amount">
            ${formatWon(income.amount)}
          </div>

          <div class="record-actions">

            <button
              type="button"
              class="record-edit-btn"
              data-action="edit-income"
              data-id="${income.id}"
            >
              수정
            </button>

            <button
              type="button"
              class="record-delete-btn"
              data-action="delete-income"
              data-id="${income.id}"
            >
              삭제
            </button>

          </div>

        </div>
      `).join('')}
    `;
  }


  function getIncomeCategoryLabel(category) {
    return {
      allowance: '수당',
      salary: '월급',
      bonus: '보너스'
    }[category] || category;
  }


  /* =========================================================
     삭제
     ========================================================= */

  function askDelete(type, id) {
    pendingDelete = {
      type,
      id
    };

    openModal('delete-confirm-modal');
  }


  function executeDelete() {
    if (!pendingDelete) return;

    const { type, id } = pendingDelete;

    if (type === 'expense') {
      data.expenses =
        data.expenses.filter(
          item => item.id !== id
        );
    }

    if (type === 'income') {
      data.incomes =
        data.incomes.filter(
          item => item.id !== id
        );
    }

    saveData();

    pendingDelete = null;

    closeModal('delete-confirm-modal');

    renderAll();

    if (
      !document
        .getElementById('income-history-modal')
        .classList.contains('hidden')
    ) {
      renderIncomeHistory();
    }
  }


  /* =========================================================
     목표금액 팝업
     ========================================================= */

  function openGoalModal(type) {
    const title =
      document.getElementById(
        'goal-modal-title'
      );

    const description =
      document.getElementById(
        'goal-modal-description'
      );

    const typeInput =
      document.getElementById(
        'goal-type'
      );

    const amount =
      document.getElementById(
        'goal-amount'
      );

    const titles = {
      living: '생활비 목표금액',
      fixed: '고정지출 목표금액',
      prepared: '준비지출 연간 목표금액'
    };

    title.textContent =
      titles[type] || '목표금액 설정';

    if (type === 'prepared') {
      description.textContent =
        '이 달부터 이후 달의 준비지출 연간 목표금액에 적용됩니다.';
    } else {
      description.textContent =
        '이 달부터 이후 달의 목표금액에 적용됩니다. 이전 달에는 영향을 주지 않습니다.';
    }

    typeInput.value = type;

    amount.value = formatNumber(
      getGoal(type)
    );

    openModal('goal-modal');

    setTimeout(() => {
      amount.focus();
      amount.select();
    }, 50);
  }


  function handleGoalSubmit(event) {
    event.preventDefault();

    const type =
      document.getElementById(
        'goal-type'
      ).value;

    const amount =
      parseMoney(
        document.getElementById(
          'goal-amount'
        ).value
      );

    const key =
      monthKey(
        currentYear,
        currentMonth
      );

    setFutureSetting(
      type,
      amount,
      key
    );

    saveData();

    closeModal('goal-modal');

    renderAll();
  }


  /* =========================================================
     자산축적
     ========================================================= */

  function openAssetModal() {
    const input =
      document.getElementById(
        'asset-amount'
      );

    input.value = formatNumber(
      getAssetAmount()
    );

    openModal('asset-modal');

    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }


  function handleAssetSubmit(event) {
    event.preventDefault();

    const amount =
      parseMoney(
        document.getElementById(
          'asset-amount'
        ).value
      );

    setAssetAmount(amount);

    saveData();

    closeModal('asset-modal');

    renderAll();
  }


  /* =========================================================
     연간 화면
     ========================================================= */

  function renderYearly() {
    document.getElementById(
      'yearly-year'
    ).textContent =
      `${currentYear}년`;

    const yearExpenses =
      data.expenses.filter(
        item =>
          item.date.startsWith(
            `${currentYear}-`
          )
      );

    const yearIncomes =
      data.incomes.filter(
        item =>
          item.date.startsWith(
            `${currentYear}-`
          )
      );

    const incomeTotal =
      yearIncomes.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    const expenseTotal =
      yearExpenses.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    const living =
      sumByCategory(
        yearExpenses,
        'living'
      );

    const fixed =
      sumByCategory(
        yearExpenses,
        'fixed'
      );

    const prepared =
      yearExpenses
        .filter(
          item =>
            item.category === 'irregular' &&
            item.tag === 'prepared'
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0
        );

    const special =
      yearExpenses
        .filter(
          item =>
            item.category === 'irregular' &&
            item.tag === 'special'
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0
        );

    const balance =
      incomeTotal -
      expenseTotal -
      getYearlyAssetTotal();

    document.getElementById(
      'yearly-income-total'
    ).textContent =
      formatWon(incomeTotal);

    document.getElementById(
      'yearly-expense-total'
    ).textContent =
      formatWon(expenseTotal);

    document.getElementById(
      'yearly-balance-total'
    ).textContent =
      formatWon(balance);

    document.getElementById(
      'yearly-living-total'
    ).textContent =
      formatWon(living);

    document.getElementById(
      'yearly-fixed-total'
    ).textContent =
      formatWon(fixed);

    document.getElementById(
      'yearly-prepared-total'
    ).textContent =
      formatWon(prepared);

    document.getElementById(
      'yearly-special-total'
    ).textContent =
      formatWon(special);

    document.getElementById(
      'yearly-asset-total'
    ).textContent =
      formatWon(
        getYearlyAssetTotal()
      );

    renderForecast();
    renderTagStatistics(yearExpenses);
    renderMonthStatistics(yearExpenses);
  }


  function getYearlyAssetTotal() {
    let total = 0;

    for (let month = 1; month <= 12; month++) {
      total += getAssetAmount(
        currentYear,
        month
      );
    }

    return total;
  }


  function renderForecast() {
    const forecast =
      data.forecasts[currentYear] || {
        income: 0,
        expense: 0
      };

    document.getElementById(
      'yearly-forecast-income'
    ).textContent =
      formatWon(forecast.income);

    document.getElementById(
      'yearly-forecast-expense'
    ).textContent =
      formatWon(forecast.expense);
  }


  function openForecastModal() {
    const forecast =
      data.forecasts[currentYear] || {
        income: 0,
        expense: 0
      };

    document.getElementById(
      'forecast-income'
    ).value =
      formatNumber(forecast.income);

    document.getElementById(
      'forecast-expense'
    ).value =
      formatNumber(forecast.expense);

    openModal('forecast-modal');
  }


  function handleForecastSubmit(event) {
    event.preventDefault();

    data.forecasts[currentYear] = {
      income: parseMoney(
        document.getElementById(
          'forecast-income'
        ).value
      ),

      expense: parseMoney(
        document.getElementById(
          'forecast-expense'
        ).value
      )
    };

    saveData();

    closeModal('forecast-modal');

    renderYearly();
  }


  /* =========================================================
     연간 통계
     ========================================================= */

  function renderTagStatistics(yearExpenses) {
    const container =
      document.getElementById(
        'tag-statistics'
      );

    const stats = {};

    yearExpenses.forEach(item => {
      const label =
        `${getCategoryLabel(item.category)} · ${getTagLabel(item.category, item.tag)}`;

      stats[label] =
        (stats[label] || 0) +
        Number(item.amount || 0);
    });

    const sorted =
      Object.entries(stats)
        .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="statistics-empty">
          아직 기록된 지출이 없습니다.
        </div>
      `;

      return;
    }

    const total =
      sorted.reduce(
        (sum, [, amount]) =>
          sum + amount,
        0
      );

    container.innerHTML = sorted
      .map(([label, amount]) => {
        const percent =
          total > 0
            ? Math.round(
                (amount / total) * 100
              )
            : 0;

        return `
          <div class="stat-row">

            <div class="stat-label">
              <span>${escapeHtml(label)}</span>
              <strong>${formatWon(amount)}</strong>
            </div>

            <div class="stat-bar">
              <div
                class="stat-bar-fill"
                style="width:${percent}%"
              ></div>
            </div>

            <span class="stat-percent">
              ${percent}%
            </span>

          </div>
        `;
      })
      .join('');
  }


  function renderMonthStatistics() {
    const container =
      document.getElementById(
        'month-statistics'
      );

    const rows = [];

    for (let month = 1; month <= 12; month++) {

      const expenses =
        getMonthlyExpenses(
          currentYear,
          month
        );

      const income =
        getMonthlyIncomes(
          currentYear,
          month
        ).reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0
        );

      const expense =
        expenses.reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0
        );

      const asset =
        getAssetAmount(
          currentYear,
          month
        );

      rows.push(`
        <div class="monthly-stat-row">

          <div class="monthly-stat-month">
            ${month}월
          </div>

          <div>
            <span>수입</span>
            <strong>${formatWon(income)}</strong>
          </div>

          <div>
            <span>지출</span>
            <strong>${formatWon(expense)}</strong>
          </div>

          <div>
            <span>자산축적</span>
            <strong>${formatWon(asset)}</strong>
          </div>

        </div>
      `);
    }

    container.innerHTML = rows.join('');
  }


  /* =========================================================
     정보 팝업
     ========================================================= */

  function openInfoModal(type) {
    const title =
      document.getElementById(
        'info-modal-title'
      );

    const content =
      document.getElementById(
        'info-modal-content'
      );

    const info = {

      living: {
        title: '생활비',
        html: `
          <p>
            평소 생활하면서 사용하는 돈입니다.
          </p>

          <div class="info-example-list">
            <div>🍚 식비</div>
            <div>☕ 간식비</div>
            <div>🛍️ 쇼핑</div>
            <div>📌 기타</div>
          </div>

          <p class="info-note">
            월 목표금액을 설정해 관리합니다.
          </p>
        `
      },

      fixed: {
        title: '고정지출',
        html: `
          <p>
            매달 또는 정기적으로 반복해서 발생하는 지출입니다.
          </p>

          <div class="info-example-list">
            <div>🛡️ 보험</div>
            <div>📱 통신</div>
            <div>📺 구독</div>
            <div>⛽ 주유비</div>
            <div>📌 기타</div>
          </div>

          <p class="info-note">
            월 목표금액을 설정해 관리합니다.
          </p>
        `
      },

      irregular: {
        title: '비정기지출',
        html: `
          <p>
            매달 발생하지 않아 별도로 관리하는 지출입니다.
          </p>

          <div class="info-sub-box">
            <strong>준비지출</strong>
            <p>
              축의금·조의금·부모님 용돈·명절 용돈·
              예상 가능한 차량 유지비 등 매년 어느 정도 준비하는 지출입니다.
            </p>
            <small>
              연간 목표금액을 설정할 수 있습니다.
            </small>
          </div>

          <div class="info-sub-box">
            <strong>특별소비</strong>
            <p>
              선물·여행·대형 차량수리 등 평소 생활비와 별도로 발생하는 큰 지출입니다.
            </p>
          </div>
        `
      }

    }[type];

    if (!info) return;

    title.textContent = info.title;
    content.innerHTML = info.html;

    openModal('annual-info-modal');
  }


  /* =========================================================
     모달
     ========================================================= */

  function openModal(id) {
    document
      .getElementById(id)
      ?.classList.remove('hidden');
  }


  function closeModal(id) {
    document
      .getElementById(id)
      ?.classList.add('hidden');
  }


  function closeAllModals() {
    document
      .querySelectorAll(
        '.annual-modal'
      )
      .forEach(modal =>
        modal.classList.add('hidden')
      );

    pendingDelete = null;
  }


  /* =========================================================
     화면 전체 렌더
     ========================================================= */

  function renderAll() {
    const monthlyView =
      document.getElementById(
        'monthly-view'
      );

    const yearlyView =
      document.getElementById(
        'yearly-view'
      );

    if (currentView === 'monthly') {
      monthlyView.classList.remove('hidden');
      yearlyView.classList.add('hidden');

      renderMonthly();

    } else {
      monthlyView.classList.add('hidden');
      yearlyView.classList.remove('hidden');

      renderYearly();
    }
  }


  /* =========================================================
     이벤트
     ========================================================= */

  function bindEvents() {

    /*
     * 금액 입력
     */
    [
      'expense-amount',
      'income-amount',
      'goal-amount',
      'asset-amount',
      'forecast-income',
      'forecast-expense'
    ].forEach(id => {
      bindMoneyInput(
        document.getElementById(id)
      );
    });


    /*
     * 월/연도
     */
    document
      .getElementById('year-select')
      .addEventListener('change', event => {
        currentYear =
          Number(event.target.value);

        renderAll();
      });


    document
      .getElementById('month-select')
      .addEventListener('change', event => {
        currentMonth =
          Number(event.target.value);

        renderAll();
      });


    document
      .getElementById('prev-month-btn')
      .addEventListener(
        'click',
        () => moveMonth(-1)
      );


    document
      .getElementById('next-month-btn')
      .addEventListener(
        'click',
        () => moveMonth(1)
      );


    document
      .getElementById('year-prev-btn')
      .addEventListener(
        'click',
        () => {
          currentYear--;
          syncYearSelect();
          renderAll();
        }
      );


    document
      .getElementById('year-next-btn')
      .addEventListener(
        'click',
        () => {
          currentYear++;
          syncYearSelect();
          renderAll();
        }
      );


    /*
     * 월별/연간 탭
     */
    document
      .querySelectorAll('.annual-view-tab')
      .forEach(button => {

        button.addEventListener(
          'click',
          () => {

            document
              .querySelectorAll(
                '.annual-view-tab'
              )
              .forEach(btn =>
                btn.classList.remove(
                  'active'
                )
              );

            button.classList.add('active');

            currentView =
              button.dataset.view;

            renderAll();
          }
        );
      });


    /*
     * 지출
     */
    document
      .getElementById('add-expense-btn')
      .addEventListener(
        'click',
        () => openExpenseModal()
      );


    document
      .getElementById('expense-form')
      .addEventListener(
        'submit',
        handleExpenseSubmit
      );


    document
      .getElementById('expense-category')
      .addEventListener(
        'change',
        () => updateTagOptions()
      );


    document
      .getElementById('expense-tag')
      .addEventListener(
        'change',
        updateTagHint
      );


    document
      .getElementById('expense-sort-select')
      .addEventListener(
        'change',
        renderExpenseList
      );


    document
      .getElementById('expense-list')
      .addEventListener(
        'click',
        handleExpenseListClick
      );


    /*
     * 수입
     */
    document
      .getElementById('add-income-btn')
      .addEventListener(
        'click',
        () => openIncomeModal()
      );


    document
      .getElementById('open-income-history-btn')
      .addEventListener(
        'click',
        () => {
          renderIncomeHistory();
          openModal(
            'income-history-modal'
          );
        }
      );


    document
      .getElementById('income-form')
      .addEventListener(
        'submit',
        handleIncomeSubmit
      );


    document
      .getElementById('income-sort-select')
      .addEventListener(
        'change',
        renderIncomeHistory
      );


    document
      .getElementById('income-history-list')
      .addEventListener(
        'click',
        handleIncomeListClick
      );


    /*
     * 목표
     */
    document
      .querySelectorAll(
        '.goal-edit-btn'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          () =>
            openGoalModal(
              button.dataset.goalType
            )
        );
      });


    document
      .getElementById('goal-form')
      .addEventListener(
        'submit',
        handleGoalSubmit
      );


    /*
     * 자산축적
     */
    document
      .getElementById(
        'asset-accumulation-card'
      )
      .addEventListener(
        'click',
        openAssetModal
      );


    document
      .getElementById('asset-form')
      .addEventListener(
        'submit',
        handleAssetSubmit
      );


    /*
     * 예상
     */
    document
      .getElementById('edit-forecast-btn')
      .addEventListener(
        'click',
        openForecastModal
      );


    document
      .getElementById('forecast-form')
      .addEventListener(
        'submit',
        handleForecastSubmit
      );


    /*
     * 정보 ?
     */
    document
      .querySelectorAll('.info-circle')
      .forEach(button => {

        button.addEventListener(
          'click',
          event => {
            event.stopPropagation();

            openInfoModal(
              button.dataset.info
            );
          }
        );
      });


    /*
     * 통계 접기/펼치기
     */
    document
      .querySelectorAll(
        '.statistics-toggle'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          () => {

            const target =
              document.getElementById(
                button.dataset.target
              );

            const isHidden =
              target.classList.contains(
                'hidden'
              );

            target.classList.toggle(
              'hidden'
            );

            const arrow =
              button.querySelector(
                'span:last-child'
              );

            arrow.textContent =
              isHidden ? '−' : '＋';
          }
        );
      });


    /*
     * 모달 닫기
     */
    document
      .querySelectorAll(
        '[data-close-modal]'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          () =>
            closeModal(
              button.dataset.closeModal
            )
        );
      });


    /*
     * 모달 배경 클릭
     */
    document
      .querySelectorAll(
        '.annual-modal-backdrop'
      )
      .forEach(backdrop => {

        backdrop.addEventListener(
          'click',
          () => {
            closeAllModals();
          }
        );
      });


    /*
     * ESC
     */
    document.addEventListener(
      'keydown',
      event => {

        if (event.key === 'Escape') {
          closeAllModals();
        }

      }
    );


    /*
     * 삭제 확인
     */
    document
      .getElementById(
        'delete-cancel-btn'
      )
      .addEventListener(
        'click',
        () => closeModal(
          'delete-confirm-modal'
        )
      );


    document
      .getElementById(
        'delete-confirm-btn'
      )
      .addEventListener(
        'click',
        executeDelete
      );
  }


  /* =========================================================
     목록 클릭
     ========================================================= */

  function handleExpenseListClick(event) {
    const button =
      event.target.closest('button');

    if (!button) return;

    const id =
      button.dataset.id;

    const action =
      button.dataset.action;

    if (action === 'edit-expense') {
      const expense =
        data.expenses.find(
          item => item.id === id
        );

      if (expense) {
        openExpenseModal(expense);
      }
    }

    if (action === 'delete-expense') {
      askDelete('expense', id);
    }
  }


  function handleIncomeListClick(event) {
    const button =
      event.target.closest('button');

    if (!button) return;

    const id =
      button.dataset.id;

    const action =
      button.dataset.action;

    if (action === 'edit-income') {
      const income =
        data.incomes.find(
          item => item.id === id
        );

      if (income) {
        openIncomeModal(income);
      }
    }

    if (action === 'delete-income') {
      askDelete('income', id);
    }
  }


  /* =========================================================
     월 이동
     ========================================================= */

  function moveMonth(direction) {
    currentMonth += direction;

    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }

    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }

    syncYearSelect();

    document.getElementById(
      'month-select'
    ).value =
      String(currentMonth);

    renderAll();
  }


  function syncYearSelect() {
    const select =
      document.getElementById(
        'year-select'
      );

    if (!select) return;

    if (
      !Array.from(select.options)
        .some(
          option =>
            Number(option.value) ===
            currentYear
        )
    ) {
      const option =
        document.createElement('option');

      option.value = currentYear;
      option.textContent =
        `${currentYear}년`;

      select.appendChild(option);
    }

    select.value =
      String(currentYear);
  }


  /* =========================================================
     유틸
     ========================================================= */

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }


  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  init();

})();