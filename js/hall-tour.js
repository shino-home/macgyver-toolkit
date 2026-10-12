// ==========================================
// 웨딩홀 계산기
// Firebase 사용자별 견적 저장
// ==========================================

(async function () {
  const root = document.querySelector(".hall-tour-section");
  if (!root) return;

  const loginNotice = document.getElementById("hall-login-notice");
  const calculator = document.getElementById("hall-calculator");
  const venueInput = document.getElementById("hall-venue-name");
  const roomInput = document.getElementById("hall-room-name");
  const rowsBody = document.getElementById("hall-quote-rows");
  const archiveList = document.getElementById("hall-archive-list");
  const archiveSort = document.getElementById("hall-archive-sort");
  const saveStatus = document.getElementById("hall-save-status");
  const saveButton = document.getElementById("hall-save-quote");

  const DEFAULT_GIFT_PER_GUEST = 100000;
  let auth;
  let db;
  let firestore;
  let currentUser = null;
  let currentQuote = null;
  let unsubscribeArchive = null;
  let saveTimer = null;
  let archiveCache = [];
  let saveInProgress = null;
  let changeVersion = 0;
  let quoteNeedsSave = false;
  let currentQuotePersisted = false;
  let currentQuoteHasInput = false;
  let archiveSortMode = "saved";

  const digitsOnly = value => String(value ?? "").replace(/[^0-9]/g, "");
  const money = value => {
    const digits = digitsOnly(value);
    return digits ? Number(digits) : 0;
  };
  const formatMoney = value => Math.round(Number(value) || 0).toLocaleString("ko-KR");
  const formatTenThousands = value => {
    const tenThousands = (Number(value) || 0) / 10000;
    return Number.isInteger(tenThousands)
      ? String(tenThousands)
      : tenThousands.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  };
  const parseTenThousands = value => {
    let normalized = String(value ?? "").replace(/,/g, "").replace(/[^0-9.]/g, "");
    const decimalIndex = normalized.indexOf(".");
    if (decimalIndex >= 0) {
      normalized = normalized.slice(0, decimalIndex + 1)
        + normalized.slice(decimalIndex + 1).replace(/\./g, "");
    }
    const amount = Number(normalized);
    return Number.isFinite(amount) ? Math.round(amount * 10000) : 0;
  };

  function compactMoney(value) {
    const amount = Math.round(Number(value) || 0);
    const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
    const abs = Math.abs(amount);
    if (abs >= 100000000) {
      const eok = Math.floor(abs / 100000000);
      const man = Math.round((abs % 100000000) / 10000);
      return man > 0 ? `${sign}${eok}억 ${man.toLocaleString("ko-KR")}만원` : `${sign}${eok}억원`;
    }
    if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString("ko-KR")}만원`;
    return `${sign}${formatMoney(abs)}원`;
  }

  function makeId() {
    return crypto.randomUUID();
  }

  function makeRow(index, fresh = true) {
    return {
      id: makeId(),
      label: `조건 ${index}`,
      guests: 200,
      mealPrice: 0,
      rentalFee: 0,
      fresh: { label: fresh, mealPrice: fresh, rentalFee: fresh }
    };
  }

  function makeQuote() {
    return {
      id: makeId(),
      venueName: "",
      roomName: "",
      giftPrice: DEFAULT_GIFT_PER_GUEST,
      rows: [makeRow(1)]
    };
  }

  function setStatus(message) {
    saveStatus.textContent = message;
  }

  function calculate(row) {
    const guests = Math.max(0, money(row.guests));
    const mealPrice = Math.max(0, money(row.mealPrice));
    const rentalFee = Math.max(0, money(row.rentalFee));
    const total = guests * mealPrice + rentalFee;
    const giftTotal = guests * DEFAULT_GIFT_PER_GUEST;
    return { total, giftTotal, difference: giftTotal - total };
  }

  // 입력 중에도 천 단위 쉼표를 표시하고, 커서 위치를 최대한 유지합니다.
  function formatNumericInput(input) {
    const oldValue = input.value;
    const oldPosition = input.selectionStart ?? oldValue.length;
    const digitsBeforeCursor = digitsOnly(oldValue.slice(0, oldPosition)).length;
    const digits = digitsOnly(oldValue);
    const formatted = digits ? Number(digits).toLocaleString("ko-KR") : "";
    input.value = formatted;

    let position = 0;
    let digitCount = 0;
    while (position < formatted.length && digitCount < digitsBeforeCursor) {
      if (/\d/.test(formatted[position])) digitCount++;
      position++;
    }
    try { input.setSelectionRange(position, position); } catch (_) {}
  }

  function numericInput(field, id, value, label, step, fresh = false) {
    const display = fresh && Number(value) === 0 ? "" : formatMoney(value);
    return `<input type="text" inputmode="numeric" autocomplete="off" class="hall-row-input" data-field="${field}" data-id="${id}" aria-label="${label}" value="${display}"${display ? "" : ' placeholder="0"'} data-step="${step}">`;
  }

  function rentalInput(id, value, fresh = false) {
    const display = fresh && Number(value) === 0 ? "" : formatTenThousands(value);
    return `<input type="text" inputmode="decimal" autocomplete="off" class="hall-row-input hall-rental-input" data-field="rentalFee" data-id="${id}" aria-label="대관료, 만원 단위" value="${display}"${display ? "" : ' placeholder="0"'}>`;
  }

  function renderRows() {
    rowsBody.innerHTML = "";
    currentQuote.rows.forEach(row => {
      const result = calculate(row);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="조건"><div class="hall-condition-cell"><input class="hall-row-label" data-field="label" data-id="${row.id}" aria-label="조건 이름" maxlength="40" placeholder="${row.fresh?.label ? row.label : ""}"><button type="button" class="hall-delete-row" data-delete-row="${row.id}" aria-label="조건 삭제">×</button></div></td>
        <td data-label="하객 수">${numericInput("guests", row.id, row.guests, "하객 수", 10)}</td>
        <td data-label="식대(원)">${numericInput("mealPrice", row.id, row.mealPrice, "식대(원)", 1000, row.fresh?.mealPrice)}</td>
        <td data-label="대관료(만원)">${rentalInput(row.id, row.rentalFee, row.fresh?.rentalFee)}</td>
        <td data-label="총비용" class="hall-total">${compactMoney(result.total)}</td>
        <td data-label="정산후" class="hall-difference ${result.difference >= 0 ? "positive" : "negative"}">${compactMoney(result.difference)}</td>
      `;
      rowsBody.appendChild(tr);
      tr.querySelector('[data-field="label"]').value = row.fresh?.label ? "" : row.label;
    });
  }

  function renderQuote() {
    if (!currentQuote) return;
    venueInput.value = currentQuote.venueName || "";
    roomInput.value = currentQuote.roomName || "";
    renderRows();
  }

  function updateRowResults(rowId) {
    if (!currentQuote) return;
    const row = currentQuote.rows.find(item => item.id === rowId);
    if (!row) return;
    const input = rowsBody.querySelector(`[data-id="${rowId}"]`);
    const tr = input?.closest("tr");
    if (!tr) return;
    const result = calculate(row);
    const cells = tr.querySelectorAll("td");
    cells[4].textContent = compactMoney(result.total);
    cells[5].textContent = compactMoney(result.difference);
    cells[5].classList.toggle("positive", result.difference >= 0);
    cells[5].classList.toggle("negative", result.difference < 0);
  }

  function quoteRef(quoteId, user = currentUser) {
    return firestore.doc(db, "users", user.uid, "hallTourQuotes", quoteId);
  }

  async function saveCurrentQuote(options = {}) {
    if (!currentUser || !currentQuote) return;
    if (!currentQuotePersisted && !currentQuoteHasInput) {
      if (options.manual) setStatus("내용을 입력하면 자동 저장됩니다.");
      return;
    }
    const quoteId = currentQuote.id;
    const savingUser = currentUser;

    if (saveInProgress) await saveInProgress;
    // 대기 중인 저장을 기다린 뒤, 현재 화면의 최신 내용을 스냅샷으로 만듭니다.
    if (currentUser?.uid !== savingUser.uid || currentQuote?.id !== quoteId) return;

    const quote = currentQuote;
    const versionAtStart = changeVersion;
    const payload = {
      venueName: quote.venueName,
      roomName: quote.roomName,
      giftPrice: DEFAULT_GIFT_PER_GUEST,
      rows: quote.rows.map(({ id, label, guests, mealPrice, rentalFee }) => ({ id, label, guests, mealPrice, rentalFee })),
      updatedAt: firestore.serverTimestamp()
    };

    setStatus(options.manual ? "저장 중..." : "변경 내용 저장 중...");
    saveButton.disabled = true;
    const operation = (async () => {
      await firestore.setDoc(quoteRef(quote.id, savingUser), payload, { merge: true });
    })();
    saveInProgress = operation;
    try {
      await operation;
      if (currentUser?.uid === savingUser.uid && currentQuote?.id === quote.id) {
        if (changeVersion === versionAtStart) {
          currentQuotePersisted = true;
          quoteNeedsSave = false;
          setStatus(options.manual ? "저장 완료" : "자동 저장 완료");
        } else {
          setStatus("새 변경 사항 저장 대기 중...");
          scheduleSave();
        }
      }
    } catch (error) {
      console.error("홀 투어 견적 저장 실패:", error);
      if (currentQuote?.id === quote.id) setStatus("저장 실패 — 인터넷 연결을 확인해 주세요.");
      throw error;
    } finally {
      if (saveInProgress === operation) saveInProgress = null;
      saveButton.disabled = false;
    }
  }

  function scheduleSave({ userInput = false } = {}) {
    if (!currentUser || !currentQuote) return;
    if (userInput) currentQuoteHasInput = true;
    if (!currentQuotePersisted && !currentQuoteHasInput) return;
    changeVersion++;
    quoteNeedsSave = true;
    setStatus("변경 내용 저장 대기 중...");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveCurrentQuote().catch(() => {});
    }, 600);
  }

  async function manualSave() {
    if (!currentUser || !currentQuote) return;
    if (!currentQuotePersisted && !currentQuoteHasInput) {
      setStatus("내용을 입력하면 자동 저장됩니다.");
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      await saveCurrentQuote({ manual: true });
    } catch (_) {
      // 오류 메시지는 saveCurrentQuote에서 화면에 표시합니다.
    }
  }

  function renderArchive() {
    archiveList.innerHTML = "";
    if (archiveCache.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hall-muted";
      empty.textContent = "아직 저장된 견적이 없습니다.";
      archiveList.appendChild(empty);
      return;
    }

    const sortedQuotes = [...archiveCache].sort((a, b) => {
      const savedA = a.updatedAt?.toMillis?.() || 0;
      const savedB = b.updatedAt?.toMillis?.() || 0;
      if (archiveSortMode === "opened") {
        const openedA = a.lastOpenedAt?.toMillis?.() || savedA;
        const openedB = b.lastOpenedAt?.toMillis?.() || savedB;
        if (openedA !== openedB) return openedB - openedA;
      }
      return savedB - savedA;
    });

    sortedQuotes.forEach(quote => {
      const item = document.createElement("div");
      item.className = "hall-archive-item";
      const info = document.createElement("button");
      info.type = "button";
      info.className = "hall-archive-open";
      info.dataset.openQuote = quote.id;
      const title = document.createElement("strong");
      title.textContent = [quote.venueName, quote.roomName].filter(Boolean).join(" · ") || "이름 없는 견적";
      const subtitle = document.createElement("span");
      subtitle.textContent = `${(quote.rows || []).length}개 조건 · ${quote.id === currentQuote?.id ? "현재 열림" : "저장된 견적"}`;
      info.append(title, subtitle);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "hall-delete-quote";
      remove.dataset.deleteQuote = quote.id;
      remove.textContent = "삭제";
      remove.setAttribute("aria-label", "견적 삭제");
      item.append(info, remove);
      archiveList.appendChild(item);
    });
  }

  function normalizeQuote(id, data) {
    const rows = Array.isArray(data.rows) && data.rows.length
      ? data.rows.map((row, index) => ({
          id: row.id || makeId(),
          label: row.label || `조건 ${index + 1}`,
          guests: money(row.guests ?? 200),
          mealPrice: money(row.mealPrice ?? 0),
          rentalFee: money(row.rentalFee ?? 0),
          fresh: { label: false, mealPrice: false, rentalFee: false }
        }))
      : [{ id: makeId(), label: "조건 1", guests: 200, mealPrice: 0, rentalFee: 0, fresh: { label: false, mealPrice: false, rentalFee: false } }];
    return {
      id,
      venueName: data.venueName || "",
      roomName: data.roomName || "",
      giftPrice: DEFAULT_GIFT_PER_GUEST,
      rows
    };
  }

  async function createNewQuote() {
    if (!currentUser) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    if (currentQuote && quoteNeedsSave) {
      try { await saveCurrentQuote(); } catch (_) { return; }
    }
    clearTimeout(saveTimer);
    saveTimer = null;
    currentQuote = makeQuote();
    currentQuotePersisted = false;
    currentQuoteHasInput = false;
    quoteNeedsSave = false;
    changeVersion++;
    renderQuote();
    renderArchive();
    setStatus("새 견적입니다. 입력하면 자동 저장됩니다.");
  }

  async function openQuote(quoteId) {
    if (!currentUser) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    if (quoteNeedsSave) {
      try { await saveCurrentQuote(); } catch (_) { return; }
    }
    clearTimeout(saveTimer);
    saveTimer = null;
    const cached = archiveCache.find(item => item.id === quoteId);
    if (!cached) return;
    currentQuote = normalizeQuote(cached.id, cached);
    currentQuotePersisted = true;
    currentQuoteHasInput = true;
    quoteNeedsSave = false;
    changeVersion++;
    renderQuote();
    renderArchive();
    setStatus("저장된 견적을 불러왔습니다.");
    cached.lastOpenedAt = { toMillis: () => Date.now() };
    renderArchive();
    firestore.setDoc(quoteRef(quoteId), {
      lastOpenedAt: firestore.serverTimestamp()
    }, { merge: true }).catch(error => {
      console.error("견적 열람 기록 저장 실패:", error);
    });
  }

  async function deleteQuote(quoteId) {
    if (!currentUser) return;
    const quote = archiveCache.find(item => item.id === quoteId);
    const name = quote ? [quote.venueName, quote.roomName].filter(Boolean).join(" · ") : "이 견적";
    if (!confirm(`'${name || "이름 없는 견적"}'을(를) 삭제할까요?`)) return;

    const deletingCurrent = currentQuote?.id === quoteId;
    if (deletingCurrent) {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (saveInProgress) {
        try { await saveInProgress; } catch (_) {}
      }
      clearTimeout(saveTimer);
      saveTimer = null;
      currentQuote = makeQuote();
      currentQuotePersisted = false;
      currentQuoteHasInput = false;
      quoteNeedsSave = false;
      renderQuote();
    }
    try {
      await firestore.deleteDoc(quoteRef(quoteId));
    } catch (error) {
      console.error("견적 삭제 실패:", error);
      alert("삭제하지 못했습니다. 인터넷 연결을 확인해 주세요.");
    }
  }

  venueInput.addEventListener("input", () => {
    if (!currentQuote) return;
    currentQuote.venueName = venueInput.value;
    scheduleSave({ userInput: true });
    renderArchive();
  });

  roomInput.addEventListener("input", () => {
    if (!currentQuote) return;
    currentQuote.roomName = roomInput.value;
    scheduleSave({ userInput: true });
    renderArchive();
  });

  rowsBody.addEventListener("input", event => {
    if (!currentQuote) return;
    const input = event.target;
    const rowId = input.dataset.id;
    const field = input.dataset.field;
    if (!rowId || !field) return;
    const row = currentQuote.rows.find(item => item.id === rowId);
    if (!row) return;

    if (field === "label") {
      row.label = input.value;
      if (row.fresh) row.fresh.label = false;
    } else {
      row[field] = field === "rentalFee" ? parseTenThousands(input.value) : money(input.value);
      if (row.fresh && Object.prototype.hasOwnProperty.call(row.fresh, field)) row.fresh[field] = false;
      if (field !== "rentalFee") formatNumericInput(input);
      updateRowResults(rowId);
    }
    scheduleSave({ userInput: true });
  });

  document.getElementById("hall-add-row").addEventListener("click", () => {
    if (!currentQuote) return;
    currentQuote.rows.push(makeRow(currentQuote.rows.length + 1));
    renderRows();
    scheduleSave();
  });

  rowsBody.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-row]");
    if (!button || !currentQuote) return;
    if (currentQuote.rows.length <= 1) {
      alert("견적 조건은 최소 1개가 필요합니다.");
      return;
    }
    currentQuote.rows = currentQuote.rows.filter(row => row.id !== button.dataset.deleteRow);
    renderRows();
    scheduleSave();
  });

  document.getElementById("hall-new-quote").addEventListener("click", createNewQuote);
  saveButton.addEventListener("click", manualSave);

  archiveSort.addEventListener("change", () => {
    archiveSortMode = archiveSort.value;
    renderArchive();
  });

  archiveList.addEventListener("click", event => {
    const openButton = event.target.closest("[data-open-quote]");
    const deleteButton = event.target.closest("[data-delete-quote]");
    if (openButton) openQuote(openButton.dataset.openQuote);
    if (deleteButton) deleteQuote(deleteButton.dataset.deleteQuote);
  });

  try {
    const firebase = await import("./firebase.js");
    auth = firebase.auth;
    db = firebase.db;
    firestore = await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js");

    authModule.onAuthStateChanged(auth, async user => {
      currentUser = user || null;
      if (unsubscribeArchive) {
        unsubscribeArchive();
        unsubscribeArchive = null;
      }
      clearTimeout(saveTimer);
      saveTimer = null;
      currentQuote = null;
      currentQuotePersisted = false;
      currentQuoteHasInput = false;
      quoteNeedsSave = false;
      archiveCache = [];
      changeVersion++;

      loginNotice.hidden = !!user;
      calculator.hidden = !user;
      if (!user) {
        archiveList.innerHTML = "";
        setStatus("로그인 후 사용할 수 있습니다.");
        return;
      }

      currentQuote = makeQuote();
      currentQuotePersisted = false;
      currentQuoteHasInput = false;
      quoteNeedsSave = false;
      changeVersion++;
      renderQuote();
      renderArchive();
      setStatus("새 견적입니다. 입력하면 자동 저장됩니다.");

      const quotesCollection = firestore.collection(db, "users", user.uid, "hallTourQuotes");
      unsubscribeArchive = firestore.onSnapshot(quotesCollection, async snapshot => {
        if (currentUser?.uid !== user.uid) return;
        archiveCache = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        renderArchive();

      }, error => {
        console.error("견적 보관함 불러오기 실패:", error);
        setStatus("보관함을 불러오지 못했습니다.");
      });
    });
  } catch (error) {
    console.error("웨딩홀 계산기 초기화 실패:", error);
    loginNotice.hidden = false;
    loginNotice.textContent = "계산기를 초기화하지 못했습니다. Firebase 설정과 인터넷 연결을 확인해 주세요.";
    calculator.hidden = true;
  }
})();
