import express from "express";
import Product from "../models/Product.js";
import { requireAuth, authorize } from "../middleware/auth.js";

const router = express.Router();

// Rota padrão GET - redireciona para list
router.get("/", async (req, res) => {
  try {
    const produtos = await Product.find().populate('grupo');
    res.json(produtos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// Rota para criar produto
router.post("/create", requireAuth, authorize("produtos"), async (req, res) => {
  try {
    const { nome, descricao, preco, precoVenda, precoCusto, categoria, tipo, grupo, unidade, estoque, quantidade, estoqueMinimo, ativo } = req.body;

    const novoProduto = new Product({
      nome,
      descricao,
      precoCusto: precoCusto || 0,
      precoVenda: precoVenda || preco || 0, // Aceitar tanto precoVenda quanto preco
      categoria,
      tipo,
      grupo,
      unidade,
      ativo: ativo !== undefined ? ativo : true,
      quantidade: quantidade || estoque || 0
    });

    await novoProduto.save();
    
    res.status(201).json({ message: "Produto cadastrado com sucesso", product: novoProduto });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// Rota para listar todos os produtos
router.get("/list", async (req, res) => {
  try {
    const products = await Product.find().sort({ dataInclusao: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
});

// Rota para buscar produto por ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

// Rota para atualizar produto
router.put("/update/:id", requireAuth, authorize("produtos"), async (req, res) => {
  try {
    const { nome, descricao, precoCusto, precoVenda, categoria, tipo, grupo, unidade, ativo, dadosFiscais, quantidade, imagem, tempoPreparoMinutos, disponivel } = req.body;
    
    const updateData = {
      nome,
      descricao,
      precoCusto: precoCusto || req.body.preco, // Compatibilidade
      precoVenda: precoVenda || req.body.preco, // Compatibilidade
      categoria,
      tipo,
      grupo,
      unidade,
      ativo,
      dadosFiscais,
      quantidade: quantidade || req.body.estoque, // Compatibilidade
      imagem,
      tempoPreparoMinutos,
      disponivel
    };

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    res.json({ message: 'Produto atualizado com sucesso', product: updatedProduct });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
});

// Rota alternativa para atualizar produto (compatibilidade com frontend)
router.put("/:id", requireAuth, authorize("produtos"), async (req, res) => {
  try {
    const { nome, descricao, preco, precoVenda, precoCusto, categoria, tipo, grupo, unidade, estoque, quantidade, estoqueMinimo, ativo } = req.body;
    
    const updateData = {
      nome,
      descricao,
      precoCusto: precoCusto || 0,
      precoVenda: precoVenda || preco || 0, // Aceitar tanto precoVenda quanto preco
      categoria,
      tipo,
      grupo,
      unidade,
      ativo,
      quantidade: quantidade || estoque || 0
    };

    const produtoAtualizado = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!produtoAtualizado) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json({ message: "Produto atualizado com sucesso", product: produtoAtualizado });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

// Rota para deletar produto
router.delete("/delete/:id", requireAuth, authorize("produtos"), async (req, res) => {
  try {
    const produtoDeletado = await Product.findByIdAndDelete(req.params.id);
    
    if (!produtoDeletado) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json({ message: "Produto deletado com sucesso" });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: "Erro ao deletar produto" });
  }
});

// Rota alternativa para deletar produto (compatibilidade com frontend)
router.delete("/:id", requireAuth, authorize("produtos"), async (req, res) => {
  try {
    const produtoDeletado = await Product.findByIdAndDelete(req.params.id);
    
    if (!produtoDeletado) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json({ message: "Produto deletado com sucesso" });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: "Erro ao deletar produto" });
  }
});

export default router;