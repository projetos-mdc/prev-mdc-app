#!/bin/bash

# Script para fazer push do projeto para o GitHub
# Uso: ./push-to-github.sh seu_usuario

if [ -z "$1" ]; then
  echo "❌ Uso: ./push-to-github.sh seu_usuario_github"
  echo ""
  echo "Exemplo: ./push-to-github.sh danilofialho"
  exit 1
fi

GITHUB_USER=$1
REPO_NAME="prev-mdc-app"
GITHUB_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "🚀 Configurando repositório GitHub..."
echo "URL: $GITHUB_URL"
echo ""

# Remover remote se já existe
git remote remove origin 2>/dev/null || true

# Adicionar novo remote
git remote add origin "$GITHUB_URL"
echo "✅ Remote adicionado"

# Renomear branch se necessário
if git rev-parse --verify main >/dev/null 2>&1; then
  echo "ℹ️  Branch main já existe"
elif git rev-parse --verify master >/dev/null 2>&1; then
  git branch -M main
  echo "✅ Branch renomeado de master para main"
fi

echo ""
echo "📤 Fazendo push para GitHub..."
git push -u origin main

echo ""
echo "✅ Pronto! Seu projeto está no GitHub!"
echo "📍 Acesse: $GITHUB_URL"
