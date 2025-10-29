import express from "express";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import { requireAuth, authorize } from "../middleware/auth.js";

const router = express.Router();

// Rota padrão GET - redireciona para list
router.get("/", async (req, res) => {
  try {
    const users = await User.find().populate('funcionario').select('-senha');
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// Rota para listar todos os usuários
router.get("/list", async (req, res) => {
  try {
    const users = await User.find()
      .populate('funcionario', 'nome telefone ativo')
      .sort({ dataInclusao: -1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

// Rota para buscar usuário por ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('funcionario', 'nome telefone ativo');
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// Rota para criar usuário
router.post("/create", requireAuth, authorize("configuracoes"), async (req, res) => {
  try {
    const { email, senha, nome, tipo, funcionario, permissoes } = req.body;

    // Verificar se email já existe
    const userExistente = await User.findOne({ email });
    if (userExistente) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    // Se for funcionário, verificar se o funcionário existe
    if (tipo === 'funcionario' && funcionario && funcionario !== 'admin-fixo') {
      const funcionarioExiste = await Employee.findById(funcionario);
      if (!funcionarioExiste) {
        return res.status(400).json({ error: "Funcionário não encontrado" });
      }
    }

    const novoUser = new User({
      email,
      senha, // Em produção, deve ser hasheada
      nome,
      tipo,
      funcionario: tipo === 'funcionario' ? funcionario : undefined,
      permissoes: permissoes || {},
      ativo: true
    });

    await novoUser.save();
    
    const userPopulado = await User.findById(novoUser._id)
      .populate('funcionario', 'nome telefone ativo');
    
    res.status(201).json({ 
      message: "Usuário cadastrado com sucesso", 
      user: userPopulado 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
});

// Rota para atualizar permissões do usuário
router.put("/:id/permissions", requireAuth, authorize("configuracoes"), async (req, res) => {
  try {
    const { permissoes } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { permissoes },
      { new: true }
    ).populate('funcionario', 'nome telefone ativo');
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    res.json({ message: "Permissões atualizadas com sucesso", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar permissões" });
  }
});

// Rota para ativar/desativar usuário
router.put("/:id/status", requireAuth, authorize("configuracoes"), async (req, res) => {
  try {
    const { ativo } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ativo },
      { new: true }
    ).populate('funcionario', 'nome telefone ativo');
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    res.json({ 
      message: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`, 
      user 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao alterar status do usuário" });
  }
});

// Rota para atualizar dados do usuário
router.put("/:id", requireAuth, authorize("configuracoes"), async (req, res) => {
  try {
    const { nome, email, tipo, funcionario, permissoes } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { nome, email, tipo, funcionario, permissoes },
      { new: true }
    ).populate('funcionario', 'nome telefone ativo');
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    res.json({ message: "Usuário atualizado com sucesso", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

// Rota para deletar usuário
router.delete("/:id", requireAuth, authorize("configuracoes"), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar usuário" });
  }
});

export default router;