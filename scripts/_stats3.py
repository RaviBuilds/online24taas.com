import json
txt=open('/tmp/online24taas-work/migration/intermediate/wp_posts.json').read()
dec=json.JSONDecoder()
obj,end=dec.raw_decode(txt)
for p in obj:
    if isinstance(p,dict) and p.get('ID')==10:
        print('FOUND 10:', p['post_title'][:60], '|', p['post_status'], p['post_type'])
        break
else:
    print('not found 10')
# count publish posts
pub=[p for p in obj if isinstance(p,dict) and p.get('post_status')=='publish' and p.get('post_type')=='post']
print('publish posts:', len(pub))
