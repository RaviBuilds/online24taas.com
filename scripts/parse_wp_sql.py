import json, os, sys

sql_path = sys.argv[1] if len(sys.argv)>1 else '/home/ravi/Projects/freelancing/online24taas/APP-DATA.SQL'
out_dir = sys.argv[2] if len(sys.argv)>2 else '/tmp/online24taas-work/migration'

with open(sql_path, encoding='utf-8') as f:
    sql = f.read()

def find_inserts(table):
    marker = 'INSERT INTO `%s`' % table
    out=[]; pos=0
    while True:
        idx = sql.find(marker, pos)
        if idx < 0: break
        vidx = sql.find('VALUES', idx)
        if vidx < 0: break
        i = vidx + 6
        in_str=False
        while i < len(sql):
            c = sql[i]
            if in_str:
                if c == '\\':
                    i += 2; continue
                if c == "'":
                    in_str = False
            else:
                if c == "'":
                    in_str = True
                elif c == ';':
                    break
            i += 1
        out.append(sql[vidx+6:i])
        pos = i + 1
    return out

def parse_fields(s):
    fields=[]; i=0; n=len(s)
    while i < n:
        while i < n and s[i] in ' \t\n\r': i += 1
        if i >= n: break
        if s[i] == "'":
            i += 1; buf=[]
            while i < n:
                c = s[i]
                if c == '\\':
                    if i+1 < n:
                        nxt = s[i+1]
                        mp = {'n':'\n','r':'\r','t':'\t','0':'\x00','Z':'\x1a','b':'\b','\\':'\\',"'":"'",'"':'"','%':'%','_':'_'}
                        buf.append(mp.get(nxt, nxt)); i += 2; continue
                    i += 1; continue
                if c == "'":
                    if i+1 < n and s[i+1] == "'":
                        buf.append("'"); i += 2; continue
                    i += 1; break
                buf.append(c); i += 1
            fields.append(''.join(buf))
        elif s[i:i+4] == 'NULL':
            fields.append(None); i += 4
        else:
            j = i
            while j < n and s[j] != ',': j += 1
            token = s[i:j].strip()
            try:
                if '.' in token: fields.append(float(token))
                else: fields.append(int(token))
            except Exception:
                fields.append(token)
            i = j
        while i < n and s[i] in ' \t\n\r': i += 1
        if i < n and s[i] == ',':
            i += 1; continue
        break
    return fields

def split_tuples(chunk):
    res=[]; i=0; n=len(chunk)
    while i < n:
        while i < n and chunk[i] in ' \t\n\r,': i += 1
        if i >= n: break
        if chunk[i] != '(':
            i += 1; continue
        i += 1
        depth=0; buf=[]; in_str=False
        while i < n:
            c = chunk[i]
            if in_str:
                buf.append(c)
                if c == '\\':
                    if i+1 < n: buf.append(chunk[i+1]); i += 2; continue
                elif c == "'":
                    in_str = False
                i += 1; continue
            if c == "'":
                in_str = True; buf.append(c); i += 1; continue
            if c == '(':
                depth += 1; buf.append(c); i += 1; continue
            if c == ')':
                if depth == 0:
                    i += 1; break
                depth -= 1; buf.append(c); i += 1; continue
            buf.append(c); i += 1
        res.append(parse_fields(''.join(buf)))
    return res

POSTCOLS=['ID','post_author','post_date','post_date_gmt','post_content','post_title','post_excerpt','post_status','comment_status','ping_status','post_password','post_name','to_ping','pinged','post_modified','post_modified_gmt','post_content_filtered','post_parent','guid','menu_order','post_type','post_mime_type','comment_count']

posts_raw=[]
for c in find_inserts('wp_posts'): posts_raw += split_tuples(c)
terms_raw=[]
for c in find_inserts('wp_terms'): terms_raw += split_tuples(c)
tax_raw=[]
for c in find_inserts('wp_term_taxonomy'): tax_raw += split_tuples(c)
rels_raw=[]
for c in find_inserts('wp_term_relationships'): rels_raw += split_tuples(c)
users_raw=[]
for c in find_inserts('wp_users'): users_raw += split_tuples(c)
metas_raw=[]
for c in find_inserts('wp_postmeta'): metas_raw += split_tuples(c)
comments_raw=[]
for c in find_inserts('wp_comments'): comments_raw += split_tuples(c)

tax_by_id={}
for t in tax_raw:
    tax_by_id[t[0]]={'term_taxonomy_id':t[0],'term_id':t[1],'taxonomy':t[2],'description':t[3],'parent':t[4],'count':t[5]}
term_by_id={}
for t in terms_raw:
    term_by_id[t[0]]={'term_id':t[0],'name':t[1],'slug':t[2],'term_group':t[3]}
rels_by_obj={}
for r in rels_raw:
    rels_by_obj.setdefault(r[0],[]).append(r[1])

