import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "thunder";

export function issueToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token ausente" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {}
  next();
}

export function authorize(permissionKey) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Não autenticado" });
    if (user.tipo === "admin") return next();
    const permissoes = user.permissoes || {};
    if (permissoes[permissionKey]) return next();
    return res.status(403).json({ error: "Sem permissão" });
  };
}