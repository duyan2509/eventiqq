export function AdminPage() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Admin</h2>
        <button className="admin-nav-item active">Dashboard</button>
        <button className="admin-nav-item">Event management</button>
        <button className="admin-nav-item">Revenue management</button>
        <button className="admin-nav-item">User management</button>
        <button className="admin-nav-item">Chart & insights</button>
      </aside>

      <section className="admin-content">
        <div className="admin-section">
          <h1>Overview</h1>
          <p className="text-muted">
            This admin space will be powered by backend analytics and management APIs.
          </p>
          <div className="admin-metrics">
            <div className="card metric-card">
              <h3>Total events</h3>
              <div className="skeleton-line short" />
            </div>
            <div className="card metric-card">
              <h3>Revenue</h3>
              <div className="skeleton-line short" />
            </div>
            <div className="card metric-card">
              <h3>Active users</h3>
              <div className="skeleton-line short" />
            </div>
          </div>

          <div className="card admin-chart">
            <h3>Chart & chat area</h3>
            <div className="chart-skeleton">
              <div className="skeleton-line wide" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

