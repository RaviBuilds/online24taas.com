import { Icon } from './Icon';

/** Plain GET form to /search. Works without JavaScript. */
export function SearchForm({ defaultValue = '', id = 'page-search', className = '' }: { defaultValue?: string; id?: string; className?: string }) {
  return (
    <form action="/search" role="search" className={`flex gap-2 ${className}`}>
      <label htmlFor={id} className="sr-only">शोध शब्द</label>
      <input id={id} name="q" type="search" enterKeyHint="search" required defaultValue={defaultValue} placeholder="बातम्या, विषय शोधा" className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-[1.0625rem] focus:border-brand focus:outline-none" />
      <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-5 font-bold text-white transition-colors hover:bg-brand-dark">
        <Icon name="search" className="size-5" /> <span className="max-sm:sr-only">शोधा</span>
      </button>
    </form>
  );
}
