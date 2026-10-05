import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken = inject(AuthService).getAccessToken();
  if (!accessToken) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` }
  }));
};
