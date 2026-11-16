import os from 'node:os';

// Virtuální adaptéry, přes které se telefony na notebook nedostanou.
const VIRTUAL_ADAPTER = /vethernet|virtualbox|vmware|wsl|docker|hyper-v|loopback|tailscale|zerotier|vpn/i;

function isPrivate(ip: string): boolean {
  return (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/** IPv4 adresa notebooku v místní síti; HOST_IP ji přepíše. */
export function findLanIp(): string {
  if (process.env.HOST_IP) return process.env.HOST_IP;

  const candidates: { name: string; address: string }[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) candidates.push({ name, address: a.address });
    }
  }

  const best =
    candidates.find((c) => isPrivate(c.address) && !VIRTUAL_ADAPTER.test(c.name)) ??
    candidates.find((c) => isPrivate(c.address)) ??
    candidates[0];

  return best?.address ?? 'localhost';
}

export function listLanIps(): string[] {
  return Object.entries(os.networkInterfaces()).flatMap(([name, addrs]) =>
    (addrs ?? [])
      .filter((a) => a.family === 'IPv4' && !a.internal)
      .map((a) => `${a.address} (${name})`),
  );
}
