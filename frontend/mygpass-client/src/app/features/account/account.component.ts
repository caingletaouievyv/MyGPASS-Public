import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page-shell">
      <section class="content-card" aria-live="polite">
        <header class="page-header">
          <div class="header-badge">Account</div>
          <div>
            <p class="eyebrow">Profile</p>
            <h1>My profile</h1>
          </div>
        </header>

        @if (user(); as currentUser) {
          <div class="profile-summary" aria-label="Profile summary">
            <div class="avatar" aria-hidden="true">
              {{ displayInitials(currentUser) }}
            </div>
            <div>
              <p class="summary-label">Welcome back</p>
              <h2>{{ currentUser.firstName || 'User' }} {{ currentUser.lastName || '' }}</h2>
            </div>
          </div>

          <div class="info-panel">
            <h3>Contact details</h3>
            <dl class="profile-list">
              <div class="profile-row">
                <dt>First name</dt>
                <dd>{{ currentUser.firstName || 'Unavailable' }}</dd>
              </div>
              <div class="profile-row">
                <dt>Last name</dt>
                <dd>{{ currentUser.lastName || 'Unavailable' }}</dd>
              </div>
              <div class="profile-row">
                <dt>Mobile number</dt>
                <dd>{{ currentUser.mobileNumber || 'Unavailable' }}</dd>
              </div>
              <div class="profile-row">
                <dt>Email</dt>
                <dd>{{ currentUser.email || 'Unavailable' }}</dd>
              </div>
            </dl>
          </div>
        } @else {
          <div class="empty-state" role="status">
            <p>Your account details are unavailable.</p>
          </div>
        }
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .page-shell {
      padding: 32px 20px 48px;
      display: flex;
      justify-content: center;
    }

    .content-card {
      width: min(100%, 1120px);
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
    }

    .page-header {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
    }

    .page-header > div:last-child { min-width: 0; }

    .header-badge {
      display: inline-flex;
      width: 96px;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      background: rgba(34, 197, 94, 0.12);
      color: #166534;
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .eyebrow {
      margin: 0 0 8px;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #15803d;
      font-weight: 700;
    }

    h1 {
      margin: 0;
      color: #111827;
      font-size: clamp(1.8rem, 2.6vw, 2.5rem);
      line-height: 1.15;
    }

    .profile-summary {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 18px 20px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, rgba(22, 163, 74, 0.06), rgba(255, 255, 255, 1));
      border: 1px solid rgba(22, 163, 74, 0.12);
      border-radius: 16px;
    }

    .avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #15803d;
      color: #ffffff;
      font-weight: 700;
      font-size: 1.1rem;
      box-shadow: 0 8px 18px rgba(21, 128, 61, 0.18);
    }

    .summary-label {
      margin: 0 0 6px;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4b5563;
    }

    .profile-summary h2 {
      margin: 0;
      color: #111827;
      font-size: 1.25rem;
      line-height: 1.3;
    }

    .info-panel {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 20px 18px;
    }

    .info-panel h3 {
      margin: 0 0 18px;
      color: #111827;
      font-size: 1rem;
      letter-spacing: 0.02em;
    }

    .profile-list {
      display: grid;
      gap: 14px;
      margin: 0;
    }

    .profile-row {
      display: grid;
      grid-template-columns: minmax(160px, 180px) minmax(0, 1fr);
      gap: 16px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    }

    .profile-row:first-child {
      border-top: 0;
      padding-top: 0;
    }

    dt {
      margin: 0;
      font-weight: 700;
      color: #374151;
      line-height: 1.5;
    }

    dd {
      margin: 0;
      color: #111827;
      line-height: 1.6;
      word-break: break-word;
      font-weight: 500;
    }

    .empty-state {
      padding: 22px;
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      background: #f8fafc;
      color: #374151;
    }

    .empty-state p {
      margin: 0;
      font-size: 1rem;
    }

    @media (max-width: 640px) {
      .content-card {
        padding: 20px 16px;
      }

      .page-header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .profile-summary {
        flex-direction: column;
        align-items: flex-start;
      }

      .profile-row {
        grid-template-columns: 1fr;
        gap: 6px;
      }
    }
  `
})
export class AccountComponent {
  private readonly authService = inject(AuthService);
  readonly user = this.authService.currentUser;

  displayInitials(user: { firstName?: string | null; lastName?: string | null } | null): string {
    const first = user?.firstName?.trim()?.charAt(0) ?? '';
    const last = user?.lastName?.trim()?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }
}
