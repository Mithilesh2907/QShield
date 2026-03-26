export default function PlaceholderPage({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center space-y-4">
      <div className="glass-card rounded-2xl p-12 max-w-lg shadow-2xl shadow-[#1d1b19]/5 border border-outline-variant/20">
        <span className="material-symbols-outlined text-6xl text-secondary mb-6 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>build_circle</span>
        <h2 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight mb-2">{title}</h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">{description}</p>
        <div className="mt-8 pt-8 border-t border-outline-variant/20">
          <span className="bg-secondary/10 text-secondary px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider">Module in Development</span>
        </div>
      </div>
    </div>
  );
}
