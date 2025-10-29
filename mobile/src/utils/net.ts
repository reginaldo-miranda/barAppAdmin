// Utilitários de validação de rede (IPv4/IPv6) e consistência

export function isValidIPv4(ip: string): boolean {
  const reg = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return reg.test(String(ip).trim());
}

export function isValidIPv4Mask(mask: string): boolean {
  if (!isValidIPv4(mask)) return false;
  // Máscaras válidas devem ser blocos de 1s contíguos seguidos de 0s
  const octets = mask.split('.').map((o) => parseInt(o, 10));
  const bin = octets.map((o) => o.toString(2).padStart(8, '0')).join('');
  const firstZero = bin.indexOf('0');
  const lastOne = bin.lastIndexOf('1');
  if (firstZero === -1) return true; // 255.255.255.255
  return lastOne < firstZero && !bin.slice(firstZero).includes('1');
}

export function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

export function sameSubnet(ip: string, mask: string, gateway: string): boolean {
  if (!isValidIPv4(ip) || !isValidIPv4Mask(mask) || !isValidIPv4(gateway)) return false;
  const ipInt = ipv4ToInt(ip);
  const maskInt = ipv4ToInt(mask);
  const gwInt = ipv4ToInt(gateway);
  return (ipInt & maskInt) === (gwInt & maskInt);
}

// IPv6 básica: aceita endereços abreviados e com prefixo
export function isValidIPv6(ip: string): boolean {
  const str = String(ip).trim();
  // Aceita :: abreviação, hextets 0-FFFF, no mais validações básicas
  const ipv6Regex = /^((?:[\da-fA-F]{1,4}:){1,7}[\da-fA-F]{1,4}|(?:[\da-fA-F]{1,4}:){1,7}:|:(?::[\da-fA-F]{1,4}){1,7}|(?:[\da-fA-F]{1,4}:){1,6}:(?:[\da-fA-F]{1,4})|(?:[\da-fA-F]{1,4}:){1,5}(?::[\da-fA-F]{1,4}){1,2}|(?:[\da-fA-F]{1,4}:){1,4}(?::[\da-fA-F]{1,4}){1,3}|(?:[\da-fA-F]{1,4}:){1,3}(?::[\da-fA-F]{1,4}){1,4}|(?:[\da-fA-F]{1,4}:){1,2}(?::[\da-fA-F]{1,4}){1,5}|[\da-fA-F]{1,4}:(?::[\da-fA-F]{1,4}){1,6})$/;
  return ipv6Regex.test(str);
}

export function isValidIPv6Prefix(prefix: string): boolean {
  const n = Number(String(prefix).trim());
  return Number.isInteger(n) && n >= 0 && n <= 128;
}

export function buildApiUrlFromIPv4(ip: string, port = 4000): string {
  return `http://${ip}:${port}/api`;
}

export function buildSocketOriginFromIPv4(ip: string, port = 4000): string {
  return `http://${ip}:${port}`;
}