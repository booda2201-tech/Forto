import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

/** يستخرج رسالة الخطأ من استجابة الباك إند */
function getBackendErrorMessage(err: HttpErrorResponse): string {
  const body = err?.error;
  if (!body) return err?.message || 'حدث خطأ';

  // { message: "..." } أو { Message: "..." } (PascalCase من .NET)
  const msg = body.message ?? body.Message;
  if (typeof msg === 'string' && msg.trim()) {
    return msg;
  }

  // { errors: { field: ["msg1", "msg2"] } } أو { Errors: {...} }
  const errors = body.errors ?? body.Errors;
  if (errors && typeof errors === 'object') {
    const msgs: string[] = [];
    for (const key of Object.keys(errors)) {
      const arr = errors[key];
      if (Array.isArray(arr)) msgs.push(...arr.filter((s: any) => typeof s === 'string'));
      else if (typeof arr === 'string') msgs.push(arr);
    }
    if (msgs.length > 0) return msgs.join(' | ');
  }

  return err?.message || 'حدث خطأ';
}

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private toastr: ToastrService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((err: HttpErrorResponse) => {
        const msg = getBackendErrorMessage(err);
        // استثناءات:
        // - صفحة تسجيل الدخول (تعرض الخطأ في النموذج)
        // - فحص دورة غسيل السيارة عند "car not found" لأننا نتعامل معها كغسلة أولى بدون تنبيه
        const url = request.url?.toLowerCase() || '';
        const isSignin = url.includes('/auth/signin');
        const isWashCycle = url.includes('/api/cars/wash-cycle');
        const isCarNotFound =
          String(msg || '').toLowerCase().includes('car not found');

        if (!isSignin && !(isWashCycle && isCarNotFound)) {
          this.toastr.error(msg, 'خطأ', { timeOut: 5000 });
        }
        return throwError(() => err);
      })
    );
  }
}
