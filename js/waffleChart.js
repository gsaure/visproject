// =========== IMPORTS & CONFIGURATION ===========
// Import core configuration and utility objects
// - Color schemes and mappings
// - Category definitions
// - UI configuration settings
import { colors, posMap, categoryMap, legendConfig, uiConfig, milestoneConfig } from './cellconfig.js';

export function createWaffleChart(visContainer, rawData) {
    // =========== CONSTANTS & SETUP ===========
    // Define core visualization parameters
    // - Margins and dimensions
    // - Grid layout settings
    // - Spacing configurations
    const margin = uiConfig.margins;
    const width = Math.floor(window.innerWidth * 0.65) - margin.left - margin.right;
    const height = 800;
    const squareSize = 7;
    const squaresPerColumn = 5;
    const categorySpacing = 60;

    // =========== SVG SETUP ===========
    // Create base SVG container with proper dimensions
    const svg = visContainer
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // =========== DATA PROCESSING ===========
    // Process raw data into visualization format
    // - Track first reviews of words
    // - Create vocabulary mappings
    // - Calculate date ranges
    const firstReviews = new Map();
    const vocabData = new Map();
    let minDate = new Date(3000, 0);
    let maxDate = new Date(0);

    // Process initial review dates and find range
    rawData.forEach(d => {
        const word = d.jpn;
        const reviewDate = new Date(Number(d.reviewDate - 25569) * 86400 * 1000);
        
        if (!firstReviews.has(word) || reviewDate < firstReviews.get(word).date) {
            firstReviews.set(word, {
                date: reviewDate,
                category: d.category,
                pos: d.partOS,
                english: d.eng
            });

            minDate = reviewDate < minDate ? reviewDate : minDate;
            maxDate = reviewDate > maxDate ? reviewDate : maxDate;
        }
    });

    // =========== WEEKLY DATA ORGANIZATION ===========
    // Group data by weeks for timeline visualization
    const weeklyData = new Map();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    let currentDate = new Date(minDate);

    while (currentDate <= maxDate) {
        const weekEnd = new Date(currentDate.getTime() + msPerWeek);
        const weekKey = currentDate.toISOString();
        weeklyData.set(weekKey, {
            start: currentDate,
            end: weekEnd,
            words: []
        });
        currentDate = weekEnd;
    }

    // =========== VOCABULARY ORGANIZATION ===========
    // Organize words into weeks and categories
    firstReviews.forEach((data, word) => {
        // Add to weekly timeline data
        for (let [weekKey, week] of weeklyData) {
            if (data.date >= week.start && data.date < week.end) {
                week.words.push({
                    word: word,
                    ...data
                });
                break;
            }
        }

        // Add to category groupings
        const category = data.category;
        if (!vocabData.has(category)) {
            vocabData.set(category, {
                category: category,
                words: []
            });
        }
        vocabData.get(category).words.push({
            word: word,
            pos: data.pos,
            date: data.date,
            english: data.english
        });
    });

    const categoryData = Array.from(vocabData.values())
        .sort((a, b) => b.words.length - a.words.length);

    // =========== CATEGORY GROUPS ===========
    // Create and position category groups
    const categoryGroups = svg.selectAll('.category-group')
        .data(categoryData)
        .enter()
        .append('g')
        .attr('class', 'category-group')
        .attr('transform', (d, i) => `translate(0, ${i * categorySpacing})`);

    // Add category labels with tooltips
    categoryGroups.append('text')
        .attr('class', 'category-label')
        .attr('x', -5)
        .attr('y', squareSize * 2.5)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .text(d => categoryMap.names[d.category])
        .on('mouseover', function(event, d) {
            const tooltip = d3.select(this.parentNode)
                .append('g')
                .attr('class', 'axis-tooltip')
                .attr('transform', `translate(${-margin.left + 10}, ${-20})`);

            tooltip.append('rect')
                .attr('width', categoryMap.tooltipWidths[d.category])
                .attr('height', 30)
                .attr('rx', 3)
                .attr('fill', 'white')
                .attr('stroke', '#ccc');

            tooltip.append('text')
                .attr('x', 5)
                .attr('y', 20)
                .style('font-size', '12px')
                .text(categoryMap.descriptions[d.category]);
        })
        .on('mouseout', function() {
            d3.select(this.parentNode).selectAll('.axis-tooltip').remove();
        });

    // =========== ANNOTATIONS ===========
    // Add week annotation and navigation
    const weekAnnotation = svg.append('text')
        .attr('class', 'week-annotation')
        .attr('x', width/2)
        .attr('y', 475)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold');

    // =========== NAVIGATION CONTROLS ===========
    // Create navigation buttons and controls
    const navigationContainer = svg.append('g')
        .attr('class', 'navigation')
        .attr('transform', `translate(${width/2-100}, ${height-240})`);

    const nextButton = navigationContainer.append('g')
        .attr('class', 'next-button')
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

    // =========== LEGEND ===========
    // Add legend with part of speech categories
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width/2-225}, ${height-295})`);

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

    // =========== VISUALIZATION UPDATE ===========
    // Handle word square creation and updates
    function showNewWords(startWeek, endWeek) {
        const weeks = Array.from(weeklyData.entries());
        const newWords = [];
        
        // Collect words for the time period
        for (let i = startWeek; i < endWeek && i < weeks.length; i++) {
            newWords.push(...weeks[i][1].words);
        }

        // Create squares with animation
        newWords.forEach((wordData, i) => {
            const category = wordData.category;
            const categoryIndex = categoryData.findIndex(d => d.category === category);
            const wordIndex = categoryData[categoryIndex].words.findIndex(w => w.word === wordData.word);
            
            const col = Math.floor(wordIndex / squaresPerColumn);
            const row = wordIndex % squaresPerColumn;

            setTimeout(() => {
                const square = categoryGroups.filter(d => d.category === category)
                    .append('rect')
                    .attr('class', 'square')
                    .attr('x', width)
                    .attr('y', row * (squareSize + 0.5))
                    .attr('width', squareSize)
                    .attr('height', squareSize)
                    .attr('rx', 1)
                    .attr('fill', colors.pos[wordData.pos]);

                square.transition()
                    .duration(uiConfig.transitions.duration)
                    .attr('x', col * (squareSize + 0.5));

                // Add tooltip interaction
                square.on('mouseover', function(event) {
                    const tooltip = svg.append('g')
                        .attr('class', 'tooltip')
                        .attr('transform', `translate(${col * (squareSize + 0.5) + squareSize + 5},
                            ${categoryIndex * categorySpacing + row * (squareSize + 0.5)})`);

                    tooltip.append('rect')
                        .attr('width', 180)
                        .attr('height', 40)
                        .attr('rx', 3)
                        .attr('fill', 'white')
                        .attr('stroke', '#ccc');

                    tooltip.append('text')
                        .attr('x', 4)
                        .attr('y', 12)
                        .style('font-size', '10px')
                        .style('font-weight', 'bold')
                        .text(`${wordData.word} (${wordData.english})`);

                    tooltip.append('text')
                        .attr('x', 4)
                        .attr('y', 28)
                        .style('font-size', '10px')
                        .text(`First reviewed: ${uiConfig.dateFormat(wordData.date)}`);
                })
                .on('mouseout', function() {
                    svg.selectAll('.tooltip').remove();
                });
            }, i * uiConfig.transitions.delay);
        });
    }

// =========== INITIALIZATION ===========
    // Setup initial state and event handlers
    let currentMilestoneIndex = 0;
    weekAnnotation.text(milestoneConfig.descriptions[0]);

    nextButton.on('click', () => {
        if (currentMilestoneIndex < milestoneConfig.weeks.length - 1) {
            const startWeek = milestoneConfig.weeks[currentMilestoneIndex];
            currentMilestoneIndex++;
            const endWeek = milestoneConfig.weeks[currentMilestoneIndex];
            
            weekAnnotation.text(milestoneConfig.descriptions[endWeek]);
            showNewWords(startWeek, endWeek);

            // Update button state
            if (currentMilestoneIndex === milestoneConfig.weeks.length - 1) {
                nextButton.style('opacity', 0.5)
                    .style('pointer-events', 'none');

                categoryGroups.each(function(d, i) {
                    // Get category data from vocabData map
                    const categoryWords = vocabData.get(d.category).words;
                        
                        // add the total to the end
                        d3.select(this)
                            .append('text')
                            .attr('class', 'total-count')
                            .attr('x', categoryWords.length*1.5 + squareSize + 10)
                            .attr('y',  (d, i) => i * categorySpacing+16)
                            .attr('dy', '0.35em')
                            .style('font-size', '18px')
                            .style('font-weight', 'bold')
                            .style('opacity', 0)
                            .text(`${categoryWords.length}`)
                            .transition()
                            .delay(4500)
                            .duration(1000)
                            .style('opacity', 1);
                    
                });
            }
        }
    });
}
