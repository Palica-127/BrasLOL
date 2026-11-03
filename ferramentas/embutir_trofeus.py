# Embute trofeus/*.png (fundo transparente) como CSS .ti-<nome> dentro do index.html
import base64,io,re,glob,os
from PIL import Image
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css='/*TROF*/.ti{display:block;width:44px;height:60px;background:center/contain no-repeat}'
for f in sorted(glob.glob(root+'/trofeus/*.png')):
    n=os.path.basename(f)[:-4];im=Image.open(f);im.thumbnail((120,170))
    b=io.BytesIO();im.save(b,'WEBP',quality=88,method=6)
    css+='.ti-%s{background-image:url(data:image/webp;base64,%s)}'%(n,base64.b64encode(b.getvalue()).decode())
css+='/*FIM-TROF*/'
p=root+'/index.html';s=open(p,encoding='utf-8').read()
if '/*TROF*/' in s: s=re.sub(r'/\*TROF\*/.*?/\*FIM-TROF\*/',lambda m:css,s,flags=re.S)
else:
    i=s.index('</style>',s.index('</style>')+8);s=s[:i]+css+'\n'+s[i:]
open(p,'w',encoding='utf-8').write(s)
