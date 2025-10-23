import express from 'express';
import Caixa from '../models/Caixa.js';
import Employee from '../models/Employee.js';

const router = express.Router();

// Listar todos os caixas
router.get('/', async (req, res) => {
  try {
    const caixas = await Caixa.find()
      .populate('funcionarioAbertura', 'nome')
      .populate('funcionarioFechamento', 'nome')
      .populate({
        path: 'vendas.venda',
        populate: [
          { path: 'funcionario', select: 'nome' },
          { 
            path: 'mesa', 
            select: 'numero nome nomeResponsavel funcionarioResponsavel',
            populate: { path: 'funcionarioResponsavel', select: 'nome' }
          }
        ]
      })
      .sort({ dataAbertura: -1 });
    res.json(caixas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Buscar caixa por ID
router.get('/:id', async (req, res) => {
  try {
    const caixa = await Caixa.findById(req.params.id)
      .populate('funcionarioAbertura', 'nome')
      .populate('funcionarioFechamento', 'nome')
      .populate({
        path: 'vendas.venda',
        populate: [
          { path: 'funcionario', select: 'nome' },
          { 
            path: 'mesa', 
            select: 'numero nome nomeResponsavel funcionarioResponsavel',
            populate: { path: 'funcionarioResponsavel', select: 'nome' }
          }
        ]
      });
    
    if (!caixa) {
      return res.status(404).json({ message: 'Caixa não encontrado' });
    }
    
    res.json(caixa);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Abrir caixa
router.post('/abrir', async (req, res) => {
  try {
    const { funcionarioId, valorAbertura = 0, observacoes = '' } = req.body;

    // Verificar se funcionário existe
    const funcionario = await Employee.findById(funcionarioId);
    if (!funcionario) {
      return res.status(404).json({ message: 'Funcionário não encontrado' });
    }

    // Verificar se já existe caixa aberto
    const caixaAberto = await Caixa.findOne({ status: 'aberto' });
    if (caixaAberto) {
      return res.status(400).json({ message: 'Já existe um caixa aberto' });
    }

    const novoCaixa = new Caixa({
      funcionarioAbertura: funcionarioId,
      valorAbertura,
      observacoes
    });

    await novoCaixa.save();
    
    const caixaPopulado = await Caixa.findById(novoCaixa._id)
      .populate('funcionarioAbertura', 'nome');
    
    res.status(201).json(caixaPopulado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fechar caixa
router.put('/:id/fechar', async (req, res) => {
  try {
    const { funcionarioId, valorFechamento, observacoes = '' } = req.body;

    const caixa = await Caixa.findById(req.params.id);
    if (!caixa) {
      return res.status(404).json({ message: 'Caixa não encontrado' });
    }

    if (caixa.status === 'fechado') {
      return res.status(400).json({ message: 'Caixa já está fechado' });
    }

    // Verificar se funcionário existe
    const funcionario = await Employee.findById(funcionarioId);
    if (!funcionario) {
      return res.status(404).json({ message: 'Funcionário não encontrado' });
    }

    caixa.dataFechamento = new Date();
    caixa.funcionarioFechamento = funcionarioId;
    caixa.valorFechamento = valorFechamento;
    caixa.status = 'fechado';
    if (observacoes) caixa.observacoes += '\n' + observacoes;

    await caixa.save();
    
    const caixaPopulado = await Caixa.findById(caixa._id)
      .populate('funcionarioAbertura', 'nome')
      .populate('funcionarioFechamento', 'nome');
    
    res.json(caixaPopulado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Registrar venda no caixa
router.post('/registrar-venda', async (req, res) => {
  try {
    const { vendaId, valor, formaPagamento } = req.body;

    // Buscar caixa aberto
    let caixaAberto = await Caixa.findOne({ status: 'aberto' });
    
    // Se não existe caixa aberto, criar um automaticamente
    if (!caixaAberto) {
      console.log('⚠️ Nenhum caixa aberto encontrado, criando automaticamente...');
      
      // Buscar primeiro funcionário disponível
      const funcionario = await Employee.findOne({ status: 'ativo' }) || await Employee.findOne();
      
      if (!funcionario) {
        // Criar funcionário padrão se não existir nenhum
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
        console.log('✅ Funcionário padrão criado automaticamente');
        
        // Criar caixa com funcionário padrão
        caixaAberto = new Caixa({
          funcionarioAbertura: funcionarioPadrao._id,
          valorAbertura: 0,
          observacoes: 'Caixa aberto automaticamente pelo sistema'
        });
      } else {
        // Criar caixa com funcionário existente
        caixaAberto = new Caixa({
          funcionarioAbertura: funcionario._id,
          valorAbertura: 0,
          observacoes: 'Caixa aberto automaticamente pelo sistema'
        });
      }
      
      await caixaAberto.save();
      console.log('✅ Caixa aberto automaticamente:', caixaAberto._id);
    }

    // Registrar venda
    caixaAberto.vendas.push({
      venda: vendaId,
      valor,
      formaPagamento,
      dataVenda: new Date()
    });

    // Atualizar totais
    caixaAberto.totalVendas += valor;
    
    switch (formaPagamento.toLowerCase()) {
      case 'dinheiro':
        caixaAberto.totalDinheiro += valor;
        break;
      case 'cartao':
      case 'cartão':
        caixaAberto.totalCartao += valor;
        break;
      case 'pix':
        caixaAberto.totalPix += valor;
        break;
    }

    await caixaAberto.save();
    
    res.json({ 
      message: 'Venda registrada no caixa com sucesso',
      caixa: caixaAberto
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Buscar caixa aberto
router.get('/status/aberto', async (req, res) => {
  try {
    const caixaAberto = await Caixa.findOne({ status: 'aberto' })
      .populate('funcionarioAbertura', 'nome')
      .populate({
        path: 'vendas.venda',
        populate: [
          { path: 'funcionario', select: 'nome' },
          { 
            path: 'mesa', 
            select: 'numero nome nomeResponsavel funcionarioResponsavel',
            populate: { path: 'funcionarioResponsavel', select: 'nome' }
          }
        ]
      });
    
    if (!caixaAberto) {
      return res.status(404).json({ message: 'Nenhum caixa aberto' });
    }
    
    res.json(caixaAberto);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;