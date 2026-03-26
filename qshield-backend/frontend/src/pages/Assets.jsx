import React from 'react';

export default function Assets({ scanData, isLoading, error }) {
  if (isLoading) return <div className="p-8 text-center text-gray-500">Scanning domain...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!scanData) return <div className="p-8 text-center text-gray-500">No assets data available yet. Please scan a domain.</div>;

  const { assets } = scanData;

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Asset Discovery</h1>
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow border border-gray-700">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Domain</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {assets && assets.length > 0 ? (
              assets.map((asset, i) => (
                <tr key={i} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{asset.domain}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{asset.ip || 'Unknown'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="px-6 py-8 text-center text-sm text-gray-500 font-medium">No assets found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
