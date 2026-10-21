import { SentLetter } from '../types';

export interface LetterheadConfig {
  companyName?: string;
  slogan?: string;
  regNo?: string;
  economicCode?: string;
  phone?: string;
  address?: string;
  stampImageBase64?: string;
}

export const generateWordDocument = (letter: SentLetter, config?: LetterheadConfig) => {
  let tableHtml = '';
  if (letter.hasPriceTable && letter.priceItems && letter.priceItems.length > 0) {
    const rows = letter.priceItems.map((item, idx) => `
      <tr>
        <td style="border: 1px solid #13213c; padding: 8px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #13213c; padding: 8px;">${item.service || '-'}</td>
        <td style="border: 1px solid #13213c; padding: 8px; text-align: center; font-weight: bold;">${item.fee || '-'}</td>
      </tr>
    `).join('');
    tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11pt;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #13213c;">
            <th style="border: 1px solid #13213c; padding: 9px; width: 8%;">ردیف</th>
            <th style="border: 1px solid #13213c; padding: 9px; width: 62%;">شرح خدمات</th>
            <th style="border: 1px solid #13213c; padding: 9px; width: 30%;">حق‌الزحمه (ریال / تومان)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${letter.priceConditions ? `<div style="font-size: 10pt; line-height: 1.8; color: #334155; margin-bottom: 25px;">${letter.priceConditions}</div>` : ''}
    `;
  }

  let transcriptsHtml = '';
  if (letter.transcripts && letter.transcripts.length > 0) {
    const tRows = letter.transcripts.map(t => `
      <div style="font-size: 9.5pt; color: #475569; margin-bottom: 4px;">
        <strong>- ${t.name || ''}</strong> (${t.position || ''}) ${t.reason ? `: ${t.reason}` : ''}
      </div>
    `).join('');
    transcriptsHtml = `
      <div style="border-top: 1px dashed #cbd5e1; margin-top: 35px; padding-top: 12px;">
        <strong style="font-size: 10pt; color: #13213c; display: block; margin-bottom: 6px;">رونوشت:</strong>
        ${tRows}
      </div>
    `;
  }

  const companyTitle = config?.companyName || 'شرکت مهندسی رهنمون کیفیت رابو';
  const slogan = config?.slogan || 'رهنمون کیفیت، ایمنی و مدیریت یکپارچه سازمانی';

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${letter.id}</title>
    <style>
      body { font-family: 'IRANSans', 'B Nazanin', Tahoma, Arial; direction: rtl; text-align: justify; margin: 40px; }
      .header-table { width: 100%; border-bottom: 2.5px solid #13213c; padding-bottom: 12px; margin-bottom: 25px; }
      .logo-cell { font-size: 20pt; font-weight: bold; color: #13213c; }
      .meta-cell { font-size: 10.5pt; text-align: left; line-height: 1.8; }
      .recipient-block { font-size: 13pt; font-weight: bold; color: #0f172a; margin-bottom: 15px; }
      .subject-block { font-size: 12pt; font-weight: bold; color: #13213c; margin-bottom: 20px; }
      .body-content { font-size: 12pt; line-height: 2; margin-bottom: 25px; text-align: justify; }
      .signature-area { width: 100%; margin-top: 35px; text-align: left; padding-left: 40px; }
      .signer-title { font-size: 11pt; font-weight: bold; color: #13213c; line-height: 1.6; }
    </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td class="logo-cell">${companyTitle}<br><span style="font-size: 10pt; color: #e4b427; font-weight: normal;">${slogan}</span></td>
          <td class="meta-cell">
            <strong>شماره نامه:</strong> ${letter.id}<br>
            <strong>تاریخ صدور:</strong> ${letter.date}<br>
            <strong>پیوست:</strong> ${letter.hasAttachment}<br>
            <strong>واحد صادرکننده:</strong> ${letter.unit}
          </td>
        </tr>
      </table>
      <div class="recipient-block">${letter.recipientPerson ? `${letter.recipientPerson}<br>` : ''}${letter.recipientOrg}</div>
      <div class="subject-block">موضوع: ${letter.subject}</div>
      <div class="body-content">${(letter.bodyText || '').replace(/\n/g, '<br>')}</div>
      ${tableHtml}
      
      <!-- Only Signer is printed; Creator and Approver remain internal only -->
      <table style="width: 100%; margin-top: 40px;">
        <tr>
          <td style="width: 50%;"></td>
          <td style="width: 50%; text-align: center;">
            <div class="signer-title">با احترام و سپاس<br><br><strong>${letter.signerName}</strong><br><span style="font-size: 9.5pt; color: #64748b; font-weight: normal;">مدیریت ارشد شرکت مهندسی رابو</span></div>
            ${config?.stampImageBase64 ? `<div style="margin-top: 10px;"><img src="${config.stampImageBase64}" style="max-height: 80px;" alt="مهر و امضای رسمی" /></div>` : ''}
          </td>
        </tr>
      </table>

      ${transcriptsHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${letter.id}.doc`;
  link.click();
  URL.revokeObjectURL(url);
};
