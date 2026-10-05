import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import { BackToTopComponent } from '../../shared/back-to-top/back-to-top.component';
import { CollectionControlsComponent } from '../../shared/collection-controls/collection-controls.component';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';
import { OperationToastComponent, OperationToastNotice } from '../../shared/operation-toast/operation-toast.component';
import {
  AdminSchedule,
  AdminScheduleService,
  PortCatalogItem,
  ScheduleCreateRequest,
  VesselCatalogItem,
} from './admin-schedule.service';
import { ShippingLineCatalogItem } from '../booking/booking.models';

type ScheduleSortField = 'vesselVisitId' | 'originPortName' | 'destinationPortName' | 'vesselName' | 'dayOfDeparture' | 'estimatedTimeOfDeparture';
type SortDirection = 'asc' | 'desc';
type ScheduleDraftFields = {
  originPortId: number;
  destinationPortId: number;
  vesselId: number;
  estimatedTimeOfDeparture: string;
};

type DayFilterValue = 'all' | 'Daily' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
type ScheduleDay = Exclude<DayFilterValue, 'all'>;
type CreateScheduleDraft = {
  originPortId: number | '';
  destinationPortId: number | '';
  vesselId: number | '';
  estimatedTimeOfDeparture: string;
  dayOfDeparture: ScheduleDay[];
};
type EditScheduleDraft = ScheduleDraftFields & { dayOfDeparture: string };
type CreateScheduleField = keyof ScheduleDraftFields;
type EditScheduleField = keyof EditScheduleDraft;

const DAY_OPTIONS: Array<{ value: DayFilterValue; label: string }> = [
  { value: 'all', label: 'All days' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' }
];

const SCHEDULE_DAY_OPTIONS: Array<{ value: ScheduleDay; label: string }> = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' }
];

