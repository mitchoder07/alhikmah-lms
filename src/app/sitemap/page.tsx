'use client'

// This is a public page that shows ALL routes the Figma plugin can import.
// Lecturers use this as a reference when importing into Figma via html.to.design.

const ROUTES = [
  { path: '/', name: 'Landing Page (Public Home)', desc: 'Hero, features, testimonials, footer. First impression for visitors.' },
  { path: '/login', name: 'Student Sign in', desc: 'Login form for students. Demo credentials shown.' },
  { path: '/register', name: 'Student Registration', desc: 'Open registration form. Matric optional for non-Al-Hikmah students.' },
  { path: '/staff-login', name: 'Staff Portal (Lecturer/Admin)', desc: 'Hidden staff login. Restricted to authorized staff only.' },
  { path: '/verify-certificate', name: 'Public Certificate Verification', desc: 'Anyone can verify a certificate by its number. Shows full certificate preview.' },
]

export default function SitemapPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full alhikmah-gradient flex items-center justify-center text-white font-bold text-[9px]">HUI</div>
            <div>
              <p className="font-semibold text-sm">Al-Hikmah LMS · Page Sitemap</p>
              <p className="text-[11px] text-muted-foreground">For Figma import via html.to.design plugin</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="alhikmah-gradient rounded-xl p-6 text-white mb-8">
          <h1 className="text-2xl font-bold mb-2">Import all pages into Figma</h1>
          <p className="text-sm text-white/90 mb-4">
            The html.to.design plugin imports one URL at a time. Use the list below: copy each URL, paste it into the plugin, and click Import. Repeat for each page you want in your Figma file.
          </p>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-xs font-mono">
            <p className="text-gold mb-1">Quick tip:</p>
            <p className="text-white/90">Replace <code className="bg-white/20 px-1.5 py-0.5 rounded">[your-domain]</code> below with your actual preview URL (e.g. <code className="bg-white/20 px-1.5 py-0.5 rounded">https://preview-xxx.space-z.ai</code>)</p>
          </div>
        </div>

        <div className="space-y-4">
          {ROUTES.map((route, i) => (
            <div key={i} className="border rounded-lg p-5 hover:shadow-md transition-shadow bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">#{i + 1}</span>
                    <h2 className="font-semibold text-base">{route.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{route.desc}</p>
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-md p-2">
                    <span className="text-xs text-muted-foreground">URL:</span>
                    <code className="text-xs font-mono text-foreground flex-1 truncate">
                      [your-domain]{route.path}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(route.path)}
                      className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Copy path
                    </button>
                  </div>
                </div>
                <a
                  href={route.path}
                  target="_blank"
                  rel="noopener"
                  className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary/10 whitespace-nowrap"
                >
                  Open ↗
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="font-semibold text-sm mb-3">Authenticated pages (require login)</h3>
          <p className="text-xs text-muted-foreground mb-4">
            These pages require a logged-in session, so the Figma plugin cannot import them directly. Instead, log in to the LMS first in your browser, then use the plugin. It will use your browser session. Alternatively, take screenshots and import as image references.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { path: '/ (after student login)', name: 'Student Dashboard', desc: 'Welcome banner, stats, continue learning, announcements' },
              { path: '/ (after lecturer login)', name: 'Lecturer Dashboard', desc: 'Analytics charts, revenue, course performance, quick actions' },
              { path: '/?view=student-courses', name: 'Student Course Catalog', desc: 'Browse and enroll in courses' },
              { path: '/?view=student-certificates', name: 'Student Certificates', desc: 'Issued, eligible, and pending certificates' },
              { path: '/?view=student-tutor', name: 'AI Study Buddy (full page)', desc: 'Chat interface with the AI Economics tutor' },
              { path: '/?view=admin-courses', name: 'Admin Course List', desc: 'Manage all Economics courses' },
              { path: '/?view=admin-students', name: 'Admin Student Roster', desc: 'Search, view, bulk import students' },
              { path: '/?view=admin-gradebook', name: 'Admin Gradebook', desc: 'Student by course grade matrix' },
              { path: '/?view=admin-revenue', name: 'Admin Revenue Dashboard', desc: 'Paystack + Flutterwave revenue tracking' },
              { path: '/?view=admin-certificates', name: 'Admin Certificate Management', desc: 'Issue certificates, view eligible students' },
            ].map((p, i) => (
              <div key={i} className="border rounded-md p-3 text-xs">
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-muted-foreground mt-1 mb-2">{p.desc}</p>
                <code className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded">{p.path}</code>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-secondary/30 rounded-lg p-5">
          <h3 className="font-semibold text-sm mb-2">Step-by-step Figma import</h3>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Open Figma, create a new design file.</li>
            <li>Install the free <strong className="text-foreground">html.to.design</strong> plugin from the Figma community.</li>
            <li>Run the plugin: right-click canvas, then Plugins, then html.to.design.</li>
            <li>Click <strong className="text-foreground">Import from URL</strong>.</li>
            <li>Paste one of the URLs above (replace <code className="bg-secondary-foreground/10 px-1 rounded">[your-domain]</code> with your actual preview URL).</li>
            <li>Click <strong className="text-foreground">Proceed</strong>. Wait 10 to 30 seconds for the import.</li>
            <li>Repeat for each URL you want in your Figma file.</li>
            <li>For authenticated pages, log in to the LMS in your browser first, then import.</li>
            <li>Select any element and press <strong className="text-foreground">C</strong> to leave a comment for the developer.</li>
          </ol>
        </div>
      </div>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Al-Hikmah University, Ilorin · Department of Economics
      </footer>
    </div>
  )
}