def terms_for_post(pid):
    cats=[]; tags=[]
    for ttid in rels_by_obj.get(pid,[]):
        tx=tax_by_id.get(ttid)
        if not tx: continue
        term=term_by_id.get(tx['term_id'])
        if not term: continue
        item={'wpTermId':term['term_id'],'title':term['name'],'slug':term['slug'],'taxonomy':tx['taxonomy']}
        if tx['taxonomy']=='category': cats.append(item)
        elif tx['taxonomy']=='post_tag': tags.append(item)
    return cats, tags

def metas_for_post(pid):
    return [{'key':m[2],'value':m[3]} for m in metas_raw if m[1]==pid]

def att_path(att_id):
    for p in posts_raw:
        d=dict(zip(POSTCOLS,p))
        if d['ID']==att_id:
            return d['guid']
    return None

import urllib.parse
def decode_once(s):
    if not isinstance(s,str): return s
    if '%' not in s: return s
    try:
        return urllib.parse.unquote(s, encoding='utf-8')
    except Exception:
        raise ValueError('MALFORMED_PERCENT_ENCODING:'+s)

users_norm=[]
for u in users_raw:
    uid=u[0]; nicename=u[3]; display=u[9] if len(u)>9 else None
    name=display or nicename or ('user-%d'%uid)
    slug_src=nicename or ('user-%d'%uid)
    try: slug=decode_once(slug_src)
    except: slug=slug_src
    users_norm.append({'_id':'author-%d'%uid,'wpUserId':uid,'name':name,'slug':slug,'sourceSlug':nicename,'login':u[1],'email':u[4],'registered':u[6]})
users_norm.sort(key=lambda x:x['wpUserId'])

terms_norm=[]
for tx in tax_raw:
    term=term_by_id.get(tx[1])
    if not term: continue
    if tx[2] not in ('category','post_tag'): continue
    taxonomy='category' if tx[2]=='category' else 'tag'
    _id=('category-%d'%term['term_id']) if taxonomy=='category' else ('tag-%d'%term['term_id'])
    src=term['slug']
    try: slug=decode_once(src)
    except: slug=src
    terms_norm.append({'_id':_id,'taxonomy':taxonomy,'wpTermId':term['term_id'],'title':term['name'],'slug':slug,'sourceSlug':src})
terms_norm.sort(key=lambda x:x['wpTermId'])

posts_norm=[]
for p in posts_raw:
    d=dict(zip(POSTCOLS,p))
    cats,tags=terms_for_post(d['ID'])
    pm=metas_for_post(d['ID'])
    thumb=None; thumb_path=None
    tm=[m for m in pm if m['key']=='_thumbnail_id']
    if tm:
        try: thumb=int(tm[0]['value'])
        except: thumb=None
        if thumb is not None: thumb_path=att_path(thumb)
    try: dec_slug=decode_once(d['post_name'])
    except: dec_slug=d['post_name']
    posts_norm.append({
        'ID':d['ID'],'post_author':d['post_author'],'post_date':d['post_date'],'post_date_gmt':d['post_date_gmt'],
        'post_content':d['post_content'],'post_title':d['post_title'],'post_excerpt':d['post_excerpt'],
        'post_status':d['post_status'],'post_name':d['post_name'],'post_modified':d['post_modified'],
        'post_type':d['post_type'],'guid':d['guid'],'post_parent':d['post_parent'],
        'categories':cats,'tags':tags,'metas':pm,
        'featuredImageId':thumb,'featuredImagePath':thumb_path,
        'sourceSlug':d['post_name'],'decodedSlug':dec_slug,
    })
posts_norm.sort(key=lambda x:x['ID'])

os.makedirs(os.path.join(out_dir,'normalized'),exist_ok=True)
os.makedirs(os.path.join(out_dir,'intermediate'),exist_ok=True)
with open(os.path.join(out_dir,'normalized','users.json'),'w',encoding='utf-8') as f: json.dump(users_norm,f,ensure_ascii=False,indent=2); f.write('\n')
with open(os.path.join(out_dir,'normalized','terms.json'),'w',encoding='utf-8') as f: json.dump(terms_norm,f,ensure_ascii=False,indent=2); f.write('\n')
with open(os.path.join(out_dir,'intermediate','wp_posts.json'),'w',encoding='utf-8') as f: json.dump(posts_norm,f,ensure_ascii=False,indent=2); f.write('\n')

pub=[p for p in posts_norm if p['post_status']=='publish' and p['post_type']=='post']
dr=[p for p in posts_norm if p['post_type']=='post' and p['post_status']!='publish']
pages=[p for p in posts_norm if p['post_type']=='page']
stats={'posts':len(posts_norm),'published':len(pub),'drafts':len(dr),'pages':len(pages),'users':len(users_norm),'terms':len(terms_norm),'categories':len([t for t in terms_norm if t['taxonomy']=='category']),'tags':len([t for t in terms_norm if t['taxonomy']=='tag']),'comments':len(comments_raw),'metas':len(metas_raw),'attachments':len([p for p in posts_norm if p['post_type']=='attachment']),'revisions':len([p for p in posts_norm if p['post_type']=='revision'])}
with open(os.path.join(out_dir,'stats.json'),'w',encoding='utf-8') as f: json.dump(stats,f,ensure_ascii=False,indent=2); f.write('\n')
print(json.dumps(stats,ensure_ascii=False))
