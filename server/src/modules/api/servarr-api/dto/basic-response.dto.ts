export class BasicResponseDto {
  status: 'OK' | 'NOK';
  code: 1 | 0;
  message?: string;
}
