// js/config.js
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  SEGURANÇA — LEIA ANTES DE COMMITAR                                     │
// │                                                                         │
// │  ✅ SEGURO para commit público:                                         │
// │     • Firebase web config (apiKey, appId, projectId…)                   │
// │       → Não é uma senha. É um identificador público do projeto.         │
// │         A segurança real vem das Firestore Security Rules.              │
// │         Referência: firebase.google.com/docs/projects/api-keys          │
// │     • reCAPTCHA SITE KEY → bloqueada por domínio, pode ser pública      │
// │                                                                         │
// │  ❌ NUNCA commitar:                                                     │
// │     • Firebase Admin SDK / service account .json                        │
// │     • reCAPTCHA SECRET KEY (a do servidor)                              │
// │     • Qualquer chave de API de pagamentos ou e-mail                     │
// └─────────────────────────────────────────────────────────────────────────┘

const APP_CONFIG = {

    // ── Firebase ──────────────────────────────────────────────────────────
    firebase: {
        apiKey:            "AIzaSyCB0LutrExC6td1nIJBuiOQlN-30TdnrO8",
        authDomain:        "independentnews-483ac.firebaseapp.com",
        projectId:         "independentnews-483ac",
        storageBucket:     "independentnews-483ac.firebasestorage.app",
        messagingSenderId: "12329558758",
        appId:             "1:12329558758:web:588a82edbd34de38d51127",
        measurementId:     "G-KBVRETFES7"
    },

    // ── reCAPTCHA ─────────────────────────────────────────────────────────
    // Gere em: https://www.google.com/recaptcha/admin
    // Tipo: reCAPTCHA v2 — "Não sou um robô"
    recaptchaSiteKey: "INSIRA_SUA_SITEKEY_AQUI",

    // ── AdSense ───────────────────────────────────────────────────────────
    // Preencha quando a conta AdSense for aprovada em: https://adsense.google.com
    adsense: {
        publisherId: "ca-pub-XXXXXXXXXXXXXXXXX",
        slots: {
            banner:    "XXXXXXXXXX",
            grid:      "XXXXXXXXXX",
            inArticle: "XXXXXXXXXX"
        }
    },

    // ── GitHub (exibido no banner de demonstração) ────────────────────────
    // Substitua pelo link real do seu repositório
    githubUrl: "https://github.com/SEU_USUARIO/idp-news"
};

// Expõe globalmente (Firebase 8 não usa ES modules no runtime)
window.APP_CONFIG = APP_CONFIG;
