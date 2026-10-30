import json
for fn in ['terms.json','users.json']:
    path='/tmp/online24taas-work/migration/normalized/'+fn
    txt=open(path).read()
    dec=json.JSONDecoder()
    obj,end=dec.raw_decode(txt)
    json.dump(obj, open(path,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print(fn, len(obj))
