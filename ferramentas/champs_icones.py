"""Baixa os ícones oficiais (Data Dragon da Riot) dos campeões que ainda não têm imagem em champs/ e
atualiza a lista CHFILES dentro do index.html. Uso: python ferramentas/champs_icones.py [--refazer: baixa todos de novo]
Fonte única da lista: o próprio index.html (const CHMAP = nome no jogo -> id no Data Dragon)."""
import json, os, re, sys, urllib.request, io
from PIL import Image
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(RAIZ, 'index.html')
PASTA = os.path.join(RAIZ, 'champs')
html = open(HTML, encoding='utf-8').read()
m = re.search(r"const CHMAP=(\{.*?\});", html, re.S)
mapa = json.loads(m.group(1))
ver = json.load(urllib.request.urlopen('https://ddragon.leagueoflegends.com/api/versions.json'))[0]
existentes = {os.path.splitext(f)[0].lower(): f for f in os.listdir(PASTA) if f.lower().endswith(('.webp', '.jpg', '.png', '.jpeg'))}
novos = 0
for nome, dd in mapa.items():
    chave = nome.lower()
    if chave in existentes and '--refazer' not in sys.argv:
        continue
    if chave in existentes and existentes[chave] != chave + '.webp':
        os.remove(os.path.join(PASTA, existentes[chave]))
    url = f'https://ddragon.leagueoflegends.com/cdn/{ver}/img/champion/{dd}.png'
    im = Image.open(io.BytesIO(urllib.request.urlopen(url).read())).convert('RGB')
    im.save(os.path.join(PASTA, chave + '.webp'), 'WEBP', quality=88)
    existentes[chave] = chave + '.webp'
    novos += 1
arquivos = {n: existentes[n.lower()] for n in mapa if n.lower() in existentes}
bloco = 'const CHFILES=' + json.dumps(arquivos, ensure_ascii=False, separators=(',', ':')) + ';'
html = re.sub(r"const CHFILES=\{.*?\};", lambda _: bloco, html, count=1, flags=re.S)
open(HTML, 'w', encoding='utf-8').write(html)
print(f'versão {ver}: {novos} ícones novos, {len(arquivos)} no total')
