// js/config.example.js
//
// INSTRUÇÕES:
// 1. Copie este arquivo para js/config.js
// 2. Preencha com suas credenciais
// 3. NUNCA commite o config.js real com chaves privadas (Admin SDK, etc.)
//    As chaves Firebase web são seguras — veja os comentários em config.js

const APP_CONFIG = {

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
        publisherId: "ca-pub-XXXXXXXXXXXXXXXXX",
        slots: {
            banner:    "",
            grid:      "",
            inArticle: ""
        }
    }
};

window.APP_CONFIG = APP_CONFIG;
