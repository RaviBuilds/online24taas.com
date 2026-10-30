export function ShareButtons({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold">शेअर करा:</span>
      {links.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className="border border-neutral-300 px-3 py-1 hover:border-primary hover:text-primary">{l.name}</a>
      ))}
    </div>
  );
}
