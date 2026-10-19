// Wikipedia — explicación breve de un tema, en el idioma elegido (es, en, fr, de). Gratuita y sin llave.
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

async function oneLang(query, lang, signal, limit) {
  const p = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: query, gsrlimit: String(limit),
    prop: 'extracts|pageimages|info', exintro: '1', explaintext: '1', exsentences: '3',
    piprop: 'thumbnail', pithumbsize: '160', inprop: 'url', format: 'json', origin: '*',
  });
  const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${p}`, { signal });
  if (!res.ok) throw new Error(`Wikipedia (${lang}) respondió ${res.status}.`);
  const pages = Object.values((await res.json()).query?.pages || {}).sort((a, b) => a.index - b.index);
  return pages
    .filter((pg) => clean(pg.extract).length > 40)
    .map((pg) => ({
      id: `${lang}-${pg.pageid}`,
      lang,
      title: pg.title,
      extract: clean(pg.extract),
      thumb: pg.thumbnail?.source || null,
      url: pg.fullurl,
    }));
}

// Una consulta por idioma; los resultados se intercalan para que ninguno domine
export async function searchWikipedia(query, { signal, langs = ['es'] } = {}) {
  const per = langs.length > 1 ? 3 : 6;
  const settled = await Promise.allSettled(langs.map((l) => oneLang(query, l, signal, per)));
  if (settled.every((r) => r.status === 'rejected')) throw new Error('Wikipedia no respondió.');
  const lists = settled.map((r) => (r.status === 'fulfilled' ? r.value : []));
  const out = [];
  for (let i = 0; i < per; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}
