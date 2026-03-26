import React from 'react';

export default function Analytics({ scanData, isLoading, error }) {
  if (isLoading) return <div className="p-8 text-center text-gray-500">Scanning domain...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!scanData) return <div className="p-8 text-center text-gray-500">No analytics data available yet. Please scan a domain.</div>;

  const { insights, counts, summary } = scanData;

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Scan Analytics & Insights</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
         <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700 hover:border-gray-500 transition-colors">
          <h3 className="text-lg font-medium text-gray-300 mb-2">HTTPS Adoption</h3>
          <p className="text-4xl font-extrabold text-green-400">{summary?.https_enabled || 0} / {summary?.total_assets || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Assets with HTTPS enabled</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700 hover:border-gray-500 transition-colors">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Quantum Vulnerable</h3>
          <p className="text-4xl font-extrabold text-red-400">{summary?.quantum_vulnerable || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Vulnerable Assets</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700 hover:border-gray-500 transition-colors">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Unique IPs</h3>
          <p className="text-4xl font-extrabold text-blue-400">{counts?.ips || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Discovered underlying infrastructure</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow border border-gray-700 p-8">
        <h2 className="text-xl font-semibold mb-6 text-gray-100 flex items-center">
          <svg className="w-5 h-5 mr-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Key Insights
        </h2>
        <ul className="space-y-4">
          {insights && insights.length > 0 ? (
            insights.map((insight, idx) => (
              <li key={idx} className="flex items-start bg-gray-900 rounded p-4 border border-gray-700">
                <span className="text-indigo-400 mr-4 text-xl mt-1">•</span>
                <span className="text-gray-300 text-lg">{insight}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-500 italic p-4">No significant insights generated.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
