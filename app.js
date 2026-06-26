// CONFIGURAÇÃO DO MODELO DO BANCO DE DADOS LOCAL EM JAVASCRIPT
const ESTRUTURA_INICIAL_DB = {
    version: "1.5.0",
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    preferences: { theme: "light", autoSaveInterval: 5 },
    processes: [],
    history: []
};

class JudicialTechERP {
    constructor() {
        this.db = ESTRUTURA_INICIAL_DB;
        this.nomeArquivo = "pericia_calculos.json";
        this.hasUnsavedChanges = false;
        this.ordemColuna = "";
        this.ordemDirecao = "asc";
        
        this.init();
    }

    init() {
        // Carrega base do LocalStorage se existir
        const baseSalva = localStorage.getItem("judicial_tech_db");
        if (baseSalva) {
            try {
                this.db = JSON.parse(baseSalva);
                this.nomeArquivo = localStorage.getItem("judicial_tech_filename") || "pericia_calculos.json";
            } catch (e) {
                this.db = ESTRUTURA_INICIAL_DB;
            }
        }
        
        this.registrarEventos();
        this.sincronizarInterfaceGlobal();
        this.renderizarDashboard();
        this.renderizarGrid();
        this.aplicarTemaSalvo();
    }

    registrarEventos() {
        // Evento do Menu Arquivo
        const btnArquivo = document.getElementById("btnMenuArquivo");
        const dropdown = document.getElementById("dropdownArquivo");
        
        btnArquivo.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("show");
        });

        document.addEventListener("click", () => dropdown.classList.remove("show"));

        // Eventos de Navegação da Sidebar
        document.querySelectorAll(".nav-item").forEach(botao => {
            botao.addEventListener("click", (e) => {
                const targetScreen = botao.getAttribute("data-target");
                this.mudarTela(targetScreen, botao);
            });
        });

        // Máscara reativa para valor monetário em tempo de execução
        const inputValor = document.getElementById("valorCobrado");
        inputValor.addEventListener("input", (e) => {
            let v = e.target.value.replace(/\D/g, "");
            v = (v / 100).toFixed(2) + "";
            v = v.replace(".", ",");
            v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
            e.target.value = v ? "R$ " + v : "";
            this.marcarModificado();
        });

        // Gatilhos de modificação nos inputs de datas para a Timeline
        ["dataSolicitada", "dataEntrega", "dataPagamento", "concluido", "impugnado"].forEach(id => {
            document.getElementById(id).addEventListener("change", () => {
                this.marcarModificado();
                this.atualizarTimelineIndividual();
            });
        });
    }

    mudarTela(screenId, botaoMenu = null) {
        document.querySelectorAll(".tela-section").forEach(s => s.classList.remove("active"));
        document.getElementById(screenId).classList.add("active");

        if (botaoMenu) {
            document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
            botaoMenu.classList.add("active");
        }
    }

    marcarModificado() {
        this.hasUnsavedChanges = true;
        document.getElementById("indicadorModificado").style.display = "inline";
    }

    sincronizarInterfaceGlobal() {
        document.getElementById("nomeArquivoAtivo").innerText = this.nomeArquivo;
        document.getElementById("arquivoStatus").style.display = "flex";
        document.getElementById("indicadorModificado").style.display = this.hasUnsavedChanges ? "inline" : "none";
    }

    aplicarTemaSalvo() {
        const tema = this.db.preferences.theme || "light";
        document.getElementById("configTema").value = tema;
        if (tema === "dark") document.body.classList.add("dark-mode");
        else document.body.classList.remove("dark-mode");
    }

    alternarTema() {
        const novoTema = document.getElementById("configTema").value;
        this.db.preferences.theme = novoTema;
        if (novoTema === "dark") document.body.classList.add("dark-mode");
        else document.body.classList.remove("dark-mode");
        this.salvarLocalStorage();
    }

    // PERSISTÊNCIA & OPERAÇÕES DE ARQUIVO JSON
    novoArquivo() {
        if (confirm("Deseja criar um novo banco de dados? Certifique-se de exportar o atual para não perder dados.")) {
            this.db = {
                version: "1.5.0",
                metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                preferences: { theme: "light", autoSaveInterval: 5 },
                processes: [],
                history: [{ timestamp: new Date().toISOString(), acao: "SISTEMA", detalhes: "Nova base de dados limpa inicializada." }]
            };
            this.nomeArquivo = "novo_banco.json";
            this.hasUnsavedChanges = true;
            this.salvarLocalStorage();
            this.init();
        }
    }

    dispararInputAbrir() { document.getElementById("inputAbrirArquivo").click(); }

    abrirArquivoJson(event) {
        const arquivo = event.target.files[0];
        if (!arquivo) return;

        const leitor = new FileReader();
        leitor.onload = (e) => {
            try {
                const dadosCarregados = JSON.parse(e.target.result);
                if (dadosCarregados.version && dadosCarregados.processes) {
                    this.db = dadosCarregados;
                    this.nomeArquivo = arquivo.name;
                    this.hasUnsavedChanges = false;
                    this.salvarLocalStorage();
                    this.init();
                    alert("Banco de dados JSON importado e validado com sucesso!");
                } else {
                    alert("Erro: Estrutura do arquivo JSON inválida para este sistema.");
                }
            } catch (err) {
                alert("Erro catastrófico ao processar a leitura do arquivo JSON.");
            }
        };
        leitor.readAsText(arquivo);
    }

    salvarComo() {
        this.db.metadata.updatedAt = new Date().toISOString();
        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.db, null, 2));
        const linkDownload = document.createElement("a");
        linkDownload.setAttribute("href", jsonString);
        linkDownload.setAttribute("download", this.nomeArquivo);
        document.body.appendChild(linkDownload);
        linkDownload.click();
        linkDownload.remove();
        
        this.hasUnsavedChanges = false;
        this.sincronizarInterfaceGlobal();
    }

    salvarLocalStorage() {
        localStorage.setItem("judicial_tech_db", JSON.stringify(this.db));
        localStorage.setItem("judicial_tech_filename", this.nomeArquivo);
    }

    limparBase() {
        if (confirm("Deseja limpar todos os registros em memória local?")) {
            localStorage.clear();
            this.db = ESTRUTURA_INICIAL_DB;
            this.nomeArquivo = "pericia_calculos.json";
            this.hasUnsavedChanges = false;
            this.init();
        }
    }

    // LÓGICA DO FORMULÁRIO DE CADASTRO
    salvarProcesso(voltarParaLista = true) {
        const numProc = document.getElementById("numeroProcesso").value.trim();
        const parte = document.getElementById("parte").value.trim();
        const reu = document.getElementById("reu").value.trim();

        if (!numProc || !parte || !reu) {
            alert("Por favor, preencha os campos obrigatórios (Processo, Parte Autora e Réu).");
            return;
        }

        const idExistente = document.getElementById("processoId").value;
        const valorLimpo = parseFloat(document.getElementById("valorCobrado").value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

        const processoObj = {
            id: idExistente || Math.random().toString(36).substring(2, 9),
            numeroProcesso: numProc,
            parte: parte,
            reu: reu,
            advogada: document.getElementById("advogada").value,
            realizador: document.getElementById("realizador").value,
            dataSolicitada: document.getElementById("dataSolicitada").value,
            orgaoJulgador: document.getElementById("orgaoJulgador").value,
            tipoAcao: document.getElementById("tipoAcao").value,
            documentacaoDisponibilizada: document.getElementById("documentacaoDisponibilizada").value,
            valorCobrado: valorLimpo,
            dataEntrega: document.getElementById("dataEntrega").value,
            dataPagamento: document.getElementById("dataPagamento").value,
            horasTrabalhadas: parseInt(document.getElementById("horasTrabalhadas").value) || 0,
            concluido: document.getElementById("concluido").checked,
            impugnado: document.getElementById("impugnado").checked,
            observacoes: document.getElementById("observacoes").value
        };

        if (idExistente) {
            const index = this.db.processes.findIndex(p => p.id === idExistente);
            this.db.processes[index] = processoObj;
            this.registrarLog("ALTERAÇÃO", `Processo CNJ ${numProc} atualizado no sistema.`);
        } else {
            this.db.processes.push(processObj);
            this.registrarLog("INCLUSÃO", `Novo processo CNJ ${numProc} adicionado ao escopo.`);
        }

        this.hasUnsavedChanges = true;
        this.salvarLocalStorage();
        this.init();

        if (voltarParaLista) {
            this.mudarTela("tela-pesquisa", document.querySelector('[data-target="tela-pesquisa"]'));
        } else {
            this.limparFormulario();
        }
    }

    editarProcesso(id) {
        const p = this.db.processes.find(item => item.id === id);
        if (!p) return;

        document.getElementById("processoId").value = p.id;
        document.getElementById("numeroProcesso").value = p.numeroProcesso;
        document.getElementById("parte").value = p.parte;
        document.getElementById("reu").value = p.reu;
        document.getElementById("advogada").value = p.advogada || "";
        document.getElementById("realizador").value = p.realizador || "";
        document.getElementById("dataSolicitada").value = p.dataSolicitada || "";
        document.getElementById("orgaoJulgador").value = p.orgaoJulgador || "";
        document.getElementById("tipoAcao").value = p.tipoAcao || "";
        document.getElementById("documentacaoDisponibilizada").value = p.documentacaoDisponibilizada || "";
        
        // Formata valor para exibição na edição
        document.getElementById("valorCobrado").value = p.valorCobrado ? "R$ " + p.valorCobrado.toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") : "";
        
        document.getElementById("dataEntrega").value = p.dataEntrega || "";
        document.getElementById("dataPagamento").value = p.dataPagamento || "";
        document.getElementById("horasTrabalhadas").value = p.horasTrabalhadas || 0;
        document.getElementById("concluido").checked = p.concluido;
        document.getElementById("impugnado").checked = p.impugnado;
        document.getElementById("observacoes").value = p.observacoes || "";

        document.getElementById("cadastro-titulo").innerText = "Editar Registro de Cálculo";
        document.getElementById("btnExcluir").style.display = "inline-flex";
        document.getElementById("btnDuplicar").style.disabled = false;

        this.atualizarTimelineIndividual();
        document.getElementById("painelTimelineProcesso").style.display = "block";

        this.mudarTela("tela-cadastro", document.getElementById("btnMenuCadastro"));
    }

    duplicarProcesso() {
        document.getElementById("processoId").value = "";
        document.getElementById("numeroProcesso").value += " (Cópia)";
        document.getElementById("btnExcluir").style.display = "none";
        document.getElementById("cadastro-titulo").innerText = "Duplicar Cenário de Cálculo";
        this.marcarModificado();
    }

    deletarProcesso() {
        const id = document.getElementById("processoId").value;
        if (id && confirm("Tem a certeza absoluta que deseja remover este cálculo permanentemente da base?")) {
            this.db.processes = this.db.processes.filter(p => p.id !== id);
            this.registrarLog("EXCLUSÃO", `Um processo em lote foi removido de forma definitiva.`);
            this.hasUnsavedChanges = true;
            this.salvarLocalStorage();
            this.init();
            this.mudarTela("tela-pesquisa", document.querySelector('[data-target="tela-pesquisa"]'));
        }
    }

    limparFormulario() {
        document.getElementById("formProcesso").reset();
        document.getElementById("processoId").value = "";
        document.getElementById("cadastro-titulo").innerText = "Novo Cadastro de Cálculo";
        document.getElementById("btnExcluir").style.display = "none";
        document.getElementById("painelTimelineProcesso").style.display = "none";
    }

    atualizarTimelineIndividual() {
        const dSoli = document.getElementById("dataSolicitada").value;
        const dEnt = document.getElementById("dataEntrega").value;
        const dPag = document.getElementById("dataPagamento").value;
        const concluido = document.getElementById("concluido").checked;

        // Step 1: Solicitado
        const sSol = document.getElementById("step-solicitado");
        if (dSoli) { sSol.classList.add("done"); document.getElementById("date-step-solicitado").innerText = dSoli.split("-").reverse().join("/"); }
        else { sSol.classList.remove("done"); document.getElementById("date-step-solicitado").innerText = "-"; }

        // Step 2: Entregue
        const sEnt = document.getElementById("step-entregue");
        if (dEnt || concluido) { sEnt.classList.add("done"); document.getElementById("date-step-entregue").innerText = dEnt ? dEnt.split("-").reverse().join("/") : "Sim"; }
        else { sEnt.classList.remove("done"); document.getElementById("date-step-entregue").innerText = "-"; }

        // Step 3: Pago
        const sPag = document.getElementById("step-pago");
        if (dPag) { sPag.classList.add("done"); document.getElementById("date-step-pago").innerText = dPag.split("-").reverse().join("/"); }
        else { sPag.classList.remove("done"); document.getElementById("date-step-pago").innerText = "-"; }
    }

    // AGREGADOR DE MÉTRICAS DO DASHBOARD & FINANCEIRO
    renderizarDashboard() {
        const lista = this.db.processes;
        let faturado = 0, recebido = 0, pendentes = 0, concluidos = 0, impugnados = 0, horas = 0;

        let realizadores = {}, advogadas = {}, orgaos = {}, acoes = {};

        lista.forEach(p => {
            if (p.concluido) concluidos++; else pendentes++;
            if (p.impugnado) impugnados++;
            
            faturado += p.valorCobrado;
            if (p.dataPagamento) recebido += p.valorCobrado;

            horas += p.horasTrabalhadas;

            // Volumétricas
            if (p.realizador) realizadores[p.realizador] = (realizadores[p.realizador] || 0) + 1;
            if (p.advogada) advogadas[p.advogada] = (advogadas[p.advogada] || 0) + 1;
            if (p.orgaoJulgador) orgaos[p.orgaoJulgador] = (orgaos[p.orgaoJulgador] || 0) + 1;
            if (p.tipoAcao) acoes[p.tipoAcao] = (acoes[p.tipoAcao] || 0) + 1;
        });

        // Atualiza KPIs da Tela 1
        document.getElementById("kpi-total").innerText = lista.length;
        document.getElementById("kpi-pendentes").innerText = pendentes;
        document.getElementById("kpi-concluidos").innerText = concluidos;
        document.getElementById("kpi-impugnados").innerText = impugnados;
        document.getElementById("kpi-faturado").innerText = this.formatarMoeda(faturado);
        document.getElementById("kpi-recebido").innerText = this.formatarMoeda(recebido);
        document.getElementById("kpi-vpendente").innerText = this.formatarMoeda(faturado - recebido);
        document.getElementById("kpi-mediahoras").innerText = lista.length ? (horas / lista.length).toFixed(1) + "h" : "0h";

        // Atualiza KPIs da Tela Financeira
        document.getElementById("fin-contas-receber").innerText = this.formatarMoeda(faturado - recebido);
        document.getElementById("fin-atraso").innerText = this.formatarMoeda(pendentes > 0 ? (faturado - recebido) * 0.4 : 0); // Estimativa de risco
        document.getElementById("fin-previsao").innerText = this.formatarMoeda(faturado - recebido);

        // Renderiza Gráficos Estáticos em Barras CSS
        this.desenharGrafico("chart-realizador", realizadores);
        this.desenharGrafico("chart-advogada", advogadas);
        this.desenharGrafico("chart-orgao", orgaos);
        this.desenharGrafico("chart-acao", acoes);

        // Atualiza Tabela Rápida Financeira
        const tbodyFin = document.getElementById("tbodyFinanceiro");
        tbodyFin.innerHTML = "";
        lista.filter(p => !p.dataPagamento).forEach(p => {
            tbodyFin.innerHTML += `<tr>
                <td><b>${p.numeroProcesso}</b></td>
                <td>${p.parte} x ${p.reu}</td>
                <td>${p.dataEntrega ? p.dataEntrega.split("-").reverse().join("/") : "Pendente"}</td>
                <td style="font-weight:700; color:var(--color-primary)">${this.formatarMoeda(p.valorCobrado)}</td>
            </tr>`;
        });
    }

    desenharGrafico(containerId, dicionario) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
        const entradas = Object.entries(dicionario);
        if (entradas.length === 0) { container.innerHTML = "<small style='color:var(--color-text-muted)'>Sem dados amostrais.</small>"; return; }

        const maximo = Math.max(...entradas.map(([_, v]) => v));

        entradas.forEach(([label, valor]) => {
            const perc = (valor / maximo) * 100;
            container.innerHTML += `<div class="chart-bar-item">
                <div class="chart-bar-label"><span>${label}</span> <b>${valor}</b></div>
                <div class="chart-bar-track"><div class="chart-bar-fill" style="width: ${perc}%"></div></div>
            </div>`;
        });
    }

    // FILTRAGEM, ORDENAÇÃO E RENDERIZAÇÃO DO GRID ERP
    filtrarGrid() {
        this.renderizarGrid();
    }

    ordenarGrid(coluna) {
        if (this.ordemColuna === coluna) {
            this.ordemDirecao = this.ordemDirecao === "asc" ? "desc" : "asc";
        } else {
            this.ordemColuna = coluna;
            this.ordemDirecao = "asc";
        }
        this.renderizarGrid();
    }

    renderizarGrid() {
        const tbody = document.getElementById("tbodyProcessos");
        tbody.innerHTML = "";

        const gSearch = document.getElementById("filtroGlobal").value.toLowerCase();
        const fParte = document.getElementById("filtroParte").value.toLowerCase();
        const fReu = document.getElementById("filtroReu").value.toLowerCase();
        const fRealizador = document.getElementById("filtroRealizador").value.toLowerCase();
        const fConcluido = document.getElementById("filtroConcluido").value;
        const fImpugnado = document.getElementById("filtroImpugnado").value;

        let resultados = this.db.processes.filter(p => {
            // Match Busca Global
            if (gSearch && !p.numeroProcesso.toLowerCase().includes(gSearch) && !p.parte.toLowerCase().includes(gSearch) && !p.reu.toLowerCase().includes(gSearch) && !p.advogada.toLowerCase().includes(gSearch)) return false;
            // Match Filtros Específicos
            if (fParte && !p.parte.toLowerCase().includes(fParte)) return false;
            if (fReu && !p.reu.toLowerCase().includes(fReu)) return false;
            if (fRealizador && !p.realizador.toLowerCase().includes(fRealizador)) return false;
            
            if (fConcluido !== "TODOS") {
                const check = fConcluido === "SIM";
                if (p.concluido !== check) return false;
            }
            if (fImpugnado !== "TODOS") {
                const check = fImpugnado === "SIM";
                if (p.impugnado !== check) return false;
            }
            return true;
        });

        // Ordenação JavaScript pura
        if (this.ordemColuna) {
            resultados.sort((a, b) => {
                let valA = a[this.ordemColuna];
                let valB = b[this.ordemColuna];
                if (typeof valA === "string") {
                    return this.ordemDirecao === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    return this.ordemDirecao === "asc" ? valA - valB : valB - valA;
                }
            });
        }

        resultados.forEach(p => {
            tbody.innerHTML += `<tr ondblclick="app.editarProcesso('${p.id}')">
                <td style="font-weight:700; color:var(--color-primary-dark)">${p.numeroProcesso}</td>
                <td>${p.parte}</td>
                <td>${p.reu}</td>
                <td>${p.tipoAcao || "-"}</td>
                <td style="font-weight:600">${this.formatarMoeda(p.valorCobrado)}</td>
                <td>
                    <span class="chip ${p.concluido ? "chip-success" : "chip-danger"}">${p.concluido ? "Concluído" : "Em aberto"}</span>
                    ${p.impugnado ? '<span class="chip chip-danger" style="margin-left:5px">Impugnado</span>' : ''}
                </td>
            </tr>`;
        });

        if (resultados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color:var(--color-text-secondary)">Nenhum cálculo processual localizado.</td></tr>`;
        }
    }

    // AUDITORIA E EXPORTAÇÃO
    registrarLog(acao, detalhes) {
        this.db.history.push({
            timestamp: new Date().toISOString(),
            acao: acao,
            detalhes: detalhes
        });
        this.renderizarHistorico();
    }

    renderizarHistorico() {
        const tbody = document.getElementById("tbodyHistorico");
        tbody.innerHTML = "";
        [...this.db.history].reverse().forEach(log => {
            tbody.innerHTML += `<tr>
                <td style="font-family:monospace">${new Date(log.timestamp).toLocaleString("pt-BR")}</td>
                <td style="font-weight:700; color:var(--color-primary)">${log.acao}</td>
                <td>${log.detalhes}</td>
            </tr>`;
        });
    }

    exportarExcel() {
        // Gera um formato CSV puro legível nativamente pelo Excel
        let csv = "Numero Processo;Parte Autora;Reu Reclamado;Tipo de Acao;Honorarios;Concluido\n";
        this.db.processes.forEach(p => {
            csv += `${p.numeroProcesso};${p.parte};${p.reu};${p.tipoAcao || ""};${p.valorCobrado.toFixed(2)};${p.concluido ? "Sim" : "Nao"}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "relatorio_processos_erp.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    formatarMoeda(valor) {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
    }
}

// Inicializa a aplicação quando o DOM estiver pronto
let app;
document.addEventListener("DOMContentLoaded", () => {
    app = new JudicialTechERP();
    app.renderizarHistorico();
});
