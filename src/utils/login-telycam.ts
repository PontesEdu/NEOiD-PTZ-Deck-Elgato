
interface LoginTelycamProps {
  ip: string
  user: string
  password: string
}

export async function LoginTelycam({ ip, user, password}: LoginTelycamProps) {
  try {
    const res = await fetch(`http://${ip}/cgi-bin/web.fcgi?func=get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: null,
        system: { login: `${user}:${password}` }
      })
    });

    const data = await res.json() as any

    return data.system.login ?? null;
  } catch (err) {
    // IP inexistente, câmera desligada, timeout, etc
    return null;
  }
}