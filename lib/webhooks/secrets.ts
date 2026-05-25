import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const SECRET_PREFIX = "whsec_"

function getEncryptionKey() {
  const configuredKey = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
  const material = configuredKey || process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET

  if (!material) return null

  return createHash("sha256").update(material).digest()
}

export function generateWebhookSigningSecret() {
  return `${SECRET_PREFIX}${randomBytes(32).toString("base64url")}`
}

export function encryptWebhookSigningSecret(secret: string) {
  const key = getEncryptionKey()

  if (!key) {
    throw new Error(
      "WEBHOOK_SECRET_ENCRYPTION_KEY, AUTH_SECRET, or BETTER_AUTH_SECRET is required to encrypt webhook secrets",
    )
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`
}

export function decryptWebhookSigningSecret(encryptedSecret: string) {
  const [version, ivValue, tagValue, encryptedValue] = encryptedSecret.split(":")
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported webhook secret format")
  }

  const key = getEncryptionKey()
  if (!key) {
    throw new Error(
      "WEBHOOK_SECRET_ENCRYPTION_KEY or auth secret is required to decrypt webhook secrets",
    )
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
