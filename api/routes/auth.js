import express from "express";
import bcrypt from "bcrypt";
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
      return res.json({ 
        message: "Login bem-sucedido", 
        token: "admin-token-123", // Token fictício para o admin
        user: { 
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
        } 
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

    const senhaCorreta = await bcrypt.compare(senhaInput, user.senha);
    if (!senhaCorreta) return res.status(400).json({ error: "Senha incorreta" });

    res.json({ message: "Login bem-sucedido", user: { _id: user._id, email: user.email, nome: user.nome || user.name, tipo: user.tipo || "funcionario" } });
  } catch (error) {
    res.status(500).json({ error: "Erro no login" });
  }
});

export default router;
