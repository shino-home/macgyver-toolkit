// ==========================================
// 맥가이버툴 로그인 화면
// ==========================================

import {
  signUp,
  login,
  logout,
  watchAuthState
} from "./auth.js";


// ==========================================
// 로그인 UI 만들기
// ==========================================

function createAuthUI() {

  if (document.getElementById("auth-ui")) {
    return;
  }

  const style = document.createElement("style");

  style.textContent = `
    #auth-ui {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      font-family: inherit;
    }

    #auth-user-area {
      position: relative;
      display: flex;
      align-items: center;
    }

    .auth-open-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 11px;
      padding: 9px 13px;
      background: #ffffff;
      color: #333;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }

    .auth-open-btn.logged-in {
      background: #ffffff;
      color: #333;
    }

    .auth-account-arrow {
      font-size: 11px;
      transition: transform 0.15s ease;
    }

    .auth-open-btn.dropdown-open .auth-account-arrow {
      transform: rotate(180deg);
    }

    .auth-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 210px;
      padding: 7px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 13px;
      background: #ffffff;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.13);
    }

    .auth-dropdown.hidden {
      display: none;
    }

    .auth-email {
      padding: 10px 11px 9px;
      color: #666;
      font-size: 12px;
      line-height: 1.4;
      word-break: break-all;
    }

    .auth-logout-btn {
      width: 100%;
      border: 0;
      border-radius: 9px;
      padding: 10px 11px;
      background: #f3f4f5;
      color: #333;
      text-align: left;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
    }

    .auth-logout-btn:hover {
      background: #e9eaec;
    }

    #auth-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0, 0, 0, 0.45);
      align-items: center;
      justify-content: center;
    }

    #auth-modal.show {
      display: flex;
    }

    .auth-box {
      width: min(90vw, 380px);
      background: white;
      border-radius: 18px;
      padding: 28px;
      box-sizing: border-box;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    }

    .auth-box h2 {
      margin: 0 0 8px;
      font-size: 22px;
    }

    .auth-description {
      margin: 0 0 22px;
      color: #777;
      font-size: 13px;
    }

    .auth-input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 13px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
    }

    .auth-input:focus {
      border-color: #888;
    }

    .auth-submit-btn {
      width: 100%;
      border: none;
      border-radius: 10px;
      padding: 12px;
      background: #222;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 4px;
    }

    .auth-submit-btn:disabled {
      opacity: 0.6;
      cursor: wait;
    }

    .auth-switch-btn {
      width: 100%;
      border: none;
      background: none;
      color: #666;
      padding: 12px 0 0;
      cursor: pointer;
      font-size: 13px;
    }

    .auth-close-btn {
      float: right;
      border: none;
      background: none;
      font-size: 22px;
      color: #777;
      cursor: pointer;
    }

    .auth-message {
      min-height: 20px;
      margin-top: 12px;
      font-size: 13px;
      color: #d33;
      line-height: 1.5;
    }
  `;

  document.head.appendChild(style);

  const authUI = document.createElement("div");
  authUI.id = "auth-ui";

  authUI.innerHTML = `
    <div id="auth-user-area">
      <button
        type="button"
        class="auth-open-btn"
        id="auth-open-btn"
        aria-expanded="false"
      >
        로그인
      </button>

      <div
        class="auth-dropdown hidden"
        id="auth-dropdown"
      >
        <div class="auth-email" id="auth-email-display"></div>
        <button
          type="button"
          class="auth-logout-btn"
          id="auth-logout-btn"
        >
          로그아웃
        </button>
      </div>
    </div>

    <div id="auth-modal">
      <div class="auth-box">
        <button
          type="button"
          class="auth-close-btn"
          id="auth-close-btn"
        >
          ×
        </button>

        <h2 id="auth-title">로그인</h2>

        <p class="auth-description">
          맥가이버툴 계정으로 로그인하세요.
        </p>

        <form id="auth-form">
          <input
            type="email"
            id="auth-email"
            class="auth-input"
            placeholder="이메일"
            autocomplete="email"
            required
          >

          <input
            type="password"
            id="auth-password"
            class="auth-input"
            placeholder="비밀번호"
            autocomplete="current-password"
            required
          >

          <button
            type="submit"
            class="auth-submit-btn"
            id="auth-submit-btn"
          >
            로그인
          </button>
        </form>

        <button
          type="button"
          class="auth-switch-btn"
          id="auth-switch-btn"
        >
          계정이 없나요? 회원가입
        </button>

        <div
          class="auth-message"
          id="auth-message"
        ></div>
      </div>
    </div>
  `;

  document.body.appendChild(authUI);

  const modal = document.getElementById("auth-modal");
  const openBtn = document.getElementById("auth-open-btn");
  const closeBtn = document.getElementById("auth-close-btn");
  const dropdown = document.getElementById("auth-dropdown");
  const emailDisplay = document.getElementById("auth-email-display");
  const logoutBtn = document.getElementById("auth-logout-btn");

  const form = document.getElementById("auth-form");
  const title = document.getElementById("auth-title");
  const submitBtn = document.getElementById("auth-submit-btn");
  const switchBtn = document.getElementById("auth-switch-btn");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const message = document.getElementById("auth-message");

  let isSignUpMode = false;
  let currentUser = null;

  function closeDropdown() {
    dropdown.classList.add("hidden");
    openBtn.classList.remove("dropdown-open");
    openBtn.setAttribute("aria-expanded", "false");
  }

  function openLoginModal() {
    closeDropdown();
    modal.classList.add("show");
    emailInput.focus();
  }

  openBtn.addEventListener("click", () => {
    if (!currentUser) {
      openLoginModal();
      return;
    }

    const isOpen = !dropdown.classList.contains("hidden");

    if (isOpen) {
      closeDropdown();
    } else {
      dropdown.classList.remove("hidden");
      openBtn.classList.add("dropdown-open");
      openBtn.setAttribute("aria-expanded", "true");
    }
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
    message.textContent = "";
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      modal.classList.remove("show");
      message.textContent = "";
    }
  });

  document.addEventListener("click", event => {
    if (!event.target.closest("#auth-user-area")) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeDropdown();
      modal.classList.remove("show");
    }
  });

  switchBtn.addEventListener("click", () => {
    isSignUpMode = !isSignUpMode;
    message.textContent = "";

    if (isSignUpMode) {
      title.textContent = "회원가입";
      submitBtn.textContent = "회원가입";
      switchBtn.textContent = "이미 계정이 있나요? 로그인";
      passwordInput.autocomplete = "new-password";
    } else {
      title.textContent = "로그인";
      submitBtn.textContent = "로그인";
      switchBtn.textContent = "계정이 없나요? 회원가입";
      passwordInput.autocomplete = "current-password";
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      message.textContent = "이메일과 비밀번호를 입력해주세요.";
      return;
    }

    submitBtn.disabled = true;
    message.textContent = "";

    let result;

    try {
      if (isSignUpMode) {
        result = await signUp(email, password);
      } else {
        result = await login(email, password);
      }
    } catch (error) {
      result = { success: false, error };
    }

    submitBtn.disabled = false;

    if (result.success) {
      modal.classList.remove("show");
      emailInput.value = "";
      passwordInput.value = "";
      message.textContent = "";
    } else {
      message.textContent = getAuthErrorMessage(result.error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;

    const result = await logout();

    if (result.success) {
      closeDropdown();
      // 로그아웃 후 화면에 남아 있을 수 있는 개인 가계부 데이터를 확실히 초기화한다.
      location.reload();
      return;
    }

    logoutBtn.disabled = false;
    alert(getAuthErrorMessage(result.error));
  });

  watchAuthState(user => {
    currentUser = user || null;

    if (currentUser) {
      openBtn.innerHTML = `
        <span>👤 내 계정</span>
        <span class="auth-account-arrow">▾</span>
      `;
      openBtn.classList.add("logged-in");
      emailDisplay.textContent = currentUser.email || "이메일 정보 없음";
    } else {
      closeDropdown();
      openBtn.textContent = "로그인";
      openBtn.classList.remove("logged-in");
      emailDisplay.textContent = "";
    }
  });
}


// ==========================================
// Firebase 오류 메시지 변환
// ==========================================

function getAuthErrorMessage(error) {
  if (!error) {
    return "알 수 없는 오류가 발생했습니다.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "이미 사용 중인 이메일입니다.";
    case "auth/invalid-email":
      return "이메일 주소가 올바르지 않습니다.";
    case "auth/weak-password":
      return "비밀번호가 너무 약합니다.";
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/user-not-found":
      return "가입된 계정을 찾을 수 없습니다.";
    case "auth/wrong-password":
      return "비밀번호가 올바르지 않습니다.";
    default:
      return "처리 중 오류가 발생했습니다. 다시 시도해주세요.";
  }
}


// ==========================================
// 화면 생성
// ==========================================

createAuthUI();
