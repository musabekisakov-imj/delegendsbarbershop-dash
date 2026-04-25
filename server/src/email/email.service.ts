import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface BookingConfirmationData {
  to: string;
  clientFirstName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  shopName: string;
  shopPhone: string;
  officeName: string;
  officeAddress: string;
}

interface BookingCancellationData {
  to: string;
  clientFirstName: string;
  serviceName: string;
  startTime: Date;
  shopName: string;
  shopPhone: string;
  reason?: string;
}

/**
 * Email sender — Resend (https://resend.com).
 *
 * In dev mode (EMAIL_DRY_RUN=true), emails are logged to console
 * instead of sent. Lets you test booking flows without burning
 * the free-tier 3k/month quota or spamming real inboxes.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly replyTo: string | undefined;
  private readonly dryRun: boolean;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.from = config.get<string>('EMAIL_FROM') ?? 'BarberPro <noreply@example.com>';
    this.replyTo = config.get<string>('EMAIL_REPLY_TO');
    this.dryRun = config.get<string>('EMAIL_DRY_RUN') === 'true';

    this.resend = apiKey && apiKey !== 're_xxx_your_key_here' ? new Resend(apiKey) : null;

    if (!this.resend && !this.dryRun) {
      this.logger.warn('EMAIL_DRY_RUN=false but RESEND_API_KEY missing — emails will fail silently.');
    }
  }

  async sendBookingConfirmation(data: BookingConfirmationData) {
    return this.send({
      to: data.to,
      subject: `Booking confirmed — ${this.formatDate(data.startTime)}`,
      html: this.renderConfirmation(data),
    });
  }

  async sendBookingCancellation(data: BookingCancellationData) {
    return this.send({
      to: data.to,
      subject: `Booking cancelled — ${data.shopName}`,
      html: this.renderCancellation(data),
    });
  }

  // ─── Internal ─────────────────────────────────────────
  private async send({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (this.dryRun) {
      this.logger.log(`[DRY-RUN] → ${to} · ${subject}`);
      this.logger.debug(html.replace(/\s+/g, ' ').slice(0, 300) + '…');
      return { id: 'dry-run', dryRun: true };
    }
    if (!this.resend) {
      this.logger.error('Email send attempted without RESEND_API_KEY configured');
      return null;
    }
    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        ...(this.replyTo && { replyTo: this.replyTo }),
      });
      this.logger.log(`Sent → ${to} · ${subject} · id=${result.data?.id}`);
      return result;
    } catch (err) {
      this.logger.error(`Send failed → ${to} · ${(err as Error).message}`);
      return null;
    }
  }

  private formatDate(d: Date) {
    return d.toLocaleString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ─── Templates ───────────────────────────────────────
  // Inline HTML (no separate template engine for Phase 0). Move to
  // Handlebars + react-email in Phase 1 if templates grow complex.
  private renderConfirmation(d: BookingConfirmationData) {
    return /* html */ `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0a0a0a;background:#ffffff">
        <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#737373;margin:0">Booking confirmed</p>
        <h1 style="font-size:28px;font-weight:700;margin:6px 0 24px;letter-spacing:-0.01em">Hi ${this.escape(d.clientFirstName)},</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#404040">Your appointment with <strong>${this.escape(d.shopName)}</strong> is confirmed:</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
          <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#737373;font-size:11px;letter-spacing:0.18em;text-transform:uppercase">Service</td><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:600;text-align:right">${this.escape(d.serviceName)}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#737373;font-size:11px;letter-spacing:0.18em;text-transform:uppercase">Barber</td><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:600;text-align:right">${this.escape(d.staffName)}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#737373;font-size:11px;letter-spacing:0.18em;text-transform:uppercase">When</td><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:600;text-align:right;font-variant-numeric:tabular-nums">${this.formatDate(d.startTime)}</td></tr>
          <tr><td style="padding:10px 0;color:#737373;font-size:11px;letter-spacing:0.18em;text-transform:uppercase">Where</td><td style="padding:10px 0;font-weight:600;text-align:right">${this.escape(d.officeName)}<br><span style="font-weight:400;color:#737373;font-size:13px">${this.escape(d.officeAddress)}</span></td></tr>
        </table>
        <p style="font-size:13px;line-height:1.6;color:#737373;margin:0 0 8px">Need to reschedule? Reply to this email or call us on <strong style="color:#0a0a0a">${this.escape(d.shopPhone)}</strong>.</p>
        <p style="font-size:11px;color:#a3a3a3;margin:32px 0 0;letter-spacing:0.05em">${this.escape(d.shopName)}</p>
      </div>
    `;
  }

  private renderCancellation(d: BookingCancellationData) {
    return /* html */ `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0a0a0a;background:#ffffff">
        <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#b45309">Booking cancelled</p>
        <h1 style="font-size:28px;font-weight:700;margin:6px 0 24px;letter-spacing:-0.01em">Hi ${this.escape(d.clientFirstName)},</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px;color:#404040">
          Your appointment for <strong>${this.escape(d.serviceName)}</strong> on
          <strong style="font-variant-numeric:tabular-nums">${this.formatDate(d.startTime)}</strong> has been cancelled.
        </p>
        ${d.reason ? `<p style="font-size:14px;color:#737373;margin:0 0 16px"><em>${this.escape(d.reason)}</em></p>` : ''}
        <p style="font-size:14px;line-height:1.6;color:#404040;margin:24px 0 8px">
          Want to rebook? Reply to this email or call <strong>${this.escape(d.shopPhone)}</strong>.
        </p>
        <p style="font-size:11px;color:#a3a3a3;margin:32px 0 0;letter-spacing:0.05em">${this.escape(d.shopName)}</p>
      </div>
    `;
  }

  private escape(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
