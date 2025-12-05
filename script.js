// Example dataset (replace with real sensor data)
const sensorData = [
    { "temperature": 24.15, "timestamp": "2025-12-05T11:37:06.262534" },
    { "temperature": 24.17, "timestamp": "2025-12-05T11:37:38.004651" },
    { "temperature": 24.20, "timestamp": "2025-12-05T11:38:10.000000" },
    { "temperature": 24.25, "timestamp": "2025-12-05T11:38:40.000000" },
    { "temperature": 24.30, "timestamp": "2025-12-05T11:39:10.000000" }
];

// Prepare chart data
const labels = sensorData.map(d => new Date(d.timestamp).toLocaleTimeString());
const temperatureValues = sensorData.map(d => d.temperature);

// Chart.js line chart
new Chart(document.getElementById('temperatureChart'), {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: 'Temperature (°C)',
            data: temperatureValues,
            borderColor: '#800020',
            backgroundColor: 'rgba(128,0,32,0.2)',
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: '#800020'
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: true },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: {
                title: { display: true, text: 'Time' },
                grid: { color: '#eee' }
            },
            y: {
                title: { display: true, text: '°C' },
                grid: { color: '#eee' }
            }
        }
    }
});

