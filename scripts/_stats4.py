import json
txt=open('/tmp/online24taas-work/migration/intermediate/wp_posts.json').read()
dec=json.JSONDecoder()
obj,end=dec.raw_decode(txt)
from collections import Counter
c=Counter(p.get('post_status') for p in obj if isinstance(p,dict) and p.get('post_type')=='post')
print('post type counts by status:', dict(c))
print('total post-type rows:', sum(c.values()))
