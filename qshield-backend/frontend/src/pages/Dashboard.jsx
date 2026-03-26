import React from 'react';

export default function Dashboard({ scanData, isLoading, error }) {
  if (isLoading) return <div className="p-8 text-center text-gray-400">Scanning domain...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!scanData) return <div className="p-8 text-center text-gray-500">Enter a domain to begin scanning.</div>;

  const { score, risk, quantum_status, summary } = scanData;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-white">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700 hover:border-gray-500 transition-colors">
          <h2 className="text-gray-400 text-sm uppercase tracking-wider">Security Score</h2>
          <div className="mt-2 text-4xl font-extrabold text-blue-400">{score || 0}</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700 hover:border-gray-500 transition-colors">
          <h2 className="text-gray-400 text-sm uppercase tracking-wider">Risk Level</h2>
          <div className={`mt-2 text-3xl font-bold ${
            risk === 'Low' ? 'text-green-500' : 
            risk === 'Medium' ? 'text-yellow-500' : 
            'text-red-500'
          }`}>
            {risk || 'Unknown'}
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700 hover:border-gray-500 transition-colors">
          <h2 className="text-gray-400 text-sm uppercase tracking-wider">Quantum Status</h2>
          <div className="mt-2 text-xl font-bold text-orange-400">{quantum_status || 'Unknown'}</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700 hover:border-gray-500 transition-colors">
          <h2 className="text-gray-400 text-sm uppercase tracking-wider">Total Assets</h2>
          <div className="mt-2 text-4xl font-extrabold text-purple-400">{summary?.total_assets || 0}</div>
        </div>
      </div>
    </div>
  );
}
