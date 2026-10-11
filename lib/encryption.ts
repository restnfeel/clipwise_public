import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const LEGACY_ALGORITHM = "aes-256-cbc";

type MasterKey = { secret: string; key: Buffer; kid: string };

function toMasterKey(secret: string): MasterKey {
  const key = crypto.createHash("sha256").update(secret).digest();
  // kid는 키 자체가 아니라 키 해시의 해시 앞부분이라 노출돼도 키를 추정할 수 없다.
  const kid = crypto.createHash("sha256").update(key).digest("hex").slice(0, 8);
  return { secret, key, kid };
}

/** 현재 키 + (교체 중이면) 이전 키. 런타임에 읽어 기본값 없이 동작한다. */
function masterKeys(): MasterKey[] {
  const current = process.env.ENCRYPTION_KEY?.trim() || "";
  if (!current) throw new Error("ENCRYPTION_KEY가 설정되지 않았습니다. 암호화·복호화를 할 수 없습니다.");
  const previous = process.env.ENCRYPTION_KEY_PREVIOUS?.trim() || "";
  return previous && previous !== current ? [toMasterKey(current), toMasterKey(previous)] : [toMasterKey(current)];
}

export function currentEncryptionKeyId() {
  return masterKeys()[0].kid;
}

export function encryptApiKey(text: string): string {
  const { key, kid } = masterKeys()[0];
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return ["v3", kid, iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted].join(":");
}

function decryptGcm(key: Buffer, ivHex: string, tagHex: string, encryptedData: string) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function decryptApiKey(encryptedText: string): string {
  const keys = masterKeys();
  const parts = encryptedText.split(":");

  if (parts[0] === "v3") {
    const [, kid, ivHex, tagHex, encryptedData] = parts;
    if (!kid || !ivHex || !tagHex || !encryptedData) throw new Error("암호문 형식이 올바르지 않습니다.");
    const match = keys.find((candidate) => candidate.kid === kid);
    if (!match) throw new Error("이 값을 암호화한 키를 찾을 수 없습니다. ENCRYPTION_KEY 또는 ENCRYPTION_KEY_PREVIOUS를 확인하세요.");
    return decryptGcm(match.key, ivHex, tagHex, encryptedData);
  }

  if (parts[0] === "v2") {
    const [, ivHex, tagHex, encryptedData] = parts;
    if (!ivHex || !tagHex || !encryptedData) throw new Error("암호문 형식이 올바르지 않습니다.");
    for (const candidate of keys) {
      try { return decryptGcm(candidate.key, ivHex, tagHex, encryptedData); } catch { /* 다음 키 시도 */ }
    }
    throw new Error("암호문을 복호화하지 못했습니다. ENCRYPTION_KEY를 확인하세요.");
  }

  // 구형 형식: 저장된 IV를 쓰지 않던 password 기반 cipher. 기존 레코드 복호화 용도로만 유지한다.
  const { key, iv } = legacyKeyAndIv(keys[0].secret);
  const encryptedData = parts.slice(1).join(":");
  const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/** 암호문이 이전 키나 구형 형식이면 true. 관리자 재암호화 대상 판별용. */
export function needsReencryption(encryptedText: string) {
  const parts = encryptedText.split(":");
  return parts[0] !== "v3" || parts[1] !== currentEncryptionKeyId();
}

function legacyKeyAndIv(secret: string) {
  const password = Buffer.from(secret);
  const chunks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  while (Buffer.concat(chunks).length < 48) {
    previous = crypto.createHash("md5").update(Buffer.concat([previous, password])).digest();
    chunks.push(previous);
  }
  const derived = Buffer.concat(chunks);
  return { key: derived.subarray(0, 32), iv: derived.subarray(32, 48) };
}

/** 비밀값 비교용 지문. 원문을 복원할 수 없다. */
export function secretFingerprint(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 6);
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "*".repeat(apiKey.length);
  }
  return (
    apiKey.substring(0, 4) +
    "*".repeat(apiKey.length - 8) +
    apiKey.substring(apiKey.length - 4)
  );
}
