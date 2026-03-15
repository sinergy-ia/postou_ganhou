export type BillingInvoicePayload = {
  invoiceNumber: string;
  generatedAt: string;
  establishmentName: string;
  establishmentEmail: string;
  category: string;
  planName: string;
  billingCycle: string;
  periodLabel: string;
  redeemedCoupons: number;
  issuedCoupons: number;
  totalParticipations: number;
  conversionRate: string;
  approvalRate: string;
  roi: string;
  unitFee: string;
  totalAmount: string;
};

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showPrintFeedback(message: string) {
  if (typeof document === "undefined") {
    return;
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "24px 24px auto auto";
  container.style.zIndex = "9999";
  container.style.maxWidth = "320px";
  container.style.border = "1px solid #e2e8f0";
  container.style.borderRadius = "18px";
  container.style.background = "#ffffff";
  container.style.boxShadow = "0 20px 50px rgba(15, 23, 42, 0.16)";
  container.style.padding = "16px";
  container.style.fontFamily = 'Inter, "Segoe UI", sans-serif';
  container.style.color = "#0f172a";

  const title = document.createElement("div");
  title.textContent = "Nao foi possivel gerar a fatura";
  title.style.fontSize = "14px";
  title.style.fontWeight = "800";

  const description = document.createElement("div");
  description.textContent = message;
  description.style.marginTop = "8px";
  description.style.fontSize = "13px";
  description.style.lineHeight = "1.5";
  description.style.color = "#475569";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Fechar";
  button.style.marginTop = "14px";
  button.style.border = "0";
  button.style.borderRadius = "12px";
  button.style.background = "#0f172a";
  button.style.color = "#ffffff";
  button.style.padding = "10px 14px";
  button.style.fontSize = "13px";
  button.style.fontWeight = "700";
  button.style.cursor = "pointer";
  button.onclick = () => container.remove();

  container.appendChild(title);
  container.appendChild(description);
  container.appendChild(button);
  document.body.appendChild(container);

  window.setTimeout(() => {
    container.remove();
  }, 6000);
}

export function formatDateTimePtBr(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function buildInvoiceNumber(
  establishmentId?: string | null,
  generatedAt = new Date(),
) {
  return `FAT-${generatedAt
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${String(establishmentId || "")
    .slice(-6)
    .toUpperCase()}`;
}

function buildInvoiceHtml(payload: BillingInvoicePayload) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(payload.invoiceNumber)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f8fafc;
      --card: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --primary: #4f46e5;
    }
    * { box-sizing: border-box; }
    @page {
      size: A4;
      margin: 12mm;
    }
    body {
      margin: 0;
      font-family: Inter, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 32px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 32px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #fff;
    }
    .brand {
      font-size: 14px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.75;
      margin-bottom: 12px;
    }
    .title {
      font-size: 34px;
      font-weight: 800;
      margin: 0 0 8px;
    }
    .subtitle {
      margin: 0;
      color: rgba(255,255,255,0.75);
      font-size: 14px;
      line-height: 1.6;
    }
    .meta {
      min-width: 260px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px;
      padding: 20px;
    }
    .meta-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      opacity: 0.7;
      margin-bottom: 6px;
    }
    .meta-value {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 18px;
    }
    .content {
      padding: 32px;
      display: grid;
      gap: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 20px;
      background: #fff;
    }
    .card h3 {
      margin: 0 0 14px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .line:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .line strong {
      color: var(--text);
    }
    .summary {
      border: 1px solid #c7d2fe;
      background: #eef2ff;
      border-radius: 20px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-end;
    }
    .summary-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #4338ca;
      font-weight: 700;
    }
    .summary-total {
      font-size: 40px;
      font-weight: 900;
      color: #312e81;
      line-height: 1;
      margin-top: 8px;
    }
    .summary-note {
      max-width: 340px;
      color: #4338ca;
      font-size: 13px;
      line-height: 1.6;
    }
    .footer {
      padding: 0 32px 32px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.7;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .sheet {
        box-shadow: none;
        border: 0;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="header">
      <div>
        <div class="brand">Marque &amp; Ganhe</div>
        <h1 class="title">Fatura de cobranca</h1>
        <p class="subtitle">Documento gerado pelo painel para conferencia administrativa da cobranca por resgates de cupons.</p>
      </div>
      <aside class="meta">
        <div class="meta-label">Numero da fatura</div>
        <div class="meta-value">${escapeHtml(payload.invoiceNumber)}</div>
        <div class="meta-label">Gerado em</div>
        <div class="meta-value">${escapeHtml(payload.generatedAt)}</div>
      </aside>
    </section>

    <section class="content">
      <div class="grid">
        <section class="card">
          <h3>Estabelecimento</h3>
          <div class="line"><span>Nome</span><strong>${escapeHtml(payload.establishmentName)}</strong></div>
          <div class="line"><span>E-mail</span><strong>${escapeHtml(payload.establishmentEmail)}</strong></div>
          <div class="line"><span>Categoria</span><strong>${escapeHtml(payload.category)}</strong></div>
        </section>

        <section class="card">
          <h3>Plano e periodo</h3>
          <div class="line"><span>Plano</span><strong>${escapeHtml(payload.planName)}</strong></div>
          <div class="line"><span>Ciclo</span><strong>${escapeHtml(payload.billingCycle)}</strong></div>
          <div class="line"><span>Periodo</span><strong>${escapeHtml(payload.periodLabel)}</strong></div>
        </section>
      </div>

      <section class="card">
        <h3>Resumo de performance</h3>
        <div class="line"><span>Participacoes</span><strong>${escapeHtml(payload.totalParticipations)}</strong></div>
        <div class="line"><span>Cupons emitidos</span><strong>${escapeHtml(payload.issuedCoupons)}</strong></div>
        <div class="line"><span>Cupons resgatados</span><strong>${escapeHtml(payload.redeemedCoupons)}</strong></div>
        <div class="line"><span>Taxa de conversao</span><strong>${escapeHtml(payload.conversionRate)}</strong></div>
        <div class="line"><span>Taxa de aprovacao</span><strong>${escapeHtml(payload.approvalRate)}</strong></div>
        <div class="line"><span>ROI estimado</span><strong>${escapeHtml(payload.roi)}</strong></div>
        <div class="line"><span>Taxa unitaria por resgate</span><strong>${escapeHtml(payload.unitFee)}</strong></div>
      </section>

      <section class="summary">
        <div>
          <div class="summary-label">Valor total estimado</div>
          <div class="summary-total">${escapeHtml(payload.totalAmount)}</div>
        </div>
        <div class="summary-note">
          Total calculado com base na quantidade de cupons resgatados multiplicada pela taxa unitaria do plano vigente.
        </div>
      </section>
    </section>

    <footer class="footer">
      O PDF pode ser salvo usando a impressao do navegador em "Salvar como PDF".
    </footer>
  </main>
</body>
</html>`;
}

export function openInvoicePdf(payload: BillingInvoicePayload) {
  openHtmlAsPdf(buildInvoiceHtml(payload));
}

export function openHtmlAsPdf(html: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;

  if (!printWindow) {
    iframe.remove();
    showPrintFeedback("Tente novamente em instantes.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  let hasPrinted = false;

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 300);
  };

  const triggerPrint = () => {
    if (hasPrinted) {
      return;
    }

    hasPrinted = true;
    printWindow.focus();
    printWindow.print();
  };

  iframe.onload = () => {
    window.setTimeout(triggerPrint, 250);
  };

  try {
    printWindow.addEventListener("afterprint", cleanup, { once: true });
  } catch {
    // Ignore browsers that do not expose event listeners on iframe windows.
  }

  window.setTimeout(triggerPrint, 500);
  window.setTimeout(cleanup, 60000);
}
