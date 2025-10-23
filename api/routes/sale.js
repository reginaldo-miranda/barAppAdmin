import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Employee from '../models/Employee.js';
import Customer from '../models/Customer.js';
import Caixa from '../models/Caixa.js';

const router = express.Router();

// Criar nova venda
router.post('/create', async (req, res) => {
  try {
    const { funcionario, cliente, mesa, tipoVenda, nomeComanda, valorTotal, observacoes } = req.body

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

    // Resolver ID de funcionário (mapeando admin-fixo para um funcionário padrão)
    let funcionarioResolvedId = null;
    if (funcionario !== 'admin-fixo') {
      funcionarioResolvedId = funcionario;
    } else {
      let funcionarioPadrao = await Employee.findOne({ nome: 'Administrador' })
        || await Employee.findOne({ email: 'admin@bar.com' })
        || await Employee.findOne({ status: 'ativo' })
        || await Employee.findOne();
      if (!funcionarioPadrao) {
        funcionarioPadrao = new Employee({
          nome: 'Administrador',
          email: 'admin@bar.com',
          telefone: '(00) 00000-0000',
          cargo: 'Gerente',
          salario: 0,
          dataAdmissao: new Date(),
          status: 'ativo'
        });
        await funcionarioPadrao.save();
      }
      funcionarioResolvedId = funcionarioPadrao?._id || null;
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
      tipoVenda: tipoVenda || 'balcao',
      funcionario: funcionarioResolvedId || undefined
    };

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
    
    // Se for venda de mesa, atualizar status da mesa e linkar vendaAtual (sem alterar responsável)
    if (tipoVenda === 'mesa' && mesa) {
      const Mesa = (await import('../models/Mesa.js')).default;
      await Mesa.findByIdAndUpdate(mesa, {
        status: 'ocupada',
        vendaAtual: novaVenda._id,
        horaAbertura: new Date()
      });
    }
    
    // Após salvar nova venda, popular referências
    const vendaPopulada = await Sale.findById(novaVenda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate({
        path: 'mesa',
        select: 'numero nome nomeResponsavel funcionarioResponsavel',
        populate: { path: 'funcionarioResponsavel', select: 'nome' }
      });

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
      .populate({
        path: 'mesa',
        select: 'numero nome nomeResponsavel funcionarioResponsavel',
        populate: { path: 'funcionarioResponsavel', select: 'nome' }
      })
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
      .populate({
        path: 'mesa',
        select: 'numero nome nomeResponsavel funcionarioResponsavel',
        populate: { path: 'funcionarioResponsavel', select: 'nome' }
      })
      .sort({ dataVenda: -1 })
      .limit(100);

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
        const inicio = new Date(dataInicio + 'T00:00:00-03:00');
        filtros.dataVenda.$gte = inicio;
      }
      if (dataFim) {
        const fim = new Date(dataFim + 'T23:59:59-03:00');
        filtros.dataVenda.$lte = fim;
      }
    }

    const vendas = await Sale.find(filtros)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate('mesa', 'numero nome')
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
      .populate('mesa', 'numero nome')
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
      .populate('mesa', 'numero nome')
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

    // Normalizar e definir forma de pagamento
    const formaPagamentoNormalizada = (formaPagamento || venda.formaPagamento || 'dinheiro')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (['dinheiro', 'cartao', 'pix'].includes(formaPagamentoNormalizada)) {
      venda.formaPagamento = formaPagamentoNormalizada;
    } else {
      venda.formaPagamento = 'dinheiro';
    }

    // Garantir subtotal e total atualizados
    const subtotal = venda.itens.reduce(
      (acc, item) => acc + (item.subtotal ?? (item.quantidade * item.precoUnitario)),
      0
    );
    venda.subtotal = subtotal;
    venda.total = Math.max(0, subtotal - (venda.desconto || 0));

    // Capturar snapshots de responsável e atendente (prioriza abertura da mesa)
    let atendenteDefinidoPorMesa = false;
    if (venda.mesa) {
      const Mesa = (await import('../models/Mesa.js')).default;
      const mesaDoc = await Mesa.findById(venda.mesa).populate('funcionarioResponsavel', 'nome');
      if (mesaDoc) {
        // Responsável: prioriza nomeResponsavel da mesa; fallback para nomeComanda
        const nomeRespMesa = mesaDoc?.nomeResponsavel || '';
        venda.responsavelNome = (nomeRespMesa && nomeRespMesa.trim()) || (venda.nomeComanda || '').trim() || venda.responsavelNome || '';
        venda.responsavelFuncionario = mesaDoc?.funcionarioResponsavel?._id || venda.responsavelFuncionario || null;

        // Atendente: deve refletir quem abriu a mesa (funcionarioResponsavel)
        const atendenteMesaId = mesaDoc?.funcionarioResponsavel?._id || null;
        const atendenteMesaNome = mesaDoc?.funcionarioResponsavel?.nome || null;
        if (atendenteMesaId && atendenteMesaNome) {
          // Atualiza snapshots de atendente
          venda.funcionarioNome = atendenteMesaNome;
          venda.funcionarioId = atendenteMesaId;
          venda.funcionarioAberturaNome = venda.funcionarioAberturaNome || atendenteMesaNome;
          venda.funcionarioAberturaId = venda.funcionarioAberturaId || atendenteMesaId;
          // Atualiza o relacionamento para refletir o atendente correto na UI que usa venda.funcionario
          venda.funcionario = atendenteMesaId;
          atendenteDefinidoPorMesa = true;
        }
      } else {
        // Fallback: usar nome da comanda para responsável
        venda.responsavelNome = (venda.nomeComanda || '').trim() || venda.responsavelNome || '';
      }
    } else {
      // Fallback global: usar nome da comanda
      venda.responsavelNome = (venda.nomeComanda || '').trim() || venda.responsavelNome || '';
    }

    // Caso não tenha atendente definido pela mesa, usar o funcionário da venda como fallback
    if (!atendenteDefinidoPorMesa && venda.funcionario) {
      try {
        const funcionarioDoc = await Employee.findById(venda.funcionario);
        if (funcionarioDoc) {
          venda.funcionarioNome = funcionarioDoc.nome;
          venda.funcionarioId = funcionarioDoc._id;
          if (!venda.funcionarioAberturaNome) venda.funcionarioAberturaNome = funcionarioDoc.nome;
          if (!venda.funcionarioAberturaId) venda.funcionarioAberturaId = funcionarioDoc._id;
        }
      } catch (err) {
        console.warn('Erro ao buscar funcionário da venda:', err);
      }
    }

    // Fallback final para nome de atendente caso ainda não tenha sido possível definir
    if (!venda.funcionarioNome && !venda.funcionarioAberturaNome) {
      venda.funcionarioAberturaNome = 'Administrador';
    }

    // Atualizar venda com snapshots
    venda.status = 'finalizada';
    venda.dataFinalizacao = new Date();
    await venda.save();

    // Registrar venda no caixa
    try {
      let caixaAberto = await Caixa.findOne({ status: 'aberto' });
      if (!caixaAberto) {
        const funcionario = await Employee.findOne({ status: 'ativo' }) || await Employee.findOne();
        if (!funcionario) {
          const funcionarioPadrao = new Employee({
            nome: 'Administrador',
            email: 'admin@bar.com',
            telefone: '(00) 00000-0000',
            cargo: 'Gerente',
            salario: 0,
            dataAdmissao: new Date(),
            status: 'ativo'
          });
          await funcionarioPadrao.save();
          caixaAberto = new Caixa({
            funcionarioAbertura: funcionarioPadrao._id,
            valorAbertura: 0,
            observacoes: 'Caixa aberto automaticamente pelo sistema'
          });
        } else {
          caixaAberto = new Caixa({
            funcionarioAbertura: funcionario._id,
            valorAbertura: 0,
            observacoes: 'Caixa aberto automaticamente pelo sistema'
          });
        }
        await caixaAberto.save();
      }

      const valorVenda = Number.isFinite(venda.total)
        ? venda.total
        : Math.max(0, venda.itens.reduce((acc,i)=>acc + (i.subtotal ?? (i.quantidade * i.precoUnitario)), 0) - (venda.desconto || 0));
      const forma = (venda.formaPagamento || 'dinheiro')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      caixaAberto.vendas.push({
        venda: venda._id,
        valor: valorVenda,
        formaPagamento: forma,
        dataVenda: new Date()
      });

      caixaAberto.totalVendas = Number(caixaAberto.totalVendas || 0) + valorVenda;
      switch (forma) {
        case 'dinheiro':
          caixaAberto.totalDinheiro = Number(caixaAberto.totalDinheiro || 0) + valorVenda;
          break;
        case 'cartao':
        case 'cartão':
          caixaAberto.totalCartao = Number(caixaAberto.totalCartao || 0) + valorVenda;
          break;
        case 'pix':
          caixaAberto.totalPix = Number(caixaAberto.totalPix || 0) + valorVenda;
          break;
      }

      await caixaAberto.save();
    } catch (caixaError) {
      console.error('Erro ao registrar venda no caixa:', caixaError);
    }

    // Limpar mesa
    if (venda.mesa) {
      const Mesa = (await import('../models/Mesa.js')).default;
      await Mesa.findByIdAndUpdate(venda.mesa, {
        status: 'livre',
        vendaAtual: null,
        clientesAtuais: 0,
        horaAbertura: null,
        observacoes: '',
        funcionarioResponsavel: null,
        nomeResponsavel: ''
      });
    }

    const vendaFinalizada = await Sale.findById(venda._id)
      .populate('funcionario', 'nome')
      .populate('cliente', 'nome')
      .populate({
        path: 'mesa',
        select: 'numero nome nomeResponsavel funcionarioResponsavel',
        populate: { path: 'funcionarioResponsavel', select: 'nome' }
      })
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