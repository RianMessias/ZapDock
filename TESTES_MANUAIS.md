# Testes Manuais — Modo Persistente (Painel Lateral)

## Pré-requisitos

- Chrome 145+ ou Edge com suporte a `sidePanel`
- Extensão carregada sem pacote (`chrome://extensions` → "Carregar sem pacote")

---

## 1. Alternância entre modos

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1.1 | Clique no ícone do ZapDock | Popup ancorado abre com WhatsApp |
| 1.2 | Clique no botão painel lateral (ícone de retângulo dividido ao meio) na barra do popup | Painel lateral abre com WhatsApp; popup mostra aviso "WhatsApp já está ativo no painel lateral" |

## 2. Persistência ao trocar de aba

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 2.1 | Com o painel lateral aberto, navegue para outra aba (qualquer site) | O painel lateral **não** recarrega |
| 2.2 | Volte para a aba anterior | O painel lateral continua com o WhatsApp carregado |

## 3. Preferência entre popup e painel

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 3.1 | Com o painel lateral ativo, feche o popup e clique novamente no ícone | Popup mostra aviso "WhatsApp já está ativo no painel lateral" (não recarrega o WhatsApp) |
| 3.2 | Clique em "Usar popup" no aviso | O popup carrega o WhatsApp normalmente; o painel lateral permanece aberto |
| 3.3 | Feche o popup e clique no ícone novamente | Popup carrega WhatsApp (modo padrão restaurado) |

## 4. Compartilhamento de estado

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 4.1 | No painel lateral, clique no botão de som para silenciar | O badge de som muda; a preferência é salva |
| 4.2 | Abra o popup | O estado do som é o mesmo (silenciado) |
| 4.3 | No popup, reative o som | O painel lateral reflete a mudança |
| 4.4 | Envie uma mensagem no WhatsApp | O badge de contador e o alerta sonoro funcionam em ambos os painéis |

## 5. Funcionalidades do painel lateral

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 5.1 | Clique em "Recarregar" no painel lateral | O WhatsApp recarrega dentro do painel |
| 5.2 | Clique em "Abrir em uma aba" | O WhatsApp abre em uma nova aba |
| 5.3 | Redimensione o painel lateral (arraste a borda) | O layout se ajusta (escala muda conforme as media queries) |

## 6. Fallback em navegadores sem suporte

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 6.1 | (Simulado) O botão de painel lateral existe mas o chrome.sidePanel.open() falha | O popup permanece em modo normal; nenhum erro visível para o usuário |

## 7. Regressão — popup ancorado

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 7.1 | Desative o painel lateral (use "Usar popup") | Popup funciona exatamente como antes |
| 7.2 | Atalho Ctrl+Shift+Y | Abre o popup ancorado (comportamento inalterado) |
| 7.3 | Badge no ícone da extensão | Continua funcionando |
