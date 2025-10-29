import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { optionalAuth, issueToken } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// Rota de cadastro
router.post("/register", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // verificar se já existe
    const userExistente = await User.findOne({ email });
    if (userExistente) {
      return res.status(400).json({ error: "Usuário já existe" });
    }

    // criptografar senha
    const hashedSenha = await bcrypt.hash(senha, 10);

    const novoUser = new User({ email, senha: hashedSenha });
    await novoUser.save();

    res.status(201).json({ message: "Usuário cadastrado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: "Erro no cadastro" });
  }
});

// Rota de login
router.post("/login", async (req, res) => {
  try {
    const { email, senha, password } = req.body;
    const senhaInput = senha || password; // Aceita tanto 'senha' quanto 'password'

    // Usuário admin fixo para primeiro acesso
    const adminFixo = {
      name: "Admin",
      email: "admin@barapp.com",
      password: "123456",
      role: "admin"
    };

    // Verificar se é o usuário admin fixo
    if (email === adminFixo.email && senhaInput === adminFixo.password) {
      const adminUser = {
        _id: "admin-fixo",
        email: adminFixo.email,
        nome: adminFixo.name,
        tipo: "admin",
        permissoes: {
          vendas: true,
          produtos: true,
          funcionarios: true,
          clientes: true,
          relatorios: true,
          configuracoes: true,
          comandas: true
        }
      };
      const token = issueToken(adminUser);
      return res.json({ message: "Login bem-sucedido", token, user: adminUser });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

    const senhaCorreta = await bcrypt.compare(senhaInput, user.senha);
    if (!senhaCorreta) return res.status(400).json({ error: "Senha incorreta" });

    const safeUser = {
      _id: user._id,
      email: user.email,
      nome: user.nome || user.name,
      tipo: user.tipo || "funcionario",
      permissoes: user.permissoes || {}
    };
    const token = issueToken(safeUser);
    res.json({ message: "Login bem-sucedido", token, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: "Erro no login" });
  }
});

// Retorna usuário autenticado
router.get("/me", optionalAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Não autenticado" });
  res.json({ user: req.user });
});

export default router;
