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

  // 이미 만들어져 있으면 다시 만들지 않는다.
  if (document.getElementById("auth-ui")) {
    return;
  }


  // ----------------------------------------
  // 스타일
  // ----------------------------------------

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
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .auth-status {
      font-size: 13px;
      color: #555;
    }

    .auth-open-btn,
    .auth-logout-btn {
      border: none;
      border-radius: 10px;
      padding: 9px 14px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }

    .auth-open-btn {
      background: #222;
      color: white;
    }

    .auth-logout-btn {
      background: #eeeeee;
      color: #333;
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


  // ----------------------------------------
  // 로그인 버튼 영역
  // ----------------------------------------

  const authUI = document.createElement("div");

  authUI.id = "auth-ui";

  authUI.innerHTML = `
    <div id="auth-user-area">
      <button
        type="button"
        class="auth-open-btn"
        id="auth-open-btn">
        로그인
      </button>
    </div>

    <div id="auth-modal">

      <div class="auth-box">

        <button
          type="button"
          class="auth-close-btn"
          id="auth-close-btn">
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
            id="auth-submit-btn">
            로그인
          </button>

        </form>

        <button
          type="button"
          class="auth-switch-btn"
          id="auth-switch-btn">
          계정이 없나요? 회원가입
        </button>

        <div
          class="auth-message"
          id="auth-message">
        </div>

      </div>

    </div>
  `;

  document.body.appendChild(authUI);


  // ----------------------------------------
  // 요소 가져오기
  // ----------------------------------------

  const modal = document.getElementById("auth-modal");
  const openBtn = document.getElementById("auth-open-btn");
  const closeBtn = document.getElementById("auth-close-btn");

  const form = document.getElementById("auth-form");

  const title = document.getElementById("auth-title");
  const submitBtn = document.getElementById("auth-submit-btn");
  const switchBtn = document.getElementById("auth-switch-btn");

  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");

  const message = document.getElementById("auth-message");


  let isSignUpMode = false;


  // ----------------------------------------
  // 로그인 팝업 열기
  // ----------------------------------------

  openBtn.addEventListener("click", () => {

    modal.classList.add("show");

    emailInput.focus();

  });


  // ----------------------------------------
  // 로그인 팝업 닫기
  // ----------------------------------------

  closeBtn.addEventListener("click", () => {

    modal.classList.remove("show");

    message.textContent = "";

  });


  // ----------------------------------------
  // 회원가입 / 로그인 전환
  // ----------------------------------------

  switchBtn.addEventListener("click", () => {

    isSignUpMode = !isSignUpMode;

    message.textContent = "";

    if (isSignUpMode) {

      title.textContent = "회원가입";

      submitBtn.textContent = "회원가입";

      switchBtn.textContent =
        "이미 계정이 있나요? 로그인";

      passwordInput.autocomplete = "new-password";

    } else {

      title.textContent = "로그인";

      submitBtn.textContent = "로그인";

      switchBtn.textContent =
        "계정이 없나요? 회원가입";

      passwordInput.autocomplete = "current-password";

    }

  });


  // ----------------------------------------
  // 로그인 / 회원가입 처리
  // ----------------------------------------

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = emailInput.value.trim();

    const password = passwordInput.value;


    if (!email || !password) {

      message.textContent =
        "이메일과 비밀번호를 입력해주세요.";

      return;

    }


    submitBtn.disabled = true;

    message.textContent = "";


    let result;


    if (isSignUpMode) {

      result = await signUp(email, password);

    } else {

      result = await login(email, password);

    }


    submitBtn.disabled = false;


    if (result.success) {

      message.textContent =
        "로그인되었습니다.";

      modal.classList.remove("show");

      emailInput.value = "";
      passwordInput.value = "";

    } else {

      message.textContent =
        getAuthErrorMessage(result.error);

    }

  });


  // ----------------------------------------
  // 로그인 상태 감시
  // ----------------------------------------

  watchAuthState((user) => {

    if (user) {

      openBtn.textContent = "로그인됨";

      openBtn.style.background = "#2f7d32";

    } else {

      openBtn.textContent = "로그인";

      openBtn.style.background = "#222";

    }

  });


  // ----------------------------------------
  // 로그인 상태 버튼 클릭
  // ----------------------------------------

  openBtn.addEventListener("dblclick", async () => {

    if (openBtn.textContent === "로그인됨") {

      await logout();

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