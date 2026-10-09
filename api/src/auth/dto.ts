import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** At least 8 characters with at least one letter and one number. */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_MESSAGE = 'Ang password ay dapat may 8 o higit pang character, may letra at numero';

export class TeacherLoginDto {
  @IsString() @IsNotEmpty() username: string;
  @IsString() @IsNotEmpty() password: string;
}

export class PupilLoginDto {
  @IsString() @Length(4, 8) code: string;
}

/** Shared fields of the sign-up form and the Aking Account page. */
class ProfileFields {
  @Transform(trim) @IsString() @Length(3, 80, { message: 'Ang buong pangalan ay dapat 3 hanggang 80 character' })
  fullName: string;

  @Transform(trim) @IsString() @Length(3, 120, { message: 'Ang paaralan ay dapat 3 hanggang 120 character' })
  school: string;

  @Transform(trim) @IsOptional() @IsString() @MaxLength(60, { message: 'Ang seksyon ay hanggang 60 character lamang' })
  section?: string;
}

export class RegisterTeacherDto extends ProfileFields {
  @Transform(trimLower)
  @IsString()
  @Length(4, 30, { message: 'Ang username ay dapat 4 hanggang 30 character' })
  @Matches(/^[a-z0-9._]+$/, { message: 'Maliliit na letra, numero, tuldok (.) at underscore (_) lamang ang puwede sa username' })
  username: string;

  @IsString() @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE }) password: string;

  @IsString() @IsNotEmpty({ message: 'Ilagay ang registration code' }) registrationCode: string;
}

export class UpdateProfileDto extends ProfileFields {}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty({ message: 'Ilagay ang kasalukuyang password' }) currentPassword: string;
  @IsString() @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE }) newPassword: string;
}
