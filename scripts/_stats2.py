import json
txt=open('/tmp/online24taas-work/migration/intermediate/wp_posts.json').read()
dec=json.JSONDecoder()
obj,end=dec.raw_decode(txt)
print('parsed posts:',len(obj))
from collections import Counter
print(Counter((p['post_type'],p['post_status']) for p in obj))
