// Example dataset (replace with your JSON data or API)
const sensorData = [
  { "temperature": 24.15, "timestamp": "2025-12-05T11:37:06.262534" },
  { "temperature": 24.17, "timestamp": "2025-12-05T11:37:38.004651" },
  { "temperature": 24.20, "timestamp": "2025-12-05T11:38:10.000000" }
];

// Prepare labels (time) and data (temperature)
const labels = sensorData.map(d => new Date(d.timestamp).toLocaleTimeString());
const temperatureValues = sensorData.map(d => d.temperature);

// Create Chart.js line chart
new Chart(document.getElementById('temperatureChart'), {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: 'Temperature (°C)',
            data: temperatureValues,
            borderColor: 'red',
            fill: false,
            tension: 0.3
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' } },
            y: { title: { display: true, text: '°C' } }
        }
    }
});