@Component({
  selector: 'app-admin-schedules',
  standalone: true,
  imports: [CommonModule, BackToTopComponent, CollectionControlsComponent, ConfirmationDialogComponent, OperationToastComponent],
  template: `
    <main class="page-shell">
      <section class="content-card" aria-live="polite">
        <header class="page-header">
          <div class="header-badge">Admin</div>
          <div>
            <p class="eyebrow">Schedule maintenance</p>
            <h1>Manage schedules</h1>
          </div>
        </header>

        @if (isLoading()) {
          <div class="status-box loading" role="status"><span class="spinner" aria-hidden="true"></span><p>Loading schedules...</p></div>
        } @else if (error()) {
          <div class="status-box error" role="alert"><p>{{ error() }}</p><button type="button" class="secondary-button" (click)="loadSchedules()">Try again</button></div>
        } @else {
          <div class="schedule-controls-layout">
            <app-collection-controls
              searchLabel="Search schedules"
              searchPlaceholder="Origin, destination, vessel, or day"
              [searchValue]="searchTerm()"
              [filters]="scheduleFilters()"
              [sortOptions]="scheduleSortOptions"
              [sortValue]="sortField()"
              [sortDirection]="sortDirection()"
              [visibleCount]="filteredSchedules().length"
              [totalCount]="schedules().length"
              resultLabel="schedules"
              [hasActiveFilters]="hasActiveFilters()"
              actionLabel="Refresh"
              [actionDisabled]="isLoading()"
              (searchChange)="searchTerm.set($event)"
              (filterChange)="onFilterChange($event.key, $event.value)"
              (sortChange)="onSortChange($event)"
              (directionChange)="onDirectionChange($event)"
              (clear)="clearFilters()"
              (action)="loadSchedules()" />

            <div class="create-panel" [class.has-create-form]="showCreateForm()">
              @if (showCreateForm()) {
                <div class="edit-panel">
                  <div class="panel-header">
                    <h2>Create schedule</h2>
                  </div>
                  <div class="form-grid schedule-form-grid">
                    <label>
                      <span>Origin port</span>
                      <select [value]="createDraft()?.originPortId ?? ''" (change)="updateCreateDraft('originPortId', $event)">
                        <option value="" disabled>Select origin port</option>
                        @for (port of ports(); track port.portId) {
                          <option [value]="port.portId">{{ port.name }}</option>
                        }
                      </select>
                    </label>
                    <label>
                      <span>Destination port</span>
                      <select [value]="createDraft()?.destinationPortId ?? ''" (change)="updateCreateDraft('destinationPortId', $event)">
                        <option value="" disabled>Select destination port</option>
                        @for (port of ports(); track port.portId) {
                          <option [value]="port.portId">{{ port.name }}</option>
                        }
                      </select>
                    </label>
                    <label>
                      <span>Vessel</span>
                      <select [value]="createDraft()?.vesselId ?? ''" (change)="updateCreateDraft('vesselId', $event)">
                        <option value="" disabled>Select vessel</option>
                        @for (vessel of vessels(); track vessel.vesselId) {
                          <option [value]="vessel.vesselId">{{ vesselLabel(vessel) }}</option>
                        }
                      </select>
                    </label>
                    <fieldset class="day-options" [disabled]="busyCreate()">
                      <legend>
                        <span>Day of departure</span>
                        <button
                          type="button"
                          class="day-clear-button"
                          [disabled]="busyCreate() || (createDraft()?.dayOfDeparture.length ?? 0) === 0"
                          (click)="clearCreateDays()">Clear</button>
                      </legend>
                          <p class="day-options-help">Each selected day creates a separate schedule entry.</p>
                      <div class="day-options-grid">
                        @for (day of scheduleDayOptions; track day.value) {
                          <label class="day-option">
                            <input
                              type="checkbox"
                              [checked]="isCreateDaySelected(day.value)"
                              [disabled]="busyCreate() || (day.value !== 'Daily' && isDailySelected())"
                              (change)="toggleCreateDay(day.value, $event)" />
                            <span>{{ day.label }}</span>
                          </label>
                        }
                      </div>
                    </fieldset>
                    <label>
                      <span>Estimated time of departure</span>
                      <input type="time" [value]="createDraft()?.estimatedTimeOfDeparture ?? ''" (input)="updateCreateDraft('estimatedTimeOfDeparture', $event)" />
                    </label>
                  </div>
                  <div class="edit-actions">
                    <button type="button" class="primary-button" [disabled]="busyCreate()" (click)="saveNewSchedule()">{{ busyCreate() ? 'Saving...' : 'Create schedule' }}</button>
                    <button type="button" class="secondary-button" [disabled]="busyCreate()" (click)="cancelCreate()">Cancel</button>
                  </div>
                </div>
              } @else {
                <button type="button" class="primary-button create-button" (click)="startCreate()">Add schedule</button>
              }
            </div>
          </div>

          @if (actionError()) {
            <div class="action-error" role="alert"><span>{{ actionError() }}</span><button type="button" class="dismiss-button" aria-label="Dismiss action error" (click)="actionError.set(null)">Dismiss</button></div>
          }

          @if (schedules().length === 0) {
            <div class="empty-state" role="status"><h2>No schedules yet</h2><p>There are no vessel schedules to manage.</p></div>
          } @else if (filteredSchedules().length === 0) {
            <div class="empty-state" role="status"><h2>No schedules match your filters.</h2><p>Try a different route, vessel, or departure day.</p><button type="button" class="secondary-button" (click)="clearFilters()">Clear filters</button></div>
          } @else {
            <div class="schedule-list">
              @for (schedule of filteredSchedules(); track schedule.vesselVisitId) {
                <article class="schedule-card">
                  <div class="schedule-card-header">
                    <div>
                      <h2>{{ schedule.originPortName }} → {{ schedule.destinationPortName }}</h2>
                      <p class="schedule-id">Schedule #{{ schedule.vesselVisitId }}</p>
                    </div>
                  </div>

                  @if (editingScheduleId() === schedule.vesselVisitId && editDraft(); as draft) {
                    <div class="edit-panel">
                      <div class="form-grid schedule-form-grid">
                        <label>
                          <span>Origin port</span>
                          <select (change)="updateDraft('originPortId', $event)">
                            @for (port of ports(); track port.portId) {
                              <option [value]="port.portId" [selected]="port.portId === draft.originPortId">{{ port.name }}</option>
                            }
                          </select>
                        </label>
                        <label>
                          <span>Destination port</span>
                          <select (change)="updateDraft('destinationPortId', $event)">
                            @for (port of ports(); track port.portId) {
                              <option [value]="port.portId" [selected]="port.portId === draft.destinationPortId">{{ port.name }}</option>
                            }
                          </select>
                        </label>
                        <label>
                          <span>Vessel</span>
                          <select (change)="updateDraft('vesselId', $event)">
                            @for (vessel of vessels(); track vessel.vesselId) {
                              <option [value]="vessel.vesselId" [selected]="vessel.vesselId === draft.vesselId">{{ vesselLabel(vessel) }}</option>
                            }
                          </select>
                        </label>
                        <fieldset class="day-options" [disabled]="isBusy(schedule.vesselVisitId)">
                          <legend>
                            <span>Day of departure</span>
                            <button
                              type="button"
                              class="day-clear-button"
                                [disabled]="isBusy(schedule.vesselVisitId) || !draft.dayOfDeparture"
                              (click)="clearEditDay()">Clear</button>
                          </legend>
                              <p class="day-options-help">Changes apply to this schedule entry only.</p>
                          <div class="day-options-grid">
                            @for (day of scheduleDayOptions; track day.value) {
                              <label class="day-option">
                                <input
                                  type="checkbox"
                                  [checked]="isEditDaySelected(day.value)"
                                  [disabled]="isBusy(schedule.vesselVisitId) || (day.value !== 'Daily' && isEditDailySelected())"
                                  (change)="toggleEditDay(day.value, $event)" />
                                <span>{{ day.label }}</span>
                              </label>
                            }
                          </div>
                        </fieldset>
                        <label>
                          <span>Estimated time of departure</span>
                          <input type="time" [value]="toInputTime(draft.estimatedTimeOfDeparture)" (input)="updateDraft('estimatedTimeOfDeparture', $event)" />
                        </label>
                      </div>
                      <div class="edit-actions">
                        <button type="button" class="primary-button" [disabled]="isBusy(schedule.vesselVisitId)" (click)="saveSchedule(schedule.vesselVisitId)">{{ isBusy(schedule.vesselVisitId) ? 'Saving...' : 'Save changes' }}</button>
                        <button type="button" class="secondary-button" [disabled]="isBusy(schedule.vesselVisitId)" (click)="cancelEdit()">Cancel</button>
                      </div>
                    </div>
                  } @else {
                    <div class="schedule-details">
                      <div class="detail-item"><span class="detail-label">Vessel</span><span>{{ schedule.vesselName }}</span></div>
                      <div class="detail-item"><span class="detail-label">Shipping line</span><span>{{ schedule.shippingLineName }}</span></div>
                      <div class="detail-item"><span class="detail-label">Departure day</span><span>{{ schedule.dayOfDeparture || 'Daily' }}</span></div>
                      <div class="detail-item"><span class="detail-label">Departure time</span><span>{{ formatTime(schedule.estimatedTimeOfDeparture) }}</span></div>
                    </div>
                  }

                  <div class="schedule-actions">
                    <button type="button" class="secondary-button" [disabled]="isBusy(schedule.vesselVisitId)" (click)="startEdit(schedule)">Edit</button>
                    <button type="button" class="secondary-button warning-button" [disabled]="isBusy(schedule.vesselVisitId)" (click)="requestDeleteSchedule(schedule)">Delete</button>
                  </div>
                </article>
              }
            </div>
          }
        }
      </section>
      @if (pendingDeleteSchedule(); as schedule) {
        <app-confirmation-dialog
          title="Delete schedule"
          message="Are you sure you want to delete this schedule?"
          [details]="[
            'Schedule #' + schedule.vesselVisitId,
            schedule.originPortName + ' → ' + schedule.destinationPortName,
            'Vessel: ' + schedule.vesselName,
            'Shipping line: ' + schedule.shippingLineName,
            (schedule.dayOfDeparture || 'Daily') + ' · ' + formatTime(schedule.estimatedTimeOfDeparture)
          ]"
          confirmLabel="Delete"
          (cancel)="cancelDeleteSchedule()"
          (confirm)="confirmDeleteSchedule()" />
      }
          <app-operation-toast [notice]="operationNotice()" (dismissed)="operationNotice.set(null)" />
      <app-back-to-top />
    </main>
  `,
  styles: [`
    :host { display: block; }

    .page-shell {
      width: min(1120px, calc(100% - 48px));
      margin: 0 auto;
      padding: 24px 0 40px;
    }

    .content-card {
      width: 100%;
      box-sizing: border-box;
      padding: 24px;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
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
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #15803d;
    }

    h1, h2, p { margin-top: 0; }

    h1 {
      margin: 0;
      color: #111827;
      font-size: clamp(1.8rem, 2.6vw, 2.5rem);
      line-height: 1.15;
    }

    h2 {
      margin-bottom: 4px;
      color: #111827;
      font-size: 1.08rem;
    }

    .create-panel {
      margin-bottom: 18px;
    }

    .schedule-controls-layout {
      display: grid;
      grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr));
      gap: 12px;
      align-items: end;
      margin-bottom: 18px;
    }

    :host ::ng-deep .schedule-controls-layout app-collection-controls {
      grid-column: 1 / -1;
      grid-row: 1;
    }

    :host ::ng-deep .schedule-controls-layout .collection-controls {
      display: grid;
      grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 0;
    }

    :host ::ng-deep .schedule-controls-layout .search-control,
    :host ::ng-deep .schedule-controls-layout .select-control {
      grid-row: 1;
    }

    :host ::ng-deep .schedule-controls-layout .search-control { grid-column: 1; }
    :host ::ng-deep .schedule-controls-layout .select-control:nth-child(2) { grid-column: 2; }
    :host ::ng-deep .schedule-controls-layout .select-control:nth-child(3) { grid-column: 3; }
    :host ::ng-deep .schedule-controls-layout .select-control:nth-child(4) { grid-column: 4; }

    :host ::ng-deep .schedule-controls-layout .control-summary {
      grid-column: 2 / -1;
      grid-row: 2;
      justify-content: flex-end;
      margin-left: 0;
    }

    .create-button {
      width: fit-content;
    }

    .schedule-controls-layout > .create-panel {
      grid-column: 1;
      grid-row: 2;
      margin-bottom: 0;
    }

    .schedule-controls-layout > .create-panel.has-create-form {
      grid-column: 1 / -1;
      grid-row: 3;
    }

    .schedule-list { display: grid; gap: 10px; }

    .schedule-card {
      padding: 15px 18px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }

    .schedule-card-header, .schedule-actions, .edit-actions, .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .edit-actions { margin-top: 18px; }

    .schedule-actions { justify-content: flex-start; flex-wrap: wrap; }

    .schedule-id, .detail-label {
      margin-bottom: 0;
      color: #6b7280;
      font-size: 0.8rem;
    }

    .schedule-details {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin: 12px 0;
      padding: 12px 0;
      border-top: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
    }

    .detail-item {
      display: grid;
      min-width: 0;
      gap: 6px;
      color: #111827;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }

    .edit-panel {
      margin: 14px 0;
      padding: 14px;
      border: 1px solid rgba(22, 163, 74, 0.16);
      border-radius: 10px;
      background: #f8fffa;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
      gap: 12px;
    }

    .schedule-form-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

    .form-grid label {
      display: grid;
      gap: 6px;
      color: #374151;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .day-options { min-width: 0; margin: 0; padding: 0; border: 0; }
    .schedule-form-grid .day-options { grid-column: span 2; }
    .day-options legend { display: flex; width: 100%; align-items: center; justify-content: space-between; margin-bottom: 6px; color: #374151; font-size: 0.8rem; font-weight: 700; }
    .day-options-help { margin: 0 0 8px; color: #6b7280; font-size: 0.76rem; font-weight: 400; line-height: 1.4; }
    .day-clear-button { border: 0; padding: 2px 0; background: transparent; color: #166534; font: inherit; font-size: 0.76rem; cursor: pointer; }
    .day-clear-button:disabled { cursor: not-allowed; opacity: 0.55; }
    .day-options-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .form-grid .day-option { display: flex; min-height: 36px; align-items: center; gap: 6px; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; background: #ffffff; cursor: pointer; }
    .day-option:has(input:checked) { border-color: #15803d; background: #f0fdf4; color: #166534; }
    .day-option input { width: 16px; min-height: 16px; margin: 0; padding: 0; accent-color: #15803d; flex: 0 0 auto; }
    .day-option input:focus-visible { outline: 2px solid #15803d; outline-offset: 2px; }
    .day-option:has(input:disabled) { cursor: not-allowed; opacity: 0.55; }

    input,
    select {
      box-sizing: border-box;
      width: 100%;
      min-height: 40px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 9px 10px;
      background: #ffffff;
      color: #111827;
      font: inherit;
      font-size: 0.84rem;
    }

    .primary-button, .secondary-button, .dismiss-button {
      min-height: 38px;
      border-radius: 8px;
      padding: 8px 12px;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
    }

    .primary-button {
      border: 1px solid #15803d;
      background: #15803d;
      color: #ffffff;
    }

    .secondary-button {
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #374151;
    }

    .secondary-button:hover:not(:disabled) {
      border-color: #15803d;
      color: #166534;
      background: #f0fdf4;
    }

    .warning-button {
      border-color: #f59e0b;
      color: #92400e;
    }

    .dismiss-button {
      min-height: 0;
      border: 0;
      padding: 0;
      background: transparent;
      color: #991b1b;
    }

    button:disabled, select:disabled { cursor: not-allowed; opacity: 0.55; }

    .status-box, .empty-state, .action-error { padding: 20px; border-radius: 12px; }
    .status-box p, .empty-state p { margin-bottom: 0; }
    .status-box.loading { display: flex; align-items: center; gap: 10px; color: #374151; }
    .status-box.error, .action-error { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid #fecaca; background: #fff7f7; color: #991b1b; }
    .empty-state { border: 1px dashed #cbd5e1; background: #f8fafc; color: #374151; }
    .empty-state h2 { margin-bottom: 6px; }
    .spinner { width: 18px; height: 18px; border: 2px solid rgba(21, 128, 61, 0.2); border-top-color: #15803d; border-radius: 50%; animation: spin 0.8s linear infinite; }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 760px) {
      .page-shell { width: min(100%, calc(100% - 28px)); padding: 20px 0 32px; }
      .content-card { padding: 20px 16px; }
      .schedule-controls-layout { display: flex; align-items: stretch; flex-direction: column; }
      :host ::ng-deep .schedule-controls-layout .control-summary { justify-content: space-between; }
      .schedule-controls-layout > .create-panel,
      .schedule-controls-layout > .create-panel.has-create-form { order: 2; }
      .page-header, .schedule-card-header { display: flex; align-items: flex-start; flex-direction: column; }
      .schedule-details, .form-grid { grid-template-columns: 1fr; }
      .schedule-form-grid .day-options { grid-column: auto; }
      .edit-actions { align-items: stretch; flex-direction: column; }
      .edit-actions button, .create-button { width: 100%; }
      .status-box.error, .action-error { align-items: flex-start; flex-direction: column; }
    }

    @media (max-width: 480px) {
      .page-shell { width: calc(100% - 20px); padding: 16px 0 28px; }
      .content-card { padding: 16px 12px; border-radius: 14px; }
      .schedule-card { padding: 14px; }
      .schedule-actions { align-items: stretch; }
      .schedule-actions > button { flex: 1 1 130px; min-height: 44px; }
      .detail-item { overflow-wrap: anywhere; }
      .day-options-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `]
})
export class AdminSchedulesComponent {
  private readonly adminScheduleService = inject(AdminScheduleService);
  readonly schedules = signal<AdminSchedule[]>([]);
  readonly ports = signal<PortCatalogItem[]>([]);
  readonly vessels = signal<VesselCatalogItem[]>([]);
  readonly shippingLines = signal<ShippingLineCatalogItem[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly operationNotice = signal<OperationToastNotice | null>(null);
  readonly searchTerm = signal('');
  readonly dayFilter = signal<DayFilterValue>('all');
  readonly sortField = signal<ScheduleSortField>('vesselVisitId');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly editingScheduleId = signal<number | null>(null);
  readonly editDraft = signal<EditScheduleDraft | null>(null);
  readonly showCreateForm = signal(false);
  readonly createDraft = signal<CreateScheduleDraft | null>(null);
  readonly pendingDeleteSchedule = signal<AdminSchedule | null>(null);
  readonly busyScheduleId = signal<number | null>(null);
  readonly busyCreate = signal(false);
  readonly scheduleDayOptions = SCHEDULE_DAY_OPTIONS;

  readonly scheduleFilters = computed(() => [
    {
      key: 'day',
      label: 'Departure day',
      value: this.dayFilter(),
      options: DAY_OPTIONS
    }
  ]);

  readonly scheduleSortOptions = [
    { value: 'vesselVisitId', label: 'Schedule ID' },
    { value: 'originPortName', label: 'Origin port' },
    { value: 'destinationPortName', label: 'Destination port' },
    { value: 'vesselName', label: 'Vessel' },
    { value: 'dayOfDeparture', label: 'Departure day' },
    { value: 'estimatedTimeOfDeparture', label: 'Departure time' }
  ];

  readonly filteredSchedules = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    return [...this.schedules()]
      .filter((schedule) => this.dayFilter() === 'all' || (schedule.dayOfDeparture || 'Daily') === this.dayFilter())
      .filter((schedule) => !query || [
        schedule.originPortName,
        schedule.destinationPortName,
        schedule.vesselName,
        schedule.shippingLineName,
        schedule.dayOfDeparture ?? 'Daily'
      ].some((value) => value.toLowerCase().includes(query)))
      .sort((first, second) => this.compareSchedules(first, second));
  });

  readonly hasActiveFilters = computed(() => Boolean(
    this.searchTerm().trim() || this.dayFilter() !== 'all' || this.sortField() !== 'vesselVisitId' || this.sortDirection() !== 'asc'
  ));

  constructor() {
    this.loadCatalog();
    this.loadSchedules();
  }

  loadCatalog(): void {
    this.adminScheduleService.getPorts().subscribe({
      next: (ports) => this.ports.set(ports),
      error: () => this.ports.set([])
    });

    this.adminScheduleService.getVessels().subscribe({
      next: (vessels) => this.vessels.set(vessels),
      error: () => this.vessels.set([])
    });

    this.adminScheduleService.getShippingLines().subscribe({
      next: (shippingLines) => this.shippingLines.set(shippingLines),
      error: () => this.shippingLines.set([])
    });
  }

  loadSchedules(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.adminScheduleService.getSchedules().pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (schedules) => this.schedules.set(schedules),
      error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'Unable to load schedules right now.'))
    });
  }

  onFilterChange(key: string, value: string): void {
    if (key === 'day') this.dayFilter.set(value as DayFilterValue);
  }

  onSortChange(value: string): void {
    this.sortField.set(value as ScheduleSortField);
  }

  onDirectionChange(value: string): void {
    this.sortDirection.set(value as SortDirection);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.dayFilter.set('all');
    this.sortField.set('vesselVisitId');
    this.sortDirection.set('asc');
  }

  startCreate(): void {
    this.actionError.set(null);
    this.createDraft.set(this.newDraft());
    this.showCreateForm.set(true);
  }

  cancelCreate(): void {
    this.showCreateForm.set(false);
    this.createDraft.set(null);
    this.actionError.set(null);
  }

  startEdit(schedule: AdminSchedule): void {
    this.actionError.set(null);
    this.editingScheduleId.set(schedule.vesselVisitId);
    this.editDraft.set({
      originPortId: this.resolvePortId(schedule.originPortId, schedule.originPortName),
      destinationPortId: this.resolvePortId(schedule.destinationPortId, schedule.destinationPortName),
      vesselId: this.resolveVesselId(schedule.vesselId, schedule.vesselName),
      dayOfDeparture: schedule.dayOfDeparture?.trim() || 'Daily',
      estimatedTimeOfDeparture: this.toTimeSpanString(schedule.estimatedTimeOfDeparture)
    });
  }

  cancelEdit(): void {
    this.editingScheduleId.set(null);
    this.editDraft.set(null);
    this.actionError.set(null);
  }

  updateCreateDraft(field: CreateScheduleField, event: Event): void {
    const draft = this.createDraft();
    if (!draft) return;
    const value = this.toFieldValue(field, event);
    this.createDraft.set({ ...draft, [field]: value } as CreateScheduleDraft);
  }

  updateDraft(field: EditScheduleField, event: Event): void {
    const draft = this.editDraft();
    if (!draft) return;
    const value = this.toFieldValue(field, event);
    this.editDraft.set({ ...draft, [field]: value } as EditScheduleDraft);
  }

  isCreateDaySelected(day: ScheduleDay): boolean {
    return this.createDraft()?.dayOfDeparture.includes(day) ?? false;
  }

  isDailySelected(): boolean {
    return this.isCreateDaySelected('Daily');
  }

  clearCreateDays(): void {
    const draft = this.createDraft();
    if (draft) this.createDraft.set({ ...draft, dayOfDeparture: [] });
  }

  isEditDaySelected(day: ScheduleDay): boolean {
    return this.editDraft()?.dayOfDeparture === day;
  }

  isEditDailySelected(): boolean {
    return this.isEditDaySelected('Daily');
  }

  clearEditDay(): void {
    const draft = this.editDraft();
    if (draft) this.editDraft.set({ ...draft, dayOfDeparture: '' });
  }

  toggleEditDay(day: ScheduleDay, event: Event): void {
    const draft = this.editDraft();
    if (!draft) return;

    const checked = (event.target as HTMLInputElement).checked;
    this.editDraft.set({ ...draft, dayOfDeparture: checked ? day : '' });
  }

  toggleCreateDay(day: ScheduleDay, event: Event): void {
    const draft = this.createDraft();
    if (!draft) return;

    const checked = (event.target as HTMLInputElement).checked;
    const selectedDays = new Set(draft.dayOfDeparture);
    if (day === 'Daily') {
      this.createDraft.set({ ...draft, dayOfDeparture: checked ? ['Daily'] : [] });
      return;
    }

    selectedDays.delete('Daily');
    if (checked) selectedDays.add(day);
    else selectedDays.delete(day);
    this.createDraft.set({ ...draft, dayOfDeparture: [...selectedDays] });
  }

  saveNewSchedule(): void {
    const draft = this.createDraft();
    if (!draft) return;

    if (draft.originPortId === '' || draft.originPortId === 0 ||
      draft.destinationPortId === '' || draft.destinationPortId === 0 ||
      draft.vesselId === '' || draft.vesselId === 0) {
      this.actionError.set('Please select a valid origin port, destination port, and vessel.');
      return;
    }

    const selectedDays = [...new Set(draft.dayOfDeparture)];
    if (selectedDays.length === 0) {
      this.actionError.set('Please select at least one departure day.');
      return;
    }
    const daysToCreate = selectedDays.includes('Daily') ? ['Daily' as const] : selectedDays;

    this.busyCreate.set(true);
    this.actionError.set(null);
    this.operationNotice.set(null);

    const baseRequest = {
      originPortId: draft.originPortId,
      destinationPortId: draft.destinationPortId,
      vesselId: draft.vesselId,
      estimatedTimeOfDeparture: this.toTimeSpanString(draft.estimatedTimeOfDeparture)
    };

    forkJoin(daysToCreate.map((day) => {
      const request: ScheduleCreateRequest = { ...baseRequest, dayOfDeparture: day };
      return this.adminScheduleService.createSchedule(request).pipe(
        map((schedule) => ({ day, schedule, error: null as unknown | null })),
        catchError((error: unknown) => of({ day, schedule: null, error }))
      );
    })).pipe(finalize(() => this.busyCreate.set(false)))
      .subscribe({
        next: (results) => {
          const createdSchedules = results.flatMap((result) => result.schedule ? [result.schedule] : []);
          const failedResults = results.filter((result) => result.error !== null);
          this.schedules.update((items) => [...createdSchedules, ...items]);

          if (failedResults.length === 0) {
            this.showOperationNotice('Schedule created successfully.', 'success');
            this.showCreateForm.set(false);
            this.createDraft.set(null);
            return;
          }

          this.showOperationNotice('Failed to create schedule.', 'error');
          const failedDays = failedResults.map((result) => result.day);
          const firstError = this.getErrorMessage(failedResults[0].error, 'Request failed.');
          if (createdSchedules.length > 0) {
            this.createDraft.set({ ...draft, dayOfDeparture: failedDays });
            this.actionError.set(`Only ${createdSchedules.length} of ${results.length} schedules were created. Failed days: ${failedDays.join(', ')}. ${firstError}`);
            return;
          }

          this.actionError.set(this.getErrorMessage(failedResults[0].error, 'Unable to create the selected schedules.'));
        },
        error: (error: unknown) => {
          this.showOperationNotice('Failed to create schedule.', 'error');
          this.actionError.set(this.getErrorMessage(error, 'Unable to create the schedule.'));
        }
      });
  }

  saveSchedule(scheduleId: number): void {
    const draft = this.editDraft();
    if (!draft) return;

    this.actionError.set(null);
    this.busyScheduleId.set(scheduleId);
    this.operationNotice.set(null);

    this.adminScheduleService.updateSchedule(scheduleId, {
      originPortId: draft.originPortId,
      destinationPortId: draft.destinationPortId,
      vesselId: draft.vesselId,
      dayOfDeparture: draft.dayOfDeparture || null,
      estimatedTimeOfDeparture: this.toTimeSpanString(draft.estimatedTimeOfDeparture)
    }).pipe(finalize(() => this.busyScheduleId.set(null))).subscribe({
      next: (updatedSchedule) => {
        this.schedules.update((items) => items.map((schedule) => schedule.vesselVisitId === updatedSchedule.vesselVisitId ? updatedSchedule : schedule));
        this.showOperationNotice(`Schedule #${scheduleId} updated successfully.`, 'success');
        this.cancelEdit();
      },
      error: (error: unknown) => {
        this.showOperationNotice('Failed to update schedule.', 'error');
        this.actionError.set(this.getErrorMessage(error, 'Unable to update the schedule.'));
      }
    });
  }

  requestDeleteSchedule(schedule: AdminSchedule): void {
    this.pendingDeleteSchedule.set(schedule);
  }

  confirmDeleteSchedule(): void {
    const schedule = this.pendingDeleteSchedule();
    if (!schedule) return;
    this.pendingDeleteSchedule.set(null);
    this.deleteSchedule(schedule);
  }

  cancelDeleteSchedule(): void { this.pendingDeleteSchedule.set(null); }

  private deleteSchedule(schedule: AdminSchedule): void {

    this.actionError.set(null);
    this.busyScheduleId.set(schedule.vesselVisitId);
    this.operationNotice.set(null);

    this.adminScheduleService.deleteSchedule(schedule.vesselVisitId).pipe(finalize(() => this.busyScheduleId.set(null))).subscribe({
      next: () => {
        this.schedules.update((items) => items.filter((item) => item.vesselVisitId !== schedule.vesselVisitId));
        this.showOperationNotice(`Schedule #${schedule.vesselVisitId} deleted successfully.`, 'success');
        if (this.editingScheduleId() === schedule.vesselVisitId) {
          this.cancelEdit();
        }
      },
      error: (error: unknown) => {
        this.showOperationNotice('Failed to delete schedule.', 'error');
        this.actionError.set(this.getErrorMessage(error, 'Unable to delete the schedule.'));
      }
    });
  }

  private showOperationNotice(message: string, type: OperationToastNotice['type']): void {
    this.operationNotice.set({ message, type });
  }

  isBusy(scheduleId: number): boolean {
    return this.busyScheduleId() === scheduleId;
  }

  toInputTime(value: string | null | undefined): string {
    return this.toTimeInputValue(value ?? '00:00:00');
  }

  private newDraft(): CreateScheduleDraft {
    return {
      originPortId: '',
      destinationPortId: '',
      vesselId: '',
      dayOfDeparture: [],
      estimatedTimeOfDeparture: ''
    };
  }

  private resolvePortId(portId: number, portName: string): number {
    return this.ports().find((port) => port.portId === portId || port.name === portName)?.portId ?? portId;
  }

  private resolveVesselId(vesselId: number, vesselName: string): number {
    return this.vessels().find((vessel) => vessel.vesselId === vesselId || vessel.name === vesselName)?.vesselId ?? vesselId;
  }

  vesselLabel(vessel: VesselCatalogItem): string {
    const shippingLine = this.shippingLines().find((line) => line.shippingLineId === vessel.shippingLineId);
    return shippingLine ? `${vessel.name} — ${shippingLine.name}` : vessel.name;
  }

  private compareSchedules(first: AdminSchedule, second: AdminSchedule): number {
    let result = 0;
    switch (this.sortField()) {
      case 'originPortName':
        result = first.originPortName.localeCompare(second.originPortName);
        break;
      case 'destinationPortName':
        result = first.destinationPortName.localeCompare(second.destinationPortName);
        break;
      case 'vesselName':
        result = first.vesselName.localeCompare(second.vesselName);
        break;
      case 'dayOfDeparture':
        result = (first.dayOfDeparture ?? 'Daily').localeCompare(second.dayOfDeparture ?? 'Daily');
        break;
      case 'estimatedTimeOfDeparture':
        result = this.toMinutes(first.estimatedTimeOfDeparture) - this.toMinutes(second.estimatedTimeOfDeparture);
        break;
      case 'vesselVisitId':
      default:
        result = first.vesselVisitId - second.vesselVisitId;
        break;
    }
    return this.sortDirection() === 'asc' ? result : -result;
  }

  private toFieldValue(field: CreateScheduleField | EditScheduleField, event: Event): string | number {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.value;

    if (field === 'originPortId' || field === 'destinationPortId' || field === 'vesselId') {
      return Number(value || 0);
    }

    return value;
  }

  private toTimeInputValue(value: string | null | undefined): string {
    if (!value) return '00:00';
    const normalized = value.trim();
    if (normalized.length === 5) return normalized;
    if (normalized.length >= 5 && normalized.includes(':')) {
      return normalized.slice(0, 5);
    }
    return '00:00';
  }

  private toTimeSpanString(value: string): string {
    const normalized = value?.trim();
    if (!normalized) return '00:00:00';
    if (normalized.length === 5) return `${normalized}:00`;
    return normalized;
  }

  private toMinutes(value: string | null | undefined): number {
    const normalized = this.toTimeSpanString(value ?? '00:00:00');
    const [hours, minutes] = normalized.split(':').map((part) => Number(part || 0));
    return (hours * 60) + minutes;
  }

  formatTime(value: string | null | undefined): string {
    const normalized = this.toTimeSpanString(value ?? '00:00:00');
    const parts = normalized.split(':');
    if (parts.length < 2) return '00:00';
    const hours = Number(parts[0] ?? 0);
    const minutes = Number(parts[1] ?? 0);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    const response = error as { error?: { title?: string; message?: string } };
    return response.error?.title ?? response.error?.message ?? fallback;
  }
}
