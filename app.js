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
        
        if (btnArquivo && dropdown) {
            btnArquivo.onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.toggle("show");
            };
        }

        document.addEventListener("click", () => {
            if (dropdown) dropdown.classList.remove("show");
        });

        // Eventos de Navegação da Sidebar
        document.querySelectorAll(".nav-item").forEach(botao => {
            botao.onclick = () => {
                const targetScreen = botao.getAttribute("data-target");
                this.mudarTela(targetScreen, botao);
            };
        });

        // Máscara reativa para valor monetário em tempo de execução
        const inputValor = document.getElementById("valorCobrado");
        if (inputValor) {
            inputValor.oninput = (e) => {
                let v = e.target.value.replace(/\D/g, "");
                v = (v / 100).toFixed(2) + "";
                v = v.replace(".", ",");
                v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
                e.target.value = v ? "R$ " + v : "";
                this.marcarModificado();
            };
        }

        // Gatilhos de modificação nos inputs para a Timeline
        ["dataSolicitada", "dataEntrega", "dataPagamento", "concluido", "impugnado"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.onchange = () => {
                    this.marcarModificado();
                    this.atualizarTimelineIndividual();
                };
            }
        });
    }

    mudarTela(screenId, botaoMenu = null) {
        document.querySelectorAll(".tela-section").forEach(s => s.classList.remove("active"));
        const telaAlvo = document.getElementById(screenId);
        if (telaAlvo) telaAlvo.classList.add("active");

        if (botaoMenu) {
            document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
            botaoMenu.classList.add("active");
        }
    }

    marcarModificado() {
        this.hasUnsavedChanges = true;
        const ind = document.getElementById("indicadorModificado");
        if (ind) ind.style.display = "inline";
    }

    sincronizarInterfaceGlobal() {
        const nomeEl = document.getElementById("nomeArquivoAtivo");
        const statusEl = document.getElementById("arquivoStatus");
        const indEl = document.getElementById("indicadorModificado");

        if (nomeEl) nomeEl.innerText = this.nomeArquivo;
        if (statusEl) statusEl.style.display = "flex";
        if (indEl) indEl.style.display = this.hasUnsavedChanges ? "inline" : "none";
    }

    aplicarTemaSalvo() {
        const tema = this.db.preferences.theme || "light";
        const configTemaEl = document.getElementById("configTema");
        if (configTemaEl) configTemaEl.value = tema;
        
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

    dispararInputAbrir() { 
        const el = document.getElementById("inputAbrirArquivo");
        if (el) el.click(); 
    }

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
                    this.renderizarHistorico();
                    alert("Banco de dados JSON importado e validado com sucesso!");
                } else {
                    alert("Erro: Estrutura do arquivo JSON inválida para este sistema.");
                }
            } catch (err) {
                alert("Erro ao processar a leitura do arquivo JSON.");
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
            this.renderizarHistorico();
        }
    }

    importarCSV(event) {
        const arquivo = event.target.files[0];
        if (!arquivo) return;

        const leitor = new FileReader();
        leitor.onload = (e) => {
            const texto = e.target.result;
            const linhas = texto.split('\n');
            let importados = 0;

            for (let i = 1; i < linhas.length; i++) {
                const linha = linhas[i].trim();
                if (!linha) continue;

                const colunas = linha.split(';');
                if (colunas.length < 5) continue;

                const parseData = (str) => {
                    if (!str || str.trim() === "") return "";
                    const partes = str.trim().split('/');
                    if (partes.length === 3) {
                        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                    }
                    return "";
                };

                const parseValor = (str) => {
                    if (!str || str.trim() === "") return 0;
                    let limpo = str.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
                    return parseFloat(limpo) || 0;
                };

                const parseBool = (str) => {
                    return str && str.trim().toLowerCase() === 'sim';
                };

                const novoProcesso = {
                    id: Math.random().toString(36).substring(2, 9),
                    realizador: colunas[0] ? colunas[0].trim() : "",
                    numeroProcesso: colunas[1] ? colunas[1].trim() : "Pendente/Sem Número",
                    parte: colunas[2] ? colunas[2].trim() : "",
                    reu: colunas[3] ? colunas[3].trim() : "",
                    advogada: colunas[4] ? colunas[4].trim() : "",
                    dataSolicitada: parseData(colunas[5]),
                    orgaoJulgador: colunas[6] ? colunas[6].trim() : "",
                    tipoAcao: colunas[7] ? colunas[7].trim() : "",
                    documentacaoDisponibilizada: colunas[8] ? colunas[8].trim() : "",
                    valorCobrado: parseValor(colunas[9]),
                    horasTrabalhadas: parseInt(colunas[10]) || 0,
                    observacoes: colunas[11] ? colunas[11].trim() : "",
                    dataEntrega: parseData(colunas[12]),
                    dataPagamento: parseData(colunas[13]),
                    concluido: parseBool(colunas[14]),
                    impugnado: parseBool(colunas[15])
                };

                this.db.processes.push(novoProcesso);
                importados++;
            }

            if (importados > 0) {
                this.registrarLog("IMPORTAÇÃO LOTE", `Migração de ${importados} processos via planilha Excel (CSV).`);
                this.hasUnsavedChanges = true;
                this.salvarLocalStorage();
                this.init();
                alert(`Carga concluída com sucesso! ${importados} processos foram injetados no sistema.`);
            } else {
                alert("Nenhum dado válido lido. Verifique se salvou a planilha como 'CSV (separado por vírgulas)'.");
            }
            event.target.value = '';
        };
        leitor.readAsText(arquivo, 'ISO-8859-1'); 
    }

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
            if (index >= 0) this.db.processes[index] = processoObj;
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
        
        document.getElementById("valorCobrado").value = p.valorCobrado ? "R$ " + p.valorCobrado.toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") : "";
        
        document.getElementById("dataEntrega").value = p.dataEntrega || "";
        document.getElementById("dataPagamento").value = p.dataPagamento || "";
        document.getElementById("horasTrabalhadas").value = p.horasTrabalhadas || 0;
        document.getElementById("concluido").checked = p.concluido;
        document.getElementById("impugnado").checked = p.impugnado;
        document.getElementById("observacoes").value = p.observacoes || "";

        document.getElementById("cadastro-titulo").innerText = "Editar Registro de Cálculo";
        
        const btnExc = document.getElementById("btnExcluir");
        if (btnExc) btnExc.style.display = "inline-flex";

        this.atualizarTimelineIndividual();
        const pTimeline = document.getElementById("painelTimelineProcesso");
        if (pTimeline) pTimeline.style.display = "block";

        this.mudarTela("tela-cadastro", document.getElementById("btnMenuCadastro"));
    }

    duplicarProcesso() {
        document.getElementById("processoId").value = "";
        document.getElementById("numeroProcesso").value += " (Cópia)";
        const btnExc = document.getElementById("btnExcluir");
        if (btnExc) btnExc.style.display = "none";
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
        const form = document.getElementById("formProcesso");
        if (form) form.reset();
        document.getElementById("processoId").value = "";
        document.getElementById("cadastro-titulo").innerText = "Novo Cadastro de Cálculo";
        const btnExc = document.getElementById("btnExcluir");
        if (btnExc) btnExc.style.display = "none";
        const pTimeline = document.getElementById("painelTimelineProcesso");
        if (pTimeline) pTimeline.style.display = "none";
    }

    atualizarTimelineIndividual() {
        const dSoli = document.getElementById("dataSolicitada").value;
        const dEnt = document.getElementById("dataEntrega").value;
        const dPag = document.getElementById("dataPagamento").value;
        const concluido = document.getElementById("concluido").checked;

        const sSol = document.getElementById("step-solicitado");
        if (sSol) {
            if (dSoli) { sSol.classList.add("done"); document.getElementById("date-step-solicitado").innerText = dSoli.split("-").reverse().join("/"); }
            else { sSol.classList.remove("done"); document.getElementById("date-step-solicitado").innerText = "-"; }
        }

        const sEnt = document.getElementById("step-entregue");
        if (sEnt) {
            if (dEnt || concluido) { sEnt.classList.add("done"); document.getElementById("date-step-entregue").innerText = dEnt ? dEnt.split("-").reverse().join("/") : "Sim"; }
            else { sEnt.classList.remove("done"); document.getElementById("date-step-entregue").innerText = "-"; }
        }

        const sPag = document.getElementById("step-pago");
        if (sPag) {
            if (dPag) { sPag.classList.add("done"); document.getElementById("date-step-pago").innerText = dPag.split("-").reverse().join("/"); }
            else { sPag.classList.remove("done"); document.getElementById("date-step-pago").innerText = "-"; }
        }
    }

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

            if (p.realizador) realizadores[p.realizador] = (realizadores[p.realizador] || 0) + 1;
            if (p.advogada) advogadas[p.advogada] = (advogadas[p.advogada] || 0) + 1;
            if (p.orgaoJulgador) orgaos[p.orgaoJulgador] = (orgaos[p.orgaoJulgador] || 0) + 1;
            if (p.tipoAcao) acoes[p.tipoAcao] = (acoes[p.tipoAcao] || 0) + 1;
        });

        const safeSetText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

        safeSetText("kpi-total", lista.length);
        safeSetText("kpi-pendentes", pendentes);
        safeSetText("kpi-concluidos", concluidos);
        safeSetText("kpi-impugnados", impugnados);
        safeSetText("kpi-faturado", this.formatarMoeda(faturado));
        safeSetText("kpi-recebido", this.formatarMoeda(recebido));
        safeSetText("kpi-vpendente", this.formatarMoeda(faturado - recebido));
        safeSetText("kpi-mediahoras", lista.length ? (horas / lista.length).toFixed(1) + "h" : "0h");

        safeSetText("fin-contas-receber", this.formatarMoeda(faturado - recebido));
        safeSetText("fin-atraso", this.formatarMoeda(pendentes > 0 ? (faturado - recebido) * 0.25 : 0));
        safeSetText("fin-previsao", this.formatarMoeda(faturado - recebido));

        this.desenharGrafico("chart-realizador", realizadores);
        this.desenharGrafico("chart-advogada", advogadas);
        this.desenharGrafico("chart-orgao", orgaos);
        this.desenharGrafico("chart-acao", acoes);

        const tbodyFin = document.getElementById("tbodyFinanceiro");
        if (tbodyFin) {
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
    }

    desenharGrafico(containerId, dicionario) {
        const container = document.getElementById(containerId);
        if (!container) return;
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

    filtrarGrid() { this.renderizarGrid(); }

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
        if (!tbody) return;
        tbody.innerHTML = "";

        const gSearch = document.getElementById("filtroGlobal")?.value.toLowerCase() || "";
        const fParte = document.getElementById("filtroParte")?.value.toLowerCase() || "";
        const fReu = document.getElementById("filtroReu")?.value.toLowerCase() || "";
        const fRealizador = document.getElementById("filtroRealizador")?.value.toLowerCase() || "";
        const fConcluido = document.getElementById("filtroConcluido")?.value || "TODOS";
        const fImpugnado = document.getElementById("filtroImpugnado")?.value || "TODOS";

        let resultados = this.db.processes.filter(p => {
            if (gSearch && !p.numeroProcesso.toLowerCase().includes(gSearch) && !p.parte.toLowerCase().includes(gSearch) && !p.reu.toLowerCase().includes(gSearch) && !p.advogada.toLowerCase().includes(gSearch)) return false;
            if (fParte && !p.parte.toLowerCase().includes(fParte)) return false;
            if (fReu && !p.reu.toLowerCase().includes(fReu)) return false;
            if (fRealizador && !p.realizador.toLowerCase().includes(fRealizador)) return false;
            
            if (fConcluido !== "TODOS") {
                if (p.concluido !== (fConcluido === "SIM")) return false;
            }
            if (fImpugnado !== "TODOS") {
                if (p.impugnado !== (fImpugnado === "SIM")) return false;
            }
            return true;
        });

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

    registrarLog(acao, detalhes) {
        this.db.history.push({ timestamp: new Date().toISOString(), acao, detalhes });
        this.renderizarHistorico();
    }

    renderizarHistorico() {
        const tbody = document.getElementById("tbodyHistorico");
        if (!tbody) return;
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

let app;
document.addEventListener("DOMContentLoaded", () => {
    app = new JudicialTechERP();
    app.renderizarHistorico();
});
