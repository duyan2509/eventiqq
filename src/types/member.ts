export interface MemberResponse {
  id: string
  userId: string
  email: string
  permissionName: string
  isDesigner: boolean
}

export interface ChangePermission {
  permissionId: string
}
