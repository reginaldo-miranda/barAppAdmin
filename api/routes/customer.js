import express from "express";
import Customer from "../models/Customer.js";

const router = express.Router();

// Rota para criar cliente
router.post("/create", async (req, res) => {
  try {
    const { nome, endereco, cidade, estado, fone, cpf, rg, dataNascimento, ativo } = req.body;

    // Verificar se CPF já existe
    const customerExistente = await Customer.findOne({ cpf });
    if (customerExistente) {
      return res.status(400).json({ error: "CPF já cadastrado" });
    }

    const novoCustomer = new Customer({
      nome,
      endereco,
      cidade,
      estado,
      fone,
      cpf,
      rg,
      dataNascimento,
      ativo: ativo !== undefined ? ativo : true
    });

    await novoCustomer.save();
    res.status(201).json({ message: "Cliente cadastrado com sucesso", customer: novoCustomer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar cliente" });
  }
});

// Rota para listar todos os clientes
router.get("/list", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ dataInclusao: -1 });
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar clientes" });
  }
});

// Rota para buscar cliente por ID
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

// Rota para atualizar cliente
router.put("/update/:id", async (req, res) => {
  try {
    const { nome, endereco, cidade, estado, fone, cpf, rg, dataNascimento, ativo } = req.body;
    
    // Verificar se CPF já existe em outro cliente
    const customerExistente = await Customer.findOne({ cpf, _id: { $ne: req.params.id } });
    if (customerExistente) {
      return res.status(400).json({ error: "CPF já cadastrado para outro cliente" });
    }

    const customerAtualizado = await Customer.findByIdAndUpdate(
      req.params.id,
      { nome, endereco, cidade, estado, fone, cpf, rg, dataNascimento, ativo },
      { new: true }
    );

    if (!customerAtualizado) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ message: "Cliente atualizado com sucesso", customer: customerAtualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});

// Rota para deletar cliente
router.delete("/delete/:id", async (req, res) => {
  try {
    const customerDeletado = await Customer.findByIdAndDelete(req.params.id);
    
    if (!customerDeletado) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ message: "Cliente deletado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar cliente" });
  }
});

export default router;