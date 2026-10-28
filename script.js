
"use strict";



const form = document.getElementById("form-lancamento");
const campoDescricao = document.getElementById("descricao");
const campoValor = document.getElementById("valor");
const campoTipo = document.getElementById("tipo");
const campoCategoria = document.getElementById("categoria");
const campoData = document.getElementById("data");
const filtroTipo = document.getElementById("filtro-tipo");

const saldoAtual = document.getElementById("saldo-atual");
const totalReceitas = document.getElementById("total-receitas");
const totalDespesas = document.getElementById("total-despesas");

const listaLancamentos = document.getElementById("lista-lancamentos");
const mensagemVazia = document.getElementById("mensagem-vazia");
const mensagemStatus = document.getElementById("mensagem-status");

const CHAVE_STORAGE = "meusaldo_lancamentos";


function obterDataAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}


function carregarLancamentos() {
    try {
        const dados = localStorage.getItem(CHAVE_STORAGE);

        if (!dados) {
            return [];
        }

        const lancamentos = JSON.parse(dados);

        if (!Array.isArray(lancamentos)) {
            return [];
        }

        return lancamentos.filter((item) =>
            item &&
            Number.isSafeInteger(item.id) &&
            typeof item.descricao === "string" &&
            item.descricao.trim() !== "" &&
            typeof item.valor === "number" &&
            Number.isFinite(item.valor) &&
            item.valor > 0 &&
            ["receita", "despesa"].includes(item.tipo) &&
            typeof item.categoria === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(item.data)
        );
    } catch (erro) {
        console.error("Não foi possível carregar os lançamentos:", erro);
        return [];
    }
}

let lancamentos = carregarLancamentos();

function salvarLancamentos() {
    try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lancamentos));
        return true;
    } catch (erro) {
        console.error("Não foi possível salvar os dados:", erro);
        mostrarMensagem("Não foi possível salvar. Verifique o armazenamento do navegador.");
        return false;
    }
}

let temporizadorMensagem;

function mostrarMensagem(texto) {
    mensagemStatus.textContent = texto;
    mensagemStatus.classList.add("show");

    clearTimeout(temporizadorMensagem);

    temporizadorMensagem = setTimeout(() => {
        mensagemStatus.classList.remove("show");
    }, 2800);
}

function atualizarResumo() {
    let receitas = 0;
    let despesas = 0;

    lancamentos.forEach((item) => {
        if (item.tipo === "receita") {
            receitas += item.valor;
        } else {
            despesas += item.valor;
        }
    });

    const saldo = receitas - despesas;

    saldoAtual.textContent = formatarMoeda(saldo);
    totalReceitas.textContent = formatarMoeda(receitas);
    totalDespesas.textContent = formatarMoeda(despesas);


    saldoAtual.style.color = saldo < 0 ? "#ffcbc5" : "#ffffff";
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}

function criarLinha(item) {
    const linha = document.createElement("tr");

    const celulaDescricao = document.createElement("td");
    celulaDescricao.appendChild(
        criarElemento("span", "transaction-name", item.descricao)
    );

    const celulaCategoria = document.createElement("td");
    celulaCategoria.appendChild(
        criarElemento("span", "category-tag", item.categoria)
    );

    const celulaData = criarElemento(
        "td",
        "transaction-date",
        formatarData(item.data)
    );

    const sinal = item.tipo === "receita" ? "+" : "−";
    const classeValor = item.tipo === "receita"
        ? "amount-income"
        : "amount-expense";

    const celulaValor = criarElemento(
        "td",
        classeValor,
        `${sinal} ${formatarMoeda(item.valor)}`
    );

    const celulaAcao = document.createElement("td");
    celulaAcao.className = "text-end";

    const botaoExcluir = criarElemento("button", "delete-button", "×");

    botaoExcluir.type = "button";
    botaoExcluir.dataset.id = String(item.id);
    botaoExcluir.setAttribute(
        "aria-label",
        `Excluir lançamento: ${item.descricao}`
    );
    botaoExcluir.title = "Excluir lançamento";

    celulaAcao.appendChild(botaoExcluir);

    linha.append(
        celulaDescricao,
        celulaCategoria,
        celulaData,
        celulaValor,
        celulaAcao
    );

    return linha;
}


function renderizarLancamentos() {
    const tipoSelecionado = filtroTipo.value;

    const lancamentosFiltrados = lancamentos
        .filter((item) => {
            return tipoSelecionado === "todos" ||
                item.tipo === tipoSelecionado;
        })
        .sort((a, b) => {
       
            return b.data.localeCompare(a.data) || b.id - a.id;
        });

    listaLancamentos.replaceChildren();

    lancamentosFiltrados.forEach((item) => {
        listaLancamentos.appendChild(criarLinha(item));
    });

    mensagemVazia.hidden = lancamentosFiltrados.length > 0;

    if (lancamentosFiltrados.length === 0) {
        mensagemVazia.textContent = lancamentos.length === 0
            ? "Nenhum lançamento por aqui ainda. Adicione sua primeira movimentação acima."
            : "Nenhum lançamento encontrado para este filtro.";
    }
}

form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const descricao = campoDescricao.value.trim();
    const valor = Number(campoValor.value);
    const tipo = campoTipo.value;
    const categoria = campoCategoria.value;
    const data = campoData.value;

    if (
        !descricao ||
        descricao.length > 80 ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        valor > 999999999 ||
        !["receita", "despesa"].includes(tipo) ||
        !categoria ||
        !data ||
        data > obterDataAtual()
    ) {
        mostrarMensagem("Confira os dados e tente novamente.");
        return;
    }

    const novoLancamento = {
        id: Date.now(),
        descricao,
        valor: Math.round((valor + Number.EPSILON) * 100) / 100,
        tipo,
        categoria,
        data
    };

    lancamentos.push(novoLancamento);

    if (!salvarLancamentos()) {
        lancamentos.pop();
        return;
    }

    atualizarResumo();
    renderizarLancamentos();

    form.reset();
    campoData.value = obterDataAtual();
    campoDescricao.focus();

    mostrarMensagem("Lançamento adicionado com sucesso!");
});

listaLancamentos.addEventListener("click", (evento) => {
    const botao = evento.target.closest(".delete-button");

    if (!botao) {
        return;
    }

    const id = Number(botao.dataset.id);

    const lancamentoEncontrado = lancamentos.find(
        (item) => item.id === id
    );

    if (!lancamentoEncontrado) {
        return;
    }

    const listaAnterior = lancamentos;

    lancamentos = lancamentos.filter((item) => item.id !== id);

    if (!salvarLancamentos()) {
        lancamentos = listaAnterior;
        return;
    }

    atualizarResumo();
    renderizarLancamentos();

    mostrarMensagem("Lançamento excluído.");
});

filtroTipo.addEventListener("change", renderizarLancamentos);

document.querySelectorAll(".nav-link-custom").forEach((link) => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link-custom").forEach((item) => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});

campoData.value = obterDataAtual();

atualizarResumo();
renderizarLancamentos();
