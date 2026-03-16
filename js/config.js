// js/config.js
// Configuração central da aplicação.
// As chaves do Firebase são públicas por design — a segurança vem das Firestore Rules.
// Nunca commite: Firebase Admin SDK, reCAPTCHA secret key, chaves de pagamento.

window.APP_CONFIG = {
    firebase: {
        apiKey:            "AIzaSyCB0LutrExC6td1nIJBuiOQlN-30TdnrO8",
        authDomain:        "independentnews-483ac.firebaseapp.com",
        projectId:         "independentnews-483ac",
        storageBucket:     "independentnews-483ac.firebasestorage.app",
        messagingSenderId: "12329558758",
        appId:             "1:12329558758:web:588a82edbd34de38d51127",
        measurementId:     "G-KBVRETFES7"
    },

    // Gere em: https://www.google.com/recaptcha/admin (tipo v2 "Não sou um robô")
    recaptchaSiteKey: "INSIRA_SUA_SITEKEY_AQUI",

    // Preencha quando a conta AdSense for aprovada
    adsense: {
        publisherId: "ca-pub-XXXXXXXXXXXXXXXXX",
        slots: { banner: "XXXXXXXXXX", grid: "XXXXXXXXXX", inArticle: "XXXXXXXXXX" }
    },

    // Link do repositório — aparece no banner de demonstração
    githubUrl: "https://github.com/SEU_USUARIO/idp-news"
};
