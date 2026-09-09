// 가계부 모듈
(() => {

  /* ==========================================
     기본 설정
     ========================================== */

  const STORAGE_KEY = "macgyver_household_account_v2";

  const CURRENT_DATE = new Date();

  let currentYear = CURRENT_DATE.getFullYear();
  let currentMonth = CURRENT_DATE.getMonth() + 1;

  let selectedGoalCategory = null;


  /* ==========================================
     데이터
     ========================================== */

  let data = loadData();


  function createDefaultData() {

    return {
      expenses: [],
      incomes: [],
      goals: {},
      forecasts: {}
    };

  }


  function loadData() {

    try {

      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return createDefaultData();
      }

      const parsed = JSON.parse(saved);

      return {
        expenses: Array.isArray(parsed.expenses)
          ? parsed.expenses
          : [],

        incomes: Array.isArray(parsed.incomes)
          ? parsed.incomes
          : [],

        goals: parsed.goals || {},

        forecasts: parsed.forecasts || {}
      };

    } catch (error) {

      console.error(
        "가계부 데이터를 불러오는 중 오류:",
        error
      );

      return createDefaultData();

    }

  }


  function saveData() {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

  }


  /* ==========================================
     공통 함수
     ========================================== */

  function formatWon(value) {

    return `${Number(value || 0).toLocaleString("ko-KR")}원`;

  }


  function monthKey(year, month) {

    return `${year}-${String(month).padStart(2, "0")}`;

  }


  function escapeHTML(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function categoryName(category) {

    const names = {

      living: "생활비",
      fixed: "고정지출",
      irregular: "비정기지출",

      allowance: "수당",
      salary: "월급",
      bonus: "보너스"

    };

    return names[category] || category;

  }


  function categoryClass(category) {

    if (category === "living") {
      return "living";
    }

    if (category === "fixed") {
      return "fixed";
    }

    if (category === "irregular") {
      return "irregular";
    }

    return "";

  }


  /* ==========================================
     현재 월 데이터
     ========================================== */

  function getCurrentExpenses() {

    const key =
      monthKey(currentYear, currentMonth);

    return data.expenses.filter(
      item => item.date.startsWith(key)
    );

  }


  function getCurrentIncomes() {

    const key =
      monthKey(currentYear, currentMonth);

    return data.incomes.filter(
      item => item.date.startsWith(key)
    );

  }


  /* ==========================================
     팝업
     ========================================== */

  function openModal(id) {

    document
      .getElementById(id)
      ?.classList.add("open");

  }


  function closeModal(id) {

    document
      .getElementById(id)
      ?.classList.remove("open");

  }


  document
    .querySelectorAll("[data-close-modal]")
    .forEach(button => {

      button.addEventListener("click", () => {

        closeModal(
          button.getAttribute("data-close-modal")
        );

      });

    });


  document
    .querySelectorAll(".annual-modal-backdrop")
    .forEach(backdrop => {

      backdrop.addEventListener("click", () => {

        backdrop
          .closest(".annual-modal")
          ?.classList.remove("open");

      });

    });


  /* ==========================================
     화면 탭
     ========================================== */

  const viewTabs =
    document.querySelectorAll(".annual-view-tab");

  const views =
    document.querySelectorAll(".annual-view");


  viewTabs.forEach(button => {

    button.addEventListener("click", () => {

      const target =
        button.getAttribute("data-view");

      viewTabs.forEach(tab =>
        tab.classList.remove("active")
      );

      views.forEach(view =>
        view.classList.remove("active")
      );

      button.classList.add("active");

      document
        .getElementById(`annual-${target}-view`)
        ?.classList.add("active");


      if (target === "yearly") {

        renderYearly();

      } else {

        renderMonthly();

      }

    });

  });


  /* ==========================================
     월 이동
     ========================================== */

  document
    .getElementById("annual-prev-month")
    ?.addEventListener("click", () => {

      currentMonth--;

      if (currentMonth < 1) {

        currentMonth = 12;
        currentYear--;

      }

      renderMonthly();

    });


  document
    .getElementById("annual-next-month")
    ?.addEventListener("click", () => {

      currentMonth++;

      if (currentMonth > 12) {

        currentMonth = 1;
        currentYear++;

      }

      renderMonthly();

    });


  /* ==========================================
     연도 이동
     ========================================== */

  document
    .getElementById("annual-prev-year")
    ?.addEventListener("click", () => {

      currentYear--;

      renderYearly();

    });


  document
    .getElementById("annual-next-year")
    ?.addEventListener("click", () => {

      currentYear++;

      renderYearly();

    });


  /* ==========================================
     날짜 입력 기본값
     ========================================== */

  function setDefaultDate(inputId) {

    const input =
      document.getElementById(inputId);

    if (!input) return;

    const today =
      new Date();

    let year =
      currentYear;

    let month =
      currentMonth;

    let day =
      today.getDate();

    if (
      today.getFullYear() !== currentYear ||
      today.getMonth() + 1 !== currentMonth
    ) {

      day = 1;

    }

    const maxDay =
      new Date(
        year,
        month,
        0
      ).getDate();

    day =
      Math.min(day, maxDay);

    input.value =
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  }


  /* ==========================================
     지출 팝업
     ========================================== */

  document
    .getElementById("annual-open-expense")
    ?.addEventListener("click", () => {

      setDefaultDate("expense-date");

      document.getElementById(
        "expense-title"
      ).value = "";

      document.getElementById(
        "expense-amount"
      ).value = "";

      document.getElementById(
        "expense-category"
      ).value = "living";

      updateExpenseTags();

      openModal("annual-expense-modal");

    });


  /* ==========================================
     지출 태그
     ========================================== */

  function updateExpenseTags() {

    const category =
      document.getElementById(
        "expense-category"
      )?.value;

    const tagSelect =
      document.getElementById(
        "expense-tag"
      );

    if (!tagSelect) return;


    let tags = [];


    if (category === "living") {

      tags = [
        "식비",
        "간식비",
        "쇼핑"
      ];

    }

    else if (category === "fixed") {

      tags = [
        "보험",
        "통신",
        "구독",
        "자동차",
        "기타"
      ];

    }

    else {

      tags = [
        "빅이벤트",
        "경조사"
      ];

    }


    tagSelect.innerHTML =
      tags
        .map(tag =>
          `<option value="${escapeHTML(tag)}">${escapeHTML(tag)}</option>`
        )
        .join("");

  }


  document
    .getElementById("expense-category")
    ?.addEventListener(
      "change",
      updateExpenseTags
    );


  /* ==========================================
     지출 저장
     ========================================== */

  document
    .getElementById("annual-save-expense")
    ?.addEventListener("click", () => {

      const date =
        document.getElementById(
          "expense-date"
        ).value;

      const title =
        document.getElementById(
          "expense-title"
        ).value.trim();

      const amount =
        Number(
          document.getElementById(
            "expense-amount"
          ).value
        );

      const category =
        document.getElementById(
          "expense-category"
        ).value;

      const tag =
        document.getElementById(
          "expense-tag"
        ).value;


      if (!date) {

        alert("날짜를 입력해주세요.");
        return;

      }


      if (!title) {

        alert("내용을 입력해주세요.");
        return;

      }


      if (!amount || amount <= 0) {

        alert("금액을 입력해주세요.");
        return;

      }


      data.expenses.push({

        id:
          `expense-${Date.now()}-${Math.random()}`,

        date,

        title,

        amount,

        category,

        tag

      });


      saveData();


      const dateParts =
        date.split("-");

      currentYear =
        Number(dateParts[0]);

      currentMonth =
        Number(dateParts[1]);


      closeModal(
        "annual-expense-modal"
      );


      renderMonthly();

    });


  /* ==========================================
     수입 팝업
     ========================================== */

  document
    .getElementById("annual-open-income")
    ?.addEventListener("click", () => {

      setDefaultDate("income-date");

      document.getElementById(
        "income-title"
      ).value = "";

      document.getElementById(
        "income-amount"
      ).value = "";

      document.getElementById(
        "income-category"
      ).value = "salary";


      openModal(
        "annual-income-modal"
      );

    });


  /* ==========================================
     수입 저장
     ========================================== */

  document
    .getElementById("annual-save-income")
    ?.addEventListener("click", () => {

      const date =
        document.getElementById(
          "income-date"
        ).value;

      const title =
        document.getElementById(
          "income-title"
        ).value.trim();

      const amount =
        Number(
          document.getElementById(
            "income-amount"
          ).value
        );

      const category =
        document.getElementById(
          "income-category"
        ).value;


      if (!date) {

        alert("날짜를 입력해주세요.");
        return;

      }


      if (!title) {

        alert("내용을 입력해주세요.");
        return;

      }


      if (!amount || amount <= 0) {

        alert("금액을 입력해주세요.");
        return;

      }


      data.incomes.push({

        id:
          `income-${Date.now()}-${Math.random()}`,

        date,

        title,

        amount,

        category

      });


      saveData();


      const dateParts =
        date.split("-");

      currentYear =
        Number(dateParts[0]);

      currentMonth =
        Number(dateParts[1]);


      closeModal(
        "annual-income-modal"
      );


      renderMonthly();

    });


  /* ==========================================
     목표 설정
     ========================================== */

  document
    .querySelectorAll(
      "[data-goal-category]"
    )
    .forEach(card => {

      card.addEventListener("click", () => {

        selectedGoalCategory =
          card.getAttribute(
            "data-goal-category"
          );


        const key =
          monthKey(
            currentYear,
            currentMonth
          );


        const currentGoal =
          data.goals[key]?.[
            selectedGoalCategory
          ] || "";


        document.getElementById(
          "goal-modal-title"
        ).textContent =
          `${selectedGoalCategory === "living"
            ? "생활비"
            : "고정지출"} 목표 설정`;


        document.getElementById(
          "goal-amount"
        ).value =
          currentGoal;


        openModal(
          "annual-goal-modal"
        );

      });

    });


  /* ==========================================
     목표 저장
     ========================================== */

  document
    .getElementById("annual-save-goal")
    ?.addEventListener("click", () => {

      if (!selectedGoalCategory) return;


      const amount =
        Number(
          document.getElementById(
            "goal-amount"
          ).value
        );


      if (!amount || amount <= 0) {

        alert("목표 금액을 입력해주세요.");
        return;

      }


      const key =
        monthKey(
          currentYear,
          currentMonth
        );


      if (!data.goals[key]) {

        data.goals[key] = {};

      }


      data.goals[key][
        selectedGoalCategory
      ] = amount;


      saveData();


      closeModal(
        "annual-goal-modal"
      );


      renderMonthly();

    });


  /* ==========================================
     연간 예상치
     ========================================== */

  document
    .getElementById("annual-edit-forecast")
    ?.addEventListener("click", () => {

      const key =
        String(currentYear);


      const forecast =
        data.forecasts[key] || {};


      document.getElementById(
        "forecast-income"
      ).value =
        forecast.income || "";


      document.getElementById(
        "forecast-expense"
      ).value =
        forecast.expense || "";


      openModal(
        "annual-forecast-modal"
      );

    });


  document
    .getElementById("annual-save-forecast")
    ?.addEventListener("click", () => {

      const income =
        Number(
          document.getElementById(
            "forecast-income"
          ).value
        );


      const expense =
        Number(
          document.getElementById(
            "forecast-expense"
          ).value
        );


      if (!income && !expense) {

        alert(
          "예상 수입 또는 예상 지출을 입력해주세요."
        );

        return;

      }


      data.forecasts[
        String(currentYear)
      ] = {

        income:
          income || 0,

        expense:
          expense || 0

      };


      saveData();


      closeModal(
        "annual-forecast-modal"
      );


      renderYearly();

    });


  /* ==========================================
     삭제
     ========================================== */

  function deleteExpense(id) {

    if (
      !confirm(
        "이 지출 내역을 삭제할까요?"
      )
    ) {
      return;
    }


    data.expenses =
      data.expenses.filter(
        item => item.id !== id
      );


    saveData();

    renderMonthly();
    renderYearly();

  }


  function deleteIncome(id) {

    if (
      !confirm(
        "이 수입 내역을 삭제할까요?"
      )
    ) {
      return;
    }


    data.incomes =
      data.incomes.filter(
        item => item.id !== id
      );


    saveData();

    renderMonthly();
    renderYearly();

  }


  /* ==========================================
     월별 화면
     ========================================== */

  function renderMonthly() {

    document.getElementById(
      "annual-period-button"
    ).textContent =
      `${currentYear}년 ${currentMonth}월`;


    const expenses =
      getCurrentExpenses();

    const incomes =
      getCurrentIncomes();


    const livingTotal =
      expenses
        .filter(
          item => item.category === "living"
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount),
          0
        );


    const fixedTotal =
      expenses
        .filter(
          item => item.category === "fixed"
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount),
          0
        );


    const irregularTotal =
      expenses
        .filter(
          item => item.category === "irregular"
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount),
          0
        );


    const allExpenseTotal =
      livingTotal +
      fixedTotal +
      irregularTotal;


    const incomeTotal =
      incomes.reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      );


    /* 생활비 */

    document.getElementById(
      "monthly-living-total"
    ).textContent =
      formatWon(livingTotal);


    /* 고정지출 */

    document.getElementById(
      "monthly-fixed-total"
    ).textContent =
      formatWon(fixedTotal);


    /* 비정기 */

    document.getElementById(
      "monthly-irregular-total"
    ).textContent =
      formatWon(irregularTotal);


    /* 전체 지출 */

    document.getElementById(
      "monthly-all-expense-total"
    ).textContent =
      formatWon(allExpenseTotal);


    /* 수입 */

    document.getElementById(
      "monthly-income-total"
    ).textContent =
      formatWon(incomeTotal);


    document.getElementById(
      "monthly-income-count"
    ).textContent =
      `${incomes.length}건`;


    /* 목표 */

    renderMonthlyGoals();

    renderIncomeList(incomes);
    renderExpenseList(expenses);

  }


  /* ==========================================
     월별 목표 표시
     ========================================== */

  function renderMonthlyGoals() {

    const key =
      monthKey(
        currentYear,
        currentMonth
      );


    const goals =
      data.goals[key] || {};


    updateGoalCard(
      "living",
      goals.living
    );


    updateGoalCard(
      "fixed",
      goals.fixed
    );

  }


  function updateGoalCard(
    category,
    goal
  ) {

    const totalElement =
      document.getElementById(
        category === "living"
          ? "monthly-living-total"
          : "monthly-fixed-total"
      );


    const goalElement =
      document.getElementById(
        category === "living"
          ? "monthly-living-goal"
          : "monthly-fixed-goal"
      );


    const percentElement =
      document.getElementById(
        category === "living"
          ? "monthly-living-percent"
          : "monthly-fixed-percent"
      );


    const progressElement =
      document.getElementById(
        category === "living"
          ? "monthly-living-progress"
          : "monthly-fixed-progress"
      );


    const total =
      Number(
        totalElement.textContent
          .replaceAll(",", "")
          .replace("원", "")
      );


    if (!goal) {

      goalElement.textContent =
        "목표 미설정";

      percentElement.textContent =
        "-";

      progressElement.style.width =
        "0%";

      return;

    }


    const percent =
      (total / goal) * 100;


    goalElement.textContent =
      `목표 ${formatWon(goal)}`;


    percentElement.textContent =
      `${Math.round(percent)}%`;


    progressElement.style.width =
      `${Math.min(percent, 100)}%`;

  }


  /* ==========================================
     수입 리스트
     ========================================== */

  function renderIncomeList(incomes) {

    const container =
      document.getElementById(
        "annual-income-list"
      );


    container.innerHTML = "";


    if (!incomes.length) {

      container.innerHTML = `
        <div class="annual-empty">
          아직 입력된 수입 내역이 없습니다.
        </div>
      `;

      return;

    }


    const sorted =
      [...incomes].sort(
        (a, b) =>
          b.date.localeCompare(a.date)
      );


    sorted.forEach(item => {

      const element =
        document.createElement("div");

      element.className =
        "annual-record income";


      element.innerHTML = `

        <div class="annual-record-date">
          ${escapeHTML(
            item.date.substring(5).replace("-", "/")
          )}
        </div>

        <div class="annual-record-info">

          <strong>
            ${escapeHTML(item.title)}
          </strong>

          <span>
            ${escapeHTML(
              categoryName(item.category)
            )}
          </span>

        </div>

        <strong class="annual-record-amount">
          ${formatWon(item.amount)}
        </strong>

        <button
          class="annual-record-delete"
        >
          ×
        </button>

      `;


      element
        .querySelector(
          ".annual-record-delete"
        )
        .addEventListener(
          "click",
          () => deleteIncome(item.id)
        );


      container.appendChild(element);

    });

  }


  /* ==========================================
     지출 리스트
     ========================================== */

  function renderExpenseList(expenses) {

    const container =
      document.getElementById(
        "annual-expense-list"
      );


    container.innerHTML = "";


    if (!expenses.length) {

      container.innerHTML = `
        <div class="annual-empty">
          아직 입력된 지출 내역이 없습니다.
        </div>
      `;

      return;

    }


    const sorted =
      [...expenses].sort(
        (a, b) =>
          b.date.localeCompare(a.date)
      );


    sorted.forEach(item => {

      const element =
        document.createElement("div");


      element.className =
        `annual-record expense ${
          item.category === "living"
            ? "living-record"
            : ""
        }`;


      element.innerHTML = `

        <div class="annual-record-date">
          ${escapeHTML(
            item.date.substring(5).replace("-", "/")
          )}
        </div>

        <div class="annual-record-info">

          <strong>
            ${escapeHTML(item.title)}
          </strong>

          <span>

            <em class="${categoryClass(item.category)}">
              ${escapeHTML(
                categoryName(item.category)
              )}
            </em>

            ${escapeHTML(item.tag)}

          </span>

        </div>

        <strong class="annual-record-amount">
          ${formatWon(item.amount)}
        </strong>

        <button
          class="annual-record-delete"
        >
          ×
        </button>

      `;


      element
        .querySelector(
          ".annual-record-delete"
        )
        .addEventListener(
          "click",
          () => deleteExpense(item.id)
        );


      container.appendChild(element);

    });

  }


  /* ==========================================
     연간 데이터
     ========================================== */

  function getYearExpenses(year) {

    return data.expenses.filter(
      item =>
        item.date.startsWith(`${year}-`)
    );

  }


  function getYearIncomes(year) {

    return data.incomes.filter(
      item =>
        item.date.startsWith(`${year}-`)
    );

  }


  /* ==========================================
     연간 화면
     ========================================== */

  function renderYearly() {

    document.getElementById(
      "annual-year-label"
    ).textContent =
      `${currentYear}년`;


    const expenses =
      getYearExpenses(currentYear);

    const incomes =
      getYearIncomes(currentYear);


    const living =
      sumCategory(
        expenses,
        "living"
      );


    const fixed =
      sumCategory(
        expenses,
        "fixed"
      );


    const event =
      expenses
        .filter(
          item =>
            item.category === "irregular" &&
            item.tag === "경조사"
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount),
          0
        );


    const bigEvent =
      expenses
        .filter(
          item =>
            item.category === "irregular" &&
            item.tag === "빅이벤트"
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount),
          0
        );


    const totalExpense =
      living +
      fixed +
      event +
      bigEvent;


    const totalIncome =
      incomes.reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      );


    const balance =
      totalIncome -
      totalExpense;


    document.getElementById(
      "yearly-income-total"
    ).textContent =
      formatWon(totalIncome);


    document.getElementById(
      "yearly-expense-total"
    ).textContent =
      formatWon(totalExpense);


    document.getElementById(
      "yearly-balance-total"
    ).textContent =
      formatWon(balance);


    document.getElementById(
      "yearly-living-total"
    ).textContent =
      formatWon(living);


    document.getElementById(
      "yearly-fixed-total"
    ).textContent =
      formatWon(fixed);


    document.getElementById(
      "yearly-event-total"
    ).textContent =
      formatWon(event);


    document.getElementById(
      "yearly-big-event-total"
    ).textContent =
      formatWon(bigEvent);


    renderForecast();
    renderTagStatistics();
    renderMonthlyTable();

  }


  function sumCategory(
    expenses,
    category
  ) {

    return expenses
      .filter(
        item =>
          item.category === category
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      );

  }


  /* ==========================================
     예상치
     ========================================== */

  function renderForecast() {

    const forecast =
      data.forecasts[
        String(currentYear)
      ];


    if (!forecast) {

      document.getElementById(
        "yearly-forecast-income"
      ).textContent =
        "미설정";


      document.getElementById(
        "yearly-forecast-expense"
      ).textContent =
        "미설정";


      document.getElementById(
        "yearly-forecast-balance"
      ).textContent =
        "미설정";


      return;

    }


    const income =
      Number(forecast.income || 0);

    const expense =
      Number(forecast.expense || 0);


    document.getElementById(
      "yearly-forecast-income"
    ).textContent =
      formatWon(income);


    document.getElementById(
      "yearly-forecast-expense"
    ).textContent =
      formatWon(expense);


    document.getElementById(
      "yearly-forecast-balance"
    ).textContent =
      formatWon(
        income - expense
      );

  }


  /* ==========================================
     태그별 통계
     ========================================== */

  function renderTagStatistics() {

    const container =
      document.getElementById(
        "annual-living-tags"
      );


    container.innerHTML = "";


    const expenses =
      getYearExpenses(currentYear);


    const tags = [
      "식비",
      "간식비",
      "쇼핑"
    ];


    tags.forEach(tag => {

      const total =
        expenses
          .filter(
            item =>
              item.category === "living" &&
              item.tag === tag
          )
          .reduce(
            (sum, item) =>
              sum + Number(item.amount),
            0
          );


      const card =
        document.createElement("div");

      card.className =
        "annual-tag-card";


      card.innerHTML = `

        <span>${escapeHTML(tag)}</span>

        <strong>
          ${formatWon(total)}
        </strong>

      `;


      container.appendChild(card);

    });

  }


  /* ==========================================
     월별 통계
     ========================================== */

  function renderMonthlyTable() {

    const tbody =
      document.getElementById(
        "annual-monthly-table"
      );


    tbody.innerHTML = "";


    for (
      let month = 1;
      month <= 12;
      month++
    ) {

      const key =
        monthKey(
          currentYear,
          month
        );


      const expenses =
        data.expenses.filter(
          item =>
            item.date.startsWith(key)
        );


      const incomes =
        data.incomes.filter(
          item =>
            item.date.startsWith(key)
        );


      const living =
        sumCategory(
          expenses,
          "living"
        );


      const fixed =
        sumCategory(
          expenses,
          "fixed"
        );


      const event =
        expenses
          .filter(
            item =>
              item.category === "irregular" &&
              item.tag === "경조사"
          )
          .reduce(
            (sum, item) =>
              sum + Number(item.amount),
            0
          );


      const bigEvent =
        expenses
          .filter(
            item =>
              item.category === "irregular" &&
              item.tag === "빅이벤트"
          )
          .reduce(
            (sum, item) =>
              sum + Number(item.amount),
            0
          );


      const income =
        incomes.reduce(
          (sum, item) =>
            sum + Number(item.amount),
          0
        );


      const total =
        living +
        fixed +
        event +
        bigEvent;


      const row =
        document.createElement("tr");


      row.innerHTML = `

        <td>${month}월</td>

        <td>${formatWon(income)}</td>

        <td class="living-cell">
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

        <td class="total-cell">
          ${formatWon(total)}
        </td>

      `;


      tbody.appendChild(row);

    }

  }


  /* ==========================================
     펼치기 / 접기
     ========================================== */

  document
    .querySelectorAll(
      ".annual-expand-button"
    )
    .forEach(button => {

      button.addEventListener("click", () => {

        const targetId =
          button.getAttribute(
            "data-expand"
          );


        const target =
          document.getElementById(
            targetId
          );


        if (!target) return;


        const isOpen =
          target.classList.contains("open");


        target.classList.toggle(
          "open"
        );


        button.classList.toggle(
          "open"
        );


        const arrow =
          button.querySelector(
            ".annual-expand-arrow"
          );


        if (arrow) {

          arrow.textContent =
            isOpen
              ? "▼"
              : "▲";

        }

      });

    });


  /* ==========================================
     초기화
     ========================================== */

  updateExpenseTags();

  renderMonthly();

})();