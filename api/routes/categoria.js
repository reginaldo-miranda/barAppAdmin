import express from 'express';
import Categoria from '../models/Categoria.js';
import { requireAuth, authorize } from "../middleware/auth.js";

const router = express.Router();

// Listar todas as categorias
router.get('/list', async (req, res) => {
  try {
    const categorias = await Categoria.find({ ativo: true }).sort({ nome: 1 });
    res.json(categorias);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Buscar categoria por ID
router.get('/:id', async (req, res) => {
  try {
    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    res.json(categoria);
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    res.status(500).json({ error: 'Erro ao buscar categoria' });
  }
});

// Criar nova categoria
router.post('/create', requireAuth, authorize('configuracoes'), async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const categoria = new Categoria({ nome, descricao });
    await categoria.save();
    
    res.status(201).json({ message: 'Categoria cadastrada com sucesso', categoria });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
    }
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// Atualizar categoria
router.put('/update/:id', requireAuth, authorize('configuracoes'), async (req, res) => {
  try {
    const { nome, descricao, ativo } = req.body;
    
    const categoria = await Categoria.findByIdAndUpdate(
      req.params.id,
      { nome, descricao, ativo },
      { new: true, runValidators: true }
    );
    
    if (!categoria) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    
    res.json({ message: 'Categoria atualizada com sucesso', categoria });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
    }
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// Excluir categoria (soft delete)
router.delete('/delete/:id', requireAuth, authorize('configuracoes'), async (req, res) => {
  try {
    const categoria = await Categoria.findByIdAndUpdate(
      req.params.id,
      { ativo: false },
      { new: true }
    );
    
    if (!categoria) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

export default router;