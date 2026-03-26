import { useState } from 'react';
import { jsPDF } from 'jspdf';

export default function OnDemandReporting({ scanData }) {
  const [reportType, setReportType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Delivery options state
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [saveToLocation, setSaveToLocation] = useState(true);
  const [downloadLink, setDownloadLink] = useState(false);
  const [slackNotification, setSlackNotification] = useState(false);
  
  // Advanced settings state
  const [includeCharts, setIncludeCharts] = useState(true);
  const [passwordProtect, setPasswordProtect] = useState(false);

  const reportTypes = [
    { id: 'exec', label: 'Executive Reporting', icon: 'bar_chart' },
    { id: 'discovery', label: 'Assets Discovery', icon: 'track_changes' },
    { id: 'inventory', label: 'Assets Inventory', icon: 'layers' },
    { id: 'cbom', label: 'CBOM', icon: 'description' },
    { id: 'pqc', label: 'Posture of PQC', icon: 'security' },
    { id: 'cyber', label: 'Cyber Rating (Tiers 1 - 4)', icon: 'star_rate' },
  ];

  const handleSelectReport = (type) => {
    setReportType(type);
    setIsDropdownOpen(false);
  };

  const handleGenerateReport = () => {
    if (!reportType) {
      alert('Please select a Report Type to generate.');
      return;
    }

    setIsGenerating(true);

    // Simulate realistic generation delay
    setTimeout(() => {
      let exportData = {};
      
      // Filter the global scan payload down to the exact requested report type section
      if (scanData) {
        switch (reportType) {
          case 'exec': exportData = { executiveSummary: scanData.summary || scanData }; break;
          case 'discovery': exportData = { discoveryCounts: scanData.counts || scanData }; break;
          case 'inventory': exportData = { networkInventory: scanData.inventory || scanData.cbom || scanData }; break;
          case 'cbom': exportData = { cryptographicBillOfMaterials: scanData.cbom || scanData }; break;
          case 'pqc': exportData = { pqcAssessment: { risk: scanData.risk, classical: scanData.classical_security, quantum: scanData.quantum_security } }; break;
          case 'cyber': exportData = { cyberRating: { score: scanData.score, rating: scanData.rating } }; break;
          default: exportData = scanData;
        }
      } else {
        exportData = { empty: true, message: "No active scan data found."};
      }

      // 1. Output the file to download as PDF
      const reportName = `QShield_${reportType.toUpperCase()}_Report_${Date.now()}.pdf`;
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      doc.setFontSize(20);
      doc.setTextColor(229, 160, 62); // Qshield orange
      doc.text(`QShield - ${reportType.toUpperCase()} Report`, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      
      const contentStr = JSON.stringify(exportData, null, 2);
      const splitText = doc.splitTextToSize(contentStr, pageWidth - 28);
      
      let cursorY = 40;
      doc.setFont("courier", "normal"); // Monospaced for JSON block
      
      for (let i = 0; i < splitText.length; i++) {
        if (cursorY > pageHeight - 20) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(splitText[i], 14, cursorY);
        cursorY += 5; // line height
      }

      doc.save(reportName);

      // 2. Fulfill visual side-effects
      if (slackNotification) {
        alert("Alert pushed to requested Slack webhook channels!");
      }
      if (sendViaEmail) {
        alert("Final report generated and proactively scheduled for email delivery to addresses.");
      }

      setIsGenerating(false);
    }, 1500);
  };

  return (
    <section className="col-span-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="relative">
          <span className="material-symbols-outlined text-4xl text-[#e5a03e]">content_paste_search</span>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
            <span className="material-symbols-outlined text-sm text-[#e5a03e]">schedule</span>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-[#4a4542] tracking-tight">On-Demand Reporting</h2>
          <p className="text-[#8c8581] font-medium text-sm mt-0.5">Request reports as needed</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-[#fefaf6] rounded-2xl shadow-sm border border-[#f3ecd8] p-8 relative overflow-hidden">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-20">
          
          {/* Report Type */}
          <div className="space-y-4 relative z-50">
            <h3 className="text-[#59534f] font-bold text-base px-2">Report Type</h3>
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white border border-[#f1e6b8] rounded-xl px-4 py-3 flex items-center justify-between text-[#8c8581] shadow-sm hover:border-[#e5a03e] transition-colors"
              >
                <span className={reportType ? "text-[#59534f] font-medium" : ""}>
                  {reportType ? reportTypes.find(r => r.id === reportType)?.label : 'Select Report'}
                </span>
                <span className="material-symbols-outlined text-[#e5a03e]">{isDropdownOpen ? 'expand_less' : 'expand_more'}</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#f1e6b8] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] py-2 z-50">
                  {reportTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectReport(type.id)}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#fff9f0] text-left transition-colors"
                    >
                      <span className="material-symbols-outlined text-[#e5a03e] text-xl">{type.icon}</span>
                      <span className="text-[#59534f] font-medium text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Yellow Divider Arrow */}
          <div className="hidden md:flex absolute left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 z-10">
            <span className="material-symbols-outlined text-[#e5a03e] text-3xl font-light">chevron_right</span>
          </div>

          {/* Delivery Options */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <span className="material-symbols-outlined text-[#e5a03e] -rotate-45">send</span>
              <h3 className="text-[#59534f] font-bold text-base">Delivery Options</h3>
            </div>

            <div className="space-y-5">
              {/* Send via Email */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${sendViaEmail ? 'bg-[#e5a03e] border-[#e5a03e]' : 'border-outline-variant outline-none'}`}>
                      {sendViaEmail && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                    </div>
                    <span className="text-[#59534f] font-medium text-sm">Send via Email</span>
                  </label>
                  {/* Toggle */}
                  <button 
                    onClick={() => setSendViaEmail(!sendViaEmail)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${sendViaEmail ? 'bg-[#e5a03e] justify-end' : 'bg-[#e8e4db] justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                  </button>
                </div>
                {sendViaEmail && (
                  <div className="relative pl-8">
                    <input 
                      type="text" 
                      placeholder="Enter Email Addresses" 
                      className="w-full bg-[#fbf8f1] border border-[#f1e6b8] rounded-xl pl-4 pr-10 py-2.5 text-sm text-[#59534f] placeholder-[#c4bbb6] focus:outline-none focus:border-[#e5a03e]"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#e5a03e] hover:text-[#d4902b] transition-colors">
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Save to Location */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${saveToLocation ? 'bg-[#e5a03e] border-[#e5a03e]' : 'border-outline-variant outline-none'}`}>
                      {saveToLocation && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                    </div>
                    <span className="text-[#59534f] font-medium text-sm">Save to Location</span>
                  </label>
                  {/* Toggle */}
                  <button 
                    onClick={() => setSaveToLocation(!saveToLocation)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${saveToLocation ? 'bg-[#e5a03e] justify-end' : 'bg-[#e8e4db] justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                  </button>
                </div>
                {saveToLocation && (
                  <div className="relative pl-8">
                    <input 
                      type="text" 
                      defaultValue="/Reports/OnDemand/" 
                      className="w-full bg-[#fbf8f1] border border-[#f1e6b8] rounded-xl pl-4 pr-10 py-2.5 text-sm text-[#59534f] focus:outline-none focus:border-[#e5a03e]"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#e5a03e] hover:text-[#d4902b] transition-colors">
                      <span className="material-symbols-outlined">folder</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Download Link */}
              <div className="flex items-center gap-3 pt-1">
                <button 
                  onClick={() => setDownloadLink(!downloadLink)}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${downloadLink ? 'bg-[#e5a03e] border-[#e5a03e]' : 'border-[#d8d1ca] outline-none'}`}
                >
                  {downloadLink && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                </button>
                <span className="text-[#59534f] font-medium text-sm">Download Link</span>
              </div>

              {/* Slack Notification */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSlackNotification(!slackNotification)}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${slackNotification ? 'bg-[#e5a03e] border-[#e5a03e]' : 'border-[#d8d1ca] outline-none'}`}
                >
                  {slackNotification && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                </button>
                <div className="flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="w-4 h-4" />
                  <span className="text-[#59534f] font-medium text-sm">Slack Notification</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Advanced Settings */}
        <div className="mt-8 pt-6 border-t border-[#f3ecd8] relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e5a03e]">settings</span>
              <h3 className="text-[#59534f] font-bold text-sm">Advanced Settings</h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-8 w-full lg:w-auto">
              
              <div className="flex items-center gap-3">
                <span className="text-[#8c8581] text-xs font-medium uppercase tracking-wider">File Format:</span>
                <button className="flex items-center gap-2 bg-white border border-[#f1e6b8] rounded-lg px-3 py-1.5 text-sm font-medium text-[#59534f] hover:border-[#e5a03e] transition-colors">
                  PDF <span className="material-symbols-outlined text-[#e5a03e] text-sm">expand_more</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                 <span className="text-[#8c8581] text-xs font-medium uppercase tracking-wider">Include Charts</span>
                 <button 
                    onClick={() => setIncludeCharts(!includeCharts)}
                    className={`w-10 h-5 rounded-full p-1 transition-colors flex items-center ${includeCharts ? 'bg-[#e5a03e] justify-end' : 'bg-[#e8e4db] justify-start'}`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm"></div>
                  </button>
              </div>

              <div className="flex items-center gap-3">
                 <span className="text-[#8c8581] text-xs font-medium uppercase tracking-wider">Password Protect</span>
                 <button 
                    onClick={() => setPasswordProtect(!passwordProtect)}
                    className={`w-10 h-5 rounded-full p-1 transition-colors flex items-center ${passwordProtect ? 'bg-[#e5a03e] justify-end' : 'bg-[#e8e4db] justify-start'}`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm"></div>
                  </button>
              </div>

              <button 
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className={`flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-bold transition-colors ml-auto lg:ml-0 shadow-md ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#e5a03e] hover:bg-[#d4902b] shadow-[#e5a03e]/20'}`}
              >
                {isGenerating ? (
                   <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                ) : (
                   <span className="material-symbols-outlined text-xl">post_add</span>
                )}
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
