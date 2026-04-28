import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function OnDemandReporting({ scanData }) {
  const [selectedReports, setSelectedReports] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Delivery options state
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [emailAddresses, setEmailAddresses] = useState("");
  const [saveToLocation, setSaveToLocation] = useState(true);
  const [saveLocationPath, setSaveLocationPath] = useState("/Reports/OnDemand/");
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
    if (selectedReports.includes(type)) {
      setSelectedReports(selectedReports.filter(r => r !== type));
    } else {
      setSelectedReports([...selectedReports, type]);
    }
  };

  const removeReport = (typeId) => {
    setSelectedReports(selectedReports.filter(r => r !== typeId));
  };

  const handleGenerateReport = () => {
    if (selectedReports.length === 0) {
      alert('Please select at least one Report Type to generate.');
      return;
    }

    setIsGenerating(true);

    // Simulate realistic generation delay
    setTimeout(() => {
      // 1. Output the file to download as PDF
      const reportTitleMap = {
        exec: 'Executive Summary Report',
        discovery: 'Assets Discovery Report',
        inventory: 'Network Assets Inventory',
        cbom: 'Cryptographic Bill of Materials (CBOM)',
        pqc: 'Posture of Post-Quantum Cryptography (PQC)',
        cyber: 'Cyber Risk Rating'
      };

      const reportName = `REQUIEM_Combined_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // --- Title Page ---
      // Background Accent -> A stylish vertical stripe on the left edge
      doc.setFillColor(181, 10, 46); // PNB Red (#B50A2E)
      doc.rect(0, 0, 15, pageHeight, 'F'); // Left vertical edge full height

      doc.setFillColor(229, 160, 62); // Gold accent
      doc.rect(15, 0, 3, pageHeight, 'F'); // Thin gold edge next to it

      // Main Title Area
      doc.setFontSize(48);
      doc.setTextColor(181, 10, 46); // Crimson
      doc.setFont('helvetica', 'bold');
      doc.text("REQUIEM", 35, 80);

      doc.setFontSize(16);
      doc.setTextColor(229, 160, 62); // Gold
      doc.setFont('helvetica', 'normal');
      doc.text("PUNJAB NATIONAL BANK", 35, 95);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(35, 105, pageWidth - 20, 105);

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text("Strategic Security Assessment & Posture Report", 35, 115);

      // Contents section
      doc.setFontSize(12);
      doc.setTextColor(181, 10, 46);
      doc.setFont('helvetica', 'bold');
      doc.text("INCLUDED REPORTS", 35, 160);

      const selectedTitles = selectedReports.map(type => reportTitleMap[type]);
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');

      let currY = 175;
      selectedTitles.forEach((t) => {
        doc.setDrawColor(229, 160, 62);
        doc.setFillColor(229, 160, 62);
        doc.circle(38, currY - 1.5, 1.5, 'F'); // bullet
        doc.text(t, 45, currY);
        currY += 8;
      });

      // Meta at the bottom right
      let metaY = pageHeight - 50;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text("Generated:", pageWidth - 20, metaY, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text(`${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth - 20, metaY + 6, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text("Classification:", pageWidth - 20, metaY + 18, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(181, 10, 46); // Red
      doc.text("STRICTLY CONFIDENTIAL", pageWidth - 20, metaY + 24, { align: 'right' });
      // --- End Title Page ---

      if (!scanData) {
        doc.addPage();
        doc.setFontSize(12);
        doc.setTextColor(200, 50, 50);
        doc.text("No active scan data found to generate this report.", 14, 45);
      } else {
        selectedReports.forEach((currentType) => {
          doc.addPage();

          const title = reportTitleMap[currentType] || 'Security Report';

          // Header
          doc.setFontSize(22);
          doc.setTextColor(250, 188, 10); // PNB Gold
          doc.setFont('helvetica', 'bold');

          const titleText = `REQUIEM - ${title}`;
          const splitTitle = doc.splitTextToSize(titleText, pageWidth - 28);
          doc.text(splitTitle, 14, 22);

          const titleLinesHeight = splitTitle.length * 8;
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.setFont('helvetica', 'normal');
          doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 18 + titleLinesHeight);

          doc.setLineDashPattern([], 0);
          doc.setDrawColor(200, 200, 200);
          doc.line(14, 23 + titleLinesHeight, pageWidth - 14, 23 + titleLinesHeight);

          let startY = 32 + titleLinesHeight;

          if (currentType === 'exec') {
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.setFont('helvetica', 'bold');
            doc.text("Executive Summary & Overview Stats", 14, startY);

            const summaryData = scanData.summary || {};
            const activeAssets = summaryData.total_assets || 0;
            const httpOnlyCount = summaryData.http_only || 0;
            const quantumSafe = summaryData.quantum_safe || 0;
            const highRisk = summaryData.high_risk_assets || 0;

            // Draw KPI boxes
            doc.setDrawColor(230, 230, 230);
            doc.setFillColor(252, 248, 242);
            doc.roundedRect(14, startY + 5, 85, 25, 3, 3, 'FD');
            doc.roundedRect(105, startY + 5, 85, 25, 3, 3, 'FD');
            doc.roundedRect(14, startY + 35, 85, 25, 3, 3, 'FD');
            doc.roundedRect(105, startY + 35, 85, 25, 3, 3, 'FD');

            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text("TOTAL DISCOVERED ASSETS", 18, startY + 12);
            doc.text("HTTP ONLY (INSECURE)", 109, startY + 12);
            doc.text("QUANTUM SAFE ASSETS", 18, startY + 42);
            doc.text("HIGH RISK ASSETS", 109, startY + 42);

            doc.setFontSize(22);
            doc.setTextColor(50, 50, 50);
            doc.text(`${activeAssets}`, 18, startY + 24);
            doc.text(`${httpOnlyCount}`, 109, startY + 24);
            doc.setTextColor(40, 167, 69);
            doc.text(`${quantumSafe}`, 18, startY + 54);
            if (highRisk > 0) doc.setTextColor(220, 53, 69); // Red
            doc.text(`${highRisk}`, 109, startY + 54);

            let newY = startY + 75;
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text("Risk Distribution", 14, newY);

            // Dummy bar chart
            doc.setFillColor(229, 160, 62);
            doc.rect(14, newY + 5, Math.max((highRisk / Math.max(activeAssets, 1)) * 150 + 5, 5), 12, 'F');
            doc.setFontSize(11);
            doc.text("High Risk", 170, newY + 14);

            doc.setFillColor(40, 167, 69);
            doc.rect(14, newY + 25, Math.max((quantumSafe / Math.max(activeAssets, 1)) * 150 + 5, 5), 12, 'F');
            doc.text("Quantum Safe", 170, newY + 34);

            doc.setFillColor(200, 200, 200);
            doc.rect(14, newY + 45, 155, 12, 'F');
            doc.text("Total Assets", 170, newY + 54);
          }
          else if (currentType === 'discovery') {
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text("Resource & Discovery Counts", 14, startY);

            const countsData = scanData.counts || {};
            const dom = countsData.domains || 0;
            const ips = countsData.ips || 0;
            const svcs = countsData.services || 0;

            // Draw horizontal bar graph for counts
            let maxCount = Math.max(dom, ips, svcs, 1);
            let barScale = 120 / maxCount;

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);

            // Domains
            doc.text("Discovered Domains", 14, startY + 15);
            doc.setFillColor(229, 160, 62);
            doc.rect(60, startY + 10, dom * barScale + 5, 8, 'F');
            doc.text(`${dom}`, 65 + dom * barScale + 5, startY + 15);

            // IPs
            doc.text("Unique IP Addresses", 14, startY + 30);
            doc.setFillColor(181, 10, 46);
            doc.rect(60, startY + 25, ips * barScale + 5, 8, 'F');
            doc.text(`${ips}`, 65 + ips * barScale + 5, startY + 30);

            // Services
            doc.text("Active Services", 14, startY + 45);
            doc.setFillColor(100, 100, 100);
            doc.rect(60, startY + 40, svcs * barScale + 5, 8, 'F');
            doc.text(`${svcs}`, 65 + svcs * barScale + 5, startY + 45);

            const body = [
              ['Domains Discovered', dom.toString()],
              ['Unique IPs', ips.toString()],
              ['Active Services', svcs.toString()]
            ];

            autoTable(doc, {
              startY: startY + 60,
              head: [['Discovery Category', 'Count']],
              body: body,
              theme: 'grid',
              headStyles: { fillColor: [229, 160, 62] },
            });
          }
          else if (currentType === 'inventory') {
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text("Detailed Open Ports & Services Allocation", 14, startY);

            const ports = (scanData.inventory?.ports) || [];
            let body = ports.map(p => [p.port?.toString(), p.service?.toString()]);
            if (body.length === 0) body = [['No ports found', 'N/A']];

            autoTable(doc, {
              startY: startY + 10,
              head: [['Open Port', 'Associated Service / Protocol']],
              body: body,
              theme: 'striped',
              styles: { cellPadding: 4, fontSize: 10 },
              headStyles: { fillColor: [181, 10, 46], textColor: [255, 255, 255], fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [252, 248, 242] },
            });
          }
          else if (currentType === 'cbom') {
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text("Cryptographic Bill of Materials (CBOM)", 14, startY);

            let body = [];
            let qSafeCount = 0;
            let qVulnCount = 0;

            let sourceList = [];
            if (Array.isArray(scanData.cbom)) sourceList = scanData.cbom;
            else if (scanData.cbom && Array.isArray(scanData.cbom.components)) sourceList = scanData.cbom.components;
            else if (scanData.cbom && Array.isArray(scanData.cbom.items)) sourceList = scanData.cbom.items;

            sourceList.forEach(item => {
              const isSafe = item.quantum_safe || item.is_quantum_safe;
              if (isSafe) qSafeCount++; else qVulnCount++;
              body.push([
                item.domain || item.name || 'Unknown',
                item.algorithm || item.cipher || item.crypto_algorithm || 'Unknown',
                item.key_size?.toString() || item.key_length?.toString() || item.size?.toString() || 'N/A',
                isSafe ? 'Secure' : 'Vulnerable'
              ]);
            });

            // Draw ratio bar
            doc.setFontSize(11);
            doc.text("Quantum Preparedness Ratio", 14, startY + 15);
            doc.setDrawColor(200, 200, 200);
            doc.rect(14, startY + 20, 150, 10);

            let totalCryptos = Math.max(qSafeCount + qVulnCount, 1);
            if ((qSafeCount + qVulnCount) > 0) {
              let safeRatio = qSafeCount / totalCryptos;
              doc.setFillColor(40, 167, 69); // Green
              doc.rect(14, startY + 20, 150 * safeRatio, 10, 'F');
              doc.setFillColor(220, 53, 69); // Red
              doc.rect(14 + (150 * safeRatio), startY + 20, 150 * (1 - safeRatio), 10, 'F');
            } else {
              doc.setFillColor(220, 220, 220);
              doc.rect(14, startY + 20, 150, 10, 'F');
            }

            doc.setFontSize(10);
            doc.setTextColor(40, 167, 69);
            doc.text(`Quantum Safe: ${qSafeCount}`, 14, startY + 38);
            doc.setTextColor(220, 53, 69);
            doc.text(`Vulnerable: ${qVulnCount}`, 80, startY + 38);

            if (body.length > 0) {
              autoTable(doc, {
                startY: startY + 45,
                head: [['Asset / Domain', 'Algorithm', 'Key Size', 'PQC Status']],
                body: body,
                theme: 'grid',
                styles: { cellPadding: 3, fontSize: 9 },
                headStyles: { fillColor: [229, 160, 62], fontStyle: 'bold' },
                didParseCell: function (data) {
                  if (data.section === 'body' && data.column.index === 3) {
                    if (data.cell.raw === 'Secure') data.cell.styles.textColor = [40, 167, 69];
                    else data.cell.styles.textColor = [220, 53, 69];
                  }
                }
              });
            } else {
              const str = JSON.stringify(scanData.cbom || {}, null, 2);
              doc.setFontSize(9);
              doc.setFont("courier", "normal");
              const lines = doc.splitTextToSize(str, pageWidth - 28);
              doc.text(lines, 14, startY + 45);
            }
          }
          else if (currentType === 'pqc') {
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text("Post-Quantum Cryptography Assessment", 14, startY);

            // Health Status Dashboard Module
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(14, startY + 5, pageWidth - 28, 40, 3, 3, 'F');

            doc.setFontSize(12);
            doc.setTextColor(80, 80, 80);
            doc.text("System Encryption Modules (PQC)", 25, startY + 15);

            const pRisk = scanData.risk?.toString() || 'Unknown';
            doc.setFontSize(16);
            if (pRisk === 'High Risk' || pRisk === 'High') doc.setTextColor(220, 53, 69);
            else if (pRisk === 'Vulnerable' || pRisk === 'Medium') doc.setTextColor(229, 160, 62);
            else doc.setTextColor(40, 167, 69);
            doc.text(`${pRisk} Profile`, 25, startY + 25);

            const body = [
              ['Classical Security Standard', scanData.classical_security?.toString() || 'Unknown'],
              ['Quantum Security Standard', scanData.quantum_security?.toString() || 'Unknown']
            ];

            autoTable(doc, {
              startY: startY + 50,
              head: [['Encryption Standard', 'Evaluation Status']],
              body: body,
              theme: 'striped',
              headStyles: { fillColor: [181, 10, 46] },
              styles: { cellPadding: 5 }
            });
          }
          else if (currentType === 'cyber') {
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text("Overall Security & Cyber Rating", 14, startY);

            const totalScore = scanData.score || 0;
            const letterRating = scanData.rating || 'N/A';

            // Progress Bar simulation
            doc.setFillColor(230, 230, 230);
            doc.roundedRect(14, startY + 15, pageWidth - 28, 8, 4, 4, 'F');

            let barColor = [220, 53, 69]; // red
            if (totalScore >= 800) barColor = [40, 167, 69]; // green
            else if (totalScore >= 500) barColor = [229, 160, 62]; // gold

            doc.setFillColor(...barColor);
            doc.roundedRect(14, startY + 15, Math.max((totalScore / 1000) * (pageWidth - 28), 10), 8, 4, 4, 'F');

            doc.setFontSize(40);
            doc.setTextColor(...barColor);
            doc.text(`${totalScore}`, 14, startY + 40);

            doc.setFontSize(20);
            doc.setTextColor(150, 150, 150);
            doc.text("/ 1000", 14 + doc.getTextWidth(`${totalScore}`) + 2, startY + 40);

            doc.setFontSize(16);
            doc.setTextColor(100, 100, 100);
            doc.text(`Rating Segment: ${letterRating}`, 14, startY + 55);

            if (scanData.insights && scanData.insights.length > 0) {
              doc.setFontSize(14);
              doc.setTextColor(50, 50, 50);
              doc.text("Key Vulnerability Insights:", 14, startY + 75);

              let cursorY = startY + 85;
              scanData.insights.forEach(insight => {
                // Format insight as bullet with left border
                doc.setFillColor(229, 160, 62);
                doc.rect(14, cursorY, 2, 8, 'F'); // left accent border
                doc.setFontSize(10);
                doc.setTextColor(80, 80, 80);
                const lines = doc.splitTextToSize(insight, pageWidth - 35);
                doc.text(lines, 20, cursorY + 4);
                cursorY += (lines.length * 5) + 6;
              });
            }
          }
          else {
            doc.setFontSize(11);
            doc.text(`Data dump for ${currentType}`, 14, startY);
            const str = JSON.stringify(scanData, null, 2);
            const lines = doc.splitTextToSize(str, pageWidth - 28);
            let cursorY = startY + 10;
            doc.setFont("courier", "normal");
            for (let i = 0; i < lines.length; i++) {
              if (cursorY > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                cursorY = 20;
              }
              doc.text(lines[i], 14, cursorY);
              cursorY += 5;
            }
          }
        });
      }

      // Add footers to all pages EXCEPT the title page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(250, 188, 10); // PNB Gold
        doc.setLineWidth(0.5);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text("REQUIEM | PNB", 14, pageHeight - 10);

        doc.text(`Page ${i - 1}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }

      doc.save(reportName);

      // Convert PDF to blob or file object for sending to backend
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, reportName);
      formData.append('reportTypes', selectedReports.join(','));
      if (sendViaEmail && emailAddresses) {
        formData.append('send_email', 'true');
        formData.append('email_addresses', emailAddresses);
      }
      if (saveToLocation && saveLocationPath) {
        formData.append('save_location', 'true');
        formData.append('location_path', saveLocationPath);
      }
      if (slackNotification) {
        formData.append('send_slack', 'true');
      }

      // Send to backend
      fetch('/api/reports/deliver', {
        method: 'POST',
        body: formData,
      })
        .then(res => res.json())
        .then(data => {
          console.log("Delivery response:", data);
          let alerts = [];
          if (slackNotification) alerts.push("Alert pushed to Slack!");
          if (sendViaEmail && emailAddresses) alerts.push("Report scheduled for email delivery.");
          if (saveToLocation && saveLocationPath) alerts.push("Report saved to: " + saveLocationPath);

          if (alerts.length > 0) alert(alerts.join("\n"));
        })
        .catch(err => {
          console.error("Error delivering report:", err);
          alert("Warning: PDF was generated locally, but there was an error communicating with the backend for delivery.");
        })
        .finally(() => {
          setIsGenerating(false);
        });
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
            <h3 className="text-[#59534f] font-bold text-base px-2">Select Report Contents</h3>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white border border-[#f1e6b8] rounded-xl px-4 py-3 flex items-center justify-between text-[#8c8581] shadow-sm hover:border-[#e5a03e] transition-colors"
              >
                <span className={selectedReports.length > 0 ? "text-[#59534f] font-medium" : ""}>
                  {selectedReports.length > 0 ? `${selectedReports.length} report${selectedReports.length > 1 ? 's' : ''} selected` : 'Select Reports'}
                </span>
                <span className="material-symbols-outlined text-[#e5a03e]">{isDropdownOpen ? 'expand_less' : 'expand_more'}</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#f1e6b8] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] py-2 z-50 max-h-60 overflow-y-auto">
                  {reportTypes.map((type) => {
                    const isSelected = selectedReports.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleSelectReport(type.id)}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${isSelected ? 'bg-[#fff9f0]' : 'hover:bg-[#fff9f0]'} text-left`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-[#e5a03e] border-[#e5a03e]' : 'border-outline-variant outline-none'}`}>
                          {isSelected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                        </div>
                        <span className={`${isSelected ? 'text-[#e5a03e]' : 'text-[#8c8581]'} material-symbols-outlined text-xl`}>{type.icon}</span>
                        <span className="text-[#59534f] font-medium text-sm">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Pills */}
            {selectedReports.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 pt-2">
                {selectedReports.map((id) => {
                  const r = reportTypes.find(type => type.id === id);
                  return (
                    <div key={id} className="flex items-center gap-1.5 bg-[#fff9f0] border border-[#e5a03e]/30 text-[#59534f] px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                      <span className="material-symbols-outlined text-[#e5a03e] text-[16px]">{r?.icon}</span>
                      {r?.label}
                      <button onClick={() => removeReport(id)} className="ml-1 text-[#c4bbb6] hover:text-red-500 transition-colors flex items-center">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
                      value={emailAddresses}
                      onChange={(e) => setEmailAddresses(e.target.value)}
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
                      value={saveLocationPath}
                      onChange={(e) => setSaveLocationPath(e.target.value)}
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
