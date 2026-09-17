export async function api(path, method = "GET", body, mutationContext) {
  const res = await fetch(`/api${path}`, {
    method,
    headers:
      method === "GET"
        ? {}
        : {
            "Content-Type": "application/json",
            ...(mutationContext == null
              ? {}
              : { "X-Expected-Member": String(mutationContext) }),
          },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 409 && data.error?.includes("account changed"))
      window.dispatchEvent(new CustomEvent("sessionchange", { detail: { mutationContext } }));
    throw new Error(data.error || "Unable to connect. Please try again.");
  }
  return data;
}
