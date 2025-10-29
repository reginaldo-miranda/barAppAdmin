import express from "express";
import Employee from "../models/Employee.js";
import { requireAuth, authorize } from "../middleware/auth.js";

const router = express.Router();

// Rota para criar funcionário
router.post("/create", requireAuth, authorize("funcionarios"), async (req, res) => {
  try {
    const { nome, endereco, bairro, telefone, salario, dataAdmissao, ativo } = req.body;

    const novoEmployee = new Employee({
      nome,
      endereco,
      bairro,
      telefone,
      salario,
      dataAdmissao,
      ativo: ativo !== undefined ? ativo : true
    });

    await novoEmployee.save();
    res.status(201).json({ message: "Funcionário cadastrado com sucesso", employee: novoEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar funcionário" });
  }
});

// Rota para listar todos os funcionários
router.get("/list", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ dataInclusao: -1 });
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar funcionários" });
  }
});

// Rota para buscar funcionário por ID
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }
    res.json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar funcionário" });
  }
});

// Rota para atualizar funcionário
router.put("/:id", requireAuth, authorize("funcionarios"), async (req, res) => {
  try {
    const { nome, endereco, bairro, telefone, salario, dataAdmissao, ativo } = req.body;
    
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { nome, endereco, bairro, telefone, salario, dataAdmissao, ativo },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }

    res.json({ message: "Funcionário atualizado com sucesso", employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar funcionário" });
  }
});

// Rota para deletar funcionário
router.delete("/:id", requireAuth, authorize("funcionarios"), async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }
    res.json({ message: "Funcionário deletado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar funcionário" });
  }
});

export default router;