// =========== IMPORTS & CONFIGURATION ===========
// Import core configuration and utility objects
// - Color schemes and mappings
// - Text labels and descriptions
// - UI configuration settings
import { colors, posMap, legendConfig, uiConfig } from './cellconfig.js';

export function createStackedBarChart(visContainer, rawData) {
    // =========== CONSTANTS & SETUP ===========
    // Define visualization dimensions and layout
    // - Set custom margins based on UI config
    // - Calculate dimensions
    const margin = { ...uiConfig.margins, top: 200, left: 80 };
    const width = Math.floor(window.innerWidth * 0.65) - margin.left - margin.right;
    const height = 800;
    const barHeight = 60;
    
    // =========== SVG SETUP ===========
    // Create base SVG container and groups
    const svg = visContainer
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // =========== DATA PROCESSING ===========
    // Process raw data into visualization format
    // - Group by part of speech
    // - Calculate counts and distributions
    // - Sort data for display
    const posData = Array.from(d3.group(rawData, d => d.partOS))
        .map(([pos, items]) => ({
            pos: pos,
            count: new Set(items.map(d => d.jpn)).size,
            color: colors.pos[pos]
        }))
        .sort((a, b) => a.count - b.count);

    const posDataDescending = posData.sort((a, b) => b.count - a.count);

    // =========== SCALES ===========
    // Create scales for visualization
    // - Y scale for positioning
    // - Total word calculations
    const yScale = d3.scaleBand()
       .domain(posDataDescending.map(d => d.pos))
       .range([0, 400])
       .padding(0.3);

    // Calculate statistics
    const totalWords = posData.reduce((acc, curr) => acc + curr.count, 0);
    const average = Math.round(totalWords / posData.length);
    const nounCount = posData.find(d => d.pos === 'noun').count;
    const timesHigher = Math.round((nounCount / average) * 10) / 10;
    
    const xScale = d3.scaleLinear()
        .domain([0, totalWords])
        .range([0, width]);

    // =========== ANNOTATIONS ===========
    // Add text annotations for context
    const annotation = svg.append('text')
        .attr('class', 'annotation')
        .attr('x', width / 2 - 50)
        .attr('y', barHeight + 325)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('opacity', 0);

    // =========== BAR GROUP ===========
    // Create container for bars
    const barGroup = svg.append('g')
        .attr('class', 'bar-group')
        .attr('transform', `translate(0,${barHeight})`);

    // =========== NAVIGATION ===========
    // Add navigation button
    const nextButton = svg.append('g')
        .attr('class', 'next-button')
        .attr('transform', `translate(${width/2-50}, ${height-380})`)
        .style('cursor', 'pointer');

    nextButton.append('rect')
        .attr('width', 100)
        .attr('height', 30)
        .attr('rx', 4)
        .attr('fill', colors.pos.verb);

    nextButton.append('text')
        .attr('x', 20)
        .attr('y', 20)
        .attr('fill', 'white')
        .text('Next →');

    // =========== ANIMATION STATES ===========
    // Define state management for animations
    let currentState = 0;
    const states = [
        { text: "Let's consider our distribution as a whole." },
        { text: `Recall that we have ${totalWords} words. Let's see how many are in each!` },
        ...posData.map(d => ({ 
            text: `For ${posMap.plural[d.pos]}, there are ${d.count} words making up ${
                d.pos === 'noun' 
                    ? (d.count/totalWords*100 - 1).toFixed(0) 
                    : (d.count/totalWords*100).toFixed(0)
            }%.`,
            pos: d.pos 
        })),
        { text: "Let's reorganize this to see the comparison more clearly." },
        { text: `We can see that most of my vocabulary are nouns, ${timesHigher}x higher than the average.` }
    ];

    // =========== UPDATE FUNCTION ===========
    // Handle state updates and transitions
    function updateState(state) {
        // Update annotation text
        annotation
            .style('opacity', 0)
            .transition()
            .duration(uiConfig.transitions.duration)
            .style('opacity', 1)
            .text(states[state].text);

        if (state === 1) {
            // Show total bar
            barGroup.append('rect')
                .attr('class', 'total-bar')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', barHeight)
                .attr('fill', colors.ui.lightGrey)
                .attr('width', 0)
                .transition()
                .duration(uiConfig.transitions.duration * 2)
                .attr('width', width);
        } 
        else if (state > 1 && state <= posData.length + 1) {
            // Add part of speech segments
            const posIndex = state - 2;
            const pos = posData[posIndex];
            
            // Calculate segment position
            const previousTotal = posData
                .slice(0, posIndex)
                .reduce((acc, curr) => acc + curr.count, 0);
            
            // Add animated segment
            const segment = barGroup.append('rect')
                .attr('class', 'pos-bar')
                .attr('data-pos', pos.pos)
                .attr('x', xScale(previousTotal))
                .attr('y', 0)
                .attr('height', barHeight)
                .attr('fill', colors.pos[pos.pos])
                .attr('width', 0)
                .style('opacity', 1);

            segment.transition()
                .duration(uiConfig.transitions.duration * 2)
                .attr('width', xScale(pos.count))
                .on('end', () => {
                    // Add percentage label
                    const percentage = pos.pos === 'noun' 
                        ? (pos.count/totalWords*100 - 1).toFixed(0)
                        : (pos.count/totalWords*100).toFixed(0);
                    const labelX = xScale(previousTotal) + xScale(pos.count)/2;
                    
                    barGroup.append('text')
                        .attr('class', 'percentage-label')
                        .attr('x', labelX)
                        .attr('y', barHeight/2)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .style('fill', 'white')
                        .style('font-weight', 'bold')
                        .style('font-size', '16px')
                        .style('opacity', 0)
                        .text(`${percentage}%`)
                        .transition()
                        .duration(uiConfig.transitions.duration)
                        .style('opacity', 1);
                });

            // Add legend for first bar
            if (posIndex === 0) {
                const legend = svg.append('g')
                    .attr('class', 'legend')
                    .attr('transform', `translate(${width/2-300}, ${height-460})`);

                legendConfig.items.forEach((item, i) => {
                    const legendX = (i % legendConfig.layout.itemsPerRow) * legendConfig.layout.itemWidth;
                    const legendY = Math.floor(i % legendConfig.layout.itemsPerRow);
            
                    const legendItem = legend.append('g')
                        .attr('transform', `translate(${legendX}, ${legendY})`);
            
                    legendItem.append('rect')
                        .attr('width', legendConfig.layout.squareSize)
                        .attr('height', legendConfig.layout.squareSize)
                        .attr('fill', item.color);
            
                    legendItem.append('text')
                        .attr('x', 20)
                        .attr('y', 10)
                        .style('font-size', legendConfig.layout.fontSize)
                        .text(item.label);
                });
            }
        }
        else if (state === posData.length + 2) {
            // Transform to horizontal bar chart
            barGroup.selectAll('.percentage-label')
                .style('opacity', 0)
                .remove();

            // Transform segments
            barGroup.selectAll('.pos-bar')
                .each(function() {
                    const segment = d3.select(this);
                    const pos = segment.attr('data-pos');
                    const posInfo = posData.find(p => p.pos === pos);
                    
                    segment.transition()
                        .duration(uiConfig.transitions.duration * 3)
                        .attr('x', 100)
                        .attr('y', yScale(pos)-150)
                        .attr('width', xScale(posInfo.count)*2.3)
                        .attr('height', yScale.bandwidth());
                });

            // Add y-axis
            const yAxis = d3.axisLeft(yScale)
                .tickFormat(d => posMap.plural[d]);

            barGroup.append('g')
                .attr('class', 'y-axis')
                .call(yAxis)
                .style('opacity', 0);

            // Add labels
            posData.forEach(pos => {
                // Category labels
                barGroup.append('text')
                    .attr('class', 'category-label')
                    .attr('x', -15+100-width)
                    .attr('y', yScale(pos.pos)-150 + yScale.bandwidth()/2)
                    .attr('text-anchor', 'end')
                    .attr('dominant-baseline', 'middle')
                    .style('font-size', '14px')
                    .style('font-weight', '500')
                    .style('opacity', 0)
                    .text(posMap.abbreviated[pos.pos])
                    .transition()
                    .duration(uiConfig.transitions.duration * 4)
                    .attr('transform', (d, i) => `translate(${width},0)`)
                    .style('opacity', 1);

                // Count labels
                barGroup.append('text')
                    .attr('class', 'count-label')
                    .attr('x', xScale(pos.count)*2.3 + 5+100)
                    .attr('y', yScale(pos.pos)-150 + yScale.bandwidth()/2)
                    .attr('dominant-baseline', 'middle')
                    .style('font-size', '16px')
                    .style('opacity', 0)
                    .text(pos.count)
                    .transition()
                    .delay(uiConfig.transitions.duration * 3)
                    .duration(uiConfig.transitions.duration)
                    .style('opacity', 1);
            });

            // Remove background bar
            barGroup.select('.total-bar')
                .transition()
                .duration(uiConfig.transitions.duration)
                .style('opacity', 0)
                .remove();

            // Remove legend
            svg.selectAll('.legend')
                .transition()
                .duration(uiConfig.transitions.duration * 3)
                .ease(d3.easeCubicInOut)
                .attr('transform', (d, i) => `translate(${width * 1.2},${height - 450})`)
                .remove();

        } 
        else if (state === posData.length + 3) {
            // Highlight noun comparison
            barGroup.selectAll('.pos-bar')
                .transition()
                .duration(uiConfig.transitions.duration * 2)
                .attr('fill', function() {
                    const pos = d3.select(this).attr('data-pos');
                    return pos === 'noun' ? colors.pos.noun : colors.ui.lightGrey;
                });

            // Add average line
            const averageX = 100 + xScale(average)*2.3;
            
            barGroup.append('line')
                .attr('class', 'average-line')
                .attr('x1', averageX)
                .attr('y1', -200)
                .attr('x2', averageX)
                .attr('y2', 300)
                .style('stroke', colors.ui.darkGrey)
                .style('stroke-width', 0.5)
                .style('stroke-dasharray', '5,5')
                .style('opacity', 0)
                .transition()
                .duration(uiConfig.transitions.duration * 2)
                .style('opacity', 1);

            // Add average label
            barGroup.append('text')
                .attr('class', 'average-label')
                .attr('x', averageX)
                .attr('y', -210)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('fill', colors.ui.darkGrey)
                .style('opacity', 0)
                .text(`Average: ${average}`)
                .transition()
                .duration(uiConfig.transitions.duration * 2)
                .style('opacity', 1);

            // Update text colors
            barGroup.selectAll('.category-label')
                .transition()
                .duration(uiConfig.transitions.duration * 2)
                .style('fill', function() {
                    const labelText = d3.select(this).text();
                    return labelText === posMap.abbreviated.noun ? colors.pos.noun : colors.ui.darkGrey;
                });

            barGroup.selectAll('.count-label')
                .transition()
                .duration(uiConfig.transitions.duration * 2)
                .style('fill', function() {
                    const y = parseFloat(d3.select(this).attr('y'));
                    const nounY = yScale('noun')-150 + yScale.bandwidth()/2;
                    return Math.abs(y - nounY) < 1 ? colors.pos.noun : colors.ui.darkGrey;
                });
        }

        // Update button state
        if (state === states.length - 1) {
            nextButton.style('opacity', 0.5)
                .style('pointer-events', 'none');
        }
    }

    // =========== INITIALIZATION ===========
    // Initialize first state
    updateState(0);

    // Add click handler for next button
    nextButton.on('click', () => {
        if (currentState < states.length - 1) {
            currentState++;
            updateState(currentState);
        }
    });
}