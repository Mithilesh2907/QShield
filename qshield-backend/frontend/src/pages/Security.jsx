import React from 'react';

export default function Security({ scanData, isLoading, error }) {
  if (isLoading) return <div className="p-8 text-center text-gray-500">Scanning domain...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!scanData) return <div className="p-8 text-center text-gray-500">No security data available yet. Please scan a domain.</div>;

  const { cbom } = scanData;

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-2">Cryptographic Bill of Materials (CBOM)</h1>
      <p className="text-gray-400 mb-6">Detailed view of cryptographic algorithms, ciphers, and protocols across your assets.</p>
      
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow border border-gray-700">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Domain</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">TLS Version</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cipher Suite</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Algorithm Detail</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {cbom && cbom.length > 0 ? (
              cbom.map((item, i) => (
                <tr key={i} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.domain}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <span className="px-2 py-1 bg-gray-700 rounded text-xs border border-gray-600">{item.tls_version}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-300">{item.cipher}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {item.algorithm_type ? `${item.algorithm_type} (${item.key_strength || 'Unknown'})` : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.risk_level === 'Low' ? 'bg-green-100 text-green-800' : 
                      item.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.risk_level}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 font-medium">No CBOM data found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
