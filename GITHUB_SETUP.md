# 🚀 Publicar seu app no GitHub (SEM Google OAuth)

## ✅ O que foi feito:

- ✅ **Removido Google OAuth** (funções loginWithGoogle e syncGooglePartner)
- ✅ **Deletada página de callback** do Google (/auth/callback)
- ✅ **Mantida autenticação simples** com email + senha
- ✅ **Restauradas páginas** originais (login, cadastro, portal)
- ✅ **Repositório limpo** e pronto para GitHub

---

## 🔧 Próximos passos - SIMPLES:

### 1️⃣ Abra um **PowerShell** ou **CMD** na pasta do projeto

```powershell
cd "C:\Users\Danilo\Dropbox\CLAUDE\prev-mdc-app"
```

### 2️⃣ Configure o Git (primeira vez apenas)

```bash
git config user.email "atendimento@projetomdc.com"
git config user.name "Danilo Fialho"
```

### 3️⃣ Crie um repositório no GitHub

Acesse: https://github.com/new
- Nome: **prev-mdc-app**
- Deixe **público** (ou privado)
- **NÃO** initialize com README
- **NÃO** adicione .gitignore

### 4️⃣ Copie a URL do repositório que aparecerá

Será algo como: `https://github.com/SEU_USUARIO/prev-mdc-app.git`

### 5️⃣ Execute no terminal:

```bash
# Adicionar repositório remoto
git remote add origin https://github.com/SEU_USUARIO/prev-mdc-app.git

# Fazer push
git push -u origin master
```

---

## 🎯 Depois no Vercel:

1. Acesse https://vercel.com/dashboard
2. **New Project** → Conecte seu repositório GitHub
3. Adicione as env vars em **Settings > Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
   ```
4. Deploy automático ativado! 🚀

---

## 📋 Commits prontos:

```
ffc873a - feat: Plataforma Prev MDC — Next.js + Supabase
f60fd82 - refactor: remove Google OAuth - keep email/password auth only
```

O segundo commit remove completamente o Google OAuth.

---

## 🆘 Se tiver problemas:

Se os comandos acima darem erro, use esta alternativa:

```bash
# Remove tudo e começa do zero
git reset --hard HEAD
git clean -fd

# Depois faz o push normalmente
git push -u origin master
```
