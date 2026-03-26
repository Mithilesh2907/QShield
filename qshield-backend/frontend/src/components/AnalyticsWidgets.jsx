import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const barOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false }
    },
    y: {
      grid: { display: false }
    }
  },
  plugins: {
    legend: { display: false }
  }
};

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#f8fafc' }
    }
  }
};

export default function AnalyticsWidgets({ data }) {
  if (!data) return null;

  const cbom = data.cbom || [];
  const expiryBuckets = { critical: 0, warning: 0, safe: 0, good: 0 };
  cbom.forEach((item) => {
    const days = item?.certificate?.expiry_days;
    if (typeof days !== 'number' || Number.isNaN(days)) {
      return;
    }
    if (days <= 30) {
      expiryBuckets.critical += 1;
    } else if (days <= 60) {
      expiryBuckets.warning += 1;
    } else if (days <= 90) {
      expiryBuckets.safe += 1;
    } else {
      expiryBuckets.good += 1;
    }
  });

  const expiryLabels = ['0–30 Days', '30–60 Days', '60–90 Days', '>90 Days'];
  const expiryValues = [
    expiryBuckets.critical,
    expiryBuckets.warning,
    expiryBuckets.safe,
    expiryBuckets.good
  ];

  const ipAddresses = data.inventory?.ip_addresses || [];
  const ipv4Count = ipAddresses.filter((ip) => ip?.includes?.('.') ?? false).length;
  const ipv6Count = ipAddresses.filter((ip) => ip?.includes?.(':') ?? false).length;
  const totalIPs = ipv4Count + ipv6Count;

  const donutData = {
    labels: ['IPv4', 'IPv6'],
    datasets: [
      {
        data: totalIPs ? [ipv4Count, ipv6Count] : [0, 0],
        backgroundColor: ['#38bdf8', '#a5b4fc'],
        borderWidth: 0
      }
    ]
  };

  const donutPercentage = totalIPs ? Math.round((ipv4Count / totalIPs) * 100) : 0;

  return (
    <section className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="bg-gray-900 rounded-2xl border border-white/10 shadow-xl p-6 h-[320px]">
        <h3 className="text-white font-semibold mb-3">Certificate Expiry Timeline</h3>
        {expiryValues.some((value) => value > 0) ? (
          <div className="h-[240px]">
            <Bar
              data={{
                labels: expiryLabels,
                datasets: [
                  {
                    data: expiryValues,
                    backgroundColor: ['#ef4444', '#f97316', '#facc15', '#22c55e']
                  }
                ]
              }}
              options={barOptions}
            />
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No certificate expiry data available.</p>
        )}
      </div>
      <div className="bg-gray-900 rounded-2xl border border-white/10 shadow-xl p-6 h-[320px]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">IP Version Breakdown</h3>
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">Split</span>
        </div>
        {totalIPs ? (
          <>
            <div className="relative h-[210px]">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
            <p className="text-center text-sm text-white mt-3">
              IPv4 {donutPercentage}% · IPv6 {100 - donutPercentage}%
            </p>
          </>
        ) : (
          <p className="text-sm text-on-surface-variant">No IP data available.</p>
        )}
      </div>
    </section>
  );
}
