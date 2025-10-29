// primeiro server funcionando

/*import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Rota raiz
app.get("/", (req, res) => {
  res.send("Servidor Express está rodando 🚀");
});

// Rota de teste
app.get("/api/hello", (req, res) => {
  res.json({ message: "API funcionando 🚀" });
});


const PORT = 4000; // usei 4000 só pra garantir que não tem conflito
app.listen(PORT, () => {
  console.log(`✅ API rodando em: http://localhost:${PORT}`);
});
*/

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";
import Product from "./models/Product.js";
import Sale from "./models/Sale.js";
import Mesa from "./models/Mesa.js";
import authRoutes from "./routes/auth.js";
import customerRoutes from "./routes/customer.js";
import productRoutes from "./routes/product.js";
import productGroupRoutes from "./routes/productGroup.js";
import employeeRoutes from "./routes/employee.js";
import saleRoutes from "./routes/sale.js";
import mesaRoutes from "./routes/mesa.js";
import userRoutes from "./routes/user.js";
import tipoRoutes from "./routes/tipo.js";
import unidadeMedidaRoutes from "./routes/unidadeMedida.js";
import categoriaRoutes from "./routes/categoria.js";
import caixaRoutes from "./routes/caixa.js";

dotenv.config();

const app = express();
// CORS configurável
const allowedOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

// Rate limiting básico
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(limiter);

// Conexão com MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro ao conectar MongoDB:", err));

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/product", productRoutes);
app.use("/api/product-group", productGroupRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/sale", saleRoutes);
app.use("/api/mesa", mesaRoutes);
app.use("/api/user", userRoutes);
app.use("/api/tipo", tipoRoutes);
app.use("/api/unidade-medida", unidadeMedidaRoutes);
app.use("/api/categoria", categoriaRoutes);
app.use("/api/caixa", caixaRoutes);

// HTTP server e Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
  transports: ["websocket", "polling"],
});

// Helper para broadcast seguro
function emitSafe(event, payload) {
  try {
    io.emit(event, payload);
  } catch (err) {
    console.error(`❌ Erro ao emitir evento ${event}:`, err);
  }
}

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);

  socket.on("disconnect", (reason) => {
    console.log("🔌 Cliente desconectado:", socket.id, "motivo:", reason);
  });

  socket.on("error", (err) => {
    console.error("❌ Erro no socket:", err);
  });
});

// Change Streams: monitorar inserções em produtos
mongoose.connection.once("open", () => {
  console.log("👀 Iniciando Change Stream para produtos (inserts)");

  try {
    const pipeline = [
      { $match: { operationType: "insert" } },
    ];

    const productStream = Product.watch(pipeline, { fullDocument: "default" });

    productStream.on("change", (change) => {
      const doc = change.fullDocument || {};

      // Sanitização: apenas campos esperados
      const safeProduct = {
        _id: doc._id,
        nome: doc.nome,
        descricao: doc.descricao || "",
        precoCusto: doc.precoCusto,
        precoVenda: doc.precoVenda,
        categoria: doc.categoria || "",
        tipo: doc.tipo || "",
        grupo: doc.grupo || "",
        unidade: doc.unidade || "un",
        quantidade: typeof doc.quantidade === "number" ? doc.quantidade : 0,
        ativo: !!doc.ativo,
        dadosFiscais: doc.dadosFiscais || "",
        imagem: doc.imagem || "",
        tempoPreparoMinutos: typeof doc.tempoPreparoMinutos === "number" ? doc.tempoPreparoMinutos : 0,
        disponivel: doc.disponivel !== undefined ? !!doc.disponivel : true,
        dataInclusao: doc.dataInclusao || new Date(),
      };

      emitSafe("product:insert", safeProduct);
    });

    productStream.on("error", (err) => {
      console.error("❌ Erro no Change Stream de produtos:", err);
    });

    process.on("SIGINT", async () => {
      try {
        await productStream.close();
      } catch {}
      process.exit(0);
    });
  } catch (err) {
    console.error("❌ Falha ao iniciar Change Stream de produtos:", err);
  }
});

