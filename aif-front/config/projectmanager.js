import "server-only";

export const projectManager = {
  app: {
    name: "AIF Client Portal",
    logo: "/company.png",
    // "logo" shows only the image, "name" shows only the name, "both" shows both.
    brandDisplay: "logo",
    description:
      "A private investor portal for portfolio value, ledger entries, holdings, and fund statements.",
    about:
      "Investors sign in to review only their own fund records, compliance status, and statement history. Brand settings live in config/projectmanager.js.",
  },
  theme: {
    // Logo palette: navy #2E5FA5, gold, and stone gray.
    colors: {
      primary: "#2E5FA5",
      primaryHover: "#1B3C6C",
      background: "#ffffff",
      surface: "#EBF2F8",
      text: "#091C37",
      muted: "#595F61",
      border: "#C2C9CC",
      danger: "#e11d48",
    },
    components: {
      button: {
        background: "#2E5FA5",
        color: "#ffffff",
        hover: "#1B3C6C",
      },
      secondaryButton: {
        background: "#ffffff",
        color: "#091C37",
        border: "#C2C9CC",
        hover: "#EBF2F8",
      },
    },
    // Colors for every page after an investor signs in.
    portal: {
      sidebar: "#ffffff",
      sidebarEnd: "#EBF2F8",
      sidebarText: "#1B3C6C",
      sidebarMuted: "#7B8285",
      page: "#EDEFF0",
      header: "#ffffff",
      headerText: "#091C37",
      nav: {
        dashboard: { background: "#EBF2F8", color: "#2E5FA5" },
        profile: { background: "#EDEFF0", color: "#383B3D" },
        ledger: { background: "#FCEAD5", color: "#A5742E" },
        holdings: { background: "#B3CCEF", color: "#1B3C6C" },
        statements: { background: "#F6B969", color: "#4D3410" },
      },
      cards: {
        blue: { background: "#EBF2F8", color: "#1B3C6C" },
        gold: { background: "#FCEAD5", color: "#79541F" },
        lilac: { background: "#B3CCEF", color: "#1B3C6C" },
        mint: { background: "#EDEFF0", color: "#1B3C6C" },
        bannerFrom: "#091C37",
        bannerVia: "#1B3C6C",
        bannerTo: "#2E5FA5",
        bannerText: "#ffffff",
      },
      charts: ["#2E5FA5", "#4482D8", "#CF933C", "#7BA6E4"],
      badges: {
        success: { background: "#dcfce7", color: "#15803d" },
        warning: { background: "#FCEAD5", color: "#79541F" },
        danger: { background: "#ffe4e6", color: "#be123c" },
        neutral: { background: "#EDEFF0", color: "#595F61" },
      },
    },
    fontFamily: {
      options: {
        inter: "Inter, system-ui, sans-serif",
        arial: "Arial, Helvetica, sans-serif",
        verdana: "Verdana, Geneva, sans-serif",
        tahoma: "Tahoma, Geneva, sans-serif",
        trebuchet: "'Trebuchet MS', sans-serif",
        georgia: "Georgia, serif",
        times: "'Times New Roman', Times, serif",
        courier: "'Courier New', Courier, monospace",
        system: "system-ui, sans-serif",
      },
      default: "inter",
    },
    fontSize: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "30px",
    },
  },
  company: {
    name: "AIF Client Portal",
    address: "Express Tower, Sector 62\nNoida, UP 201301",
    email: "info@wealthdiscovery.in",
    phone: "91 11 4344 4666",
  },
  analytics: {
    // GA4 measurement id, for example G-XXXXXXXX. Leave empty to skip the tag.
    measurementId: "",
  },
  seo: {
    // Full site URL, for example https://example.com. Leave empty to skip canonical links.
    siteUrl: "",
  },
  // Per route. showTopNav defaults to true. showSidebar defaults to false.
  // A route missing from this list shows the top nav and footer, and hides the sidebar.
  pages: {
    "/": {
      showTopNav: true,
      showSidebar: false,
      showFooter: true,
      seo: {
        title: "AIF Client Portal",
        description:
          "A private investor portal for portfolio value, ledger entries, holdings, and fund statements.",
        keywords: ["AIF", "client portal", "investor"],
        noIndex: false,
      },
    },
    "/login": {
      showTopNav: false,
      showSidebar: false,
      showFooter: false,
      seo: {
        title: "Sign in",
        description: "Sign in to the AIF client portal.",
        keywords: ["sign in", "investor login"],
        noIndex: true,
      },
    },
    "/privacy": {
      showTopNav: true,
      showSidebar: false,
      showFooter: true,
      seo: {
        title: "Privacy Policy",
        description: "How the AIF client portal handles investor profile, bank, holding, and statement information.",
        keywords: ["privacy", "AIF", "investor data"],
        noIndex: false,
      },
    },
    "/terms": {
      showTopNav: true,
      showSidebar: false,
      showFooter: true,
      seo: {
        title: "Terms & Conditions",
        description: "The terms for using the private AIF client portal to view your own fund records.",
        keywords: ["terms", "AIF", "client portal"],
        noIndex: false,
      },
    },
    "/forgot-password": {
      showTopNav: false,
      showSidebar: false,
      showFooter: false,
      seo: {
        title: "Reset password",
        description: "Reset the password for an AIF client portal account.",
        keywords: ["reset password"],
        noIndex: true,
      },
    },
    "/dashboard": {
      showTopNav: false,
      showSidebar: true,
      showFooter: false,
      seo: {
        title: "Dashboard",
        description: "Portfolio value, recent transactions, and compliance status.",
        keywords: ["portfolio", "dashboard"],
        noIndex: true,
      },
    },
    "/profile": {
      showTopNav: false,
      showSidebar: true,
      showFooter: false,
      seo: {
        title: "Profile",
        description: "Investor profile, nominee, and compliance status.",
        keywords: ["profile", "KRA", "FATCA"],
        noIndex: true,
      },
    },
    "/ledger": {
      showTopNav: false,
      showSidebar: true,
      showFooter: false,
      seo: {
        title: "Ledger",
        description: "Capital account debits, credits, and running balance.",
        keywords: ["ledger", "transactions"],
        noIndex: true,
      },
    },
    "/holdings": {
      showTopNav: false,
      showSidebar: true,
      showFooter: false,
      seo: {
        title: "Holdings",
        description: "Scheme units, average cost, market value, and profit or loss.",
        keywords: ["holdings"],
        noIndex: true,
      },
    },
    "/statements": {
      showTopNav: false,
      showSidebar: true,
      showFooter: false,
      seo: {
        title: "Statements",
        description: "Download and preview historical investor statements.",
        keywords: ["statements"],
        noIndex: true,
      },
    },
  },
  // Values come from .env.local. Do not paste live secrets into this file.
  secrets: {
    mail: {
      clientId: process.env.MAIL_CLIENT_ID ?? "",
      clientSecret: process.env.MAIL_CLIENT_SECRET ?? "",
    },
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY ?? "",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "",
      projectId: process.env.FIREBASE_PROJECT_ID ?? "",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: process.env.FIREBASE_APP_ID ?? "",
      privateKey: process.env.FIREBASE_PRIVATE_KEY ?? "",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
    },
  },
};

