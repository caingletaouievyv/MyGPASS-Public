import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

function passwordCharacterValidator(
  pattern: RegExp,
  errorKey: string
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    return !value || pattern.test(value) ? null : { [errorKey]: true };
  };
}

export function passwordComplexityValidators(): ValidatorFn[] {
  return [
    Validators.minLength(8),
    passwordCharacterValidator(/[A-Z]/, 'uppercase'),
    passwordCharacterValidator(/[a-z]/, 'lowercase'),
    passwordCharacterValidator(/\d/, 'number'),
    passwordCharacterValidator(/[^A-Za-z0-9]/, 'specialCharacter')
  ];
}
