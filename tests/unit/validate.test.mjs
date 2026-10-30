import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDocuments } from '../../migration/lib/validate.mjs';

const ref = (id) => ({ _type: 'reference', _ref: id });
const good = () => [
  { _id: 'author-1', _type: 'author', name: 'admin', slug: { _type: 'slug', current: 'admin' }, wpUserId: 1 },
  { _id: 'category-5', _type: 'category', title: 'आरोग्य', slug: { _type: 'slug', current: 'आरोग्य' }, wpTermId: 5 },
  {
    _id: 'post-10', _type: 'post', title: 'शीर्षक', slug: { _type: 'slug', current: 'शीर्षक' }, publishedAt: '2022-09-18T03:32:05Z', wpPostId: 10,
    author: ref('author-1'), categories: [{ _key: 'c0', ...ref('category-5') }],
    featuredImage: { _type: 'image', asset: ref('image-abc-1x1-jpg') },
    body: [{ _type: 'block', _key: 'b0', style: 'normal', markDefs: [{ _key: 'b0m0', _type: 'link', href: '/x' }], children: [{ _type: 'span', _key: 'b0s0', text: 'मजकूर', marks: ['strong', 'b0m0'] }] }],
  },
];
const known = new Set(['image-abc-1x1-jpg']);
const check = (docs) => validateDocuments(docs, { knownRefTargets: known });

test('a correct bundle has no errors', () => assert.deepEqual(check(good()), []));

const mutations = {
  'percent-encoded slug': (d) => (d[2].slug.current = '%e0%a4%ae'),
  'duplicate _id': (d) => d.push({ ...d[1] }),
  'id does not match pattern': (d) => (d[1]._id = 'cat-5'),
  'dangling strong reference': (d) => (d[2].author = ref('author-99')),
  'asset missing from known targets': (d) => (d[2].featuredImage.asset = ref('image-zzz-1x1-jpg')),
  'unknown mark': (d) => (d[2].body[0].children[0].marks = ['nonsense']),
  'unknown style': (d) => (d[2].body[0].style = 'h9'),
  'block without children': (d) => (d[2].body[0].children = []),
  'bad date': (d) => (d[2].publishedAt = '18/09/2022'),
  'mojibake text': (d) => (d[2].title = 'à¤®à¤°à¤¾à¤ à¥€'),
  'html in title': (d) => (d[2].title = 'a<br>b'),
  'javascript link': (d) => (d[2].body[0].markDefs[0].href = 'javascript:alert(1)'),
  'image block without asset': (d) => d[2].body.push({ _type: 'image', _key: 'b1' }),
  'missing wpPostId': (d) => delete d[2].wpPostId,
  'duplicate slug': (d) => d.push({ ...d[2], _id: 'post-11', wpPostId: 11 }),
  'duplicate _key': (d) => d[2].body.push({ ...d[2].body[0] }),
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`validator rejects: ${name}`, () => {
    const docs = structuredClone(good());
    mutate(docs);
    assert.ok(check(docs).length > 0, 'expected at least one validation error');
  });
}

test('a draft may lack a title but a published doc may not', () => {
  const d = structuredClone(good());
  delete d[2].title;
  assert.ok(check(d).length > 0);
  d[2]._id = 'drafts.post-10';
  assert.deepEqual(check(d), []);
});
