"""Baixa os ícones oficiais (Data Dragon da Riot) dos itens de itens.js para a pasta itens/ (<id>.webp).
Uso: python ferramentas/itens_icones.py [--refazer: baixa todos de novo]
Tenta o patch de itens.js e, se não existir no Data Dragon, a versão mais recente."""
import json, os, re, sys, urllib.request, urllib.error, io
from PIL import Image
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, 'itens')
os.makedirs(PASTA, exist_ok=True)
txt = open(os.path.join(RAIZ, 'itens.js'), encoding='utf-8').read()
dados = json.loads(re.search(r'var BRASITENS=(\{.*\});?\s*$', txt, re.S).group(1).rstrip(';'))
vers = json.load(urllib.request.urlopen('https://ddragon.leagueoflegends.com/api/versions.json'))
tentar = [v for v in (dados.get('patch'), vers[0]) if v and v in vers] or [vers[0]]
novos = falhas = 0
for it in dados['items']:
    alvo = os.path.join(PASTA, f"{it['id']}.webp")
    if os.path.exists(alvo) and '--refazer' not in sys.argv:
        continue
    for v in tentar:
        try:
            raw = urllib.request.urlopen(f"https://ddragon.leagueoflegends.com/cdn/{v}/img/item/{it['id']}.png").read()
            Image.open(io.BytesIO(raw)).convert('RGB').save(alvo, 'WEBP', quality=88)
            novos += 1
            break
        except urllib.error.HTTPError:
            continue
    else:
        falhas += 1
print(f'versões {tentar}: {novos} ícones novos, {falhas} sem ícone no Data Dragon, {len(os.listdir(PASTA))} na pasta')