// Change Streams: monitorar eventos de vendas e mesas
mongoose.connection.once("open", () => {
  console.log("👀 Iniciando Change Streams para vendas e mesas");

  // Vendas: insert e update (status/total)
  try {
    const saleInsertPipeline = [{ $match: { operationType: "insert" } }];
    const saleUpdatePipeline = [{ $match: { operationType: "update" } }];

    const saleInsertStream = Sale.watch(saleInsertPipeline, { fullDocument: "default" });
    const saleUpdateStream = Sale.watch(saleUpdatePipeline, { fullDocument: "updateLookup" });

    const sanitizeSale = (doc) => ({
      _id: doc._id,
      status: doc.status,
      total: doc.total,
      subtotal: doc.subtotal,
      desconto: doc.desconto || 0,
      tipoVenda: doc.tipoVenda,
      mesa: doc.mesa || null,
      funcionario: doc.funcionario || null,
      numeroComanda: doc.numeroComanda || null,
      dataVenda: doc.dataVenda || new Date(),
      dataFinalizacao: doc.dataFinalizacao || null
    });

    saleInsertStream.on("change", (change) => {
      const doc = change.fullDocument || {};
      emitSafe("sale:insert", sanitizeSale(doc));
    });

    saleUpdateStream.on("change", (change) => {
      const doc = change.fullDocument || {};
      emitSafe("sale:update", sanitizeSale(doc));
    });

    saleInsertStream.on("error", (err) => console.error("❌ Erro no Change Stream de vendas (insert):", err));
    saleUpdateStream.on("error", (err) => console.error("❌ Erro no Change Stream de vendas (update):", err));

    process.on("SIGINT", async () => {
      try { await saleInsertStream.close(); } catch {}
      try { await saleUpdateStream.close(); } catch {}
    });
  } catch (err) {
    console.error("❌ Falha ao iniciar Change Streams de vendas:", err);
  }

  // Mesas: insert e update (status e vendaAtual)
  try {
    const mesaInsertPipeline = [{ $match: { operationType: "insert" } }];
    const mesaUpdatePipeline = [{ $match: { operationType: "update" } }];

    const mesaInsertStream = Mesa.watch(mesaInsertPipeline, { fullDocument: "default" });
    const mesaUpdateStream = Mesa.watch(mesaUpdatePipeline, { fullDocument: "updateLookup" });

    const sanitizeMesa = (doc) => ({
      _id: doc._id,
      numero: doc.numero,
      nome: doc.nome,
      status: doc.status,
      vendaAtual: doc.vendaAtual || null,
      clientesAtuais: doc.clientesAtuais || 0,
      nomeResponsavel: doc.nomeResponsavel || "",
      funcionarioResponsavel: doc.funcionarioResponsavel || null,
      horaAbertura: doc.horaAbertura || null,
      tipo: doc.tipo || "interna"
    });

    mesaInsertStream.on("change", (change) => {
      const doc = change.fullDocument || {};
      emitSafe("mesa:insert", sanitizeMesa(doc));
    });

    mesaUpdateStream.on("change", (change) => {
      const doc = change.fullDocument || {};
      emitSafe("mesa:update", sanitizeMesa(doc));
    });

    mesaInsertStream.on("error", (err) => console.error("❌ Erro no Change Stream de mesas (insert):", err));
    mesaUpdateStream.on("error", (err) => console.error("❌ Erro no Change Stream de mesas (update):", err));

    process.on("SIGINT", async () => {
      try { await mesaInsertStream.close(); } catch {}
      try { await mesaUpdateStream.close(); } catch {}
    });
  } catch (err) {
    console.error("❌ Falha ao iniciar Change Streams de mesas:", err);
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => console.log(`✅ API + Socket.IO rodando em: http://0.0.0.0:${PORT}`));
