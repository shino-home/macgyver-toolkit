// 연간 가계부 샘플 전용 모듈
(() => {

  /* ==========================================
     기본 설정
     ========================================== */

  const LIVING_BUDGET = 1600000;
  const YEARLY_LIVING_BUDGET = 19200000;
  const YEARLY_EVENT_BUDGET = 2400000;

  const SAMPLE_INCOME = {
    "2026-09": 3500000,
    "2026-10": 3200000,
    "2026-11": 4100000,
    "2026-12": 5200000
  };


  /* ==========================================
     샘플 지출 데이터
     ========================================== */

  let expenses = [

    {
      id: 1,
      date: "2026-09-02",
      title: "점심 식사",
      amount: 12000,
      category: "living",
      tag: "식비"
    },

    {
      id: 2,
      date: "2026-09-03",
      title: "카페",
      amount: 6500,
      category: "living",
      tag: "간식비"
    },

    {
      id: 3,
      date: "2026-09-05",
      title: "저녁 데이트",
      amount: 68000,
      category: "living",
      tag: "식비"
    },

    {
      id: 4,
      date: "2026-09-06",
      title: "휴대폰 요금",
      amount: 55000,
      category: "fixed",
      tag: "고정지출"
    },

    {
      id: 5,
      date: "2026-09-07",
      title: "여자친구 노트북",
      amount: 1400000,
      category: "irregular",
      tag: "빅이벤트"
    },

    {
      id: 6,
      date: "2026-09-08",
      title: "부모님 선물",
      amount: 80000,
      category: "irregular",
      tag: "경조사"
    },

    {
      id: 7,
      date: "2026-09-09",
      title: "장보기",
      amount: 92000,
      category: "living",
      tag: "식비"
    },

    {
      id: 8,
      date: "2026-09-10",
      title: "간식 구매",
      amount: 18000,
      category: "living",
      tag: "간식비"
    },

    {
      id: 9,
      date: "2026-09-12",
      title: "생활용품",
      amount: 47000,
      category: "living",
      tag: "쇼핑"
    },

    {
      id: 10,
      date: "2026-09-15",
      title: "저녁 데이트",
      amount: 75000,
      category: "living",
      tag: "식비"
    },

    {
      id: 11,
      date: "2026-10-03",
      title: "주말 장보기",
      amount: 108000,
      category: "living",
      tag: "식비"
    },

    {
      id: 12,
      date: "2026-10-05",
      title: "커피",
      amount: 7500,
      category: "living",
      tag: "간식비"
    },

    {
      id: 13,
      date: "2026-10-08",
      title: "데이트 식사",
      amount: 62000,
      category: "living",
      tag: "식비"
    },

    {
      id: 14,
      date: "2026-10-10",
      title: "자동차 관련 비용",
      amount: 180000,
      category: "fixed",
      tag: "고정지출"
    },

    {
      id: 15,
      date: "2026-10-18",
      title: "쇼핑",
      amount: 95000,
      category: "living",
      tag: "쇼핑"
    },

    {
      id: 16,
      date: "2026-11-02",
      title: "장보기",
      amount: 132000,
      category: "living",
      tag: "식비"
    },

    {
      id: 17,
      date: "2026-11-04",
      title: "간식",
      amount: 15000,
      category: "living",
      tag: "간식비"
    },

    {
      id: 18,
      date: "2026-11-09",
      title: "결혼 준비 쇼핑",
      amount: 120000,
      category: "living",
      tag: "쇼핑"
    },

    {
      id: 19,
      date: "2026-11-11",
      title: "보험료",
      amount: 150000,
      category: "fixed",
      tag: "고정지출"
    },

    {
      id: 20,
      date: "2026-11-20",
      title: "결혼식 축의금",
      amount: 100000,
      category: "irregular",
      tag: "경조사"
    },

    {
      id: 21,
      date: "2026-12-02",
      title: "장보기",
      amount: 145000,
      category: "living",
      tag: "식비"
    },

    {
      id: 22,
      date: "2026-12-06",
      title: "카페",
      amount: 12000,
      category: "living",
      tag: "간식비"
    },

    {
      id: 23,
      date: "2026-12-09",
      title: "겨울 옷",
      amount: 160000,
      category: "living",
      tag: "쇼핑"
    },

    {
      id: 24,
      date: "2026-12-12",
      title: "고정 구독서비스",
      amount: 39000,
      category: "fixed",
      tag: "고정지출"
    },

    {
      id: 25,
      date: "2026-12-20",
      title: "연말 여행",
      amount: 500000,
      category: "irregular",
      tag: "빅이벤트"
    }

  ];


  /* ==========================================
     현재 선택된 월
     ========================================== */

  let currentMonth = 9;


  /* ==========================================
     DOM
     ========================================== */

  const monthLabel =
    document.getElementById("annual-month-label");

  const expenseList =
    document.getElementById("annual-expense-list");

  const expenseCount =
    document.getElementById("annual-expense-count");


  /* ==========================================
     공통 함수
     ========================================== */

  function formatWon(value) {
    return `${value.toLocaleString("ko-KR")}원`;
  }


  function getMonthKey(month) {
    return `2026-${String(month).padStart(2, "0")}`;
  }


  function getMonthExpenses(month) {

    const monthKey = getMonthKey(month);

    return expenses.filter(expense =>
      expense.date.startsWith(monthKey)
    );

  }


  function getCategoryName(category) {

    if (category === "living") return "생활비";
    if (category === "fixed") return "고정지출";
    if (category === "irregular") return "비정기지출";

    return category;
  }


  function getCategoryClass(category) {

    if (category === "living") return "living";
    if (category === "fixed") return "fixed";
    if (category === "irregular") return "irregular";

    return "";
  }


  /* ==========================================
     탭 전환
     ========================================== */

  const tabButtons =
    document.querySelectorAll(".annual-tab-btn");

  const tabContents =
    document.querySelectorAll(".annual-tab-content");


  tabButtons.forEach(button => {

    button.addEventListener("click", () => {

      const target =
        button.getAttribute("data-tab");

      tabButtons.forEach(btn =>
        btn.classList.remove("active")
      );

      tabContents.forEach(content =>
        content.classList.remove("active")
      );

      button.classList.add("active");

      document
        .getElementById(target)
        ?.classList.add("active");

      if (target === "annual-yearly") {
        renderYearly();
      }

    });

  });


  /* ==========================================
     월 변경
     ========================================== */

  document
    .getElementById("annual-prev-month")
    ?.addEventListener("click", () => {

      if (currentMonth > 9) {
        currentMonth--;
        renderMonthly();
      }

    });


  document
    .getElementById("annual-next-month")
    ?.addEventListener("click", () => {

      if (currentMonth < 12) {
        currentMonth++;
        renderMonthly();
      }

    });


  /* ==========================================
     세부 태그 변경
     ========================================== */

  const categorySelect =
    document.getElementById("annual-expense-category");

  const tagSelect =
    document.getElementById("annual-expense-tag");


  function updateTagOptions() {

    if (!categorySelect || !tagSelect) return;

    const category = categorySelect.value;

    if (category === "living") {

      tagSelect.innerHTML = `
        <option value="식비">식비</option>
        <option value="간식비">간식비</option>
        <option value="쇼핑">쇼핑</option>
      `;

    }

    else if (category === "fixed") {

      tagSelect.innerHTML = `
        <option value="고정지출">고정지출</option>
      `;

    }

    else {

      tagSelect.innerHTML = `
        <option value="빅이벤트">빅이벤트</option>
        <option value="경조사">경조사</option>
      `;

    }

  }


  categorySelect
    ?.addEventListener("change", updateTagOptions);


  /* ==========================================
     지출 추가
     ========================================== */

  document
    .getElementById("annual-add-expense")
    ?.addEventListener("click", () => {

      const date =
        document.getElementById("annual-expense-date").value;

      const title =
        document.getElementById("annual-expense-title").value.trim();

      const amount =
        Number(
          document.getElementById("annual-expense-amount").value
        );

      const category =
        document.getElementById("annual-expense-category").value;

      const tag =
        document.getElementById("annual-expense-tag").value;


      if (!date || !title || !amount || amount <= 0) {

        alert("날짜, 내용, 금액을 모두 입력해주세요.");

        return;

      }


      expenses.push({

        id: Date.now(),

        date,

        title,

        amount,

        category,

        tag

      });


      const selectedMonth =
        Number(date.substring(5, 7));

      if (
        selectedMonth >= 9 &&
        selectedMonth <= 12
      ) {

        currentMonth = selectedMonth;

      }


      document.getElementById("annual-expense-title").value = "";
      document.getElementById("annual-expense-amount").value = "";


      renderMonthly();

    });


  /* ==========================================
     지출 삭제
     ========================================== */

  function deleteExpense(id) {

    expenses =
      expenses.filter(expense => expense.id !== id);

    renderMonthly();
    renderYearly();

  }


  /* ==========================================
     월별 화면 렌더링
     ========================================== */

  function renderMonthly() {

    if (!monthLabel || !expenseList) return;


    monthLabel.textContent =
      `2026년 ${currentMonth}월`;


    const monthExpenses =
      getMonthExpenses(currentMonth);


    /* 생활비 */

    const livingTotal =
      monthExpenses

        .filter(item => item.category === "living")

        .reduce(
          (sum, item) => sum + item.amount,
          0
        );


    /* 고정지출 */

    const fixedTotal =
      monthExpenses

        .filter(item => item.category === "fixed")

        .reduce(
          (sum, item) => sum + item.amount,
          0
        );


    /* 비정기지출 */

    const irregularTotal =
      monthExpenses

        .filter(item => item.category === "irregular")

        .reduce(
          (sum, item) => sum + item.amount,
          0
        );


    const progress =
      Math.min(
        (livingTotal / LIVING_BUDGET) * 100,
        100
      );


    document.getElementById(
      "monthly-living-total"
    ).textContent =
      formatWon(livingTotal);


    document.getElementById(
      "monthly-fixed-total"
    ).textContent =
      formatWon(fixedTotal);


    document.getElementById(
      "monthly-irregular-total"
    ).textContent =
      formatWon(irregularTotal);


    document.getElementById(
      "monthly-expense-total"
    ).textContent =
      formatWon(livingTotal);


    document.getElementById(
      "monthly-living-progress"
    ).style.width =
      `${progress}%`;


    document.getElementById(
      "monthly-living-percent"
    ).textContent =
      `${Math.round((livingTotal / LIVING_BUDGET) * 100)}%`;


    /* 거래내역 */

    expenseList.innerHTML = "";


    if (monthExpenses.length === 0) {

      expenseList.innerHTML = `
        <div class="annual-empty">
          이 달의 지출 내역이 없습니다.
        </div>
      `;

    }

    else {

      const sorted =
        [...monthExpenses].sort(
          (a, b) =>
            new Date(b.date) - new Date(a.date)
        );


      sorted.forEach(expense => {

        const item =
          document.createElement("div");

        item.className =
          "annual-expense-item";


        item.innerHTML = `

          <div class="annual-expense-date">
            ${expense.date.substring(5).replace("-", "/")}
          </div>

          <div class="annual-expense-info">

            <strong>
              ${expense.title}
            </strong>

            <span>
              <em class="${getCategoryClass(expense.category)}">
                ${getCategoryName(expense.category)}
              </em>

              ${expense.tag}
            </span>

          </div>

          <strong class="annual-expense-amount">
            ${formatWon(expense.amount)}
          </strong>

          <button
            class="annual-delete-btn"
            data-id="${expense.id}"
            title="삭제"
          >
            ×
          </button>

        `;


        item
          .querySelector(".annual-delete-btn")
          ?.addEventListener("click", () => {

            deleteExpense(expense.id);

          });


        expenseList.appendChild(item);

      });

    }


    expenseCount.textContent =
      `${monthExpenses.length}건`;

  }


  /* ==========================================
     연간 계산
     ========================================== */

  function getYearlyTotals() {

    const living =
      expenses

        .filter(item => item.category === "living")

        .reduce(
          (sum, item) => sum + item.amount,
          0
        );


    const fixed =
      expenses

        .filter(item => item.category === "fixed")

        .reduce(
          (sum, item) => sum + item.amount,
          0
        );


    const irregular =
      expenses

        .filter(item => item.category === "irregular")

        .reduce(
          (sum, item) => sum + item.amount,
          0
        );


    return {
      living,
      fixed,
      irregular,
      total: living + fixed + irregular
    };

  }


  /* ==========================================
     연간 화면 렌더링
     ========================================== */

  function renderYearly() {

    const totals =
      getYearlyTotals();


    const totalIncome =
      Object.values(SAMPLE_INCOME)
        .reduce(
          (sum, value) => sum + value,
          0
        );


    const balance =
      totalIncome - totals.total;


    document.getElementById(
      "annual-income-total"
    ).textContent =
      formatWon(totalIncome);


    document.getElementById(
      "annual-expense-total"
    ).textContent =
      formatWon(totals.total);


    document.getElementById(
      "annual-balance-total"
    ).textContent =
      formatWon(balance);


    /* 생활비 */

    document.getElementById(
      "yearly-living-total"
    ).textContent =
      formatWon(totals.living);


    const livingPercent =
      (totals.living / YEARLY_LIVING_BUDGET) * 100;


    document.getElementById(
      "yearly-living-percent"
    ).textContent =
      `${Math.round(livingPercent)}%`;


    document.getElementById(
      "yearly-living-progress"
    ).style.width =
      `${Math.min(livingPercent, 100)}%`;


    document.getElementById(
      "yearly-living-remaining"
    ).textContent =
      `잔여 ${formatWon(
        Math.max(
          YEARLY_LIVING_BUDGET - totals.living,
          0
        )
      )}`;


    /* 고정지출 */

    document.getElementById(
      "yearly-fixed-total"
    ).textContent =
      formatWon(totals.fixed);


    /* 비정기지출 중 경조사 */

    const eventTotal =
      expenses

        .filter(
          item =>
            item.category === "irregular" &&
            item.tag === "경조사"
        )

        .reduce(
          (sum, item) => sum + item.amount,
          0
        );


    /* 빅이벤트 */

    const bigEventTotal =
      expenses

        .filter(
          item =>
            item.category === "irregular" &&
            item.tag === "빅이벤트"
        )

        .reduce(
          (sum, item) => sum + item.amount,
          0
        );


    document.getElementById(
      "yearly-event-total"
    ).textContent =
      formatWon(eventTotal);


    const eventPercent =
      (eventTotal / YEARLY_EVENT_BUDGET) * 100;


    document.getElementById(
      "yearly-event-percent"
    ).textContent =
      `${Math.round(eventPercent)}%`;


    document.getElementById(
      "yearly-event-progress"
    ).style.width =
      `${Math.min(eventPercent, 100)}%`;


    document.getElementById(
      "yearly-event-remaining"
    ).textContent =
      `잔여 ${formatWon(
        Math.max(
          YEARLY_EVENT_BUDGET - eventTotal,
          0
        )
      )}`;


    document.getElementById(
      "yearly-big-event-total"
    ).textContent =
      formatWon(bigEventTotal);


    renderLivingTags();
    renderMonthlyTable();

  }


  /* ==========================================
     생활비 태그 분석
     ========================================== */

  function renderLivingTags() {

    const container =
      document.getElementById("annual-living-tags");

    if (!container) return;


    const tags = [
      "식비",
      "간식비",
      "쇼핑"
    ];


    container.innerHTML = "";


    tags.forEach(tag => {

      const total =
        expenses

          .filter(
            item =>
              item.category === "living" &&
              item.tag === tag
          )

          .reduce(
            (sum, item) => sum + item.amount,
            0
          );


      const card =
        document.createElement("div");

      card.className =
        "annual-tag-card";


      card.innerHTML = `
        <span>${tag}</span>
        <strong>${formatWon(total)}</strong>
      `;


      container.appendChild(card);

    });

  }


  /* ==========================================
     월별 테이블
     ========================================== */

  function renderMonthlyTable() {

    const tbody =
      document.getElementById("annual-monthly-table");

    if (!tbody) return;


    tbody.innerHTML = "";


    for (let month = 9; month <= 12; month++) {

      const monthExpenses =
        getMonthExpenses(month);


      const living =
        monthExpenses

          .filter(item => item.category === "living")

          .reduce(
            (sum, item) => sum + item.amount,
            0
          );


      const fixed =
        monthExpenses

          .filter(item => item.category === "fixed")

          .reduce(
            (sum, item) => sum + item.amount,
            0
          );


      const event =
        monthExpenses

          .filter(
            item =>
              item.category === "irregular" &&
              item.tag === "경조사"
          )

          .reduce(
            (sum, item) => sum + item.amount,
            0
          );


      const bigEvent =
        monthExpenses

          .filter(
            item =>
              item.category === "irregular" &&
              item.tag === "빅이벤트"
          )

          .reduce(
            (sum, item) => sum + item.amount,
            0
          );


      const total =
        living +
        fixed +
        event +
        bigEvent;


      const income =
        SAMPLE_INCOME[getMonthKey(month)] || 0;


      const tr =
        document.createElement("tr");


      tr.innerHTML = `

        <td>
          ${month}월
        </td>

        <td>
          ${formatWon(income)}
        </td>

        <td class="living-text">
          ${formatWon(living)}
        </td>

        <td>
          ${formatWon(fixed)}
        </td>

        <td>
          ${formatWon(event)}
        </td>

        <td>
          ${formatWon(bigEvent)}
        </td>

        <td class="total-text">
          ${formatWon(total)}
        </td>

      `;


      tbody.appendChild(tr);

    }

  }


  /* ==========================================
     초기화
     ========================================== */

  updateTagOptions();
  renderMonthly();
  renderYearly();

})();