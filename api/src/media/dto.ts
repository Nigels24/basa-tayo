import { IsIn } from 'class-validator';

export class SignatureDto {
  @IsIn(['image', 'audio']) kind: 'image' | 'audio';
}
