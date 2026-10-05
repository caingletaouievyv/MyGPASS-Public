import { AuthUser } from '../auth/auth.models';

export function guestInformationFromUser(user: Pick<AuthUser, 'firstName' | 'lastName' | 'mobileNumber' | 'email'> | null): {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email: string;
} {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    mobileNumber: user?.mobileNumber ?? '',
    email: user?.email ?? ''
  };
}
