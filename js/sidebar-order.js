import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const menu = document.querySelector(".nav-menu");
if (menu) {
  const defaultOrder = Array.from(menu.querySelectorAll(".nav-btn"), button => button.dataset.module);
  let currentUser = null;
  let draggedButton = null;
  let orderAtDragStart = null;
  let authRevision = 0;
  let touchTimer = null;
  let pointerHandle = null;
  let pointerStartY = 0;
  let pointerGrabOffsetY = 0;
  let pointerBaseTop = 0;
  let pointerDragging = false;

  menu.querySelectorAll(".nav-btn").forEach(button => {
    const handle = document.createElement("span");
    handle.className = "nav-drag-handle";
    handle.textContent = "⠿";
    handle.setAttribute("role", "button");
    handle.setAttribute("tabindex", "-1");
    handle.setAttribute("aria-label", `${button.querySelector(".main-label")?.textContent || "기능"} 순서 변경`);
    handle.title = "길게 눌러 메뉴 순서 변경";
    button.appendChild(handle);
  });

  const getCurrentOrder = () => Array.from(menu.querySelectorAll(".nav-btn"), button => button.dataset.module);

  function applyOrder(savedOrder) {
    const buttons = new Map(Array.from(menu.querySelectorAll(".nav-btn"), button => [button.dataset.module, button]));
    const seen = new Set();
    const ordered = [];
    for (const module of Array.isArray(savedOrder) ? savedOrder : []) {
      if (buttons.has(module) && !seen.has(module)) { ordered.push(module); seen.add(module); }
    }
    for (const module of defaultOrder) if (!seen.has(module)) ordered.push(module);
    ordered.forEach(module => menu.appendChild(buttons.get(module)));
  }

  function setReorderEnabled(enabled) {
    menu.querySelectorAll(".nav-btn").forEach(button => {
      button.draggable = enabled;
      const handle = button.querySelector(".nav-drag-handle");
      handle?.setAttribute("tabindex", enabled ? "0" : "-1");
      handle?.setAttribute("aria-disabled", String(!enabled));
      button.title = enabled ? `${button.querySelector(".main-label")?.textContent || "기능"} — 끌어서 순서 변경` : "";
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

  function moveButtonAt(clientY) {
    if (!draggedButton) return;
    const target = document.elementFromPoint(window.innerWidth / 2, clientY)?.closest(".nav-btn");
    if (!target || target === draggedButton || !menu.contains(target)) return;
    const after = clientY > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
    const oldPositions = new Map(Array.from(menu.querySelectorAll(".nav-btn"), button => [button, button.getBoundingClientRect().top]));
    const oldParent = draggedButton.parentElement;
    const oldNext = draggedButton.nextElementSibling;
    menu.insertBefore(draggedButton, after ? target.nextSibling : target);
    if (oldParent !== draggedButton.parentElement || oldNext !== draggedButton.nextElementSibling) {
      for (const [button, oldTop] of oldPositions) {
        if (button === draggedButton || !button.isConnected) continue;
        const delta = oldTop - button.getBoundingClientRect().top;
        if (Math.abs(delta) < 1) continue;
        button.style.transition = "none";
        button.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          button.style.transition = "";
          button.style.transform = "";
        });
      }
    }
  }

  menu.addEventListener("dragstart", event => {
    const button = event.target.closest(".nav-btn");
    if (!currentUser || !button) { event.preventDefault(); return; }
    draggedButton = button;
    orderAtDragStart = getCurrentOrder();
    button.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", button.dataset.module);
  });
  menu.addEventListener("dragover", event => {
    if (!draggedButton) return;
    event.preventDefault();
    moveButtonAt(event.clientY);
  });
  menu.addEventListener("dragend", async () => {
    if (!draggedButton) return;
    draggedButton.classList.remove("dragging");
    draggedButton = null;
    if (JSON.stringify(orderAtDragStart) !== JSON.stringify(getCurrentOrder())) await saveOrder();
    orderAtDragStart = null;
  });

  menu.addEventListener("pointerdown", event => {
    const handle = event.target.closest(".nav-drag-handle");
    const button = handle?.closest(".nav-btn");
    if (!currentUser || !handle || !button || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    pointerHandle = handle;
    pointerStartY = event.clientY;
    pointerDragging = false;
    touchTimer = window.setTimeout(() => {
      touchTimer = null;
      if (!pointerHandle) return;
      pointerDragging = true;
      draggedButton = button;
      orderAtDragStart = getCurrentOrder();
      const rect = button.getBoundingClientRect();
      pointerGrabOffsetY = pointerStartY - rect.top;
      pointerBaseTop = rect.top;
      button.classList.add("dragging");
      button.style.pointerEvents = "none";
      menu.classList.add("touch-reordering");
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
    }, 180);
  });

  document.addEventListener("pointermove", event => {
    if (!pointerHandle) return;
    if (touchTimer && Math.abs(event.clientY - pointerStartY) > 10) {
      clearTimeout(touchTimer);
      touchTimer = null;
      pointerHandle = null;
      return;
    }
    if (!pointerDragging) return;
    event.preventDefault();
    draggedButton.style.setProperty("--drag-offset", `${event.clientY - pointerGrabOffsetY - pointerBaseTop}px`);
    const before = getCurrentOrder().join("|");
    moveButtonAt(event.clientY);
    if (before !== getCurrentOrder().join("|")) {
      draggedButton.style.setProperty("--drag-offset", "0px");
      const rect = draggedButton.getBoundingClientRect();
      pointerBaseTop = rect.top;
      draggedButton.style.setProperty("--drag-offset", `${event.clientY - pointerGrabOffsetY - pointerBaseTop}px`);
    }
  }, { passive: false });

  menu.addEventListener("click", event => {
    if (!event.target.closest(".nav-drag-handle")) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  async function finishPointerDrag(event) {
    if (touchTimer) clearTimeout(touchTimer);
    touchTimer = null;
    if (!pointerHandle) return;
    const handle = pointerHandle;
    pointerHandle = null;
    try { if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId); } catch (_) {}
    if (!pointerDragging) return;
    pointerDragging = false;
    menu.classList.remove("touch-reordering");
    if (draggedButton) {
      draggedButton.classList.remove("dragging");
      draggedButton.style.removeProperty("--drag-offset");
      draggedButton.style.removeProperty("pointer-events");
    }
    draggedButton = null;
    if (JSON.stringify(orderAtDragStart) !== JSON.stringify(getCurrentOrder())) await saveOrder();
    orderAtDragStart = null;
  }
  document.addEventListener("pointerup", finishPointerDrag);
  document.addEventListener("pointercancel", finishPointerDrag);

  menu.addEventListener("keydown", async event => {
    const handle = event.target.closest(".nav-drag-handle");
    if (!handle || !currentUser) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const button = handle.closest(".nav-btn");
    const sibling = event.key === "ArrowUp" ? button.previousElementSibling : button.nextElementSibling;
    if (!sibling) return;
    orderAtDragStart = getCurrentOrder();
    menu.insertBefore(button, event.key === "ArrowUp" ? sibling : sibling.nextSibling);
    await saveOrder();
    handle.focus();
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
