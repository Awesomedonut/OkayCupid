import { isIP } from "node:net";
export function cookieSecurity(publicOrigin, secureCookies) {
  if (publicOrigin) {
    const origin = new URL(publicOrigin);
    if (
      origin.origin !== publicOrigin ||
      (origin.protocol !== "https:" &&
        !(
          origin.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
        ))
    )
      throw Error(
        "PUBLIC_ORIGIN must be a canonical HTTPS origin or loopback HTTP origin.",
      );
    if (origin.protocol === "https:") secureCookies = true;
  }
  return secureCookies;
}

export function trustedProxyAddresses(trustedProxies) {
  const proxies = trustedProxies
    ? trustedProxies.split(",").map((value) => value.trim())
    : [];
  for (const proxy of proxies) {
    const [address, prefix, extra] = proxy.split("/");
    const version = isIP(address);
    if (
      !version ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) > (version === 4 ? 32 : 128)))
    )
      throw Error(
        "TRUSTED_PROXIES must contain explicit IP addresses or CIDR subnets.",
      );
  }
  return proxies.length ? proxies : false;
}
