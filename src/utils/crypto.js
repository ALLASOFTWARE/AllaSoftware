import crypto from "crypto"

const getKey = () => {
  const secret =
    process.env.WHATSAPP_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    "desenvolvimento_whatsapp_token_secret"

  return crypto.createHash("sha256").update(secret).digest()
}

export const encryptText = (value) => {
  if (!value) return ""

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()

  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64")
  ].join(".")
}

export const decryptText = (value) => {
  if (!value) return ""

  const [ivText, tagText, encryptedText] = String(value).split(".")

  if (!ivText || !tagText || !encryptedText) {
    return value
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivText, "base64")
  )
  decipher.setAuthTag(Buffer.from(tagText, "base64"))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final()
  ]).toString("utf8")
}
