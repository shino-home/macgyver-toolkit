import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const menu = document.querySelector(".nav-menu");
if (menu) {
  const defaultOrder = Array.from(menu.querySelectorAll(".nav-btn"))
    .map(button => button.dataset.module);
  let currentUser = null;
  let draggedButton = null;
  let orderAtDragStart = null;
  let authRevision = 0;

  function getCurrentOrder() {
    return Array.from(menu.querySelectorAll(".nav-btn"))
      .map(button => button.dataset.module);
  }

  function applyOrder(savedOrder) {
    const buttons = new Map(
      Array.from(menu.querySelectorAll(".nav-btn"))
        .map(button => [button.dataset.module, button])
    );
    const orderedModules = [
      ...savedOrder.filter((module, index) => buttons.has(module) && savedOrder.indexOf(module) === index),
      ...defaultOrder.filter(module => !savedOrder.includes(module))
    ];

    orderedModules.forEach(module => {
      const button = buttons.get(module);
      if (button) menu.appendChild(button);
    });
  }

  function setReorderEnabled(enabled) {
    menu.querySelectorAll(".nav-btn").forEach(button => {
      button.draggable = enabled;
      button.title = enabled
        ? `${button.querySelector(".main-label")?.textContent || "기능"} — 끌어서 순서 변경`
        : "";
    });
    menu.classList.toggle("sidebar-order-enabled", enabled);
  }

  async function saveOrder() {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, "users", currentUser.uid, "preferences", "sidebar"), {
        moduleOrder: getCurrentOrder(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("사이드바 순서 저장 실패:", error);
    }
  }

  menu.addEventListener("dragstart", event => {
    const button = event.target.closest(".nav-btn");
    if (!currentUser || !button) {
      event.preventDefault();
      return;
    }
    draggedButton = button;
    orderAtDragStart = getCurrentOrder();
    button.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", button.dataset.module);
  });

  menu.addEventListener("dragover", event => {
    if (!draggedButton) return;
    event.preventDefault();
    const target = event.target.closest(".nav-btn");
    if (!target || target === draggedButton) return;
    const placeAfter = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
    menu.insertBefore(draggedButton, placeAfter ? target.nextSibling : target);
  });

  menu.addEventListener("dragend", () => {
    if (!draggedButton) return;
    draggedButton.classList.remove("dragging");
    draggedButton = null;
    if (JSON.stringify(orderAtDragStart) !== JSON.stringify(getCurrentOrder())) {
      saveOrder();
    }
    orderAtDragStart = null;
  });

  onAuthStateChanged(auth, async user => {
    currentUser = user || null;
    const revision = ++authRevision;
    setReorderEnabled(!!currentUser);

    if (!currentUser) {
      applyOrder(defaultOrder);
      return;
    }

    try {
      const snapshot = await getDoc(doc(db, "users", currentUser.uid, "preferences", "sidebar"));
      if (revision !== authRevision || !currentUser) return;
      const savedOrder = snapshot.exists() ? snapshot.data().moduleOrder : null;
      applyOrder(Array.isArray(savedOrder) ? savedOrder : defaultOrder);
    } catch (error) {
      console.error("사이드바 순서를 불러오지 못했습니다:", error);
    }
  });
}
