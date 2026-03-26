export default function Recommendations({ insights }) {
  if (!insights || !insights.length) return null;

  const recommendations = insights
    .slice(0, 4)
    .map((insight) => {
      const text = insight.replace('All assets ', '');
      return text.endsWith('.') ? text : `${text}.`;
    });

  return (
    <section className="col-span-12 md:col-span-6 bg-surface/90 backdrop-blur rounded-3xl p-6 shadow-lg border border-outline-variant/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-lg text-on-surface">Recommended Actions</h4>
          <p className="text-xs text-on-surface-variant">Based on the latest telemetry</p>
        </div>
        <span className="text-xs font-bold text-secondary uppercase tracking-[0.25em]">Action</span>
      </div>
      <ul className="space-y-3">
        {recommendations.map((rec, index) => (
          <li key={index} className="flex gap-3 text-sm text-on-surface">
            <span className="text-secondary">✔</span>
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
