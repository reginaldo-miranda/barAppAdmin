import express from 'express';
import UnidadeMedida from '../models/UnidadeMedida.js';

const router = express.Router();

// Listar todas as unidades de medida
router.get('/list', async (req, res) => {
  try {
    const unidades = await UnidadeMedida.find({ ativo: true }).sort({ nome: 1 });
    res.json(unidades);
  } catch (error) {
    console.error('Erro ao buscar unidades de medida:', error);
    res.status(500).json({ error: 'Erro ao buscar unidades de medida' });
  }
});

// Criar nova unidade de medida
router.post('/create', async (req, res) => {
  try {
    const { nome, sigla } = req.body;
    
    if (!nome || !sigla) {
      return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });
    }

    const unidade = new UnidadeMedida({ nome, sigla });
    await unidade.save();
    
    res.status(201).json({ message: 'Unidade de medida cadastrada com sucesso', unidade });
  } catch (error) {
    console.error('Erro ao cadastrar unidade de medida:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Unidade de medida já existe' });
    } else {
      res.status(500).json({ error: 'Erro ao cadastrar unidade de medida' });
    }
  }
});

// Atualizar unidade de medida
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, sigla, ativo } = req.body;
    
    const unidade = await UnidadeMedida.findByIdAndUpdate(
      id,
      { nome, sigla, ativo },
      { new: true, runValidators: true }
    );
    
    if (!unidade) {
      return res.status(404).json({ error: 'Unidade de medida não encontrada' });
    }
    
    res.json({ message: 'Unidade de medida atualizada com sucesso', unidade });
  } catch (error) {
    console.error('Erro ao atualizar unidade de medida:', error);
    res.status(500).json({ error: 'Erro ao atualizar unidade de medida' });
  }
});

// Deletar unidade de medida (soft delete)
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const unidade = await UnidadeMedida.findByIdAndUpdate(
      id,
      { ativo: false },
      { new: true }
    );
    
    if (!unidade) {
      return res.status(404).json({ error: 'Unidade de medida não encontrada' });
    }
    
    res.json({ message: 'Unidade de medida removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover unidade de medida:', error);
    res.status(500).json({ error: 'Erro ao remover unidade de medida' });
  }
});

export default router;