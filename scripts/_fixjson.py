import json
txt=open('/tmp/online24taas-work/migration/intermediate/wp_posts.json').read()
dec=json.JSONDecoder()
obj,end=dec.raw_decode(txt)
json.dump(obj, open('/tmp/online24taas-work/migration/intermediate/wp_posts.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
print('rewrote', len(obj))
