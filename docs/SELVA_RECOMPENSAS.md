# Recompensas da selva por acampamento

Implementado em `src/engine/jungle/objectives.js` (tabelas `CAMP_REWARD`, `CAMP_TREE`, `JUNGLE_RULE`) e `src/engine/economy/economy.js` (`laneMul`).

## Regras
- **CS:** limpar um acampamento inteiro soma exatamente **4 CS** (e 4 de CS de selva) ao jogador que dá o último golpe, não importa quantos monstros morram (Gromp = 4, Acuâminas com 6 monstros = 4). Épicos seguem como antes (1 por morte).
- **Valores base (nível 1), do acampamento inteiro** (ouro | XP), repartidos entre os monstros pelo peso do registro do cliente (inclui as divisões dos Krugs):

| Campo | Ouro | XP |
|---|---|---|
| Gromp | 80 | 135 |
| Krugs | 80 | 135 |
| Lobos | 85 | 95 |
| Acuâminas | 85 | 95 |
| Azul / Vermelho | 90 | 100 cada |
| Aratu | 55 | 115 |

- **Escala:** usa a média de nível dos campeões no momento do abate (no mínimo o nível do monstro ao nascer): ouro até +20% e XP até +50% no nível 18. **ESTIMADO**, sem fonte.
- **Item de caçador:** quem tem o item de selva (Golpear) ganha **+15% de XP** nos monstros grandes (azul, vermelho, Gromp, lobo grande, Acuâminas grande, Krug grande, Aratu). **ESTIMADO**.
- **Penalidade de rota:** o caçador que abate minions antes de completar o item de selva (35 acúmulos, ganhos por monstro e por abate de campeão) recebe **50% do ouro e do XP** dos minions. **ESTIMADO**.

Os valores da tabela vêm da especificação do projeto; o que está marcado ESTIMADO não tem fonte externa. Testes: `ferramentas/testes/engine_selva.js`.
