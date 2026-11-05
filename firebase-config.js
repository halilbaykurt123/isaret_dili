// Firebase ayarları (mevcut "cansu-9516e" projesi — Android uygulamasıyla aynı veritabanı).
// Web uygulaması yapılandırması (Firebase Console > Project settings > isaret-dili-web).
// Bu anahtar gizli değildir; güvenliği database.rules.json sağlar.
export const firebaseConfig = {
  apiKey: "AIzaSyDFZf1ecIJ4oCPzhUlN8eDirrDh4vmKKo4",
  authDomain: "cansu-9516e.firebaseapp.com",
  databaseURL: "https://cansu-9516e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cansu-9516e",
  storageBucket: "cansu-9516e.firebasestorage.app",
  messagingSenderId: "574655227214",
  appId: "1:574655227214:web:0c08af82312362da836a1f"
};

// Ana sayfadaki Uygunluk (Relevance) videosu: YouTube video kimliği.
// Örn. https://www.youtube.com/watch?v=bgsyc_qgnAk  ->  "bgsyc_qgnAk"
export const GIRIS_VIDEOSU = "";

// Quiz ayarları (Android uygulamasıyla aynı puanlama)
export const SORU_SURESI_SN = 15;
