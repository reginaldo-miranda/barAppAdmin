import express from "express";
import ProductGroup from "../models/ProductGroup.js";

const router = express.Router();

// Rota para criar grupo
router.post("/create", async (req, res) => {
  try {
    const { nome, descricao, icone } = req.body;

    // Verificar se já existe um grupo com esse nome
    const grupoExistente = await ProductGroup.findOne({ nome: nome.toLowerCase() });
    if (grupoExistente) {
      return res.status(400).json({ error: "Já existe um grupo com este nome" });
    }

    const novoGrupo = new ProductGroup({
      nome: nome.toLowerCase(),
      descricao,
      icone: icone || '📦'
    });

    await novoGrupo.save();
    res.status(201).json({ message: "Grupo criado com sucesso", group: novoGrupo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar grupo" });
  }
});

// Rota para listar todos os grupos
router.get("/list", async (req, res) => {
  try {
    const groups = await ProductGroup.find({ ativo: true }).sort({ dataInclusao: -1 });
    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar grupos" });
  }
});

// Rota para buscar grupo por ID
router.get("/:id", async (req, res) => {
  try {
    const group = await ProductGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar grupo" });
  }
});

// Rota para atualizar grupo
router.put("/update/:id", async (req, res) => {
  try {
    const { nome, descricao, icone, ativo } = req.body;
    
    const grupoAtualizado = await ProductGroup.findByIdAndUpdate(
      req.params.id,
      { nome: nome?.toLowerCase(), descricao, icone, ativo },
      { new: true }
    );

    if (!grupoAtualizado) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    res.json({ message: "Grupo atualizado com sucesso", group: grupoAtualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar grupo" });
  }
});

// Rota para deletar grupo
router.delete("/delete/:id", async (req, res) => {
  try {
    const grupoDeletado = await ProductGroup.findByIdAndUpdate(
      req.params.id,
      { ativo: false },
      { new: true }
    );
    
    if (!grupoDeletado) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    res.json({ message: "Grupo desativado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar grupo" });
  }
});

export default router;