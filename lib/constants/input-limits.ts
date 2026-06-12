/** Central max-length limits for admin form and search inputs. */
export const INPUT_MAX_LENGTH = {
  search: 120,
  email: 254,
  identifier: 254,
  phone: 20,
  name: 100,
  fullName: 100,
  password: 128,
  bio: 500,
  shortBio: 280,
  description: 1000,
  departmentName: 80,
  organization: 120,
  position: 120,
  companyName: 120,
  subject: 200,
  rejectionReason: 500,
  resolutionNotes: 2000,
  adminNotes: 2000,
  note: 1000,
  disputeDescription: 2000,
} as const;

export type InputMaxLengthKey = keyof typeof INPUT_MAX_LENGTH;
