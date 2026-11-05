const fs=require('fs'),vm=require('vm');
function load(file){
  const html=fs.readFileSync(file,'utf8');
  const a=html.indexOf('<script>')+8,b=html.lastIndexOf('</script>');
  const noop=()=>{};
  const el=()=>({style:{},classList:{toggle:noop,add:noop,remove:noop},setAttribute:noop,getAttribute:()=>'',appendChild:noop,insertAdjacentHTML:noop,addEventListener:noop,querySelector:()=>null,querySelectorAll:()=>[],remove:noop,innerHTML:'',textContent:''});
  const doc={getElementById:()=>null,querySelector:()=>el(),querySelectorAll:()=>[],addEventListener:noop,body:el(),documentElement:el(),createElement:el,title:''};
  const store={};
  const ls={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
  const win={scrollTo:noop,addEventListener:noop,localStorage:ls,matchMedia:()=>({matches:false,addEventListener:noop}),location:{hash:'',search:''},innerWidth:1000};
  let seed=(+process.env.SEED||12345)>>>0;const rnd=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};const M2=Object.create(Math);M2.random=rnd;
  const ctx=vm.createContext(Object.assign({clearTimeout:noop,document:doc,localStorage:ls,console,Math:M2,Date,JSON,navigator:{userAgent:'node'},performance:{now:()=>Date.now()},URL:{createObjectURL:noop}},win));
  ctx.window=ctx;ctx.__setSeed=v=>{seed=v>>>0};
  vm.runInContext(html.slice(a,b),ctx,{filename:file});
  return ctx;
}
module.exports={load,run:(ctx,c)=>vm.runInContext(c,ctx)};
