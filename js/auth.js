// ==========================================
// Firebase 로그인 기능
// ==========================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { auth } from "./firebase.js";


// ==========================================
// 회원가입
// ==========================================

async function signUp(email, password) {

  try {

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    console.log("회원가입 성공:", userCredential.user);

    return {
      success: true,
      user: userCredential.user
    };

  } catch (error) {

    console.error("회원가입 실패:", error);

    return {
      success: false,
      error: error
    };

  }

}


// ==========================================
// 로그인
// ==========================================

async function login(email, password) {

  try {

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    console.log("로그인 성공:", userCredential.user);

    return {
      success: true,
      user: userCredential.user
    };

  } catch (error) {

    console.error("로그인 실패:", error);

    return {
      success: false,
      error: error
    };

  }

}


// ==========================================
// 로그아웃
// ==========================================

async function logout() {

  try {

    await signOut(auth);

    console.log("로그아웃 성공");

    return {
      success: true
    };

  } catch (error) {

    console.error("로그아웃 실패:", error);

    return {
      success: false,
      error: error
    };

  }

}


// ==========================================
// 로그인 상태 감시
// ==========================================

function watchAuthState(callback) {

  return onAuthStateChanged(auth, callback);

}


// ==========================================
// 다른 파일에서 사용할 수 있도록 내보내기
// ==========================================

export {
  signUp,
  login,
  logout,
  watchAuthState
};