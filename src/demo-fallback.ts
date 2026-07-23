// ⚠️ DEMO ONLY — TEMPORARY. This does not belong in the engine long-term; it lives here for now so
// the demo apps stay uncluttered, and will be removed. The demo's mock BFF only runs on localhost,
// so a device/simulator without it reachable would render nothing; `withOfflineFallback` wraps a
// resolver to serve this bundled data when a fetch fails. A real app has no such fallback (the BFF
// is reachable, or it shows an error/retry).

import type { MarketApp } from "./types.js";
import type { BindingResolver } from "./resolve.js";

const FALLBACK = {
  offers: {
    uk: {
      currency: "GBP",
      campaigns: [
        { id: "house", imageUrl: "http://localhost:4000/assets/Hero.webp", tagKey: "hero.tag", headingKey: "hero.heading", ctaLabelKey: "offerGrid.cta", ctaPath: "/draws" },
        { id: "monthly", imageUrl: "http://localhost:4000/assets/MonthlyMillionaire.webp", tagKey: "hero.tag", headingKey: "campaign.monthly.heading", ctaLabelKey: "offerGrid.cta", ctaPath: "/draws" },
      ],
      offers: [
        { id: "uk-1", entries: 15, price: 1000, wasPrice: 2000, ribbon: "offerGrid.ribbon.twoForOne", checkoutUrl: "https://omaze.co.uk/cart/uk-1" },
        { id: "uk-2", entries: 40, price: 2500, wasPrice: null, ribbon: "offerGrid.ribbon.mostPopular", checkoutUrl: "https://omaze.co.uk/cart/uk-2" },
        { id: "uk-3", entries: 85, price: 5000, wasPrice: null, ribbon: "offerGrid.ribbon.bestValue", checkoutUrl: "https://omaze.co.uk/cart/uk-3" },
      ],
    },
    de: {
      currency: "EUR",
      campaigns: [
        { id: "house", imageUrl: "http://localhost:4000/assets/Frankfurt.webp", tagKey: "hero.tag", headingKey: "hero.heading", ctaLabelKey: "offerGrid.cta", ctaPath: "/draws" },
      ],
      offers: [
        { id: "de-1", entries: 15, price: 1200, wasPrice: 2400, ribbon: "offerGrid.ribbon.twoForOne", checkoutUrl: "https://omaze.de/cart/de-1" },
        { id: "de-2", entries: 40, price: 3000, wasPrice: null, ribbon: "offerGrid.ribbon.mostPopular", checkoutUrl: "https://omaze.de/cart/de-2" },
        { id: "de-3", entries: 85, price: 6000, wasPrice: null, ribbon: "offerGrid.ribbon.bestValue", checkoutUrl: "https://omaze.de/cart/de-3" },
      ],
    },
  } as Record<string, { currency: string; campaigns?: unknown[]; offers: unknown[] }>,
  content: {
    uk: { offersFaq: [
      { q: "How do I enter?", a: "Pick an entry bundle, or enter free by post." },
      { q: "When is the draw?", a: "Draws run every weekend and UK bank-holiday Mondays." },
    ] },
    de: { offersFaq: [
      { q: "Wie nehme ich teil?", a: "Wähle ein Los-Paket. Eine Identitätsprüfung ist erforderlich." },
      { q: "Wann findet die Verlosung statt?", a: "Verlosungen finden jedes Wochenende statt." },
    ] },
  } as Record<string, Record<string, unknown>>,
  translations: {
    uk: {
      "hero.tag": "London", "hero.heading": "Win this £4,000,000 house",
      "hero.headingSub": "in Bath", "hero.cta": "Enter now",
      "hero.subheading": "Plus £250,000 in cash. Enter our live draws now.",
      "nav.offers": "See the offers", "nav.draws": "Enter the draw", "nav.faq": "FAQs", "nav.entry": "How to enter",
      "footer.legal": "Omaze runs prize draws in partnership with registered charities. 18+.",
      "charityAd.heading": "Every entry supports good causes",
      "charityAd.body": "A share of every entry goes to our charity partners.",
      "offerGrid.heading": "Choose your entries", "offerGrid.cta": "Enter now", "offerGrid.entries": "{count} entries",
      "offerGrid.ribbon.twoForOne": "2 for 1", "offerGrid.ribbon.mostPopular": "Most popular", "offerGrid.ribbon.bestValue": "Best value",
      "faq.heading": "FAQs", "faq.rulesLink": "Read the house draw experience rules",
      "draws.title": "Enter the draw", "draws.select.prompt": "Choose your entry",
      "draws.option.single": "Single entry — £10", "draws.option.bundle": "Bundle — 40 entries for £25",
      "draws.cta.continue": "Continue", "draws.confirm.title": "Confirm your entry",
      "draws.confirm.lead": "You're about to enter with:", "draws.cta.confirm": "Confirm entry", "draws.cta.back": "Back",
      "draws.success.title": "You're in!", "draws.success.body": "Good luck — winners are drawn this weekend.", "draws.cta.restart": "Enter again",
      "terms.title": "Terms & Conditions", "terms.general": "Entries are subject to our standard terms. 18+.",
      "terms.rules.title": "House draw experience rules",
      "terms.rules.item1": "The prize is the house as described; no cash alternative unless stated.",
      "terms.rules.item2": "Winners must complete identity checks before the prize is released.",
      "openEntry.heading": "Free postal entry", "openEntry.badge": "No purchase necessary",
      "openEntry.body": "You can enter for free by post — no purchase required. Send your details to:",
      "openEntry.postalAddress": "Omaze, PO Box 1234, London, EC1A 1AA",
      "campaign.monthly.heading": "Win £1,000,000",
    },
    de: {
      "hero.tag": "Bayern", "hero.heading": "Gewinne dieses Haus im Wert von 4.000.000 €",
      "hero.headingSub": "in Bayern", "hero.cta": "Jetzt mitmachen",
      "hero.subheading": "Plus 250.000 € in bar. Jetzt an unseren Verlosungen teilnehmen.",
      "nav.offers": "Angebote ansehen", "nav.draws": "Zur Verlosung", "nav.faq": "Häufige Fragen", "nav.entry": "Teilnahme",
      "footer.legal": "Omaze führt Verlosungen mit eingetragenen Wohltätigkeitsorganisationen durch. Ab 18.",
      "charityAd.heading": "Jede Teilnahme unterstützt den guten Zweck",
      "charityAd.body": "Ein Teil jeder Teilnahme geht an unsere Wohltätigkeitspartner.",
      "offerGrid.heading": "Wähle deine Lose", "offerGrid.cta": "Jetzt teilnehmen", "offerGrid.entries": "{count} Lose",
      "offerGrid.ribbon.twoForOne": "2 für 1", "offerGrid.ribbon.mostPopular": "Beliebteste", "offerGrid.ribbon.bestValue": "Bester Wert",
      "faq.heading": "Häufige Fragen", "faq.rulesLink": "Regeln zum Hausverlosungs-Erlebnis lesen",
      "draws.title": "An der Verlosung teilnehmen", "draws.select.prompt": "Wähle dein Los",
      "draws.option.single": "Einzellos — 12 €", "draws.option.bundle": "Paket — 40 Lose für 30 €",
      "draws.cta.continue": "Weiter", "draws.confirm.title": "Teilnahme bestätigen",
      "draws.confirm.lead": "Du nimmst teil mit:", "draws.cta.confirm": "Teilnahme bestätigen", "draws.cta.back": "Zurück",
      "draws.success.title": "Du bist dabei!", "draws.success.body": "Viel Glück — die Gewinner werden dieses Wochenende gezogen.", "draws.cta.restart": "Erneut teilnehmen",
      "terms.title": "Allgemeine Geschäftsbedingungen", "terms.general": "Die Teilnahme unterliegt unseren AGB. Ab 18 Jahren.",
      "terms.rules.title": "Regeln zum Hausverlosungs-Erlebnis",
      "terms.rules.item1": "Der Preis ist das beschriebene Haus; keine Baralternative, sofern nicht anders angegeben.",
      "terms.rules.item2": "Gewinner müssen vor der Übergabe eine Identitätsprüfung abschließen.",
      "verifiedEntry.heading": "Identitätsprüfung erforderlich", "verifiedEntry.badge": "Verifizierung erforderlich",
      "verifiedEntry.body": "Zur Teilnahme ist eine Identitätsprüfung gesetzlich vorgeschrieben. Verfahren: {provider}.",
      "verifiedEntry.cta": "Identifizierung starten",
      "verifiedEntry.provider.schufa": "SCHUFA-Identitätsprüfung", "verifiedEntry.provider.postident": "PostIdent-Verfahren",
    },
  } as Record<string, Record<string, string>>,
};

function fallbackFor(binding: { $bind: string; key?: string }, app: MarketApp): unknown {
  switch (binding.$bind) {
    case "bff":
      return FALLBACK.offers[app.market.id] ?? null;
    case "sanity":
      return FALLBACK.content[app.market.id]?.[binding.key ?? ""] ?? null;
    case "translations":
      return FALLBACK.translations[app.market.id] ?? {};
    default:
      return null;
  }
}

/** Wrap a resolver so a failed fetch returns bundled offline data (uses ctx.app). DEMO ONLY. */
export function withOfflineFallback(resolve: BindingResolver): BindingResolver {
  return async (binding, ctx) => {
    try {
      return await resolve(binding, ctx);
    } catch {
      return fallbackFor(binding, ctx.app);
    }
  };
}
