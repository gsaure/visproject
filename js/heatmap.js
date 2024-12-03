// =========== IMPORTS & CONFIGURATION ===========
// Import core configuration and utility modules
// - Colors for visualization elements
// - Mapping objects for data transformation
// - UI configuration settings
import { colors, posMap, categoryMap, legendConfig, uiConfig } from './cellconfig.js';

export function createHeatmap(visContainer, rawData) {
    // =========== CONSTANTS & SETUP ===========
    // Define core visualization dimensions and layout parameters
    // - Set margins and dimensions
    // - Calculate calendar-specific measurements
    // - Initialize time formatting functions
    const margin = { top: 60, right: 40, bottom: 80, left: 60 };
    const width = Math.floor(window.innerWidth * 0.65) - margin.left - margin.right;
    const height = 600;
    const monthsPerRow = 3;
    const calendarWidth = (width - margin.left - margin.right) / monthsPerRow + 15;
    const calendarHeight = (height - margin.top - margin.bottom) / 2 + 75;
    const cellSize = Math.min(calendarWidth / 8, calendarHeight / 8);
    
    // =========== UTILITY FUNCTIONS ===========
    // Time-based color assignments for different periods of the day
    function getTimeColor(hour) {
        if ((hour >= 6 && hour <= 11)) return colors.pos.adj;  // Morning
        if (hour >= 12 && hour <= 17) return colors.pos.noun;  // Afternoon
        return colors.ui.darkGrey;  // Evening/night
    }
    
    const formatMonth = d3.timeFormat('%B');
    const formatWeekday = d3.timeFormat('%a');
    
    // =========== DATA PROCESSING ===========
    // Transform raw Anki data into visualization-ready format
    // - Aggregate reviews by date
    // - Process individual word reviews
    // - Create data structures for visualization
    const reviewsByDate = new Map();
    const wordReviews = [];
    
    rawData.forEach(d => {
        const date = new Date((d.reviewDate - 25569) * 86400 * 1000);
        const dateKey = d3.timeFormat('%Y-%m-%d')(date);
        
        if (!reviewsByDate.has(dateKey)) {
            reviewsByDate.set(dateKey, { date, count: 0 });
        }
        reviewsByDate.get(dateKey).count++;
        
        wordReviews.push({
            word: d.jpn,
            english: d.eng,
            date: date,
            score: d.score,
            reviewTime: +d.reviewTime,
            partOS: d.partOS,
            category: d.category,
            agree: d.agree
        });
    });
    
    const months = d3.range(5, 11).map(month => new Date(2024, month));
    
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(Array.from(reviewsByDate.values()), d => d.count)])
        .interpolator(d3.interpolateBlues);
    
    // =========== SVG SETUP ===========
    // Create main SVG container and tooltip
    const svg = visContainer
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'white')
        .style('padding', '10px')
        .style('border', '1px solid #ddd')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('max-width', '400px');

    // =========== VISUALIZATION COMPONENTS ===========
    // Mini bar chart generator for tooltip details
    function createMiniBarChart(words, type) {
        // Setup container and dimensions
        const container = document.createElement('div');
        container.style.width = '300px';
        container.style.height = '120px';
        container.style.marginBottom = '10px';
        
        const margin = { top: 5, right: 30, bottom: 5, left: 100 };
        const width = 300 - margin.left - margin.right;
        const height = 100 - margin.top - margin.bottom;
    
        // Process data for visualization
        const countMap = new Map();
        words.forEach(word => {
            const key = type === 'pos' ? word.partOS : word.category;
            countMap.set(key, (countMap.get(key) || 0) + 1);
        });
        
        const data = Array.from(countMap, ([key, value]) => ({
            key,
            value,
            label: type === 'pos' ? posMap.labels[key] : categoryMap.names[key]
        })).sort((a, b) => b.value - a.value);
    
        // Create SVG and scales
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .style('overflow', 'visible');
    
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
    
        const y = d3.scaleBand()
            .domain(data.map(d => d.key))
            .range([0, height])
            .padding(0.2);
    
        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) || 1])
            .range([0, width]);
    
        // Add bars
        g.selectAll('.mini-bar')
            .data(data)
            .join('rect')
            .attr('class', 'mini-bar')
            .attr('x', 0)
            .attr('y', d => y(d.key))
            .attr('width', d => x(d.value))
            .attr('height', y.bandwidth())
            .attr('fill', d => type === 'pos' ? colors.pos[d.key] : colors.pos.noun)
            .attr('rx', 2);
    
        // Add labels
        g.selectAll('.mini-label')
            .data(data)
            .join('text')
            .attr('class', 'mini-label')
            .attr('x', -5)
            .attr('y', d => y(d.key) + y.bandwidth() / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '10px')
            .text(d => d.label);
    
        // Add value labels
        g.selectAll('.value-label')
            .data(data)
            .join('text')
            .attr('class', 'value-label')
            .attr('x', d => x(d.value) + 5)
            .attr('y', d => y(d.key) + y.bandwidth() / 2)
            .attr('dominant-baseline', 'middle')
            .style('font-size', '10px')
            .text(d => d.value);
    
        return container;
    }

    // =========== TOOLTIP HANDLERS ===========
    // Enhanced tooltip display with detailed statistics
    function showEnhancedTooltip(event, d) {
        tooltip.selectAll('*').remove();
        
        const hourStr = d3.timeFormat('%I %p')(new Date(2024, 0, 1, d.hour));
        
        const words = d.words.filter(w => {
            if (d.key === 'good') return w.score === 'good';
            if (d.key === 'bad') return w.score === 'bad';
            if (d.key === 'yes') return w.agree === 'yes';
            if (d.key === 'no') return w.agree === 'no';
            return false;
        });
    
        const tooltipContent = tooltip.append('div')
            .style('padding', '8px');
        
        tooltipContent.append('p')
            .style('margin', '0 0 8px 0')
            .html(`<strong>Hour: ${hourStr}</strong><br/>
                   ${d.key === 'good' ? 'Good' : d.key === 'bad' ? 'Bad' : d.key === 'yes' ? 'Agreed' : 'Disagreed'} 
                   Reviews: ${words.length}`);
    
        if (words.length > 0) {
            tooltipContent.append('p')
                .style('margin', '8px 0 4px 0')
                .text('Distribution by Part of Speech:');
            
            const posChart = createMiniBarChart(words, 'pos');
            tooltipContent.node().appendChild(posChart);
    
            tooltipContent.append('p')
                .style('margin', '8px 0 4px 0')
                .text('Distribution by Category:');
            
            const categoryChart = createMiniBarChart(words, 'category');
            tooltipContent.node().appendChild(categoryChart);
        }
    
        tooltip
            .style('visibility', 'visible')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    // =========== CALENDAR RENDERING ===========
    // Create and update calendar visualization
    function renderCalendars() {
        svg.selectAll('.word-performance').remove();
        
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        months.forEach((month, i) => {
            const row = Math.floor(i / monthsPerRow);
            const col = i % monthsPerRow;
            
            // Create month group
            const monthGroup = svg.append('g')
                .attr('class', 'month')
                .attr('transform', `translate(${margin.left + col * calendarWidth},${margin.top + row * calendarHeight})`);
            
            // Add month label
            monthGroup.append('text')
                .attr('x', calendarWidth / 2)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .text(formatMonth(month));
            
            // Add weekday labels
            weekdays.forEach((day, j) => {
                monthGroup.append('text')
                    .attr('x', j * cellSize + 15)
                    .attr('y', cellSize - 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .text(day);
            });
            
            // Calculate calendar grid
            const firstDay = new Date(2024, month.getMonth(), 1);
            const daysInMonth = new Date(2024, month.getMonth() + 1, 0).getDate();
            const startOffset = firstDay.getDay();

            // Create calendar days
            for (let i = 0; i < 42; i++) {
                const row = Math.floor(i / 7);
                const col = i % 7;
                const day = i - startOffset + 1;
                
                if (day > 0 && day <= daysInMonth) {
                    const date = new Date(2024, month.getMonth(), day);
                    const dateKey = d3.timeFormat('%Y-%m-%d')(date);
                    const reviewCount = reviewsByDate.has(dateKey) ? reviewsByDate.get(dateKey).count : 0;

                    // Add day cells
                    monthGroup.append('rect')
                        .attr('class', 'day')
                        .attr('x', col * cellSize)
                        .attr('y', row * cellSize + cellSize)
                        .attr('width', cellSize - 2)
                        .attr('height', cellSize - 2)
                        .attr('rx', 2)
                        .attr('fill', colorScale(reviewCount))
                        .style('cursor', reviewCount > 0 ? 'pointer' : 'default')
                        .on('mouseover', (event) => {
                            if (reviewCount > 0) {
                                tooltip.selectAll('*').remove();
                                tooltip
                                    .style('visibility', 'visible')
                                    .style('left', (event.pageX + 10) + 'px')
                                    .style('top', (event.pageY - 10) + 'px')
                                    .html(`Date: ${d3.timeFormat('%B %d, %Y')(date)}<br/> Reviews: ${reviewCount}`);
                            }
                        })
                        .on('mouseout', () => tooltip.style('visibility', 'hidden'))
                        .on('click', () => {
                            if (reviewCount > 0) {
                                transitionToWordView(date);
                            }
                        });

                    // Add day numbers
                    monthGroup.append('text')
                        .attr('x', col * cellSize + (cellSize - 2) / 2)
                        .attr('y', row * cellSize + cellSize + (cellSize - 2) / 2)
                        .attr('text-anchor', 'middle')
                        .attr('dy', '0.3em')
                        .style('font-size', '8px')
                        .style('fill', reviewCount > 0 ? 'white' : '#666')
                        .text(day);
                }
            }
        });
    }

    // =========== PERFORMANCE VIEW ===========
    // Render word performance visualization
    function renderWordPerformance(selectedDate, viewType = 'goodbad') {
        // Clear existing elements
        svg.selectAll('.month').remove();
        svg.selectAll('.word-performance').remove();
        
        const dateStr = d3.timeFormat('%Y-%m-%d')(selectedDate);
        const dayWords = wordReviews.filter(w => 
            d3.timeFormat('%Y-%m-%d')(w.date) === dateStr
        );

        // Process data by hour
        const hourlyGroups = d3.group(dayWords, d => d.date.getHours());
        const activeHours = Array.from(hourlyGroups.keys()).map(Number).sort((a, b) => a - b);
        const hourRange = viewType === 'reviewtime' 
            ? [Math.max(0, Math.min(...activeHours) - 1), Math.min(23, Math.max(...activeHours) + 1)]
            : [0, 23];
        
        const hours = d3.range(hourRange[0], hourRange[1] + 1);
        
        // Create scales
        const timeScale = d3.scaleBand()
            .domain(hours)
            .range([margin.left, width - margin.right])
            .padding(0.1);

        // Add x-axis
        const xAxis = svg.append('g')
            .attr('class', 'word-performance x-axis')
            .attr('transform', `translate(0,${height - margin.bottom})`);
            // Add x-axis line
        xAxis.append('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', '#ccc');
        
        // Add hour labels
        xAxis.selectAll('.tick')
            .data(hours)
            .join('text')
            .attr('x', d => timeScale(d) + timeScale.bandwidth() / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .style('font-family', '"Segoe UI", Roboto, sans-serif')
            .style('font-size', '12px')
            .style('fill', d => getTimeColor(d))
            .text(d => d === 0 ? '12' : d > 12 ? d - 12 : d);

        // =========== VIEW TYPES ===========
        // Handle different visualization types: good/bad, agreement, review time
        if (viewType === 'goodbad' || viewType === 'agreement') {
            // Process data for bar chart view
            const getData = hour => {
                const hourData = hourlyGroups.get(hour) || [];
                if (viewType === 'goodbad') {
                    return {
                        good: hourData.filter(w => w.score === 'good').length,
                        bad: hourData.filter(w => w.score === 'bad').length,
                        words: hourData
                    };
                } else {
                    return {
                        yes: hourData.filter(w => w.agree === 'yes').length,
                        no: hourData.filter(w => w.agree === 'no').length,
                        words: hourData
                    };
                }
            };

            const countsByHour = hours.map(hour => ({
                hour,
                ...getData(hour)
            }));

            const subgroups = viewType === 'goodbad' ? ['good', 'bad'] : ['yes', 'no'];
            const maxCount = d3.max(countsByHour, d => 
                Math.max(...subgroups.map(g => d[g]))
            );

            // Create scales
            const countScale = d3.scaleLinear()
                .domain([0, maxCount])
                .range([height - margin.bottom, margin.top]);

            // Add y-axis
            const yAxis = svg.append('g')
                .attr('class', 'word-performance y-axis')
                .attr('transform', `translate(${margin.left},0)`)
                .call(d3.axisLeft(countScale).tickSize(0))
                .call(g => {
                    g.select('.domain').attr('stroke', '#ccc');
                    g.selectAll('text')
                        .style('font-family', '"Segoe UI", Roboto, sans-serif')
                        .style('font-size', '12px');
                });

            // Create grouped bar chart
            const xSubgroup = d3.scaleBand()
                .domain(subgroups)
                .range([0, timeScale.bandwidth()])
                .padding(0.05);

            const colors = {
                good: colors.pos.verb,
                bad: colors.pos.noun,
                yes: colors.pos.verb,
                no: colors.pos.noun
            };

            // Add bars
            const bars = svg.selectAll('.hour-group')
                .data(countsByHour)
                .join('g')
                .attr('class', 'word-performance hour-group')
                .attr('transform', d => `translate(${timeScale(d.hour)},0)`);

            bars.selectAll('rect')
                .data(d => subgroups.map(key => ({
                    key,
                    value: d[key],
                    hour: d.hour,
                    words: d.words
                })))
                .join('rect')
                .attr('x', d => xSubgroup(d.key))
                .attr('y', d => countScale(d.value))
                .attr('width', xSubgroup.bandwidth())
                .attr('height', d => height - margin.bottom - countScale(d.value))
                .attr('fill', d => colors[d.key])
                .on('mouseover', showEnhancedTooltip)
                .on('mouseout', () => tooltip.style('visibility', 'hidden'));

            // Add legend
            const labels = viewType === 'goodbad' ? ['Good', 'Bad'] : ['Agreed', 'Disagreed'];
            const legendColors = viewType === 'goodbad'
                ? [colors.good, colors.bad]
                : [colors.yes, colors.no];
            addLegend(labels, legendColors);

        } else if (viewType === 'reviewtime') {
            // Process data for review time scatter plot
            const wordsByHour = Array.from(hourlyGroups.entries())
                .flatMap(([hour, words]) => 
                    words.map(w => ({
                        ...w,
                        hour: +hour,
                        reviewTime: +w.reviewTime
                    }))
                );

            const timeExtent = d3.extent(wordsByHour, d => d.reviewTime);
            const reviewTimeScale = d3.scaleLinear()
                .domain([0, timeExtent[1]])
                .range([height - margin.bottom, margin.top]);

            // Add legend
            addLegend(['Good Reviews', 'Bad Reviews'], [colors.pos.verb, colors.pos.noun]);

            // Add y-axis
            svg.append('g')
                .attr('class', 'word-performance y-axis')
                .attr('transform', `translate(${margin.left},0)`)
                .call(d3.axisLeft(reviewTimeScale)
                    .tickSize(0)
                    .tickFormat(d => `${d}`))
                .call(g => {
                    g.select('.domain').attr('stroke', '#ccc');
                    g.selectAll('text')
                        .style('font-family', '"Segoe UI", Roboto, sans-serif')
                        .style('font-size', '12px');
                });

            // Add scatter plot points
            const jitterWidth = timeScale.bandwidth() * 0.8;
            
            svg.selectAll('.review-point')
                .data(wordsByHour)
                .join('circle')
                .attr('class', 'word-performance review-point')
                .attr('cx', d => timeScale(d.hour) + timeScale.bandwidth() / 2 + (Math.random() - 0.5) * jitterWidth)
                .attr('cy', d => reviewTimeScale(d.reviewTime))
                .attr('r', 4)
                .style('fill', d => d.score === 'good' ? colors.pos.verb : colors.pos.noun)
                .style('opacity', 0.6)
                .on('mouseover', (event, d) => {
                    tooltip.selectAll('*').remove();
                    tooltip
                        .style('visibility', 'visible')
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px')
                        .html(`
                            Word: ${d.word} (${d.english})<br/>
                            Type: ${posMap.labels[d.partOS]} (${categoryMap.names[d.category]})<br/>
                            Review Time: ${d.reviewTime}s<br/>
                            Result: ${d.score}
                        `);
                })
                .on('mouseout', () => tooltip.style('visibility', 'hidden'));
        }

        // Add axis labels
        svg.append('text')
            .attr('class', 'word-performance')
            .attr('x', width / 2)
            .attr('y', height - margin.bottom / 3)
            .attr('text-anchor', 'middle')
            .text('Time of Review');

        svg.append('text')
            .attr('class', 'word-performance')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', margin.left / 3 + 10)
            .attr('text-anchor', 'middle')
            .text(viewType === 'reviewtime' ? 'Review Time (s)' : 'Number of Reviews');

        // Add controls
        addControls(selectedDate, viewType);
    }

    // =========== UI COMPONENTS ===========
    // Add legend to visualization
    function addLegend(labels, colors) {
        const legend = svg.append('g')
            .attr('class', 'word-performance legend')
            .attr('transform', `translate(${width - margin.right - 100},${margin.top})`);

        labels.forEach((label, i) => {
            const g = legend.append('g')
                .attr('transform', `translate(0,${i * 20})`);

            g.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', colors[i]);

            g.append('text')
                .attr('x', 20)
                .attr('y', 10)
                .style('font-size', '12px')
                .text(label);
        });
    }

    // Add control buttons and handle interactions
    function addControls(selectedDate, viewType) {
        const buttonGroup = svg.append('g')
            .attr('class', 'word-performance button-group')
            .attr('transform', `translate(${width/2-100},${height+10})`);
    
        const toggleButton = buttonGroup.append('g')
            .attr('class', 'toggle-button')
            .style('cursor', 'pointer')
            .attr('transform', 'translate(0,0)');
    
        toggleButton.append('rect')
            .attr('width', 200)
            .attr('height', 30)
            .attr('rx', 5)
            .attr('fill', colors.pos.noun);
    
        let currentView = viewType;
        let buttonText;
        if (currentView === 'goodbad') {
            buttonText = 'Show Agreement';
        } else if (currentView === 'agreement') {
            buttonText = 'Show Review Time';
        } else {
            buttonText = 'Show Good/Bad';
        }
    
        toggleButton.append('text')
            .attr('x', 100)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .text(buttonText);
    
        toggleButton.on('click', () => {
            if (currentView === 'goodbad') {
                currentView = 'agreement';
                buttonText = 'Show Review Time';
            } else if (currentView === 'agreement') {
                currentView = 'reviewtime';
                buttonText = 'Show Good/Bad';
            } else {
                currentView = 'goodbad';
                buttonText = 'Show Agreement';
            }
    
            toggleButton.select('text')
                .text(buttonText);
    
            renderWordPerformance(selectedDate, currentView);
        });
    
        const resetButton = buttonGroup.append('g')
            .attr('class', 'reset-button')
            .style('cursor', 'pointer')
            .attr('transform', `translate(${220},0)`);
    
        resetButton.append('rect')
            .attr('width', 100)
            .attr('height', 30)
            .attr('rx', 4)
            .attr('fill', colors.pos.noun);
    
        resetButton.append('text')
            .attr('x', 50)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .text('Reset View');
    
        resetButton.on('click', () => {
            svg.selectAll('.word-performance')
                .transition()
                .duration(750)
                .style('opacity', 0)
                .remove();
    
            renderCalendars();
        });
    }

    // =========== VIEW TRANSITIONS ===========
    // Handle transitions between calendar and word performance views
    function transitionToWordView(date) {
        svg.selectAll('.month')
            .transition()
            .duration(750)
            .style('opacity', 0)
            .remove();
        
        renderWordPerformance(date);
    }

    // =========== INITIALIZATION ===========
    // Initialize with calendar view
    renderCalendars();
    
    // Return cleanup function
    return () => {
        tooltip.remove();
    };
}