export type Role = 'User' | 'Org' | 'Staff' | 'Admin'

export interface UserInfo {
  email: string
  currentRole: Role
}

