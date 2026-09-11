// Firebase 기본 기능
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

// Firebase 로그인 기능
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

// Firebase 데이터베이스 기능
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ==========================================
// Firebase 프로젝트 설정
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyA-Tto--8MQhMnm5gxj-6iipyUfCaHMVPs",
  authDomain: "macgyver-toolkit.firebaseapp.com",
  projectId: "macgyver-toolkit",
  storageBucket: "macgyver-toolkit.firebasestorage.app",
  messagingSenderId: "694938579929",
  appId: "1:694938579929:web:4af4eac8d7a54e79425fc8"
};


// ==========================================
// Firebase 시작
// ==========================================

const app = initializeApp(firebaseConfig);


// ==========================================
// Firebase 서비스 준비
// ==========================================

const auth = getAuth(app);
const db = getFirestore(app);


// 다른 파일에서 사용할 수 있도록 내보내기
export { app, auth, db };