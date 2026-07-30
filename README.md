# ZapDock — WhatsApp compacto com alertas

Extensão Manifest V3 para Microsoft Edge e Google Chrome. Ao clicar no ícone,
ela abre o WhatsApp Web dentro de um painel de 800 × 600 px preso à barra de
extensões, no mesmo formato visual de extensões como o AdGuard. O WhatsApp é
renderizado em 86% para caber melhor no espaço.

> **Versão oficial de testes:** `v1.0.0-beta.1`. O ZapDock depende da interface
> atual do WhatsApp Web e pode precisar de ajustes quando ela for atualizada.

## Baixar

Baixe o pacote `ZapDock-1.0.0-beta.1.zip` na
[página da versão](https://github.com/RianMessias/ZapDock/releases/tag/v1.0.0-beta.1),
extraia o arquivo e carregue a pasta descompactada no navegador.

## Instalar no Microsoft Edge

1. Abra `edge://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem pacote**.
4. Selecione a pasta `Extensao zap`.
5. No menu de extensões, fixe o **ZapDock** na barra.
6. Clique no ícone para abrir o painel.

No Chrome, use `chrome://extensions` e siga os mesmos passos.

## Primeiro login

O painel compartilha a sessão e os cookies do navegador. Se o QR Code não ficar
confortável no painel, use o botão **Abrir em uma aba**, faça o login uma única
vez e depois reabra o ZapDock.

## Funcionamento

- O painel abre diretamente com um clique no ícone.
- O tamanho usado é o máximo aceito pelo popup de extensões: 800 × 600 px.
- O conteúdo do WhatsApp usa escala de 86%, oferecendo uma área útil maior.
- O ícone da extensão exibe um contador vermelho de mensagens não lidas.
- Uma notificação sonora de dois toques é reproduzida quando o contador aumenta.
- O botão de som no cabeçalho ativa ou silencia o alerta; a escolha fica salva.
- `Ctrl+Shift+Y` também abre o painel.
- O botão de recarregar reinicia apenas o WhatsApp dentro do painel.
- Ao clicar fora do painel, ele fecha automaticamente. Esse comportamento é
  controlado pelo próprio Edge/Chrome.

### Por que o WhatsApp parece reabrir?

O Edge e o Chrome destroem qualquer popup de extensão assim que ele perde o
foco. Portanto, a parte visível do WhatsApp é criada novamente a cada clique no
ícone; esse comportamento também acontece com outros popups, mas é mais
perceptível em uma aplicação grande como o WhatsApp.

O contador e o som não dependem desse popup. Um monitor invisível permanece
ativo em segundo plano e observa tanto o contador do título quanto os selos de
mensagens não lidas da lista de conversas.

## Privacidade e permissão

O WhatsApp Web normalmente impede que sua página seja exibida dentro de um
quadro. Para viabilizar o painel ancorado, o ZapDock solicita acesso somente a
`web.whatsapp.com`, identifica a requisição como pertencente ao painel e remove
o cabeçalho que bloqueia esse enquadramento. A regra só é aplicada quando o
ZapDock é a página superior; outras abas e sites não são afetados.

A extensão mantém um quadro invisível do WhatsApp enquanto o navegador estiver
aberto. Ele serve apenas para acompanhar o número exibido no título da página,
atualizar o contador do ícone e emitir o alerta mesmo com o painel fechado.

A extensão:

- lê apenas o total de mensagens não lidas mostrado no título do WhatsApp;
- não lê o texto, remetente ou conteúdo das conversas;
- não captura nem armazena mensagens;
- armazena localmente somente o total de não lidas e a preferência de som;
- não envia dados para servidores próprios;
- não solicita acesso a outros sites.

Como o funcionamento depende das políticas atuais do WhatsApp Web, uma mudança
futura feita pelo WhatsApp pode exigir uma atualização da extensão.
