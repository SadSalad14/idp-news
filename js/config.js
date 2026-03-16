// js/config.js

window.APP_CONFIG = {

    // Modo demo ativo — site funciona com dados de exemplo, sem Firebase
    forceDemo: true,

    // Credenciais Firebase (não usadas enquanto forceDemo = true)
    firebase: {
        apiKey:            "",
        authDomain:        "",
        projectId:         "",
        storageBucket:     "",
        messagingSenderId: "",
        appId:             "",
        measurementId:     ""
    },

    // Gere em: https://www.google.com/recaptcha/admin (v2 "Não sou um robô")
    recaptchaSiteKey: "",

    // Preencha quando a conta AdSense for aprovada
    adsense: {
        publisherId: "",
        slots: { banner: "", grid: "", inArticle: "" }
    },

    // Link do repositório — aparece no banner de demonstração
    githubUrl: "https://github.com/SadSalad14/idp-news"
};
