# Contas em Dia - Sistema de Gestão Financeira Offline

Um sistema completo de gestão de contas a pagar com funcionalidade offline e PWA (Progressive Web App).

## 🚀 Funcionalidades Offline

- ✅ **PWA Completo** - Instalável como app nativo
- ✅ **Service Worker** - Cache inteligente
- ✅ **Armazenamento Local** - IndexedDB para dados offline
- ✅ **Sincronização Automática** - Quando voltar online
- ✅ **Detecção de Conectividade** - Status em tempo real

## 📱 Como Instalar Offline

1. Acesse a seção "Instalador Offline" no menu lateral
2. Clique em "Instalar Aplicativo" quando aparecer
3. Confirme a instalação no navegador
4. Agora funciona offline!

## 🛠️ Tecnologias

- **React** + **TypeScript**
- **Supabase** - Database PostgreSQL
- **Service Worker** - Cache e interceptação
- **IndexedDB** - Armazenamento offline
- **PWA** - Progressive Web App

## 🔧 Desenvolvimento

```bash
npm install
npm run dev
```

## 🌐 Uso Fora do Lovable

Este projeto roda de forma independente como aplicação web estática.

### Rodar em qualquer máquina

```bash
npm install
npm run build
npm run preview
```

### Publicação automática no GitHub Pages

O workflow em `.github/workflows/deploy-pages.yml` publica automaticamente no GitHub Pages a cada push na branch `main`.

URL esperada:

`https://<seu-usuario>.github.io/contas-em-dia-online/`

## 📞 Suporte

Para dúvidas sobre funcionalidades offline, acesse o "Instalador Offline" no sistema.
