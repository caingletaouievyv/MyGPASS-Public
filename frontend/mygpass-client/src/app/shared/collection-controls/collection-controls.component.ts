import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type CollectionControlOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'app-collection-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="collection-controls">
      @if (showSearch) {
        <label class="search-control">
          <span>{{ searchLabel }}</span>
          <input
            type="search"
            [placeholder]="searchPlaceholder"
            [value]="searchValue"
            (input)="searchChange.emit(($any($event.target)).value)" />
        </label>
      }

      @for (filter of filters; track filter.key) {
        <label class="select-control">
          <span>{{ filter.label }}</span>
          <select [value]="filter.value" (change)="filterChange.emit({ key: filter.key, value: ($any($event.target)).value })">
            @for (option of filter.options; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      }

      @if (sortOptions.length > 0) {
        <label class="select-control">
          <span>Sort by</span>
          <select [value]="sortValue" (change)="sortChange.emit(($any($event.target)).value)">
            @for (option of sortOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
        <label class="select-control direction-control">
          <span>Direction</span>
          <select [value]="sortDirection" (change)="directionChange.emit(($any($event.target)).value)">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      }

      <div class="control-summary" [class.summary-new-row]="summaryOnNewRow">
        <span class="result-count" aria-live="polite">Showing {{ visibleCount }} of {{ totalCount }} {{ resultLabel }}</span>
        @if (hasActiveFilters) {
          <button type="button" class="clear-button" (click)="clear.emit()">Clear filters</button>
        }
        @if (actionLabel) {
          <button type="button" class="action-button" [disabled]="actionDisabled" (click)="action.emit()">{{ actionLabel }}</button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }

    .collection-controls {
      display: flex;
      align-items: end;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
    }

    .search-control,
    .select-control {
      display: grid;
      gap: 6px;
      color: #374151;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .search-control {
      flex: 1 1 260px;
      min-width: min(100%, 220px);
    }

    .select-control { flex: 0 1 170px; }

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

    input:focus-visible,
    select:focus-visible,
    button:focus-visible {
      outline: 3px solid rgba(21, 128, 61, 0.2);
      outline-offset: 2px;
    }

    .control-summary {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 40px;
      margin-left: auto;
    }

    .control-summary.summary-new-row {
      flex-basis: 100%;
      justify-content: flex-end;
    }

    .result-count {
      color: #6b7280;
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .clear-button {
      min-height: 36px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 7px 10px;
      background: #ffffff;
      color: #166534;
      cursor: pointer;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .clear-button:hover { background: #f0fdf4; border-color: #15803d; }

    .action-button {
      min-height: 38px;
      border: 1px solid #15803d;
      border-radius: 8px;
      padding: 8px 13px;
      background: #15803d;
      color: #ffffff;
      cursor: pointer;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .action-button:hover:not(:disabled) { background: #166534; }
    .action-button:disabled { cursor: wait; opacity: 0.6; }

    @media (max-width: 760px) {
      .collection-controls { align-items: stretch; flex-direction: column; gap: 8px; }
      .search-control, .select-control { width: 100%; flex: 1 1 auto; }
      .control-summary { width: 100%; justify-content: space-between; margin-left: 0; }
      input, select { min-height: 44px; }
    }
  `
})
export class CollectionControlsComponent {
  @Input() showSearch = true;
  @Input() searchLabel = 'Search';
  @Input() searchPlaceholder = 'Search...';
  @Input() searchValue = '';
  @Input() filters: Array<{ key: string; label: string; value: string; options: CollectionControlOption[] }> = [];
  @Input() sortOptions: CollectionControlOption[] = [];
  @Input() sortValue = '';
  @Input() sortDirection = 'asc';
  @Input() visibleCount = 0;
  @Input() totalCount = 0;
  @Input() resultLabel = 'records';
  @Input() hasActiveFilters = false;
  @Input() summaryOnNewRow = false;
  @Input() actionLabel = '';
  @Input() actionDisabled = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: string; value: string }>();
  @Output() sortChange = new EventEmitter<string>();
  @Output() directionChange = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();
}
