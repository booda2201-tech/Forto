import { Injectable } from '@angular/core';

/**
 * يطبع الفاتورة في iframe مخفي - بدون فتح تاب جديد.
 * يضمن طباعة صفحة واحدة بدون تكرار.
 */
@Injectable({ providedIn: 'root' })
export class PrintInvoiceService {
  print(elementId: string = 'printableInvoice') {
    const el = document.getElementById(elementId);
    if (!el) {
      console.warn('PrintInvoiceService: element not found', elementId);
      window.print();
      return;
    }

    const base = document.querySelector('base')?.href || window.location.origin + '/';
    const html = el.innerHTML;
    const fixedHtml = html.replace(
      /src="([^"]*)"/g,
      (_, src) => {
        if (src.startsWith('http') || src.startsWith('data:')) return `src="${src}"`;
        try {
          const resolved = new URL(src, base).href;
          return `src="${resolved}"`;
        } catch {
          return `src="${base.replace(/\/$/, '')}/${src.replace(/^\//, '')}"`;
        }
      }
    );

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;left:-9999px;top:-9999px;';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>فاتورة - Forto</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 1.5cm; color: #000; }
    .brand-logo { max-width: 120px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #333; padding: 6px; text-align: right; }
    th { background: #f5f5f5; }
    hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
    .text-center { text-align: center; }
    .text-end { text-align: right; }
    .fw-bold { font-weight: bold; }
    .small { font-size: 11px; color: #666; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-3 { margin-bottom: 12px; }
    .mt-1 { margin-top: 4px; }
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }
    .d-flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
  </style>
</head>
<body>
  <div class="forto-invoice">${fixedHtml}</div>
</body>
</html>`);
    doc.close();

    iframe.onload = () => {
      const win = iframe.contentWindow!;
      win.focus();
      win.print();
      win.onafterprint = () => {
        document.body.removeChild(iframe);
      };
    };
  }
}
