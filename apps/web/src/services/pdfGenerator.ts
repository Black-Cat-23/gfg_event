export interface PDFScorecardData {
  teamName: string;
  teamCode: string;
  leaderName: string;
  member2Name: string;
  quizScore: number;
  quizRank: number;
  marketNetWorth: number;
  marketRank: number;
  overallScore: number;
  overallRank: number;
  totalTeams: number;
  date: string;
}

export function generateScorecardPDF(data: PDFScorecardData) {
  // Create an iframe or printable window to render the exact scorecard HTML
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Please allow pop-ups to download your PDF Scorecard!');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Scorecard_${data.teamName.replace(/\s+/g, '_')}_Kickstart2.0</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            background-color: #FAFAFA;
            color: #111827;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .container {
            max-width: 650px;
            margin: 0 auto;
            background: #FFFFFF;
            border: 2px solid #F59E0B;
            border-radius: 24px;
            padding: 36px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            position: relative;
          }

          .trophy-badge {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, #F59E0B, #FBBF24);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 16px auto;
            color: #FFFFFF;
            box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
          }

          .badge-pill {
            display: inline-block;
            background: rgba(245, 158, 11, 0.12);
            color: #D97706;
            border: 1px solid rgba(245, 158, 11, 0.3);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 12px;
          }

          h1 {
            font-size: 26px;
            font-weight: 900;
            margin: 0 0 8px 0;
            line-height: 1.25;
            color: #111827;
          }

          .subtext {
            font-size: 13px;
            color: #6B7280;
            font-weight: 600;
            margin-bottom: 24px;
          }

          .team-card {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 16px;
            padding: 16px 20px;
            margin-bottom: 24px;
            text-align: left;
          }

          .team-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .team-name {
            font-size: 18px;
            font-weight: 900;
            color: #111827;
          }

          .team-code {
            font-family: monospace;
            background: rgba(79, 70, 229, 0.1);
            color: #4F46E5;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 800;
          }

          .members {
            font-size: 12px;
            color: #4B5563;
            font-weight: 600;
            border-top: 1px solid #E5E7EB;
            padding-top: 8px;
          }

          .section-title {
            font-size: 11px;
            font-weight: 900;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 12px;
          }

          .score-item {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 14px;
            padding: 14px 18px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-align: left;
          }

          .score-title {
            font-size: 14px;
            font-weight: 800;
            color: #111827;
          }

          .score-rank {
            font-size: 11px;
            color: #6B7280;
            font-weight: 600;
          }

          .score-val {
            font-family: monospace;
            font-size: 16px;
            font-weight: 900;
          }

          .quiz-val { color: #4F46E5; }
          .market-val { color: #16A34A; }

          .grand-card {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.05));
            border: 2px solid #F59E0B;
            border-radius: 16px;
            padding: 18px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 14px;
            text-align: left;
          }

          .grand-title {
            font-size: 15px;
            font-weight: 900;
            color: #111827;
          }

          .grand-rank {
            font-size: 12px;
            color: #D97706;
            font-weight: 800;
          }

          .grand-val {
            font-family: monospace;
            font-size: 20px;
            font-weight: 900;
            color: #4F46E5;
          }

          .footer-sig {
            margin-top: 32px;
            font-size: 12px;
            font-weight: 700;
            color: #6B7280;
            text-align: center;
          }

          .heart {
            color: #EF4444;
            display: inline-block;
          }

          .btn-print {
            margin-top: 20px;
            padding: 12px 28px;
            background: #4F46E5;
            color: white;
            border: none;
            border-radius: 12px;
            font-weight: 800;
            font-size: 14px;
            cursor: pointer;
          }

          @media print {
            .btn-print { display: none; }
            body { padding: 0; background: white; }
            .container { border: 2px solid #F59E0B; shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="trophy-badge">🏆</div>
          <div class="badge-pill">✨ GRAND FINALE SCORECARD</div>
          
          <h1>Thank you for making this event a successful Kickstart 2.0! 🎉</h1>
          <div class="subtext">Official Certified Tournament Result & Team Scorecard</div>

          <div class="team-card">
            <div class="team-row">
              <span class="team-name">${data.teamName}</span>
              <span class="team-code">Code: ${data.teamCode}</span>
            </div>
            <div class="members">
              Members: <strong>${data.leaderName}</strong> & <strong>${data.member2Name}</strong>
            </div>
          </div>

          <div class="section-title">Detailed Event Scorecard</div>

          <!-- Quiz Challenge -->
          <div class="score-item">
            <div>
              <div class="score-title">Activity 1: Quiz Challenge</div>
              <div class="score-rank">Rank #${data.quizRank} of ${data.totalTeams} Teams</div>
            </div>
            <div class="score-val quiz-val">${data.quizScore} pts</div>
          </div>

          <!-- MarketMayhem -->
          <div class="score-item">
            <div>
              <div class="score-title">Activity 2: MarketMayhem Stock Simulation</div>
              <div class="score-rank">Rank #${data.marketRank} of ${data.totalTeams} Teams</div>
            </div>
            <div class="score-val market-val">₹${data.marketNetWorth.toLocaleString()}</div>
          </div>

          <!-- Overall Combined -->
          <div class="grand-card">
            <div>
              <div class="grand-title">🥇 Overall Grand Event Standings</div>
              <div class="grand-rank">Final Event Position #${data.overallRank}</div>
            </div>
            <div class="grand-val">₹${data.overallScore.toLocaleString()}</div>
          </div>

          <div class="footer-sig">
            Made with <span class="heart">❤️</span> by <strong>GFG Tech Lead</strong>
          </div>

          <button class="btn-print" onclick="window.print();">📥 Save / Download PDF Scorecard</button>
        </div>

        <script>
          // Trigger print to PDF dialog automatically
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
