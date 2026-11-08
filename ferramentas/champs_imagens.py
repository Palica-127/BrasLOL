"""Baixa imagens oficiais (Data Dragon da Riot) usadas no draft, na tela de carregamento e no painel ao vivo:
  champs/arte/<IdDataDragon>.webp  arte de carregamento (vertical) de todos os campeões de data/<patch>/champions.json
  champs/item/<id>.webp            ícone de item (ids em ferramentas/itens_usados.json, gerado por gerar_builds.js, + sentinelas)
  champs/spell/<Chave>.webp        feitiços de invocador
Só baixa o que falta. Uso: python ferramentas/champs_imagens.py"""
import json, os, io, urllib.request
from PIL import Image
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ver = '16.22.1'
campeoes = json.load(open(os.path.join(RAIZ, 'data', ver, 'champions.json'), encoding='utf-8'))
itens = json.load(open(os.path.join(RAIZ, 'ferramentas', 'itens_usados.json')))
itens = sorted(set(itens) | {3340, 3363, 3364, 2055})
feit = ['SummonerFlash', 'SummonerDot', 'SummonerSmite', 'SummonerTeleport', 'SummonerHeal', 'SummonerBarrier', 'SummonerExhaust', 'SummonerHaste', 'SummonerBoost']
def baixa(url, destino, tam=None, q=82):
    if os.path.exists(destino): return 0
    try:
        im = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=30).read())).convert('RGB')
    except Exception as e:
        print('falhou', url, e); return 0
    if tam: im.thumbnail(tam)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    im.save(destino, 'WEBP', quality=q); return 1
n = 0
for c in campeoes:
    n += baixa(f'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/{c["id"]}_0.jpg', os.path.join(RAIZ, 'champs', 'arte', c['id'] + '.webp'), (240, 436), 80)
for i in itens:
    n += baixa(f'https://ddragon.leagueoflegends.com/cdn/{ver}/img/item/{i}.png', os.path.join(RAIZ, 'champs', 'item', f'{i}.webp'), (48, 48), 85)
for f in feit:
    n += baixa(f'https://ddragon.leagueoflegends.com/cdn/{ver}/img/spell/{f}.png', os.path.join(RAIZ, 'champs', 'spell', f + '.webp'), (48, 48), 85)
print('novos arquivos:', n)
