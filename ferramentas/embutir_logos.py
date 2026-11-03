"""Embute logos/*.webp no index.html (bloco <style id="logos"> e lista LOGOS).
Uso: python ferramentas/embutir_logos.py  (na raiz do repositório)
O nome do arquivo é o slug do time: nome em minúsculas, sem acento, com hífens."""
import base64,os,re
os.chdir(os.path.dirname(os.path.abspath(__file__))+'/..')
s=open('index.html',encoding='utf-8').read()
names=sorted(f[:-5] for f in os.listdir('logos') if f.endswith('.webp'))
css='\n'.join(f'.lg-{n}::before{{background-image:url(data:image/webp;base64,{base64.b64encode(open("logos/"+n+".webp","rb").read()).decode()})}}' for n in names)
s,k1=re.subn(r'(<style id="logos">\n/\*[^\n]*\*/\n)[\s\S]*?(\n</style>)',lambda m:m.group(1)+css+m.group(2),s,count=1)
s,k2=re.subn(r'const LOGOS=new Set\(\[[^\]]*\]\);',lambda m:'const LOGOS=new Set(['+','.join(f"'{n}'" for n in names)+']);',s,count=1)
assert k1==k2==1
open('index.html','w',encoding='utf-8',newline='').write(s)
print(len(names),'logos,',len(s)//1024,'KB')
