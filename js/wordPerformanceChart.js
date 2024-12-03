// =========== IMPORTS & CONFIGURATION ===========
// Import core visualization settings and mappings
// - Colors and UI configuration
// - Part of speech mappings
// - Legend settings
import { colors, posMap, legendConfig, uiConfig } from './cellconfig.js';

export function createWordPerformanceChart(visContainer, rawData) {
    // =========== CONSTANTS & SETUP ===========
    // Define visualization dimensions and layout
    // - Set margins for chart area
    // - Calculate responsive dimensions
    const margin = { top: 60, right: 40, bottom: 80, left: 60 };
    const width = Math.floor(window.innerWidth * 0.65) - margin.left - margin.right;
    const height = 600;
    
    // Colors for parts of speech visualization
    const posColors = {
        'noun': colors.pos.noun,
        'verb': colors.pos.verb,
        'adj': colors.pos.adj,
        'adv': colors.pos.adv,
        'verbial noun': colors.pos['verbial noun'],
        'phrase': colors.pos.phrase
    };

    // =========== STATE MANAGEMENT ===========
    // Track visualization state and filters
    // - Display count for visible words
    // - Hidden word count
    // - View mode (combined/separated)
    // - Category filters
    let displayCount = 20;
    let hideTopCount = 0;
    let isCombined = false;
    let selectedCategories = new Set(Array.from(new Set(rawData.map(d => d.category))));

    // =========== DATA PROCESSING ===========
    // Process raw data into visualization format
    function processData(data) {
        // Create word statistics map
        const wordStats = new Map();
        
        // Process each review entry
        data.forEach(d => {
            if (!selectedCategories.has(d.category)) return;
            
            const key = d.jpn;
            if (!wordStats.has(key)) {
                wordStats.set(key, {
                    jpn: d.jpn,
                    eng: d.eng,
                    partOS: d.partOS,
                    category: d.category,
                    goodReviews: 0,
                    badReviews: 0,
                    firstReview: new Date(Number(d.reviewDate - 25569) * 86400 * 1000)
                });
            }
            const stat = wordStats.get(key);
            d.score === 'good' ? stat.goodReviews++ : stat.badReviews++;
        });

        // Calculate success rates and sort
        return Array.from(wordStats.values())
            .map(stat => ({
                ...stat,
                totalReviews: stat.goodReviews + stat.badReviews,
                successRate: (stat.goodReviews / (stat.goodReviews + stat.badReviews)) * 100
            }))
            .sort((a, b) => b.successRate - a.successRate);
    }

    // Filter data based on display settings
    function filterData(data) {
        return data.slice(hideTopCount, hideTopCount + displayCount);
    }

    // =========== SCALES ===========
    // Create scales for visualization
    const xScale = d3.scaleBand()
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .range([height, 0]);

    // Process initial data
    const processedData = processData(rawData);

    // =========== SVG SETUP ===========
    // Create base SVG container
    const svg = visContainer
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // =========== CONTROLS ===========
    // Add control container with consistent styling
    const controlsContainer = visContainer
        .append('div')
        .style('position', 'absolute')
        .style('top', 'auto')
        .style('left', `${margin.left}px`)
        .style('right', `${margin.right}px`)
        .style('bottom', '-75px')
        .style('display', 'flex')
        .style('gap', '10px')
        .style('text-align', 'center')
        .style('font-family', 'Roboto, sans-serif');

    // Create input group generator
    function createInputGroup(label, defaultValue, onChange) {
        const group = controlsContainer
            .append('div')
            .style('background-color', colors.pos.verb)
            .style('padding', '6px 12px')
            .style('border-radius', '4px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px');

        // Add label
        group.append('span')
            .text(label)
            .style('color', 'white')
            .style('font-size', '14px');

        // Add input field
        const input = group.append('input')
            .attr('type', 'number')
            .attr('value', defaultValue)
            .style('width', '50px')
            .style('height', '24px')
            .style('border', 'none')
            .style('border-radius', '2px')
            .style('padding', '0 8px')
            .style('font-size', '14px')
            .style('outline', 'none');

        // Add apply button
        group.append('button')
            .style('background', 'none')
            .style('border', 'none')
            .style('cursor', 'pointer')
            .style('color', 'white')
            .style('padding', '0 4px')
            .html('→')
            .on('click', () => {
                const newValue = parseInt(input.property('value'));
                if (!isNaN(newValue) && newValue >= 0) {
                    onChange(newValue);
                    updateVis(true);
                }
            });

        return group;
    }

    // Add view toggle button
    const viewToggle = controlsContainer
        .append('div')
        .style('background-color', colors.pos.verb)
        .style('padding', '6px 12px')
        .style('border-radius', '4px')
        .style('color', 'white')
        .style('cursor', 'pointer')
        .style('font-size', '14px')
        .text('Combine Parts of Speech')
        .on('click', () => {
            isCombined = !isCombined;
            viewToggle.text(isCombined ? 'Separate Parts of Speech' : 'Combine Parts of Speech');
            updateVis(true);
        });

    // Create input controls
    createInputGroup('Show Top Words:', displayCount, value => displayCount = value);
    createInputGroup('Hide Top Words:', hideTopCount, value => hideTopCount = value);

    // =========== CATEGORY SELECTOR ===========
    // Add category selection dropdown
    const categories = Array.from(new Set(rawData.map(d => d.category)));
    const categoryMap = {
        'DL': 'Daily Life',
        'PR': 'People & Relationships',
        'PT': 'Places & Travel',
        'AA': 'Actions & Activities',
        'BH': 'Body & Health',
        'TN': 'Time & Numbers',
        'NE': 'Nature & Environment',
        'AC': 'Abstract Concepts'
    };

    // Create select container
    const selectContainer = controlsContainer
        .append('div')
        .style('position', 'relative')
        .style('background-color', colors.pos.verb)
        .style('padding', '6px 12px')
        .style('border-radius', '4px')
        .style('color', 'white')
        .style('min-width', '150px');

    // Add select button
    const selectButton = selectContainer
        .append('div')
        .style('cursor', 'pointer')
        .style('display', 'flex')
        .style('justify-content', 'space-between')
        .style('font-size', '14px')
        .style('align-items', 'center')
        .style('gap', '10px');

    selectButton.append('span')
        .text('Categories');

    selectButton.append('span')
        .html('▲')
        .style('font-size', '10px');

    // Create dropdown menu
    const dropdown = selectContainer
        .append('div')
        .style('position', 'absolute')
        .style('bottom', 'calc(100% + 4px)')
        .style('left', '0')
        .style('right', '0')
        .style('background-color', 'white')
        .style('border', '1px solid #ddd')
        .style('font-size', '14px')
        .style('border-radius', '4px')
        .style('margin-bottom', '4px')
        .style('display', 'none')
        .style('z-index', '1000')
        .style('max-height', '300px')
        .style('overflow-y', 'auto');

    // Add category options
    categories.forEach(category => {
        const option = dropdown
            .append('div')
            .style('padding', '8px 12px')
            .style('cursor', 'pointer')
            .style('color', '#333')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px');

        // Add checkbox
        const checkbox = option
            .append('input')
            .attr('type', 'checkbox')
            .property('checked', true)
            .on('change', function() {
                const isChecked = d3.select(this).property('checked');
                if (isChecked) {
                    selectedCategories.add(category);
                } else {
                    selectedCategories.delete(category);
                }
                updateVis(true);
            });

        // Add category label
        option.append('span')
            .text(categoryMap[category] || category);

        // Add hover effect
        option
            .on('mouseover', function() {
                d3.select(this).style('background-color', '#f0f0f0');
            })
            .on('mouseout', function() {
                d3.select(this).style('background-color', 'white');
            });
    });

    // Add dropdown toggle
    selectButton.on('click', () => {
        const isVisible = dropdown.style('display') !== 'none';
        dropdown.style('display', isVisible ? 'none' : 'block');
    });

    // Close dropdown on outside click
    d3.select('body').on('click', function(event) {
        if (!selectContainer.node().contains(event.target)) {
            dropdown.style('display', 'none');
        }
    });

    // =========== TOOLTIP ===========
    // Create tooltip with consistent styling
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('font-size', '10px')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'white')
        .style('padding', '10px')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('font-family', 'Roboto, sans-serif')
        .style('z-index', '1000');

    // =========== VISUALIZATION UPDATE ===========
    // Handle visualization updates and transitions
    function updateVis(animate = false) {
        const duration = animate ? 750 : 0;
        svg.selectAll('.count-label').remove();
        const displayData = filterData(processData(rawData));

        if (isCombined) {
            // Combined view implementation
            updateCombinedView(displayData, duration);
        } else {
            // Separated view implementation
            updateSeparatedView(displayData, duration);
        }
        updateTooltips();
    }

    // =========== COMBINED VIEW ===========
    // Handle combined view visualization
    function updateCombinedView(displayData, duration) {
        // Remove existing elements
        svg.selectAll('.x-axis').remove();
        svg.selectAll('.count-label').remove();

        // Calculate success rate range
        const rawMin = d3.min(displayData, d => d.successRate);
        const rawMax = d3.max(displayData, d => d.successRate);
        
        let minRate, maxRate;
        if (rawMin === rawMax) {
            minRate = maxRate = rawMin;
        } else {
            minRate = Math.max(0, rawMin - 2);
            maxRate = Math.min(100, rawMax + 2);
        }

        // Create scales
        const successScale = d3.scaleLinear()
            .domain([minRate, maxRate])
            .range([0, width * 0.8]);

        const wordScale = d3.scalePoint()
            .domain(displayData.map(d => d.jpn))
            .range([0, height * 0.8])
            .padding(0.5);

        // Add x-axis
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(${-2*width},${height-80})`)
            .transition()
            .duration(1250)
            .ease(d3.easeCubicInOut)
            .attr('transform', `translate(75,${height-80})`)
            .call(d3.axisBottom(successScale)
                .ticks(5)
                .tickFormat(d => d + '%'))
            .call(g => {
                g.selectAll('text')
                    .style('font-family', '"Segoe UI", Roboto, sans-serif')
                    .style('font-size', '12px');
                g.selectAll('line')
                    .style('stroke', '#ddd');
                g.select('.domain')
                    .style('stroke', '#ddd');
            });

        // Update words
        const words = svg.selectAll('.word')
            .data(displayData, d => d.jpn);

        // Handle exit
        words.exit()
            .transition()
            .duration(duration)
            .style('opacity', 0)
            .remove();

        // Handle enter
        const wordsEnter = words.enter()
            .append('text')
            .attr('class', 'word')
            .style('font-size', '12px')
            .style('opacity', 0)
            .attr('text-anchor', 'start')
            .attr('x', 0)
            .attr('y', height / 2);

        // Handle update + enter
        words.merge(wordsEnter)
            .transition()
            .delay(500)
            .duration(1000)
            .style('opacity', 1)
            .attr('x', d => successScale(d.successRate) + 75)
            .attr('y', d => wordScale(d.jpn))
            .text(d => d.jpn)
            .style('fill', d => posColors[d.partOS]);
    }

    // =========== SEPARATED VIEW ===========
    // Handle separated view visualization
    function updateSeparatedView(displayData, duration) {
        // Remove x-axis with transition
        svg.selectAll('.x-axis')
            .transition()
            .duration(1250)
            .ease(d3.easeCubicInOut)
            .attr('transform', `translate(${width*2},${height-80})`)
            .style('opacity', 0)
            .remove();

        // Group data by part of speech and sort
        const posCounts = d3.group(displayData, d => d.partOS);
        const posTypes = Array.from(posCounts.keys())
            .sort((a, b) => posCounts.get(b).length - posCounts.get(a).length);

        // Create scales for separated view
        const posScale = d3.scaleBand()
            .domain(posTypes)
            .range([0, width])
            .padding(0.2);

        const wordScale = d3.scalePoint()
            .domain(d3.range(d3.max(posCounts.values(), d => d.length)))
            .range([0, height])
            .padding(0.5);

        // Update category labels
        const categoryLabels = svg.selectAll('.category-label')
            .data(posTypes);

        categoryLabels.exit().remove();

        const categoryLabelsEnter = categoryLabels.enter()
            .append('text')
            .attr('class', 'category-label')
            .attr('y', height-90)
            .style('font-size', '14px')
            .style('opacity', 0);

        categoryLabels.merge(categoryLabelsEnter)
            .transition()
            .delay(500)
            .duration(1000)
            .attr('x', d => posScale(d) + posScale.bandwidth() / 2)
            .attr('y', height-85)
            .attr('text-anchor', 'middle')
            .text(d => posMap.labels[d])
            .style('fill', d => posColors[d])
            .style('opacity', 1);

        // Add count labels with animation
        const countLabels = svg.selectAll('.count-label')
            .data(posTypes);

        countLabels.exit().remove();

        const countLabelsEnter = countLabels.enter()
            .append('text')
            .attr('class', 'count-label')
            .style('font-size', '25px')
            .style('font-weight', 'bold')
            .style('opacity', 0)
            .attr('text-anchor', 'middle');

        countLabels.merge(countLabelsEnter)
            .attr('x', d => posScale(d) + posScale.bandwidth() / 2)
            .text(d => posCounts.get(d).length)
            .attr('y', d => {
                const posWords = posCounts.get(d);
                const lastWordY = -(wordScale(posWords.length - 1) * 
                    (0.6 + (displayCount / 3000) * 0.5)) + height * 0.8;
                return lastWordY - 20;
            })
            .style('fill', d => posColors[d])
            .attr('opacity', 0)
            .transition()
            .delay(1100)
            .duration(500)
            .style('opacity', 1);

        // Update words with animation
        const words = svg.selectAll('.word')
            .data(displayData, d => d.jpn);

        words.exit()
            .transition()
            .duration(duration)
            .style('opacity', 0)
            .remove();

        const wordsEnter = words.enter()
            .append('text')
            .attr('class', 'word')
            .style('font-size', '12px')
            .style('opacity', 0)
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', height / 2);

        words.merge(wordsEnter)
            .transition()
            .delay(500)
            .duration(1000)
            .style('opacity', 1)
            .attr('x', d => {
                const pos = d.partOS;
                return posScale(pos) + posScale.bandwidth() / 2;
            })
            .attr('y', function(d) {
                const pos = d.partOS;
                const posWords = posCounts.get(pos);
                const wordIndex = posWords.indexOf(d);
                return -(wordScale(wordIndex) * 
                    (0.6 + (displayCount / 3000) * 0.5)) + height * 0.8;
            })
            .text(d => d.jpn)
            .style('fill', d => posColors[d.partOS]);
    }

    // =========== TOOLTIP HANDLERS ===========
    // Add tooltip interactions to words
    function updateTooltips() {
        svg.selectAll('.word')
            .on('mouseover', function(event, d) {
                tooltip
                    .style('visibility', 'visible')
                    .html(`
                        <strong>${d.jpn}</strong><br/>
                        ${d.eng}<br/>
                        Type: ${posMap.labels[d.partOS]}<br/>
                        Success Rate: ${Math.round(d.successRate)}%<br/>
                        Good Reviews: ${d.goodReviews}<br/>
                        Bad Reviews: ${d.badReviews}<br/>
                        Total Reviews: ${d.totalReviews}
                    `);
            })
            .on('mousemove', function(event) {
                tooltip
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                tooltip.style('visibility', 'hidden');
            });
    }

    // =========== INITIALIZATION ===========
    // Initialize visualization and add cleanup
    updateVis();

    return () => {
        tooltip.remove();
    };
}
