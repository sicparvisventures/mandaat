import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "nl" | "fr" | "en";
export const LANGS: Lang[] = ["nl", "fr", "en"];

const nl = {
  "nav.today": "Vandaag",
  "nav.dossiers": "Dossiers",
  "nav.lobby": "Lobby",
  "nav.lobbyLong": "Lobbyradar",
  "nav.follow": "Volg",
  "nav.followLong": "Volglijst",
  "nav.sources": "Bronnen en methode",
  "nav.report": "Meld een fout",
  "nav.theme": "Thema",
  "theme.system": "Systeem",
  "theme.light": "Licht",
  "theme.dark": "Donker",
  "search.placeholder": "Zoek een politicus of lobbyorganisatie",
  "search.label": "Zoeken",
  "search.none": "Niets gevonden voor deze zoekterm.",
  "home.title": "Zij werken voor ons.",
  "home.lede":
    "Elke Europarlementariër heeft een publiek dossier: wie ze ontmoeten, wie hen lobbyt en hoe ze stemmen. Alleen officiële bronnen.",
  "home.yourMeps": "Jouw {n} Belgische Europarlementsleden",
  "home.all": "Alle",
  "home.latest": "Nieuw in de bronnen",
  "home.mostLobbied": "Meest gelobbyd, laatste 12 maanden",
  "home.dataFrom": "Data bijgewerkt op {date}",
  "feed.meeting": "Lobbymeeting",
  "feed.met": "ontmoette",
  "feed.about": "over",
  "dossiers.title": "Dossiers",
  "dossiers.lede": "Alle {n} leden van het Europees Parlement. Filter op land of fractie.",
  "dossiers.country": "Land",
  "dossiers.group": "Fractie",
  "dossiers.allCountries": "Alle landen",
  "dossiers.allGroups": "Alle fracties",
  "dossiers.sort": "Sorteer",
  "dossiers.sortName": "Naam",
  "dossiers.sortMeetings": "Meeste lobbymeetings",
  "dossiers.count": "{n} dossiers",
  "card.kind": "Publiek dossier",
  "card.institution": "Europees Parlement",
  "card.name": "Naam",
  "card.group": "Fractie",
  "card.party": "Nationale partij",
  "card.since": "Lid sinds",
  "card.employer": "Werkgever",
  "card.employerValue": "De burgers",
  "card.salary": "Nettoloon per maand",
  "dossier.back": "Dossiers",
  "dossier.follow": "Volg",
  "dossier.following": "Gevolgd",
  "dossier.meetings12": "lobbymeetings, laatste 12 maanden",
  "dossier.meetingsAll": "lobbymeetings sinds begin mandaat",
  "dossier.attendance": "aanwezig bij hoofdelijke stemmingen",
  "dossier.committees": "commissies",
  "dossier.committee": "commissie",
  "dossier.topOrgs": "Ontmoet het vaakst",
  "dossier.tabMeetings": "Meetings",
  "dossier.tabVotes": "Stemmingen",
  "dossier.tabRoles": "Functies",
  "dossier.tabSources": "Bronnen",
  "dossier.noMeetings":
    "Dit lid heeft geen lobbymeetings gepubliceerd. Leden publiceren meetings zelf, en niet elke ontmoeting valt onder de publicatieplicht.",
  "dossier.howToRead": "Hoe lees je dit",
  "dossier.howToReadText":
    "Lobbymeetings worden door het parlementslid zelf gepubliceerd. Wat niet gepubliceerd is, zie je hier niet. We tonen wat officieel is, zonder oordeel.",
  "dossier.voted": "Stemde",
  "dossier.for": "voor",
  "dossier.against": "tegen",
  "dossier.abstention": "onthouding",
  "dossier.didNotVote": "niet gestemd",
  "dossier.noVotes": "Nog geen stemgegevens voor dit lid.",
  "dossier.declarations": "Belangenverklaringen",
  "dossier.declarationsText":
    "De officiële verklaringen over financiële belangen, nevenfuncties en bezoldigde activiteiten (PDF, Europees Parlement).",
  "dossier.memberships": "Functies en lidmaatschappen",
  "dossier.current": "huidig",
  "dossier.official": "Officiële pagina",
  "dossier.ofVotes": "van {n} stemmingen",
  "dossier.showMore": "Toon meer",
  "dossier.notFound": "Dit dossier bestaat niet (meer). Misschien is het mandaat afgelopen.",
  "lobby.title": "Lobbyradar",
  "lobby.lede": "Organisaties die Europarlementsleden ontmoetten, gerangschikt op aantal gepubliceerde meetings.",
  "lobby.meetings": "meetings",
  "lobby.metBy": "Ontmoette deze politici",
  "lobby.register": "Transparantieregister",
  "lobby.notInRegister": "Geen registernummer vermeld bij deze meetings.",
  "lobby.budget": "lobbykosten per jaar",
  "lobby.persons": "lobbyisten",
  "lobby.accreditations": "toegangsbadges EP",
  "lobby.category": "Categorie",
  "lobby.office": "Hoofdkantoor",
  "lobby.recent": "Recente meetings",
  "lobby.commission": "Ontmoette ook de Europese Commissie, {n} keer",
  "lobby.filterBe": "Alleen meetings met Belgische leden",
  "follow.title": "Volglijst",
  "follow.lede": "Je volglijst staat alleen op dit toestel. Geen account, geen tracking.",
  "follow.empty": "Je volgt nog niemand. Open een dossier en tik op Volg.",
  "follow.browse": "Bekijk de Belgische leden",
  "sources.title": "Bronnen en methode",
  "report.title": "Meld een fout",
  "common.source": "Bron",
  "common.updated": "bijgewerkt",
  "common.loading": "Laden",
  "common.error": "De data kon niet geladen worden. Controleer je verbinding en probeer opnieuw.",
  "common.retry": "Opnieuw proberen",
  "common.offline": "Offline. Je ziet de laatst bewaarde versie.",
  "common.example": "voorbeeld",
  "common.lang": "Taal",
} as const;

