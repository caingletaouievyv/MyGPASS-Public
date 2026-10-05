import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PHILIPPINE_MOBILE_NUMBER_PATTERN = /^09(?!0{9}$|1{9}$|2{9}$|3{9}$|4{9}$|5{9}$|6{9}$|7{9}$|8{9}$|9{9}$)\d{9}$/;

export const philippineMobileNumberValidator: ValidatorFn = (
  control: AbstractControl<string>
): ValidationErrors | null => {
  const value = control.value?.trim() ?? '';
  return !value || PHILIPPINE_MOBILE_NUMBER_PATTERN.test(value)
    ? null
    : { invalidMobileNumber: true };
};
