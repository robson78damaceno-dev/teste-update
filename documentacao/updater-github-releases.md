# Updater no desktop com GitHub Releases

Este documento descreve a configuracao minima para publicar atualizacoes do app desktop (Tauri) no Windows usando GitHub Releases.

## 1) Gerar chave de assinatura do updater

No root do projeto:

```bash
npx tauri signer generate -- -w "$HOME/.tauri/mjc-player.key"
```

No Windows PowerShell:

```powershell
npx tauri signer generate -- -w "$env:USERPROFILE\.tauri\mjc-player.key"
```

Esse comando gera:
- chave privada (arquivo `.key`) para assinar os bundles
- chave publica (texto PEM) para colocar no `tauri.conf.json` em `plugins.updater.pubkey`

Nao versione a chave privada no Git.

## 2) Configurar secrets no GitHub

No repositorio GitHub (Settings > Secrets and variables > Actions), criar:

- `GH_RELEASES_TOKEN`: PAT com permissao de `repo` (para publicar release em repositorio privado).
- `TAURI_SIGNING_PRIVATE_KEY`: conteudo da chave privada (ou caminho, se preferir no runner).
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: senha da chave (pode ser vazia, mas recomenda-se definir).

## 3) Endpoint do updater

Em `src-tauri/tauri.conf.json`, ajuste o endpoint para o repo real:

```json
"endpoints": [
  "https://github.com/OWNER/REPO/releases/latest/download/latest.json"
]
```

Para repositorio privado, o acesso ao `latest.json` exige autenticacao. Se o cliente final nao tiver acesso direto, use um endpoint intermediario (proxy/update service) para entregar esse JSON.

## 4) Publicar nova versao

1. Atualize versao no app (`src-tauri/tauri.conf.json` e `src-tauri/Cargo.toml`).
2. Crie a tag semver:

```bash
git tag v0.1.1
git push origin v0.1.1
```

3. O workflow `windows-release.yml` vai buildar e publicar os artefatos no Release.

## 5) Fluxo no app

No startup do desktop, o frontend faz:
- check de atualizacao;
- se houver update: mostra tela de atualizacao;
- baixa e instala;
- informa para reiniciar o app ao fim.
