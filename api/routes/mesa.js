import express from 'express';
import Mesa from '../models/Mesa.js';
import Sale from '../models/Sale.js';
import { requireAuth, authorize } from "../middleware/auth.js";

const router = express.Router();

// Listar todas as mesas
router.get('/list', async (req, res) => {
  try {
    const mesas = await Mesa.find({ ativo: true })
      .populate('vendaAtual')
      .populate('funcionarioResponsavel', 'nome')
      .sort({ numero: 1 });

    res.json(mesas);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar mesas', error: error.message });
  }
});

// Buscar mesa por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mesa = await Mesa.findById(id)
      .populate('vendaAtual')
      .populate('funcionarioResponsavel', 'nome');

    if (!mesa) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }

    res.json({ data: mesa });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar mesa', error: error.message });
  }
});

// Criar nova mesa
router.post('/create', requireAuth, authorize('comandas'), async (req, res) => {
  try {
    const { numero, nome, capacidade, observacoes, tipo } = req.body;
    
    const mesaExistente = await Mesa.findOne({ numero });
    if (mesaExistente) {
      return res.status(400).json({ message: 'Já existe uma mesa com este número' });
    }

    const mesa = new Mesa({
      numero,
      nome,
      capacidade,
      observacoes,
      tipo: tipo || 'interna'
    });

    await mesa.save();
    res.status(201).json({ message: 'Mesa criada com sucesso', mesa });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar mesa', error: error.message });
  }
});

// Abrir mesa
router.post('/:id/abrir', requireAuth, authorize('comandas'), async (req, res) => {
  try {
    const { id } = req.params;
    const { funcionarioId, nomeResponsavel, observacoes, numeroClientes = 1 } = req.body;
    
    const mesa = await Mesa.findById(id);
    if (!mesa) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }

    if (mesa.status === 'ocupada') {
      return res.status(400).json({ message: 'Mesa já está ocupada' });
    }

    // Validar funcionário responsável
    if (!funcionarioId) {
      return res.status(400).json({ message: 'Funcionário responsável é obrigatório' });
    }

    // Atualizar mesa com informações completas
    mesa.status = 'ocupada';
    mesa.clientesAtuais = numeroClientes;
    mesa.horaAbertura = new Date();
    mesa.observacoes = observacoes || '';
    mesa.funcionarioResponsavel = funcionarioId;
    mesa.nomeResponsavel = nomeResponsavel || '';

    await mesa.save();
    
    res.json({ message: 'Mesa aberta com sucesso', mesa });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao abrir mesa', error: error.message });
  }
});

// Fechar mesa
router.post('/:id/fechar', requireAuth, authorize('comandas'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const mesa = await Mesa.findById(id);
    if (!mesa) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }

    // Verificar se há venda em aberto
    if (mesa.vendaAtual) {
      const venda = await Sale.findById(mesa.vendaAtual);
      if (venda && venda.status === 'aberta') {
        return res.status(400).json({ 
          message: 'Não é possível fechar mesa com venda em aberto. Finalize ou cancele a venda primeiro.' 
        });
      }
    }

    await mesa.fechar();
    res.json({ message: 'Mesa fechada com sucesso', mesa });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao fechar mesa', error: error.message });
  }
});

// Atualizar mesa
router.put('/:id', requireAuth, authorize('comandas'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('🔄 Atualizando mesa:', id);
    console.log('🔄 Dados recebidos:', updateData);
    
    const mesa = await Mesa.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!mesa) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }

    console.log('✅ Mesa atualizada:', mesa);
    res.json({ message: 'Mesa atualizada com sucesso', mesa });
  } catch (error) {
    console.error('❌ Erro ao atualizar mesa:', error);
    res.status(500).json({ message: 'Erro ao atualizar mesa', error: error.message });
  }
});

// Deletar mesa (desativar)
router.delete('/:id', requireAuth, authorize('comandas'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const mesa = await Mesa.findById(id);
    if (!mesa) {
      return res.status(404).json({ message: 'Mesa não encontrada' });
    }

    if (mesa.status === 'ocupada') {
      return res.status(400).json({ message: 'Não é possível deletar mesa ocupada' });
    }

    mesa.ativo = false;
    await mesa.save();

    res.json({ message: 'Mesa removida com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover mesa', error: error.message });
  }
});

// Obter status de todas as mesas (para dashboard)
router.get('/status', async (req, res) => {
  try {
    const mesas = await Mesa.find({ ativo: true });
    
    const status = {
      total: mesas.length,
      livres: mesas.filter(m => m.status === 'livre').length,
      ocupadas: mesas.filter(m => m.status === 'ocupada').length,
      reservadas: mesas.filter(m => m.status === 'reservada').length,
      manutencao: mesas.filter(m => m.status === 'manutencao').length
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar status das mesas', error: error.message });
  }
});

export default router;