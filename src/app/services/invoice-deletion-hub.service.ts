import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { ApiService } from './api.service';

/** استجابة الإدمن على طلب حذف فاتورة */
export type DeletionProcessedAction = 'approved' | 'rejected';

export interface DeletionProcessedEvent {
  invoiceId: number;
  action: DeletionProcessedAction;
}

/**
 * خدمة SignalR للاستماع لحدث تأكيد/رفض حذف الفاتورة من الإدمن.
 * عند استقبال DeletionProcessed نحدّث قائمة الفواتير في الـ UI.
 */
@Injectable({
  providedIn: 'root',
})
export class InvoiceDeletionHubService {
  private connection: signalR.HubConnection | null = null;
  private readonly hubPath = '/hubs/invoice-deletion';

  /** يُبث عند استقبال DeletionProcessed من الـ Hub */
  private deletionProcessed$ = new Subject<DeletionProcessedEvent>();
  readonly onDeletionProcessed = this.deletionProcessed$.asObservable();

  constructor(private api: ApiService) {}

  /** بدء الاتصال بالـ Hub والاستماع لـ DeletionProcessed */
  async startConnection(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }
    if (this.connection?.state === signalR.HubConnectionState.Connecting) {
      return;
    }

    const baseUrl = this.api.getBaseUrl();
    const hubUrl = baseUrl.replace(/\/$/, '') + this.hubPath;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    this.connection.on('DeletionProcessed', (invoiceId: number, action: string) => {
      const event: DeletionProcessedEvent = {
        invoiceId,
        action: action === 'approved' || action === 'rejected' ? action : 'rejected',
      };
      this.deletionProcessed$.next(event);
    });

    try {
      await this.connection.start();
    } catch (err: any) {
      // 404 = الـ Hub مش موجود على الـ base الحالي (استخدم local في api.service لو الباك على localhost)
      if (err?.message?.includes('404') || err?.statusCode === 404) {
        console.info(
          '[InvoiceDeletionHub] Hub غير متاح (404). للتطوير: غيّر baseUrl في api.service إلى localhost إذا الباك يعمل محلياً.'
        );
      } else {
        console.warn('[InvoiceDeletionHub] Failed to start connection:', err);
      }
    }
  }

  /** إيقاف الاتصال */
  async stopConnection(): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.stop();
    } catch (err) {
      console.warn('[InvoiceDeletionHub] Error stopping connection:', err);
    } finally {
      this.connection = null;
    }
  }
}
