import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const menu = document.querySelector(".nav-menu");
if (menu) {
  const defaultOrder = Array.from(menu.querySelectorAll(".nav-btn"), button => button.dataset.module);
  let currentUser = null;
  let draggedButton = null;
  let pointerButton = null;
  let orderAtDragStart = null;
  let authRevision = 0;
  let longPressTimer = null;
  let pointerId = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerDragging = false;
  let suppressNextClick = false;

  const getCurrentOrder = () => Array.from(menu.querySelectorAll(".nav-btn"), button => button.dataset.module);
  const announceOrder = () => document.dispatchEvent(new CustomEvent("sidebarorderchange", { detail: { moduleOrder: getCurrentOrder() } }));

  function applyOrder(savedOrder) {
    const buttons = new Map(Array.from(menu.querySelectorAll(".nav-btn"), button => [button.dataset.module, button]));
    const seen = new Set();
    const ordered = [];
    for (const module of Array.isArray(savedOrder) ? savedOrder : []) {
      if (buttons.has(module) && !seen.has(module)) { ordered.push(module); seen.add(module); }
    }
    for (const module of defaultOrder) if (!seen.has(module)) ordered.push(module);
    ordered.forEach(module => menu.appendChild(buttons.get(module)));
    announceOrder();
  }

  function setReorderEnabled(enabled) {
    menu.querySelectorAll(".nav-btn").forEach(button => {
      button.draggable = false;
      button.setAttribute("aria-label", `${button.querySelector(".main-label")?.textContent || "기능"}. ${enabled ? "길게 누른 뒤 끌어 순서를 바꿀 수 있습니다." : ""}`.trim());
      button.title = enabled ? "길게 누른 뒤 끌어 메뉴 순서 변경 · Alt+방향키로 이동" : "";
    });
    menu.classList.toggle("sidebar-order-enabled", enabled);
  }

  async function saveOrder() {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, "users", currentUser.uid, "preferences", "sidebar"), {
        moduleOrder: getCurrentOrder(), updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("사이드바 순서 저장 실패:", error);
      applyOrder(orderAtDragStart || defaultOrder);
    }
  }

  function moveButtonAt(clientX, clientY) {
    if (!draggedButton) return;
    const pointed = document.elementFromPoint(clientX, clientY);
    const buttons = Array.from(menu.querySelectorAll(".nav-btn"));
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    let target = pointed?.closest(".nav-btn") || document.elementFromPoint(menu.getBoundingClientRect().left + menu.clientWidth / 2, clientY)?.closest(".nav-btn");
    let forceBefore = false;
    let forceAfter = false;
    if (!target && first && clientY < first.getBoundingClientRect().top) { target = first; forceBefore = true; }
    if (!target && last && clientY > last.getBoundingClientRect().bottom) { target = last; forceAfter = true; }
    if (!target || target === draggedButton || !menu.contains(target)) return;
    const oldPositions = new Map(Array.from(menu.querySelectorAll(".nav-btn"), button => [button, button.getBoundingClientRect().top]));
    const rect = target.getBoundingClientRect();
    const after = forceAfter || (!forceBefore && clientY > rect.top + rect.height / 2);
    const beforeOrder = getCurrentOrder().join("|");
    menu.insertBefore(draggedButton, after ? target.nextSibling : target);
    if (beforeOrder !== getCurrentOrder().join("|")) {
      for (const [button, oldTop] of oldPositions) {
        if (button === draggedButton) continue;
        const delta = oldTop - button.getBoundingClientRect().top;
        if (Math.abs(delta) < 1) continue;
        button.style.transition = "none";
        button.style.transform = `translateY(${delta}px)`;
        void button.offsetHeight;
        requestAnimationFrame(() => {
          button.style.transition = "";
          button.style.transform = "";
        });
      }
      announceOrder();
    }
  }

  function startDrag(button) {
    if (!currentUser || pointerDragging) return;
    pointerDragging = true;
    draggedButton = button;
    orderAtDragStart = getCurrentOrder();
    button.classList.add("dragging");
    menu.classList.add("pointer-reordering");
  }

  function clearDragStyles() {
    menu.classList.remove("pointer-reordering");
    menu.querySelectorAll(".nav-btn.dragging").forEach(button => button.classList.remove("dragging"));
  }

  async function finishDrag(cancelled = false) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    if (pointerId === null) return;
    pointerId = null;
    pointerButton = null;
    if (!pointerDragging) return;
    pointerDragging = false;
    if (cancelled && orderAtDragStart) applyOrder(orderAtDragStart);
    clearDragStyles();
    if (cancelled || JSON.stringify(orderAtDragStart) !== JSON.stringify(getCurrentOrder())) {
      if (!cancelled) await saveOrder();
    }
    suppressNextClick = !cancelled;
    window.setTimeout(() => { suppressNextClick = false; }, 0);
    draggedButton = null;
    orderAtDragStart = null;
  }

  menu.addEventListener("pointerdown", event => {
    const button = event.target.closest(".nav-btn");
    if (!currentUser || !button || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointerButton = button;
    pointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      longPressTimer = window.setTimeout(() => startDrag(button), 280);
    }
  });

  document.addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - pointerStartX;
    const dy = event.clientY - pointerStartY;
    if (longPressTimer && Math.hypot(dx, dy) > 9) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      pointerId = null;
      pointerButton = null;
      return;
    }
    if (!pointerDragging && event.pointerType === "mouse" && Math.hypot(dx, dy) > 5) {
      startDrag(pointerButton);
    }
    if (!pointerDragging) return;
    event.preventDefault();
    moveButtonAt(event.clientX, event.clientY);
  }, { passive: false });

  document.addEventListener("pointerup", () => finishDrag(false));
  document.addEventListener("pointercancel", () => finishDrag(true));
  window.addEventListener("blur", () => finishDrag(true));

  menu.addEventListener("click", event => {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  menu.addEventListener("keydown", async event => {
    const button = event.target.closest(".nav-btn");
    if (!button || !currentUser || !event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const sibling = event.key === "ArrowUp" ? button.previousElementSibling : button.nextElementSibling;
    if (!sibling) return;
    orderAtDragStart = getCurrentOrder();
    menu.insertBefore(button, event.key === "ArrowUp" ? sibling : sibling.nextSibling);
    announceOrder();
    await saveOrder();
    button.focus();
    orderAtDragStart = null;
  });

  onAuthStateChanged(auth, async user => {
    currentUser = user || null;
    const revision = ++authRevision;
    setReorderEnabled(!!currentUser);
    if (!currentUser) { applyOrder(defaultOrder); return; }
    try {
      const snapshot = await getDoc(doc(db, "users", currentUser.uid, "preferences", "sidebar"));
      if (revision !== authRevision || !currentUser) return;
      applyOrder(snapshot.exists() ? snapshot.data().moduleOrder : defaultOrder);
    } catch (error) {
      console.error("사이드바 순서를 불러오지 못했습니다:", error);
    }
  });
}
