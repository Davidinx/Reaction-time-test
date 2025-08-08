document.addEventListener("DOMContentLoaded", function () {
    const startButton = document.getElementById('startButton');
    const themeButton = document.getElementById('themeButton');
    const resetButton = document.getElementById('resetButton');
    const downloadButton = document.getElementById('downloadButton');
    const message = document.getElementById('message');
    const result = document.getElementById('result');
    const stats = document.getElementById('stats');
    const trafficLights = document.querySelectorAll('.traffic-light');
    const body = document.body;
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    const chartContainer = document.getElementById('chartContainer');

    const maxResults = 20;
    const reactionTimes = [];
    let startTime = null;
    let gameActive = false;
    let greenLight = false;
    let goTimer = null;
    let lightTimers = [];
    let chart;

    function createNewCanvas() {
        chartContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.id = 'reactionChart';
        canvas.width = 400;
        canvas.height = 200;
        chartContainer.appendChild(canvas);
        return canvas.getContext('2d');
    }

    function newChart() {
        const ctx = createNewCanvas();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Tempi di reazione (ms)',
                        data: [],
                        borderColor: 'blue',
                        tension: 0.1
                    },
                    {
                        label: 'Media',
                        data: [],
                        borderColor: 'orange',
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    newChart();

    const saved = localStorage.getItem("reactionTimes");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                reactionTimes.push(...parsed);
                updateTable();
                updateChart();
                updateStats();
            }
        } catch (e) {
            console.error("Errore nel caricamento dei dati salvati");
        }
    }

    function resetLights() {
        trafficLights.forEach(light => {
            [...light.children].forEach(circle => circle.className = 'light');
        });
    }

    function flashYellow() {
        stopLightSequence();
        resetLights();
        trafficLights.forEach(light => {
            [...light.children].forEach(circle => circle.classList.add('flash-yellow'));
        });
        setTimeout(() => {
            trafficLights.forEach(light => {
                [...light.children].forEach(circle => circle.classList.remove('flash-yellow'));
            });
            message.textContent = "Premi 'Inizia Test' per riprovare";
            startButton.disabled = false;
            gameActive = false;
        }, 2000);
    }

    function stopLightSequence() {
        lightTimers.forEach(t => clearTimeout(t));
        lightTimers = [];
        if (goTimer) clearTimeout(goTimer);
        goTimer = null;
    }

    function updateTable() {
        resultsTableBody.innerHTML = "";
        reactionTimes.slice(-maxResults).forEach((time, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${index + 1}</td><td>${time}</td>`;
            resultsTableBody.appendChild(row);
        });
    }

    function updateChart() {
        const data = reactionTimes.slice(-maxResults);
        const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
        chart.data.labels = data.map((_, i) => i + 1);
        chart.data.datasets[0].data = data;
        chart.data.datasets[1].data = data.map(() => avg);
        chart.update();
    }

    function updateStats() {
        if (reactionTimes.length === 0) {
            stats.textContent = "";
            return;
        }
        const min = Math.min(...reactionTimes);
        const max = Math.max(...reactionTimes);
        const avg = Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
        stats.textContent = `Media: ${avg} ms | Migliore: ${min} ms | Peggiore: ${max} ms`;
    }

    function saveData() {
        localStorage.setItem("reactionTimes", JSON.stringify(reactionTimes));
    }

    function resetData() {
        if (!confirm("Sei sicuro di voler cancellare tutti i dati?")) return;
        reactionTimes.length = 0;
        localStorage.removeItem("reactionTimes");
        updateTable();
        updateStats();
        result.innerHTML = "";
        message.textContent = "Dati cancellati. Premi 'Inizia Test' per riprovare.";
        newChart();
    }

    function downloadCSV() {
        if (reactionTimes.length === 0) {
            alert("Non ci sono dati da scaricare.");
            return;
        }

        let csv = "Tentativo,Tempo (ms)\n";
        reactionTimes.forEach((time, index) => {
            csv += `${index + 1},${time}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "tempi_di_reazione.csv";
        link.click();
    }

    function startTest() {
        startButton.disabled = true;
        message.textContent = "Attendi il verde...";
        result.innerHTML = "";
        resetLights();
        gameActive = true;
        greenLight = false;
        startTime = null;

        let delay = 0;
        trafficLights.forEach(light => {
            const timer = setTimeout(() => {
                [...light.children].forEach(circle => circle.classList.add('red'));
            }, delay);
            lightTimers.push(timer);
            delay += 1000;
        });

        goTimer = setTimeout(() => {
            trafficLights.forEach(light => {
                [...light.children].forEach(circle => {
                    circle.classList.remove('red');
                    circle.classList.add('green');
                });
            });
            startTime = new Date().getTime();
            greenLight = true;
            message.textContent = "Clicca ora!";
        }, delay + 1000);
    }

    function handleClick(event) {
        if ([startButton, themeButton, resetButton, downloadButton].includes(event.target)) return;
        if (!gameActive) return;
        if (!greenLight) {
            message.textContent = "Partenza anticipata!";
            gameActive = false;
            flashYellow();
            return;
        }

        const reactionTime = new Date().getTime() - startTime;
        const previousTime = reactionTimes[reactionTimes.length - 1] || null;
        reactionTimes.push(reactionTime);

        result.innerHTML = `Il tuo tempo è ${reactionTime} ms` +
            (previousTime ? `<br><span class="delta" style="font-size: 0.8em; color: gray;">(${reactionTime - previousTime > 0 ? '+' : ''}${reactionTime - previousTime} ms rispetto al precedente)</span>` : "");

        message.textContent = "Premi 'Inizia Test' per riprovare";
        updateTable();
        updateChart();
        updateStats();
        saveData();
        gameActive = false;
        greenLight = false;
        startButton.disabled = false;
    }

    function toggleTheme() {
        body.classList.toggle('dark-mode');
        themeButton.textContent = body.classList.contains('dark-mode') ? 'Modalità Chiara' : 'Modalità Scura';
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        body.classList.add('dark-mode');
        themeButton.textContent = 'Modalità Chiara';
    }

    startButton.addEventListener('click', startTest);
    document.addEventListener('click', handleClick);
    themeButton.addEventListener('click', toggleTheme);
    resetButton.addEventListener('click', resetData);
    downloadButton.addEventListener('click', downloadCSV);
});
