import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Employee from '../models/Employee.js';
import Customer from '../models/Customer.js';

const router = express.Router();

// Criar nova venda
router.post('/create', async (req, res) => {
  try {
    const { funcionario, cliente, mesa, tipoVenda, nomeComanda, valorTotal, observacoes } = req.body;

    // Verificar se funcionário existe
    if (!funcionario || funcionario.trim() === '') {
      return res.status(400).json({ error: 'Funcionário é obrigatório' });
    }
    
    // Permitir admin-fixo ou verificar se funcionário existe no banco
    if (funcionario !== 'admin-fixo') {
      const funcionarioExiste = await Employee.findById(funcionario);
      if (!funcionarioExiste) {
        return res.status(400).json({ error: 'Funcionário não encontrado' });
      }
    }

    // Verificar se cliente existe (opcional)
    if (cliente && cliente.trim() !== '') {
      const clienteExiste = await Customer.findById(cliente);
      if (!clienteExiste) {
        return res.status(400).json({ error: 'Cliente não encontrado' });
      }
    }

    // Verificar mesa se tipo for mesa
    if (tipoVenda === 'mesa' && mesa) {
      const Mesa = (await import('../models/Mesa.js')).default;
      const mesaExiste = await Mesa.findById(mesa);
      if (!mesaExiste) {
        return res.status(400).json({ error: 'Mesa não encontrada' });
      }
      
      // Verificar se a mesa já tem uma venda ativa
      if (mesaExiste.status === 'ocupada' && mesaExiste.vendaAtual) {
        const vendaExistente = await Sale.findById(mesaExiste.vendaAtual);
        if (vendaExistente && vendaExistente.status === 'aberta') {
          return res.status(400).json({ error: 'Mesa já possui uma venda em aberto' });
        }
      }
    }

    const dadosVenda = {
      itens: [],
      status: 'aberta',
      tipoVenda: tipoVenda || 'balcao'
    };

    // Adicionar funcionario apenas se não for admin-fixo
    if (funcionario !== 'admin-fixo') {
      dadosVenda.funcionario = funcionario;
    }

    // Adicionar nomeComanda se fornecido
    if (nomeComanda && nomeComanda.trim() !== '') {
      dadosVenda.nomeComanda = nomeComanda.trim();
    }

    // Adicionar valorTotal se fornecido
    if (valorTotal && valorTotal > 0) {
      dadosVenda.total = valorTotal;
    }

    // Adicionar observações se fornecidas
    if (observacoes && observacoes.trim() !== '') {
      dadosVenda.observacoes = observacoes.trim();
    }

    // Adicionar cliente apenas se fornecido
    if (cliente && cliente.trim() !== '') {
      dadosVenda.cliente = cliente;
    }

    // Adicionar mesa se fornecida
    if (mesa) {
      dadosVenda.mesa = mesa;
    }

    const novaVenda = new Sale(dadosVenda);
    await novaVenda.save();
    
    // Se for venda de mesa, atualizar status da mesa
    if (tipoVenda === 'mesa' && mesa) {
      const Mesa = (await import('../models/Mesa.js')).default;
      await Mesa.findByIdAndUpdate(mesa, {
        status: 'ocupada',
        vendaAtual: novaVenda._id,
        horaAbertura: new Date()
      });
    }
    
    const vendaPopulada = await Sale.findById(novaVenda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('mesa', 'numero nome');

    res.status(201).json(vendaPopulada);
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar vendas abertas
router.get('/open', async (req, res) => {
  try {
    const vendasAbertas = await Sale.find({ status: 'aberta' })
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .sort({ dataVenda: -1 });

    res.json(vendasAbertas);
  } catch (error) {
    console.error('Erro ao buscar vendas abertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todas as vendas (com filtros opcionais)
router.get('/list', async (req, res) => {
  try {
    const { status, funcionario, cliente, dataInicio, dataFim } = req.query;
    const filtros = {};

    if (status) filtros.status = status;
    if (funcionario) filtros.funcionario = funcionario;
    if (cliente) filtros.cliente = cliente;
    
    if (dataInicio || dataFim) {
      filtros.dataVenda = {};
      if (dataInicio) filtros.dataVenda.$gte = new Date(dataInicio);
      if (dataFim) filtros.dataVenda.$lte = new Date(dataFim);
    }

    const vendas = await Sale.find(filtros)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .sort({ dataVenda: -1 })
      .limit(100); // Limitar a 100 registros

    res.json(vendas);
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar vendas finalizadas por período (para resumo do caixa)
router.get('/finalizadas', async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const filtros = { status: 'finalizada' };
    
    if (dataInicio || dataFim) {
      filtros.dataVenda = {};
      if (dataInicio) {
        // Converter para data local e depois para UTC considerando fuso horário brasileiro (UTC-3)
        const inicio = new Date(dataInicio + 'T00:00:00-03:00');
        filtros.dataVenda.$gte = inicio;
      }
      if (dataFim) {
        // Converter para data local e depois para UTC considerando fuso horário brasileiro (UTC-3)
        const fim = new Date(dataFim + 'T23:59:59-03:00');
        filtros.dataVenda.$lte = fim;
      }
    }

    const vendas = await Sale.find(filtros)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .sort({ dataVenda: -1 });

    res.json(vendas);
  } catch (error) {
    console.error('Erro ao buscar vendas finalizadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar vendas por mesa
router.get('/mesa/:mesaId', async (req, res) => {
  try {
    const { mesaId } = req.params;
    
    const vendas = await Sale.find({ mesa: mesaId })
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('itens.produto', 'nome precoVenda')
      .sort({ dataVenda: -1 });

    res.json(vendas);
  } catch (error) {
    console.error('Erro ao buscar vendas da mesa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar venda por ID
router.get('/:id', async (req, res) => {
  try {
    const venda = await Sale.findById(req.params.id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('itens.produto', 'nome precoVenda');

    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    res.json(venda);
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar item à venda
router.post('/:id/item', async (req, res) => {
  try {
    const { produtoId, quantidade } = req.body;
    
    const venda = await Sale.findById(req.params.id);
    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (venda.status !== 'aberta') {
      return res.status(400).json({ error: 'Não é possível adicionar itens a uma venda finalizada' });
    }

    const produto = await Product.findById(produtoId);
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    if (!produto.ativo) {
      return res.status(400).json({ error: 'Produto inativo' });
    }

    // Verificar se item já existe na venda
    const itemExistente = venda.itens.find(item => item.produto.toString() === produtoId);
    
    if (itemExistente) {
      itemExistente.quantidade += quantidade;
      itemExistente.subtotal = itemExistente.quantidade * itemExistente.precoUnitario;
    } else {
      venda.itens.push({
        produto: produtoId,
        nomeProduto: produto.nome,
        quantidade: quantidade,
        precoUnitario: produto.precoVenda,
        subtotal: quantidade * produto.precoVenda
      });
    }

    await venda.save();
    
    const vendaAtualizada = await Sale.findById(venda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('itens.produto', 'nome precoVenda');

    res.json(vendaAtualizada);
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover item da venda
router.delete('/:id/item/:produtoId', async (req, res) => {
  try {
    const venda = await Sale.findById(req.params.id);
    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (venda.status !== 'aberta') {
      return res.status(400).json({ error: 'Não é possível remover itens de uma venda finalizada' });
    }

    venda.itens = venda.itens.filter(item => item.produto.toString() !== req.params.produtoId);
    await venda.save();
    
    const vendaAtualizada = await Sale.findById(venda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('itens.produto', 'nome precoVenda');

    res.json(vendaAtualizada);
  } catch (error) {
    console.error('Erro ao remover item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar quantidade de item
router.put('/:id/item/:produtoId', async (req, res) => {
  try {
    const { quantidade } = req.body;
    
    if (quantidade <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
    }

    const venda = await Sale.findById(req.params.id);
    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (venda.status !== 'aberta') {
      return res.status(400).json({ error: 'Não é possível alterar itens de uma venda finalizada' });
    }

    const item = venda.itens.find(item => item.produto.toString() === req.params.produtoId);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado na venda' });
    }

    item.quantidade = quantidade;
    item.subtotal = quantidade * item.precoUnitario;

    await venda.save();
    
    const vendaAtualizada = await Sale.findById(venda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('itens.produto', 'nome precoVenda');

    res.json(vendaAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aplicar desconto
router.put('/:id/discount', async (req, res) => {
  try {
    const { desconto } = req.body;
    
    if (desconto < 0) {
      return res.status(400).json({ error: 'Desconto não pode ser negativo' });
    }

    const venda = await Sale.findById(req.params.id);
    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (venda.status !== 'aberta') {
      return res.status(400).json({ error: 'Não é possível alterar desconto de uma venda finalizada' });
    }

    venda.desconto = desconto;
    await venda.save();
    
    const vendaAtualizada = await Sale.findById(venda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('itens.produto', 'nome precoVenda');

    res.json(vendaAtualizada);
  } catch (error) {
    console.error('Erro ao aplicar desconto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Finalizar venda
router.put('/:id/finalize', async (req, res) => {
  try {
    const { formaPagamento } = req.body;
    
    const venda = await Sale.findById(req.params.id);
    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (venda.status !== 'aberta') {
      return res.status(400).json({ error: 'Venda já foi finalizada ou cancelada' });
    }

    if (venda.itens.length === 0) {
      return res.status(400).json({ error: 'Não é possível finalizar uma venda sem itens' });
    }

    // Definir forma de pagamento se fornecida
    if (formaPagamento && ['dinheiro', 'cartao', 'pix'].includes(formaPagamento)) {
      venda.formaPagamento = formaPagamento;
    }

    venda.status = 'finalizada';
    venda.dataFinalizacao = new Date();
    await venda.save();
    
    // Se a venda está associada a uma mesa, limpar os dados da mesa
    if (venda.mesa) {
      const Mesa = (await import('../models/Mesa.js')).default;
      await Mesa.findByIdAndUpdate(venda.mesa, {
        status: 'livre',
        vendaAtual: null,
        clientesAtuais: 0,
        horaAbertura: null,
        observacoes: ''
      });
    }
    
    const vendaFinalizada = await Sale.findById(venda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('itens.produto', 'nome precoVenda');

    res.json(vendaFinalizada);
  } catch (error) {
    console.error('Erro ao finalizar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cancelar venda
router.put('/:id/cancel', async (req, res) => {
  try {
    const venda = await Sale.findById(req.params.id);
    if (!venda) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (venda.status === 'finalizada') {
      return res.status(400).json({ error: 'Não é possível cancelar uma venda finalizada' });
    }

    venda.status = 'cancelada';
    await venda.save();
    
    const vendaCancelada = await Sale.findById(venda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('itens.produto', 'nome precoVenda');

    res.json(vendaCancelada);
  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todas as vendas (rota alternativa)
router.get('/', async (req, res) => {
  try {
    const { status, funcionario, cliente, dataInicio, dataFim } = req.query;
    const filtros = {};

    if (status) filtros.status = status;
    if (funcionario) filtros.funcionario = funcionario;
    if (cliente) filtros.cliente = cliente;
    
    if (dataInicio || dataFim) {
      filtros.dataVenda = {};
      if (dataInicio) filtros.dataVenda.$gte = new Date(dataInicio);
      if (dataFim) filtros.dataVenda.$lte = new Date(dataFim);
    }

    const vendas = await Sale.find(filtros)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .sort({ dataVenda: -1 })
      .limit(100); // Limitar a 100 registros

    res.json(vendas);
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;