export type Key = keyof typeof nl;
type Dict = Record<Key, string>;

const fr: Dict = {
  "nav.today": "Aujourd'hui",
  "nav.dossiers": "Dossiers",
  "nav.lobby": "Lobby",
  "nav.lobbyLong": "Radar du lobby",
  "nav.follow": "Suivis",
  "nav.followLong": "Mes suivis",
  "nav.sources": "Sources et méthode",
  "nav.report": "Signaler une erreur",
  "nav.theme": "Thème",
  "theme.system": "Système",
  "theme.light": "Clair",
  "theme.dark": "Sombre",
  "search.placeholder": "Chercher un élu ou un lobby",
  "search.label": "Recherche",
  "search.none": "Aucun résultat pour cette recherche.",
  "home.title": "Ils travaillent pour nous.",
  "home.lede":
    "Chaque député européen a un dossier public : qui il rencontre, qui le lobbie et comment il vote. Uniquement des sources officielles.",
  "home.yourMeps": "Vos {n} députés européens belges",
  "home.all": "Tous",
  "home.latest": "Nouveau dans les sources",
  "home.mostLobbied": "Les plus sollicités, 12 derniers mois",
  "home.dataFrom": "Données mises à jour le {date}",
  "feed.meeting": "Réunion de lobbying",
  "feed.met": "a rencontré",
  "feed.about": "sur",
  "dossiers.title": "Dossiers",
  "dossiers.lede": "Les {n} membres du Parlement européen. Filtrez par pays ou par groupe.",
  "dossiers.country": "Pays",
  "dossiers.group": "Groupe",
  "dossiers.allCountries": "Tous les pays",
  "dossiers.allGroups": "Tous les groupes",
  "dossiers.sort": "Trier",
  "dossiers.sortName": "Nom",
  "dossiers.sortMeetings": "Le plus de réunions",
  "dossiers.count": "{n} dossiers",
  "card.kind": "Dossier public",
  "card.institution": "Parlement européen",
  "card.name": "Nom",
  "card.group": "Groupe",
  "card.party": "Parti national",
  "card.since": "Membre depuis",
  "card.employer": "Employeur",
  "card.employerValue": "Les citoyens",
  "card.salary": "Salaire net mensuel",
  "dossier.back": "Dossiers",
  "dossier.follow": "Suivre",
  "dossier.following": "Suivi",
  "dossier.meetings12": "réunions de lobbying, 12 derniers mois",
  "dossier.meetingsAll": "réunions de lobbying depuis le début du mandat",
  "dossier.attendance": "présence aux votes par appel nominal",
  "dossier.committees": "commissions",
  "dossier.committee": "commission",
  "dossier.topOrgs": "Rencontre le plus souvent",
  "dossier.tabMeetings": "Réunions",
  "dossier.tabVotes": "Votes",
  "dossier.tabRoles": "Fonctions",
  "dossier.tabSources": "Sources",
  "dossier.noMeetings":
    "Ce député n'a publié aucune réunion de lobbying. Les députés publient eux-mêmes leurs réunions, et toutes ne sont pas soumises à l'obligation de publication.",
  "dossier.howToRead": "Comment lire ceci",
  "dossier.howToReadText":
    "Les réunions sont publiées par le député lui-même. Ce qui n'est pas publié n'apparaît pas ici. Nous montrons ce qui est officiel, sans jugement.",
  "dossier.voted": "A voté",
  "dossier.for": "pour",
  "dossier.against": "contre",
  "dossier.abstention": "abstention",
  "dossier.didNotVote": "n'a pas voté",
  "dossier.noVotes": "Pas encore de données de vote pour ce député.",
  "dossier.declarations": "Déclarations d'intérêts",
  "dossier.declarationsText":
    "Les déclarations officielles d'intérêts financiers, de fonctions annexes et d'activités rémunérées (PDF, Parlement européen).",
  "dossier.memberships": "Fonctions et appartenances",
  "dossier.current": "actuel",
  "dossier.official": "Page officielle",
  "dossier.ofVotes": "sur {n} votes",
  "dossier.showMore": "Voir plus",
  "dossier.notFound": "Ce dossier n'existe pas (ou plus). Le mandat est peut-être terminé.",
  "lobby.title": "Radar du lobby",
  "lobby.lede": "Les organisations qui ont rencontré des députés européens, classées par nombre de réunions publiées.",
  "lobby.meetings": "réunions",
  "lobby.metBy": "A rencontré ces élus",
  "lobby.register": "Registre de transparence",
  "lobby.notInRegister": "Aucun numéro de registre indiqué pour ces réunions.",
  "lobby.budget": "coûts de lobbying par an",
  "lobby.persons": "lobbyistes",
  "lobby.accreditations": "badges d'accès PE",
  "lobby.category": "Catégorie",
  "lobby.office": "Siège",
  "lobby.recent": "Réunions récentes",
  "lobby.commission": "A aussi rencontré la Commission européenne, {n} fois",
  "lobby.filterBe": "Uniquement les réunions avec des députés belges",
  "follow.title": "Mes suivis",
  "follow.lede": "Votre liste reste sur cet appareil. Pas de compte, pas de traçage.",
  "follow.empty": "Vous ne suivez encore personne. Ouvrez un dossier et touchez Suivre.",
  "follow.browse": "Voir les députés belges",
  "sources.title": "Sources et méthode",
  "report.title": "Signaler une erreur",
  "common.source": "Source",
  "common.updated": "mis à jour",
  "common.loading": "Chargement",
  "common.error": "Les données n'ont pas pu être chargées. Vérifiez votre connexion et réessayez.",
  "common.retry": "Réessayer",
  "common.offline": "Hors ligne. Vous voyez la dernière version enregistrée.",
  "common.example": "exemple",
  "common.lang": "Langue",
};

