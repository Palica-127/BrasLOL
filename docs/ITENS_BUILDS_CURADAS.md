# Builds curadas de itens (Bloco 4b)

**Status: ESTIMADO.** As builds foram escritas à mão a partir de conhecimento geral do meta recente. Não são estatística do patch 16.22.1 nem de fonte citável no projeto. O leagueofgraphs bloqueou a coleta automática (403) e não foi contornado; o lolalytics não deu dados confiáveis. Para trocar por dados reais, edite `src/engine/items/curated.js`.

## O que mudou
- **`src/engine/items/curated.js` (novo):** 164 campeões com build própria. Cada entrada é `E(classe, núcleo, finais, botas)`.
  - `classe` define a adaptação (fighter, tank, adc, mage, assassin, enchanter).
  - `núcleo` são os itens em ordem de compra.
  - `finais` são as opções padrão para as vagas finais.
  - `botas` só aparece quando difere da bota padrão da classe.
  - `check()` valida que todos os ids existem no catálogo e são itens completos.
- **Adaptação à partida:** as vagas finais são trocadas conforme o jogo (tabela `SIT`):
  - inimigo com cura → anticura (Lembrete Mortal, Morellonomicon, Espinhos);
  - maioria do dano inimigo AP ou AD → resistência mágica ou armadura;
  - 2 ou mais alvos resistentes → penetração.
  A cura inimiga é detectada pelo conjunto `HEAL`.
- **Oponente de rota:** `setEnemy` passa o adversário direto da rota para `makeBuild`, e esse oponente pesa mais que o resto do time inimigo.
- **Campeão sem entrada** continua usando o analisador por arquétipo (`builds.js`). Foram adicionados os arquétipos `tanque-suporte` e `encantador`, e o conjunto `NO_SUPPORT` impede itens de suporte em quem não é suporte.

## Bug corrigido na loja
`nextPurchase` e `cheapestStep` compravam componentes de itens já possuídos, o que enchia o inventário (apareceu como Safira sobrando na build da Annie). Agora `cheapestStep.walk` não desce em componentes já possuídos e `nextPurchase` devolve `null` quando todos os componentes diretos já estão no inventário.

## Botas (patch 16.22.1)
3170 Marcha Célere, 3171 Lucidez Escarlate, 3173 Esmagadores Acorrentados, 3174 Mobilização Blindada, 3175 Sapatos Enfeitiçados.

## Testes
`ferramentas/testes/engine_itens.js` cobre as builds curadas: ids válidos, build de 6 itens completa, adaptação e a compra da Annie.

## Mapa 3D de referência
A pasta `for-study-only-summoner-rift-3d-export` está marcada como "somente estudo". Foi usada só como referência de layout; nada dela foi copiado, embutido ou distribuído no projeto.

## Pendências
- Trocar as builds estimadas por estatística real do patch quando houver fonte permitida.
- Ajustar o conjunto `HEAL` e a tabela `SIT` conforme o meta.
