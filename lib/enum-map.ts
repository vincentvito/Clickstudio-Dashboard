// Maps between frontend display values and Prisma enum values
// Prisma enums use PascalCase internally, @map handles DB storage

const STATE_TO_PRISMA: Record<string, string> = {
  Backlog: "Backlog",
  "In Build": "InBuild",
  Live: "Live",
  Paused: "Paused",
}

const STATE_FROM_PRISMA: Record<string, string> = {
  Backlog: "Backlog",
  InBuild: "In Build",
  Live: "Live",
  Paused: "Paused",
}

const SECTION_TO_PRISMA: Record<string, string> = {
  Product: "Product",
  Marketing: "Marketing",
}

export function stateToPrisma(state: string): string {
  return STATE_TO_PRISMA[state] ?? state
}

export function stateFromPrisma(state: string): string {
  return STATE_FROM_PRISMA[state] ?? state
}

export function sectionToPrisma(section: string): string {
  return SECTION_TO_PRISMA[section] ?? section
}