const en: Dict = {
  "nav.today": "Today",
  "nav.dossiers": "Files",
  "nav.lobby": "Lobby",
  "nav.lobbyLong": "Lobby radar",
  "nav.follow": "Follow",
  "nav.followLong": "Following",
  "nav.sources": "Sources and method",
  "nav.report": "Report an error",
  "nav.theme": "Theme",
  "theme.system": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "search.placeholder": "Search a politician or lobby group",
  "search.label": "Search",
  "search.none": "Nothing found for this search.",
  "home.title": "They work for us.",
  "home.lede":
    "Every Member of the European Parliament has a public file: who they meet, who lobbies them and how they vote. Official sources only.",
  "home.yourMeps": "Your {n} Belgian MEPs",
  "home.all": "All",
  "home.latest": "New in the sources",
  "home.mostLobbied": "Most lobbied, last 12 months",
  "home.dataFrom": "Data updated on {date}",
  "feed.meeting": "Lobby meeting",
  "feed.met": "met",
  "feed.about": "about",
  "dossiers.title": "Files",
  "dossiers.lede": "All {n} Members of the European Parliament. Filter by country or group.",
  "dossiers.country": "Country",
  "dossiers.group": "Group",
  "dossiers.allCountries": "All countries",
  "dossiers.allGroups": "All groups",
  "dossiers.sort": "Sort",
  "dossiers.sortName": "Name",
  "dossiers.sortMeetings": "Most lobby meetings",
  "dossiers.count": "{n} files",
  "card.kind": "Public file",
  "card.institution": "European Parliament",
  "card.name": "Name",
  "card.group": "Group",
  "card.party": "National party",
  "card.since": "Member since",
  "card.employer": "Employer",
  "card.employerValue": "The citizens",
  "card.salary": "Net monthly salary",
  "dossier.back": "Files",
  "dossier.follow": "Follow",
  "dossier.following": "Following",
  "dossier.meetings12": "lobby meetings, last 12 months",
  "dossier.meetingsAll": "lobby meetings since start of term",
  "dossier.attendance": "present at roll-call votes",
  "dossier.committees": "committees",
  "dossier.committee": "committee",
  "dossier.topOrgs": "Meets most often",
  "dossier.tabMeetings": "Meetings",
  "dossier.tabVotes": "Votes",
  "dossier.tabRoles": "Roles",
  "dossier.tabSources": "Sources",
  "dossier.noMeetings":
    "This member has not published any lobby meetings. Members publish meetings themselves, and not every meeting falls under the publication rules.",
  "dossier.howToRead": "How to read this",
  "dossier.howToReadText":
    "Lobby meetings are published by the member themselves. What isn't published doesn't show up here. We show what is official, without judgement.",
  "dossier.voted": "Voted",
  "dossier.for": "for",
  "dossier.against": "against",
  "dossier.abstention": "abstained",
  "dossier.didNotVote": "did not vote",
  "dossier.noVotes": "No voting data for this member yet.",
  "dossier.declarations": "Declarations of interests",
  "dossier.declarationsText":
    "The official declarations of financial interests, side jobs and paid activities (PDF, European Parliament).",
  "dossier.memberships": "Roles and memberships",
  "dossier.current": "current",
  "dossier.official": "Official page",
  "dossier.ofVotes": "of {n} votes",
  "dossier.showMore": "Show more",
  "dossier.notFound": "This file doesn't exist (anymore). The term may have ended.",
  "lobby.title": "Lobby radar",
  "lobby.lede": "Organisations that met Members of the European Parliament, ranked by number of published meetings.",
  "lobby.meetings": "meetings",
  "lobby.metBy": "Met these politicians",
  "lobby.register": "Transparency Register",
  "lobby.notInRegister": "No register number listed with these meetings.",
  "lobby.budget": "lobbying costs per year",
  "lobby.persons": "lobbyists",
  "lobby.accreditations": "EP access badges",
  "lobby.category": "Category",
  "lobby.office": "Head office",
  "lobby.recent": "Recent meetings",
  "lobby.commission": "Also met the European Commission, {n} times",
  "lobby.filterBe": "Only meetings with Belgian members",
  "follow.title": "Following",
  "follow.lede": "Your list stays on this device. No account, no tracking.",
  "follow.empty": "You're not following anyone yet. Open a file and tap Follow.",
  "follow.browse": "See the Belgian members",
  "sources.title": "Sources and method",
  "report.title": "Report an error",
  "common.source": "Source",
  "common.updated": "updated",
  "common.loading": "Loading",
  "common.error": "The data couldn't be loaded. Check your connection and try again.",
  "common.retry": "Try again",
  "common.offline": "Offline. You're seeing the last saved version.",
  "common.example": "example",
  "common.lang": "Language",
};

const dicts: Record<Lang, Dict> = { nl, fr, en };
const LOCALES: Record<Lang, string> = { nl: "nl-BE", fr: "fr-BE", en: "en-GB" };

function detect(): Lang {
  try {
    const saved = localStorage.getItem("mandaat.lang");
    if (saved === "nl" || saved === "fr" || saved === "en") return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = (typeof navigator !== "undefined" ? navigator.language : "nl").slice(0, 2);
  return nav === "fr" ? "fr" : nav === "en" ? "en" : "nl";
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  locale: string;
  date: (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
  num: (n: number) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("mandaat.lang", l);
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo<Ctx>(() => {
    const locale = LOCALES[lang];
    const dtf = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
    const nf = new Intl.NumberFormat(locale);
    return {
      lang,
      setLang,
      locale,
      t: (k, vars) => {
        let s: string = dicts[lang][k] ?? nl[k];
        if (vars) for (const [name, v] of Object.entries(vars)) s = s.replace(`{${name}}`, String(v));
        return s;
      },
      date: (iso, opts) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return opts ? new Intl.DateTimeFormat(locale, opts).format(d) : dtf.format(d);
      },
      num: (n) => nf.format(n),
    };
  }, [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