export const secrets = projectManager.secrets;

export function pageMetadata(path) {
  const page = projectManager.pages[path] ?? {};
  const seo = page.seo ?? {};
  const title = seo.title || projectManager.app.name;
  const description = seo.description || projectManager.app.description;
  const isHome = path === "/";
  const metadata = {
    title: isHome ? { absolute: title } : title,
    description,
    openGraph: {
      title,
      description,
      siteName: projectManager.app.name,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };

  if (Array.isArray(seo.keywords) && seo.keywords.length > 0) {
    metadata.keywords = seo.keywords;
  }

  if (seo.noIndex) {
    metadata.robots = { index: false, follow: false };
  }

  if (projectManager.seo.siteUrl) {
    metadata.alternates = { canonical: path };
    metadata.openGraph.url = path;
  }

  return metadata;
}

export function pageChrome() {
  return Object.fromEntries(
    Object.entries(projectManager.pages).map(([path, page]) => [
      path,
      {
        showTopNav: page.showTopNav !== false,
        showSidebar: page.showSidebar === true,
        showFooter: page.showFooter !== false,
      },
    ]),
  );
}

export function themeVariablesCss() {
  const { colors, components, fontFamily, fontSize, portal } = projectManager.theme;
  const { button, secondaryButton } = components;
  const fontSans =
    fontFamily.options[fontFamily.default] ?? fontFamily.options.inter;
  const navVars = Object.entries(portal.nav)
    .map(([name, tone]) => `  --pm-nav-${name}-bg: ${tone.background};\n  --pm-nav-${name}-color: ${tone.color};`)
    .join("\n");
  const cardVars = Object.entries(portal.cards)
    .filter(([, value]) => typeof value === "object")
    .map(([name, tone]) => `  --pm-card-${name}-bg: ${tone.background};\n  --pm-card-${name}-color: ${tone.color};`)
    .join("\n");
  const badgeVars = Object.entries(portal.badges)
    .map(([name, tone]) => `  --pm-badge-${name}-bg: ${tone.background};\n  --pm-badge-${name}-color: ${tone.color};`)
    .join("\n");
  const chartVars = portal.charts
    .map((color, index) => `  --pm-chart-${index + 1}: ${color};`)
    .join("\n");

  return `:root {
  --pm-primary: ${colors.primary};
  --pm-primary-hover: ${colors.primaryHover};
  --pm-background: ${colors.background};
  --pm-surface: ${colors.surface};
  --pm-text: ${colors.text};
  --pm-muted: ${colors.muted};
  --pm-border: ${colors.border};
  --pm-danger: ${colors.danger};
  --pm-button-bg: ${button.background};
  --pm-button-color: ${button.color};
  --pm-button-hover: ${button.hover};
  --pm-button-secondary-bg: ${secondaryButton.background};
  --pm-button-secondary-color: ${secondaryButton.color};
  --pm-button-secondary-border: ${secondaryButton.border};
  --pm-button-secondary-hover: ${secondaryButton.hover};
  --pm-font-sans: ${fontSans};
  --pm-text-xs: ${fontSize.xs};
  --pm-text-sm: ${fontSize.sm};
  --pm-text-base: ${fontSize.base};
  --pm-text-lg: ${fontSize.lg};
  --pm-text-xl: ${fontSize.xl};
  --pm-text-2xl: ${fontSize["2xl"]};
  --pm-text-3xl: ${fontSize["3xl"]};
  --pm-portal-sidebar: ${portal.sidebar};
  --pm-portal-sidebar-end: ${portal.sidebarEnd};
  --pm-portal-sidebar-text: ${portal.sidebarText};
  --pm-portal-sidebar-muted: ${portal.sidebarMuted};
  --pm-portal-page: ${portal.page};
  --pm-portal-header: ${portal.header};
  --pm-portal-header-text: ${portal.headerText};
  --pm-banner-from: ${portal.cards.bannerFrom};
  --pm-banner-via: ${portal.cards.bannerVia};
  --pm-banner-to: ${portal.cards.bannerTo};
  --pm-banner-text: ${portal.cards.bannerText};
${navVars}
${cardVars}
${badgeVars}
${chartVars}
}`;
}

