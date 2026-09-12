// ==========================================
// 연간 가계부 - Firebase 클라우드 저장
// ==========================================

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  auth,
  db
} from "./firebase.js";


const HOUSEHOLD_DOCUMENT = "householdAccount";

let currentUser = null;
let authInitialized = false;
let authReadyResolve;


const authReady = new Promise(resolve => {
  authReadyResolve = resolve;
});


onAuthStateChanged(auth, user => {

  currentUser = user || null;

  if (!authInitialized) {

    authInitialized = true;
    authReadyResolve(currentUser);

  }

});


async function waitForAuth() {

  if (!authInitialized) {
    await authReady;
  }

  return currentUser;

}


function getHouseholdRef(user) {

  if (!user) {
    return null;
  }

  return doc(
    db,
    "users",
    user.uid,
    HOUSEHOLD_DOCUMENT,
    "data"
  );

}


async function loadHouseholdState() {

  const user = await waitForAuth();


  if (!user) {

    return {
      loggedIn: false,
      exists: false,
      state: null
    };

  }


  const ref = getHouseholdRef(user);


  try {

    const snapshot = await getDoc(ref);


    if (!snapshot.exists()) {

      return {
        loggedIn: true,
        exists: false,
        state: null
      };

    }


    const data = snapshot.data();


    return {
      loggedIn: true,
      exists: true,
      state: data.state || null
    };

  } catch (error) {

    console.error(
      "Firebase 가계부 데이터를 불러오지 못했습니다.",
      error
    );


    return {
      loggedIn: true,
      exists: false,
      state: null,
      error
    };

  }

}


async function saveHouseholdState(state) {

  const user = await waitForAuth();


  if (!user) {

    return {
      success: false,
      reason: "not-logged-in"
    };

  }


  const ref = getHouseholdRef(user);


  try {

    await setDoc(
      ref,
      {
        state: state,
        updatedAt: serverTimestamp(),
        version: 1
      },
      {
        merge: true
      }
    );


    return {
      success: true
    };

  } catch (error) {

    console.error(
      "Firebase 가계부 저장 실패:",
      error
    );


    return {
      success: false,
      reason: "save-error",
      error
    };

  }

}


async function watchHouseholdState(callback) {

  const user = await waitForAuth();


  if (!user) {
    return null;
  }


  const ref = getHouseholdRef(user);


  return onSnapshot(
    ref,

    snapshot => {

      if (!snapshot.exists()) {
        return;
      }


      const data = snapshot.data();


      if (data.state) {
        callback(data.state);
      }

    },

    error => {

      console.error(
        "Firebase 가계부 실시간 동기화 오류:",
        error
      );

    }

  );

}


export {
  loadHouseholdState,
  saveHouseholdState,
  watchHouseholdState
};