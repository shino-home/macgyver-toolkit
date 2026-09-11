// ==========================================
// Firestore 연결 테스트
// ==========================================

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  auth,
  db
} from "./firebase.js";


// ==========================================
// 로그인 상태 확인
// ==========================================

onAuthStateChanged(auth, async (user) => {

  if (!user) {

    console.log("Firestore 테스트 대기 중: 로그인되어 있지 않습니다.");

    return;

  }


  console.log("로그인 사용자 확인:");
  console.log("UID:", user.uid);
  console.log("이메일:", user.email);


  // ----------------------------------------
  // 테스트 문서 위치
  // users / 내 UID / test / connection
  // ----------------------------------------

  const testRef = doc(
    db,
    "users",
    user.uid,
    "test",
    "connection"
  );


  try {

    // --------------------------------------
    // 1. Firestore에 테스트 데이터 저장
    // --------------------------------------

    await setDoc(testRef, {

      message: "MacGyver Toolkit Firestore 연결 테스트",

      testTime: new Date().toISOString(),

      email: user.email

    });


    console.log("✅ Firestore 저장 성공");


    // --------------------------------------
    // 2. 다시 읽어오기
    // --------------------------------------

    const snapshot = await getDoc(testRef);


    if (snapshot.exists()) {

      console.log(
        "✅ Firestore 읽기 성공:",
        snapshot.data()
      );

    } else {

      console.error(
        "❌ Firestore 문서를 찾을 수 없습니다."
      );

    }

  } catch (error) {

    console.error(
      "❌ Firestore 테스트 실패:",
      error
    );

  }

});