# 📰 idp.news

> **Plataforma de notícias independentes verificadas pela comunidade**  
> Projeto pessoal de portfolio — demonstração de arquitetura frontend com Firebase

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)](.)
[![Firebase](https://img.shields.io/badge/Firebase-8.10.0-orange)](https://firebase.google.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 📌 Sobre o Projeto

O **idp.news** é uma SPA (Single Page Application) que permite à comunidade publicar e verificar a veracidade de notícias locais por meio de votação ponderada. O sistema atribui peso maior aos votos de usuários geograficamente próximos ao fato reportado.

Este projeto nasceu como uma plataforma independente de jornalismo comunitário e está em constante evolução.

---

## ✨ Funcionalidades

| Recurso | Status |
|---|---|
| Publicação de notícias com localização geográfica | ✅ Implementado |
| Sistema de votação com peso por proximidade (Haversine) | ✅ Implementado |
| Verificação comunitária (status: averiguar / verificada) | ✅ Implementado |
| Autenticação com e-mail e senha | ✅ Implementado |
| reCAPTCHA v2 nos formulários | ✅ Implementado |
| Sistema de reputação de usuários | ✅ Implementado |
| Report de abuso com limite automático | ✅ Implementado |
| Cache local com invalidação automática | ✅ Implementado |
| Scroll infinito com paginação Firestore | ✅ Implementado |
| Detecção de usuários banidos | ✅ Implementado |
| PWA com Service Worker e modo offline | 🔧 Parcial |
| Sistema de comentários | 🗓️ Planejado |
| Painel de moderação | 🗓️ Planejado |
| Google AdSense (slots preparados) | 🗓️ Aguardando aprovação |

---

## 🛠️ Stack Técnica

- **Frontend:** HTML5, CSS3, JavaScript (ES Modules — sem framework)
- **Backend:** Firebase (Firestore, Authentication, Hosting)
- **Autenticação anti-bot:** Google reCAPTCHA v2
- **Geocoding:** OpenStreetMap Nominatim (gratuito, sem chave de API)
- **Ícones:** Font Awesome 6
- **PWA:** Service Worker + Web Manifest

### Por que sem framework?

Decisão intencional para demonstrar domínio de JavaScript vanilla e para manter o projeto leve e sem dependências de build. O bundle final é zero — apenas HTML, CSS e JS nativos.

---

## 🏗️ Arquitetura

```
idp-news/
├── index.html              # SPA raiz
├── css/
│   └── style.css           # Estilos globais (tema escuro)
├── js/
│   ├── config.js           # Credenciais (ver setup abaixo) — não commitado
│   ├── config.example.js   # Template de configuração
│   ├── firebase.js         # Inicialização Firebase
│   ├── auth.js             # Autenticação + reCAPTCHA
│   ├── noticias.js         # Feed, filtros, modal, votação UI
│   ├── votacao.js          # Lógica de votos e reports
│   ├── publicacao.js       # Formulário de publicação
│   ├── main.js             # Inicialização da aplicação
│   ├── ui.js               # Componentes reutilizáveis (toast, loading…)
│   ├── geo.js              # Geolocalização do usuário
│   └── data.json           # Conteúdo estático (termos, privacidade…)
└── sw.js                   # Service Worker (PWA)
```

### Fluxo de verificação

```
Publicação → status: "averiguar"
    ↓ votos positivos (peso 1× ou 2× se próximo ao local)
    ↓ pontuação ≥ 50 → status: "verificada"
    ↓ pontuação ≤ -30 → status: "removida"
    ↓ 5 reports → removida automaticamente
```

### Otimizações Firebase (Plano Gratuito)

- Cache de 15 minutos no `localStorage` → reduz ~60% das leituras
- `onSnapshot` apenas nos contadores do footer, não no feed inteiro
- Reputação do usuário cacheada em memória após login
- Atualização de votos local (em memória) sem nova query ao Firestore
- `batch.commit()` agrupa escrita de notícia + update de reputação em 1 operação

---

## 🚀 Setup Local

### Pré-requisitos

- Node.js 18+
- Conta no [Firebase](https://console.firebase.google.com)
- Chave do [reCAPTCHA v2](https://www.google.com/recaptcha/admin)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/idp-news.git
cd idp-news

# 2. Instale as dependências de desenvolvimento
npm install

# 3. Configure as credenciais
cp js/config.example.js js/config.js
# Edite js/config.js com suas chaves do Firebase e reCAPTCHA

# 4. Inicie o servidor local
npm run dev
# Abre em: http://localhost:5500
```

### Configuração do Firebase

No [Firebase Console](https://console.firebase.google.com):

1. **Firestore** → Criar banco de dados no modo produção
2. **Authentication** → Ativar provedor: E-mail/Senha
3. **Firestore Rules** → Aplicar as regras em `firestore.rules`
4. **Índice composto** → Ao carregar o site pela primeira vez, o console do navegador mostrará um link para criá-lo automaticamente

---

## 🔐 Segurança

### O que é seguro commitar

As chaves da configuração Firebase (`apiKey`, `appId`, `projectId`…) são **identificadores públicos por design** — a segurança é garantida pelas [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started), não por esconder essas chaves. A própria documentação do Firebase recomenda que elas fiquem no código do cliente.

A `reCAPTCHA SITE KEY` também é pública — ela é bloqueada por domínio no painel do Google.

### O que NUNCA commitar

- Firebase Admin SDK / arquivo JSON de service account
- reCAPTCHA **Secret Key** (a do servidor)
- Chaves de API de serviços de pagamento, e-mail transacional, etc.

---

## 📸 Screenshots

> *Em breve*

---

## 🗺️ Roadmap

- [ ] Sistema de comentários por notícia
- [ ] Painel de moderação para admins
- [ ] Notificações por push (PWA)
- [ ] Busca por texto nas notícias
- [ ] Perfil público do usuário com histórico
- [ ] Migração para Firebase v9 (modular) para bundle menor

---

## 📄 Licença

MIT © 2026 — veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">
  <sub>Feito com JavaScript puro, Firebase e muita vontade de fazer um jornalismo mais honesto.</sub>
</div>
