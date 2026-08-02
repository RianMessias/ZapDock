# Contribuindo com o ZapDock

O ZapDock é um projeto open source e ficamos felizes com a sua ajuda! Abaixo estão as diretrizes para contribuir.

## Adicionando ou Atualizando Idiomas (Internacionalização - i18n)

O ZapDock usa a API `chrome.i18n` para suportar vários idiomas. Atualmente suportamos Português (`pt_BR`), Inglês (`en`) e Espanhol (`es`).

Se você deseja adicionar um novo idioma ou corrigir uma tradução existente:

1. Vá até a pasta `_locales/`.
2. Para adicionar um novo idioma, crie uma pasta com o código do idioma (ex: `fr` para Francês) e crie um arquivo `messages.json` lá dentro.
3. Use o arquivo `_locales/pt_BR/messages.json` como referência. Ele é a nossa fonte de verdade.
4. Traduza os campos `"message"` mantendo qualquer substituição ou marcação (como `$1` nos contadores de mensagens pluralizadas).
5. Certifique-se de que o arquivo resultante seja um JSON válido.
6. Faça o commit, push e abra um Pull Request detalhando sua adição/correção.

Sua contribuição ajudará milhares de pessoas a usar o WhatsApp Web de maneira mais focada no seu próprio idioma. Obrigado!
