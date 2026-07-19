# Smart Novel Bank — Next.js (SEO Edition)

Aapke Blogger widget ka SEO-ready Next.js version. Har novel ka apna
crawlable page hai (`/novel/[id]-slug`), automatic sitemap (100k+ URLs
handle karta hai), aur JSON-LD structured data.

## 1. Supabase mein zaroori cheez

Aapki `urdu_novels` table mein ek numeric primary key `id` column zaroor
hona chahiye (Supabase default `id bigserial primary key` hi hoti hai,
to shayad already hai). Confirm kar lein Table Editor mein.

## 2. Local setup

```bash
npm install
cp .env.example .env.local
# .env.local mein apni Supabase URL, anon key, aur final domain daalein
npm run dev
```

`http://localhost:3000` par khol kar check karein.

## 3. GitHub par push karein

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smart-novel-bank.git
git push -u origin main
```

## 4. Vercel par deploy

1. https://vercel.com par login karein (GitHub se)
2. "Add New Project" → apna GitHub repo select karein
3. Environment Variables mein ye 3 add karein (same jo `.env.local` mein hain):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (apna final domain, e.g. `https://www.yourdomain.com`)
4. Deploy dabayein.

## 5. Custom domain

Vercel Project → Settings → Domains → apna domain add karein, aur
apne domain registrar (GoDaddy/Namecheap/etc) mein Vercel ke diye hue
DNS records (A/CNAME) daal dein.

## 6. Google Search Console

1. https://search.google.com/search-console par apna domain verify karein
2. Sitemaps section mein `sitemap.xml` submit karein
   (URL hoga: `https://www.yourdomain.com/sitemap.xml`)
3. Google 100k+ URLs ko crawl/index karne mein kuch hafte le sakta hai —
   ye normal hai. "URL Inspection" tool se manually bhi kuch important
   novel pages ko "Request Indexing" kar sakte hain.

## SEO checklist jo already handle hai

- [x] Har novel ka apna static/ISR page (`/novel/[id]-slug`)
- [x] Per-page `<title>`, meta description, canonical URL
- [x] JSON-LD `Book` structured data
- [x] Auto-generated `sitemap.xml` (100k+ URLs ke liye multi-file)
- [x] `robots.txt` jo `/search` ko crawl se exclude karta hai (duplicate
      content avoid karne ke liye) lekin novel pages ko allow karta hai
- [x] Homepage aur novel pages server-rendered hain (JS ke bina bhi
      Google ko poora content milta hai)

## Aage ka improvement (optional)

- Har novel ka cover image field add karein Supabase mein → OG image
  aur visual appeal ke liye
- Novel ke andar "category/genre" column add karein → topic pages
  banane ke liye (e.g. `/genre/romantic`)
- Blogger se is naye domain par 301 redirect set karein taake purana
  SEO juice transfer ho
