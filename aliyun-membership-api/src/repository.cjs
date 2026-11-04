const OSS = require("ali-oss");

class MemoryMembershipRepository {
  constructor(codes = {}) {
    this.codes = new Map(Object.entries(codes));
    this.devices = new Map();
  }

  async getCode(codeHash) {
    return this.codes.get(codeHash) ?? null;
  }

  async putCode(codeHash, record) {
    this.codes.set(codeHash, record);
  }

  async claimSession(codeHash, deviceHash, maxSessions, nowIso, activeAfterIso) {
    const devices = this.devices.get(codeHash) ?? new Map();
    const activeAfter = Date.parse(activeAfterIso);
    for (const [key, device] of devices) {
      if (Date.parse(device.lastSeenAt) < activeAfter) devices.delete(key);
    }
    if (!devices.has(deviceHash) && devices.size >= maxSessions) return { allowed: false, count: devices.size };
    const existing = devices.get(deviceHash);
    devices.set(deviceHash, { firstSeenAt: existing?.firstSeenAt ?? nowIso, lastSeenAt: nowIso });
    this.devices.set(codeHash, devices);
    return { allowed: true, count: devices.size };
  }

  async endSession(codeHash, deviceHash) {
    const devices = this.devices.get(codeHash);
    if (!devices) return;
    devices.delete(deviceHash);
    if (devices.size === 0) this.devices.delete(codeHash);
  }
}

class OssMembershipRepository {
  constructor(client, prefix = "_private/membership") {
    this.client = client;
    this.prefix = prefix.replace(/^\/+|\/+$/g, "");
  }

  codeKey(codeHash) {
    return `${this.prefix}/codes/${codeHash}.json`;
  }

  deviceKey(codeHash, deviceHash) {
    return `${this.prefix}/devices/${codeHash}/${deviceHash}.json`;
  }

  async readJson(key) {
    try {
      const result = await this.client.get(key);
      return JSON.parse(result.content.toString("utf8"));
    } catch (error) {
      if (error?.status === 404 || error?.code === "NoSuchKey") return null;
      throw error;
    }
  }

  async getCode(codeHash) {
    return this.readJson(this.codeKey(codeHash));
  }

  async putCode(codeHash, record) {
    await this.client.put(this.codeKey(codeHash), Buffer.from(JSON.stringify(record)), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  async claimSession(codeHash, deviceHash, maxSessions, nowIso, activeAfterIso) {
    const prefix = `${this.prefix}/devices/${codeHash}/`;
    const currentKey = this.deviceKey(codeHash, deviceHash);
    const activeAfter = Date.parse(activeAfterIso);
    const listed = await this.client.listV2({ prefix, "max-keys": 1000 });
    const objects = listed.objects ?? [];
    const activeObjects = objects.filter(object => Date.parse(object.lastModified) >= activeAfter);
    const currentIsActive = activeObjects.some(object => object.name === currentKey);
    if (!currentIsActive && activeObjects.length >= maxSessions) {
      return { allowed: false, count: activeObjects.length };
    }

    const existing = await this.readJson(currentKey);
    await this.client.put(
      currentKey,
      Buffer.from(JSON.stringify({ firstSeenAt: existing?.firstSeenAt ?? nowIso, lastSeenAt: nowIso })),
      { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );

    const staleKeys = objects
      .filter(object => object.name !== currentKey && Date.parse(object.lastModified) < activeAfter)
      .slice(0, 50)
      .map(object => object.name);
    await Promise.allSettled(staleKeys.map(key => this.client.delete(key)));
    return { allowed: true, count: currentIsActive ? activeObjects.length : activeObjects.length + 1 };
  }

  async endSession(codeHash, deviceHash) {
    try {
      await this.client.delete(this.deviceKey(codeHash, deviceHash));
    } catch (error) {
      if (error?.status !== 404 && error?.code !== "NoSuchKey") throw error;
    }
  }
}

function createOssClient(env = process.env, bucket = env.OSS_BUCKET) {
  const options = {
    region: env.OSS_REGION,
    bucket,
    accessKeyId: env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    secure: true,
    authorizationV4: true,
  };
  if (env.ALIBABA_CLOUD_SECURITY_TOKEN) options.stsToken = env.ALIBABA_CLOUD_SECURITY_TOKEN;
  return new OSS(options);
}

module.exports = { MemoryMembershipRepository, OssMembershipRepository, createOssClient };
