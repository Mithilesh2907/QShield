export default function ThreatBanner({ risk, rating }) {
  const isCritical = risk === 'High' || rating === 'Critical';
  if (!isCritical) {
    return null;
  }

  const message =
    rating === 'Critical'
      ? '⚠️ Critical Risk Detected — Immediate action required'
      : '⚠️ High Risk Assets Found';

  return (
    <section className="col-span-12 bg-red-600/90 border border-red-500 rounded-3xl p-5 shadow-2xl text-white flex items-center gap-4">
      <div className="text-2xl">⚠️</div>
      <div>
        <p className="text-lg font-semibold">{message}</p>
        <p className="text-sm opacity-80">Review high risk assets and remediation notes before releasing changes.</p>
      </div>
    </section>
  );
}
