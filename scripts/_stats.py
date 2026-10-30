import json
d=json.load(open('/tmp/online24taas-work/migration/intermediate/wp_posts.json'))
from collections import Counter
print(Counter((p['post_type'],p['post_status']) for p in d))
print('total',len(d))
