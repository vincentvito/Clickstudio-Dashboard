import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements, adminAc } from "better-auth/plugins/organization/access"

const statement = {
  ...defaultStatements,
  project: ["create", "update", "delete"],
} as const

export const ac = createAccessControl(statement)

export const member = ac.newRole({
  project: [],
})

export const admin = ac.newRole({
  project: ["create", "update", "delete"],
  ...adminAc.statements,
})

export const owner = ac.newRole({
  project: ["create", "update", "delete"],
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
})
