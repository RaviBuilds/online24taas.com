import json, urllib.parse, os
base='/tmp/online24taas-work/migration'
posts=json.load(open(base+'/intermediate/wp_posts.json'))
terms=json.load(open(base+'/normalized/terms.json'))
users=json.load(open(base+'/normalized/users.json'))
term_by_id={}
for t in terms: term_by_id[t['wpTermId']]=t

def dec(s):
    try: return urllib.parse.unquote(s) if isinstance(s,str) and '%' in s else s
    except: return s

empty=[]
for p in posts:
    if p['post_type']!='post' or p['post_status']!='publish': continue
    content=(p['post_content'] or '').strip()
    if content: continue
    # categories/tags already in p
    cats=[{'wpTermId':c['wpTermId'],'title':c['title'],'slug':dec(c['slug'])} for c in p.get('categories',[])]
    tags=[{'wpTermId':t['wpTermId'],'title':t['title'],'slug':dec(t['slug'])} for t in p.get('tags',[])]
    other = p['post_excerpt'] or ''
    has_title = bool((p['post_title'] or '').strip())
    has_excerpt = bool(other.strip())
    has_thumb = p['featuredImageId'] is not None
    if has_thumb and (has_title or has_excerpt):
        cls='image-led-pending-review'
    elif not has_thumb:
        cls='potentially-incomplete'
    else:
        cls='unresolved'
    empty.append({
        'wpPostId': p['ID'],
        'title': p['post_title'],
        'slug': dec(p['post_name']),
        'sourceSlug': p['post_name'],
        'publishedAt': p['post_date'],
        'excerpt': p['post_excerpt'],
        'featuredImageId': p['featuredImageId'],
        'featuredImagePath': p['featuredImagePath'],
        'categories': cats,
        'tags': tags,
        'metas': p.get('metas',[]),
        'hasTitle': has_title,
        'hasExcerpt': has_excerpt,
        'hasFeaturedImage': has_thumb,
        'classification': cls,
        'evidence': 'empty post_content; featuredImage=' + str(has_thumb) + '; title=' + str(has_title) + '; excerpt=' + str(has_excerpt),
    })

out='/home/ravi/Projects/freelancing/online24taas-web'
json.dump(empty, open(out+'/EMPTY_BODY_POSTS.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
# csv
import csv
with open(out+'/EMPTY_BODY_POSTS.csv','w',newline='',encoding='utf-8') as f:
    w=csv.writer(f)
    w.writerow(['wpPostId','title','slug','publishedAt','excerpt','featuredImageId','featuredImagePath','categories','tags','classification'])
    for e in empty:
        w.writerow([e['wpPostId'],e['title'],e['slug'],e['publishedAt'],e['excerpt'],e['featuredImageId'],e['featuredImagePath'], '|'.join(c['title'] for c in e['categories']), '|'.join(t['title'] for t in e['tags']), e['classification']])
# md summary
from collections import Counter
c=Counter(e['classification'] for e in empty)
lines=['# Empty-body post inventory','']
lines.append(f'Total published posts analyzed: {len([p for p in posts if p["post_type"]=="post" and p["post_status"]=="publish"])}')
lines.append(f'Empty-body posts: {len(empty)}')
lines.append('')
lines.append('## Classification counts')
for k,v in c.items(): lines.append(f'- {k}: {v}')
lines.append('')
lines.append('## Sample (first 20)')
for e in empty[:20]:
    lines.append(f"- {e['wpPostId']}: {e['title'][:60]} | {e['classification']} | thumb={e['featuredImageId']}")
open(out+'/EMPTY_BODY_POSTS.md','w',encoding='utf-8').write('\n'.join(lines))
print('empty count', len(empty))
print(c)
