import {
  Badge,
  Button,
  buttonVariants,
  Card,
  DataTable,
  type DataTableColumn,
  EndpointCard,
  FieldError,
  Grid,
  Input,
  Label,
  Section,
} from "@/components/ui";
import { NAV_LINKS, SECTION_IDS, SITE } from "@/content";

/**
 * P12.S1 — design-system preview (purely presentational, NO backend calls).
 *
 * Exercises every ported primitive (Section / Card / Button / Badge / Field /
 * DataTable + the type scale) in hi2vi_web's adopted brand green, so the design
 * system is provably rendering end-to-end. This is a whole, polished page — the
 * look knowledge's real surfaces inherit — not a functional stub.
 *
 * P12.S2 replaces this file with the root auth redirect (signed-in → dashboard,
 * else → login); the `design/canvas/` mirror remains the P14 design-gate artifact.
 */

// Inline preview rows — sample data for the DataTable specimen, not a fetch.
interface PreviewProject {
  name: string;
  status: "active" | "paused";
  documents: number;
  lastUsed: string;
}

const PREVIEW_PROJECTS: PreviewProject[] = [
  { name: "acme-support", status: "active", documents: 128, lastUsed: "2026-07-15" },
  { name: "연구노트", status: "active", documents: 342, lastUsed: "2026-07-14" },
  { name: "beta-widget", status: "paused", documents: 17, lastUsed: "2026-06-30" },
];

const PROJECT_COLUMNS: DataTableColumn<PreviewProject>[] = [
  { key: "name", header: "Project", cell: (r) => <span className="font-medium">{r.name}</span> },
  {
    key: "status",
    header: "Status",
    cell: (r) => (
      <Badge variant={r.status === "active" ? "softGreen" : "archive"}>
        {r.status}
      </Badge>
    ),
  },
  {
    key: "documents",
    header: "Documents",
    align: "right",
    cell: (r) => <span className="font-mono text-caption text-steel">{r.documents}</span>,
  },
  {
    key: "lastUsed",
    header: "Last used",
    align: "right",
    cell: (r) => <span className="font-mono text-caption text-steel">{r.lastUsed}</span>,
  },
];

const TYPE_SAMPLES: { token: string; className: string; sample: string }[] = [
  { token: "text-hero-display", className: "text-hero-display", sample: "지식 히어로" },
  { token: "text-heading-1", className: "text-heading-1", sample: "Heading 제목" },
  { token: "text-heading-3", className: "text-heading-3", sample: "Heading 제목" },
  { token: "text-body-lg", className: "text-body-lg", sample: "Body large — 본문 텍스트 예시입니다." },
  { token: "text-body-md", className: "text-body-md", sample: "Body medium — 본문 텍스트 예시입니다." },
  { token: "text-caption", className: "text-caption", sample: "Caption — 캡션 텍스트" },
];

export default function PreviewPage() {
  return (
    <main id="main-content">
      {/* Topbar */}
      <header className="border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-page items-center justify-between px-5 py-4 md:px-14">
          <span className="text-heading-4 font-bold text-ink">{SITE.name}</span>
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-body-sm text-steel transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <a
              href={`#${SECTION_IDS.overview}`}
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Sign in
            </a>
          </nav>
        </div>
      </header>

      {/* Overview / hero */}
      <Section id={SECTION_IDS.overview} tone="default">
        <p className="text-micro uppercase text-green-dark">Design system · P12.S1</p>
        <h1 className="mt-3 max-w-3xl text-display-lg text-ink">
          The <span className="text-green-deep">knowledge</span> tenant dashboard,
          in its real design language.
        </h1>
        <p className="mt-5 max-w-2xl text-body-lg text-slate">
          {SITE.description} Bright signal-green on near-black-green — the
          adopted hi2vi_web brand, ported to a dashboard-shaped app.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg">
            Create project
          </Button>
          <Button variant="secondary" size="lg">
            View documents
          </Button>
          <Badge variant="signal">All web UI free</Badge>
          <Badge variant="softGreen">Graph included</Badge>
        </div>
      </Section>

      {/* Primitives showcase */}
      <Section id={SECTION_IDS.primitives} tone="surface">
        <h2 className="text-heading-2 text-ink">Primitives</h2>
        <p className="mt-3 max-w-2xl text-body-md text-slate">
          Every token-driven primitive later slices compose on — rendered in the
          brand palette, self-hosted fonts, no third-party requests.
        </p>

        {/* Cards */}
        <Grid cols={3} className="mt-8">
          <Card variant="feature">
            <h3 className="text-heading-4 text-ink">Projects</h3>
            <p className="mt-2 text-body-md text-slate">
              List, create, and open per-tenant projects.
            </p>
          </Card>
          <Card variant="security">
            <h3 className="text-heading-4 text-ink">Credentials</h3>
            <p className="mt-2 text-body-md text-slate">
              Mint show-once <span className="font-mono text-code-md">vk_</span> keys and revoke.
            </p>
          </Card>
          <Card variant="dark">
            <h3 className="text-heading-4">Usage</h3>
            <p className="mt-2 text-body-md text-on-dark-muted">
              Derived, read-only 30-day metrics per tenant and project.
            </p>
          </Card>
        </Grid>

        {/* Type scale */}
        <div className="mt-10">
          <h3 className="text-heading-4 text-ink">Type scale</h3>
          <div className="mt-4 space-y-4 rounded-lg border border-hairline bg-canvas p-6">
            {TYPE_SAMPLES.map((t) => (
              <div key={t.token} className="border-t border-hairline-soft pt-4 first:border-t-0 first:pt-0">
                <span className="font-mono text-caption text-steel">{t.token}</span>
                <div className={`${t.className} text-ink`}>{t.sample}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DataTable */}
        <div className="mt-10">
          <h3 className="text-heading-4 text-ink">DataTable</h3>
          <p className="mt-2 text-body-sm text-steel">
            The net-new primitive — the projects / credentials / documents lists.
          </p>
          <div className="mt-4">
            <DataTable
              columns={PROJECT_COLUMNS}
              rows={PREVIEW_PROJECTS}
              rowKey={(r) => r.name}
              empty="No projects yet."
            />
          </div>
        </div>

        {/* Field + endpoint */}
        <Grid cols={2} className="mt-10 items-start">
          <Card variant="base">
            <h3 className="text-heading-4 text-ink">Field</h3>
            <div className="mt-4 space-y-2">
              <Label htmlFor="preview-name">Project name</Label>
              <Input id="preview-name" placeholder="acme-support" defaultValue="연구노트" />
              <FieldError id="preview-name-error" />
            </div>
          </Card>
          <div>
            <h3 className="text-heading-4 text-ink">EndpointCard</h3>
            <EndpointCard label="GET /app/projects" className="mt-4">
              {`{
  "projects": [
    { "name": "acme-support", "documents": 128 }
  ]
}`}
            </EndpointCard>
          </div>
        </Grid>
      </Section>
    </main>
  );
}
