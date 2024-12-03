// =========== IMPORTS & CONFIGURATION ===========
// Import all visualization components and configuration
// - Core visualization components
// - Configuration objects
// - Helper functions
import { createImageCell } from './imagecell.js';
import { cellConfigs } from './cellconfig.js';
import { createWaffleChart } from './waffleChart.js';
import { createStackedBarChart } from './stackedBarChart.js';
import { createWordPerformanceChart } from './wordPerformanceChart.js';
import { createHeatmap } from './heatmap.js';

// =========== VISUALIZATION MANAGER ===========
// Handle visualization updates and transitions
// - Clear existing content
// - Create new visualization based on index
// - Handle both image and chart content
function updateVis(index, data) {
    // Clear existing content
    const visContainer = d3.select('#vis');
    visContainer.selectAll('*').remove();

    // Handle image cells
    if (cellConfigs.images[index]) {
        createImageCell(visContainer, cellConfigs.images[index]);
        return;
    }

    // Handle chart cells
    if (cellConfigs.charts[index]) {
        // Create appropriate visualization based on config
        switch (cellConfigs.charts[index]) {
            case 'waffleChart':
                createWaffleChart(visContainer, data);
                break;
            case 'stackedBar':
                createStackedBarChart(visContainer, data);
                break;
            case 'wordPerformanceChart':
                createWordPerformanceChart(visContainer, data);
                break;
            case 'heatmap':
                createHeatmap(visContainer, data);
                break;
        }
    }
}

// =========== INITIALIZATION ===========
// Load data and setup scroll-based visualization
// - Load CSV data
// - Initialize scroller
// - Setup visualization
d3.csv('data.csv').then(function(rawData) {
    // Initialize scroll-based navigation
    const scroll = scroller()
        .container(d3.select('#graphic'))
        .containerOffset(350)
        .on('active', function(index) {
            // Update section visibility
            d3.selectAll('.step')
                .style('opacity', (d, i) => i === index ? 1 : 0.1);
            
            // Update visualization
            updateVis(index, rawData);
        });

    // Start scroll handler and show initial visualization
    scroll();
    updateVis(0, rawData);
});