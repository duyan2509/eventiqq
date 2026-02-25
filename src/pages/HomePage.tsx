export function HomePage() {
  return (
    <div className="home-layout">
      <section className="hero">
        <div className="hero-content">
          <h1>Discover, host and manage events effortlessly</h1>
          <p>
            Eventiqq helps you explore organizations, join experiences and manage your
            own events with a modern, role-based workspace.
          </p>
          <div className="hero-actions">
            <button className="btn primary">Explore events</button>
            <button className="btn ghost">Create organization</button>
          </div>

          <div className="search-bar">
            <input
              className="search-input"
              placeholder="Search events, organizers, locations..."
            />
            <button className="btn primary">Search</button>
          </div>

          <div className="filters-row">
            <button className="filter-pill active">All events</button>
            <button className="filter-pill">This week</button>
            <button className="filter-pill">Online</button>
            <button className="filter-pill">Nearby</button>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-card">
            <div className="hero-card-header">
              <span className="dot dot-green" />
              <span className="dot dot-amber" />
              <span className="dot dot-red" />
            </div>
            <div className="hero-card-body">
              <div className="skeleton-line wide" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="hero-metric-row">
                <div className="metric">
                  <span className="metric-label">Active events</span>
                  <span className="metric-value">•••</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Tickets sold</span>
                  <span className="metric-value">•••</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

   

      <section className="home-section">
        <div className="section-header">
          <h2>Upcoming events</h2>
          <span className="section-caption">Event data is coming soon.</span>
        </div>
        <div className="card-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card skeleton-card">
              <div className="skeleton-badge-row">
                <div className="skeleton-badge" />
                <div className="skeleton-badge" />
              </div>
              <div className="skeleton-line wide" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

