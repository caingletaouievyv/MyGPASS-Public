import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AdminSchedule, AdminScheduleService, ScheduleCreateRequest } from './admin-schedule.service';
import { AdminSchedulesComponent } from './admin-schedules.component';

describe('AdminSchedulesComponent departure days', () => {
  let fixture: ComponentFixture<AdminSchedulesComponent>;
  let component: AdminSchedulesComponent;
  let adminScheduleService: {
    getSchedules: ReturnType<typeof vi.fn>;
    getPorts: ReturnType<typeof vi.fn>;
    getVessels: ReturnType<typeof vi.fn>;
    getShippingLines: ReturnType<typeof vi.fn>;
    createSchedule: ReturnType<typeof vi.fn>;
    updateSchedule: ReturnType<typeof vi.fn>;
    deleteSchedule: ReturnType<typeof vi.fn>;
  };
  let createdId: number;

  const makeSchedule = (request: ScheduleCreateRequest, vesselVisitId: number): AdminSchedule => ({
    vesselVisitId,
    originPortId: request.originPortId,
    originPortName: 'Origin',
    destinationPortId: request.destinationPortId,
    destinationPortName: 'Destination',
    shippingLineId: 20,
    shippingLineName: 'Line',
    vesselId: request.vesselId,
    vesselName: 'Vessel',
    dayOfDeparture: request.dayOfDeparture,
    estimatedTimeOfDeparture: request.estimatedTimeOfDeparture
  });

  const changeEvent = (value: string): Event => ({ target: { value } } as unknown as Event);
  const checkboxEvent = (checked: boolean): Event => ({ target: { checked } } as unknown as Event);
  const selectRequiredCreateFields = (): void => {
    component.updateCreateDraft('originPortId', changeEvent('1'));
    component.updateCreateDraft('destinationPortId', changeEvent('2'));
    component.updateCreateDraft('vesselId', changeEvent('10'));
  };

  beforeEach(async () => {
    createdId = 100;
    adminScheduleService = {
      getSchedules: vi.fn(() => of([])),
      getPorts: vi.fn(() => of([{ portId: 1, name: 'Origin' }, { portId: 2, name: 'Destination' }])),
      getVessels: vi.fn(() => of([{ vesselId: 10, shippingLineId: 20, name: 'Vessel' }])),
      getShippingLines: vi.fn(() => of([{ shippingLineId: 20, name: 'Line' }])),
      createSchedule: vi.fn((request: ScheduleCreateRequest) => of(makeSchedule(request, createdId++))),
      updateSchedule: vi.fn((scheduleId: number, request: ScheduleCreateRequest) => of(makeSchedule(request, scheduleId))),
      deleteSchedule: vi.fn(() => of(undefined))
    };

    await TestBed.configureTestingModule({
      imports: [AdminSchedulesComponent],
      providers: [{ provide: AdminScheduleService, useValue: adminScheduleService }]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSchedulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens and reopens create with blank defaults after cancel', () => {
    component.startCreate();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.create-panel .day-options-help')?.textContent?.trim())
      .toBe('Each selected day creates a separate schedule entry.');
    const selects = Array.from(fixture.nativeElement.querySelectorAll('.create-panel select')) as HTMLSelectElement[];
    expect(selects.map((select) => select.value)).toEqual(['', '', '']);
    expect(selects.map((select) => select.selectedOptions[0]?.textContent?.trim())).toEqual([
      'Select origin port', 'Select destination port', 'Select vessel'
    ]);
    expect(Array.from(fixture.nativeElement.querySelectorAll('.create-panel input[type="checkbox"]'))
      .every((input) => !(input as HTMLInputElement).checked)).toBe(true);
    expect((fixture.nativeElement.querySelector('.create-panel input[type="time"]') as HTMLInputElement).value).toBe('');

    selectRequiredCreateFields();
    component.toggleCreateDay('Monday', checkboxEvent(true));
    component.updateCreateDraft('estimatedTimeOfDeparture', changeEvent('09:15'));
    component.cancelCreate();
    component.startCreate();
    fixture.detectChanges();

    expect(component.createDraft()).toEqual({
      originPortId: '',
      destinationPortId: '',
      vesselId: '',
      dayOfDeparture: [],
      estimatedTimeOfDeparture: ''
    });
    expect(Array.from(fixture.nativeElement.querySelectorAll('.create-panel select'))
      .every((select) => !(select as HTMLSelectElement).value)).toBe(true);
  });

  it('loads the saved values when editing a schedule', () => {
    const schedule = makeSchedule({
      originPortId: 1,
      destinationPortId: 2,
      vesselId: 10,
      dayOfDeparture: 'Tuesday',
      estimatedTimeOfDeparture: '13:25:00'
    }, 42);
    component.schedules.set([schedule]);
    component.startEdit(schedule);
    fixture.detectChanges();

    const selects = Array.from(fixture.nativeElement.querySelectorAll('.schedule-card select')) as HTMLSelectElement[];
    expect(selects.map((select) => select.value)).toEqual(['1', '2', '10']);
    const dayOptions = fixture.nativeElement.querySelectorAll('.schedule-card .day-option') as NodeListOf<HTMLLabelElement>;
    const selectedDay = Array.from(dayOptions)
      .find((option) => option.textContent?.includes('Tuesday'));
    expect((selectedDay?.querySelector('input') as HTMLInputElement).checked).toBe(true);
    expect(fixture.nativeElement.querySelector('.schedule-card .day-options-help')?.textContent?.trim())
      .toBe('Changes apply to this schedule entry only.');
    expect((fixture.nativeElement.querySelector('.schedule-card input[type="time"]') as HTMLInputElement).value).toBe('13:25');
  });

  it('selecting Daily clears weekday selections', () => {
    component.startCreate();
    component.createDraft.update((draft) => draft && ({ ...draft, dayOfDeparture: ['Monday', 'Friday'] }));

    component.toggleCreateDay('Daily', checkboxEvent(true));

    expect(component.createDraft()?.dayOfDeparture).toEqual(['Daily']);
  });

  it('selecting a weekday clears Daily', () => {
    component.startCreate();
    component.toggleCreateDay('Daily', checkboxEvent(false));

    component.toggleCreateDay('Tuesday', checkboxEvent(true));

    expect(component.createDraft()?.dayOfDeparture).toEqual(['Tuesday']);
    expect(component.isDailySelected()).toBe(false);
  });

  it('allows multiple weekdays without duplicates', () => {
    component.startCreate();
    component.toggleCreateDay('Daily', checkboxEvent(false));
    component.toggleCreateDay('Monday', checkboxEvent(true));
    component.toggleCreateDay('Wednesday', checkboxEvent(true));
    component.toggleCreateDay('Friday', checkboxEvent(true));
    component.toggleCreateDay('Monday', checkboxEvent(true));

    expect(component.createDraft()?.dayOfDeparture).toEqual(['Monday', 'Wednesday', 'Friday']);
  });

  it('clears all selected departure days', () => {
    component.startCreate();

    component.clearCreateDays();

    expect(component.createDraft()?.dayOfDeparture).toEqual([]);
  });

  it('creates exactly one schedule for Daily', () => {
    component.startCreate();
    selectRequiredCreateFields();
    component.toggleCreateDay('Daily', checkboxEvent(true));

    component.saveNewSchedule();

    expect(adminScheduleService.createSchedule).toHaveBeenCalledTimes(1);
    expect(adminScheduleService.createSchedule).toHaveBeenCalledWith(expect.objectContaining({ dayOfDeparture: 'Daily' }));
    expect(component.schedules()).toHaveLength(1);

    component.startCreate();

    expect(component.createDraft()).toEqual({
      originPortId: '',
      destinationPortId: '',
      vesselId: '',
      dayOfDeparture: [],
      estimatedTimeOfDeparture: ''
    });
  });

  it('creates one schedule per selected weekday', () => {
    component.startCreate();
    selectRequiredCreateFields();
    component.toggleCreateDay('Daily', checkboxEvent(false));
    component.toggleCreateDay('Monday', checkboxEvent(true));
    component.toggleCreateDay('Wednesday', checkboxEvent(true));

    component.saveNewSchedule();

    expect(adminScheduleService.createSchedule.mock.calls.map(([request]) => (request as ScheduleCreateRequest).dayOfDeparture)).toEqual([
      'Monday', 'Wednesday'
    ]);
    expect(component.schedules()).toHaveLength(2);
    expect(component.operationNotice()).toEqual({ message: 'Schedule created successfully.', type: 'success' });
  });

  it('loads the saved edit day and keeps Daily exclusive', () => {
    const schedule = makeSchedule({
      originPortId: 1,
      destinationPortId: 2,
      vesselId: 10,
      dayOfDeparture: 'Monday',
      estimatedTimeOfDeparture: '09:00:00'
    }, 42);
    component.schedules.set([schedule]);
    component.startEdit(schedule);
    fixture.detectChanges();

    expect(component.editDraft()?.dayOfDeparture).toBe('Monday');
    const dayOptions = Array.from(fixture.nativeElement.querySelectorAll('.schedule-card .day-option')) as HTMLLabelElement[];
    expect(dayOptions.filter((option) => (option.querySelector('input') as HTMLInputElement).checked)
      .map((option) => option.textContent?.trim())).toEqual(['Monday']);

    component.toggleEditDay('Friday', checkboxEvent(true));
    expect(component.editDraft()?.dayOfDeparture).toBe('Friday');
    expect(component.isEditDaySelected('Monday')).toBe(false);

    component.toggleEditDay('Daily', checkboxEvent(true));
    expect(component.editDraft()?.dayOfDeparture).toBe('Daily');
    expect(component.isEditDaySelected('Friday')).toBe(false);
    component.toggleEditDay('Daily', checkboxEvent(false));
    component.toggleEditDay('Tuesday', checkboxEvent(true));
    expect(component.editDraft()?.dayOfDeparture).toBe('Tuesday');
  });

  it('updates only the edited schedule and does not create another', () => {
    const schedule = makeSchedule({
      originPortId: 1,
      destinationPortId: 2,
      vesselId: 10,
      dayOfDeparture: 'Monday',
      estimatedTimeOfDeparture: '09:00:00'
    }, 42);
    component.schedules.set([schedule]);
    component.startEdit(schedule);
    component.toggleEditDay('Friday', checkboxEvent(true));

    component.saveSchedule(42);

    expect(adminScheduleService.updateSchedule).toHaveBeenCalledTimes(1);
    expect(adminScheduleService.updateSchedule).toHaveBeenCalledWith(42, expect.objectContaining({ dayOfDeparture: 'Friday' }));
    expect(adminScheduleService.createSchedule).not.toHaveBeenCalled();
    expect(component.schedules()).toHaveLength(1);
    expect(component.schedules()[0].vesselVisitId).toBe(42);
    expect(component.schedules()[0].dayOfDeparture).toBe('Friday');
    expect(component.operationNotice()).toEqual({ message: 'Schedule #42 updated successfully.', type: 'success' });
  });

  it('shows a failure notification when schedule update fails', () => {
    adminScheduleService.updateSchedule.mockReturnValue(throwError(() => new Error('Service unavailable.')));
    const schedule = makeSchedule({
      originPortId: 1,
      destinationPortId: 2,
      vesselId: 10,
      dayOfDeparture: 'Monday',
      estimatedTimeOfDeparture: '09:00:00'
    }, 42);
    component.startEdit(schedule);

    component.saveSchedule(42);

    expect(component.operationNotice()).toEqual({ message: 'Failed to update schedule.', type: 'error' });
    expect(adminScheduleService.createSchedule).not.toHaveBeenCalled();
  });

  it('shows success only after schedule deletion succeeds', () => {
    const schedule = makeSchedule({
      originPortId: 1,
      destinationPortId: 2,
      vesselId: 10,
      dayOfDeparture: 'Monday',
      estimatedTimeOfDeparture: '09:00:00'
    }, 42);
    component.schedules.set([schedule]);
    component.requestDeleteSchedule(schedule);
    component.confirmDeleteSchedule();

    expect(adminScheduleService.deleteSchedule).toHaveBeenCalledWith(42);
    expect(component.operationNotice()).toEqual({ message: 'Schedule #42 deleted successfully.', type: 'success' });
    expect(component.schedules()).toHaveLength(0);
  });

  it('shows a failure notification when schedule deletion fails', () => {
    adminScheduleService.deleteSchedule.mockReturnValue(throwError(() => new Error('Service unavailable.')));
    const schedule = makeSchedule({
      originPortId: 1,
      destinationPortId: 2,
      vesselId: 10,
      dayOfDeparture: 'Monday',
      estimatedTimeOfDeparture: '09:00:00'
    }, 42);
    component.requestDeleteSchedule(schedule);
    component.confirmDeleteSchedule();

    expect(component.operationNotice()).toEqual({ message: 'Failed to delete schedule.', type: 'error' });
    expect(component.schedules()).toHaveLength(0);
  });

  it('reports partial success and leaves only failed days selected', () => {
    adminScheduleService.createSchedule.mockImplementation((request: ScheduleCreateRequest) =>
      request.dayOfDeparture === 'Wednesday'
        ? throwError(() => ({ error: { message: 'Service unavailable.' } }))
        : of(makeSchedule(request, createdId++))
    );
    component.startCreate();
    selectRequiredCreateFields();
    component.toggleCreateDay('Daily', checkboxEvent(false));
    component.toggleCreateDay('Monday', checkboxEvent(true));
    component.toggleCreateDay('Wednesday', checkboxEvent(true));

    component.saveNewSchedule();

    expect(component.schedules()).toHaveLength(1);
    expect(component.createDraft()?.dayOfDeparture).toEqual(['Wednesday']);
    expect(component.actionError()).toContain('Only 1 of 2 schedules were created');
    expect(component.actionError()).toContain('Wednesday');
    expect(component.operationNotice()).toEqual({ message: 'Failed to create schedule.', type: 'error' });
  });

  it('requires at least one departure day', () => {
    component.startCreate();
    selectRequiredCreateFields();
    component.toggleCreateDay('Daily', checkboxEvent(false));

    component.saveNewSchedule();

    expect(adminScheduleService.createSchedule).not.toHaveBeenCalled();
    expect(component.actionError()).toBe('Please select at least one departure day.');
  });
});