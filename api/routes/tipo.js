import express from 'express';
import Tipo from '../models/Tipo.js';

const router = express.Router();

// Listar todos os tipos
router.get('/list', async (req, res) => {
  try {
    const tipos = await Tipo.find({ ativo: true }).sort({ nome: 1 });
    res.json(tipos);
  } catch (error) {
    console.error('Erro ao buscar tipos:', error);
    res.status(500).json({ error: 'Erro ao buscar tipos' });
  }
});

// Criar novo tipo
router.post('/create', async (req, res) => {
  try {
    const { nome } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const tipo = new Tipo({ nome });
    await tipo.save();
    
    res.status(201).json({ message: 'Tipo cadastrado com sucesso', tipo });
  } catch (error) {
    console.error('Erro ao cadastrar tipo:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Tipo já existe' });
    } else {
      res.status(500).json({ error: 'Erro ao cadastrar tipo' });
    }
  }
});

// Atualizar tipo
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, ativo } = req.body;
    
    const tipo = await Tipo.findByIdAndUpdate(
      id,
      { nome, ativo },
      { new: true, runValidators: true }
    );
    
    if (!tipo) {
      return res.status(404).json({ error: 'Tipo não encontrado' });
    }
    
    res.json({ message: 'Tipo atualizado com sucesso', tipo });
  } catch (error) {
    console.error('Erro ao atualizar tipo:', error);
    res.status(500).json({ error: 'Erro ao atualizar tipo' });
  }
});

// Deletar tipo (soft delete)
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tipo = await Tipo.findByIdAndUpdate(
      id,
      { ativo: false },
      { new: true }
    );
    
    if (!tipo) {
      return res.status(404).json({ error: 'Tipo não encontrado' });
    }
    
    res.json({ message: 'Tipo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover tipo:', error);
    res.status(500).json({ error: 'Erro ao remover tipo' });
  }
});

export default router;