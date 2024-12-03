// =========== IMPORTS & SETUP ===========

// bring in our configuration and styling
import { colors, posMap, categoryMap, legendConfig, uiConfig } from './cellconfig.js';

export function createHeatmap(visContainer, rawData) {
    // =========== CONSTANTS & CONFIG ===========
    
    // setup our dimensions and spacing
    // - base width on window size
    // - fixed height of 600px
    // - calendar layout uses 3 months per row
    const margin = { top: 60, right: 40, bottom: 80, left: 60 };
    const width = Math.floor(window.innerWidth * 0.65) - margin.left - margin.right;
    const height = 600;
    const monthsPerRow = 3;
    const calendarWidth = (width - margin.left - margin.right) / monthsPerRow + 15;
    const calendarHeight = (height - margin.top - margin.bottom) / 2 + 75;
    const cellSize = Math.min(calendarWidth / 8, calendarHeight / 8);
    
    // =========== HELPER FUNCTIONS ===========

    // color coding for different times of day
    // - morning (6-11): orange
    // - afternoon (12-17): blue  
    // - evening/night: black
    function getTimeColor(hour) {
        if ((hour >= 6 && hour <= 11)) {
            return '#f28e2c';
        } else if (hour >= 12 && hour <= 17) {
            return '#4e79a7';
        }
        return '#000000';
    }
    
    // date formatting helpers
    const formatMonth = d3.timeFormat('%B');
    const formatWeekday = d3.timeFormat('%a');
    
    // =========== DATA PROCESSING ===========
    
    // organize our raw data into useful structures
    // - create map of reviews by date for the calendar
    // - create array of word reviews with all details
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
    
    // =========== VISUALIZATION SETUP ===========
    
    // setup our basic visualization parameters
    // - months we'll show (May-October 2024)
    // - color scale for review counts
    // - create main SVG container
    const months = d3.range(5, 11).map(month => new Date(2024, month));
    
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(Array.from(reviewsByDate.values()), d => d.count)])
        .interpolator(d3.interpolateBlues);
    
    const svg = visContainer
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    // =========== TOOLTIP ===========

    // create tooltip for hover information
    // - positioned absolutely
    // - hidden by default
    // - styled for readability
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

    // =========== MINI CHART GENERATOR ===========

    // creates small bar charts for tooltip details
    // - shows distribution of parts of speech or categories
    // - takes array of words and type ('pos' or 'category')
    function createMiniBarChart(words, type) {
        const container = document.createElement('div');
        container.style.width = '300px';
        container.style.height = '120px';
        container.style.marginBottom = '10px';
        
        const margin = { top: 5, right: 30, bottom: 5, left: 100 };
        const width = 300 - margin.left - margin.right;
        const height = 100 - margin.top - margin.bottom;
    
        // count occurrences of each category
        const countMap = new Map();
        words.forEach(word => {
            const key = type === 'pos' ? word.partOS : word.category;
            countMap.set(key, (countMap.get(key) || 0) + 1);
        });
        
        // prepare data for visualization
        const data = Array.from(countMap, ([key, value]) => ({
            key,
            value,
            label: type === 'pos' ? posMap.labels[key] : categoryMap.names[key]
        })).sort((a, b) => b.value - a.value);
    
        // create SVG and setup scales
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
    
        // add bars and labels
        g.selectAll('.mini-bar')
            .data(data)
            .join('rect')
            .attr('class', 'mini-bar')
            .attr('x', 0)
            .attr('y', d => y(d.key))
            .attr('width', d => x(d.value))
            .attr('height', y.bandwidth())
            .attr('fill', d => type === 'pos' ? colors.pos[d.key] : '#4e79a7')
            .attr('rx', 2);
    
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

    // =========== TOOLTIP HANDLER ===========

    // handles enhanced tooltip display
    // - shows distribution charts
    // - filters words based on view type
    function showEnhancedTooltip(event, d) {
        tooltip.selectAll('*').remove();
        
        const hourStr = d3.timeFormat('%I %p')(new Date(2024, 0, 1, d.hour));
        
        // filter words based on current view
        const words = d.words.filter(w => {
            if (d.key === 'good') return w.score === 'good';
            if (d.key === 'bad') return w.score === 'bad';
            if (d.key === 'yes') return w.agree === 'yes';
            if (d.key === 'no') return w.agree === 'no';
            return false;
        });
    
        // build tooltip content
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
    
        // position and show tooltip
        tooltip
            .style('visibility', 'visible')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    // =========== CALENDAR VIEW ===========
    
    // renders the monthly calendar view
    // - creates a grid for each month
    // - adds labels for months and days
    // - colors cells based on review count
    function renderCalendars() {
        svg.selectAll('.word-performance').remove();
        
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // create calendar for each month
        months.forEach((month, i) => {
            const row = Math.floor(i / monthsPerRow);
            const col = i % monthsPerRow;
            
            // setup month container and labels
            const monthGroup = svg.append('g')
                .attr('class', 'month')
                .attr('transform', `translate(${margin.left + col * calendarWidth},${margin.top + row * calendarHeight})`);
            
            monthGroup.append('text')
                .attr('x', calendarWidth / 2)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .text(formatMonth(month));
            
            weekdays.forEach((day, j) => {
                monthGroup.append('text')
                    .attr('x', j * cellSize + 15)
                    .attr('y', cellSize - 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .text(day);
            });
            
            // calculate calendar grid positions
            const firstDay = new Date(2024, month.getMonth(), 1);
            const daysInMonth = new Date(2024, month.getMonth() + 1, 0).getDate();
            const startOffset = firstDay.getDay();

            // create calendar cells
            for (let i = 0; i < 42; i++) {
                const row = Math.floor(i / 7);
                const col = i % 7;
                const day = i - startOffset + 1;
                
                if (day > 0 && day <= daysInMonth) {
                    const date = new Date(2024, month.getMonth(), day);
                    const dateKey = d3.timeFormat('%Y-%m-%d')(date);
                    const reviewCount = reviewsByDate.has(dateKey) ? reviewsByDate.get(dateKey).count : 0;

                    // add calendar cell with interactions
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

                    // add day number
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

    // =========== WORD PERFORMANCE VIEW ===========
    
    // handles rendering of detailed word performance data
    // - supports three view types: goodbad, agreement, reviewtime
    // - creates bar charts or scatter plots based on view
    function renderWordPerformance(selectedDate, viewType = 'goodbad') {
        svg.selectAll('.month').remove();
        svg.selectAll('.word-performance').remove();
        
        // filter to selected date's words
        const dateStr = d3.timeFormat('%Y-%m-%d')(selectedDate);
        const dayWords = wordReviews.filter(w => 
            d3.timeFormat('%Y-%m-%d')(w.date) === dateStr
        );

        // setup time scales and ranges
        const hourlyGroups = d3.group(dayWords, d => d.date.getHours());
        const activeHours = Array.from(hourlyGroups.keys()).map(Number).sort((a, b) => a - b);
        const hourRange = viewType === 'reviewtime' 
            ? [Math.max(0, Math.min(...activeHours) - 1), Math.min(23, Math.max(...activeHours) + 1)]
            : [0, 23];
        
        const hours = d3.range(hourRange[0], hourRange[1] + 1);
        
        // setup scales and axes
        const timeScale = d3.scaleBand()
            .domain(hours)
            .range([margin.left, width - margin.right])
            .padding(0.1);

        // create x-axis with time labels
        const xAxis = svg.append('g')
            .attr('class', 'word-performance x-axis')
            .attr('transform', `translate(0,${height - margin.bottom})`);

        xAxis.append('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', '#ccc');
        
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

        // =========== VISUALIZATION TYPES ===========

        // handle different view types
        // - goodbad/agreement: grouped bar charts
        // - reviewtime: scatter plot
        if (viewType === 'goodbad' || viewType === 'agreement') {
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

            // setup data and scales for bars
            const countsByHour = hours.map(hour => ({
                hour,
                ...getData(hour)
            }));

            const subgroups = viewType === 'goodbad' ? ['good', 'bad'] : ['yes', 'no'];
            const maxCount = d3.max(countsByHour, d => 
                Math.max(...subgroups.map(g => d[g]))
            );

            const countScale = d3.scaleLinear()
                .domain([0, maxCount])
                .range([height - margin.bottom, margin.top]);

            // create y-axis
            svg.append('g')
                .attr('class', 'word-performance y-axis')
                .attr('transform', `translate(${margin.left},0)`)
                .call(d3.axisLeft(countScale).tickSize(0))
                .call(g => {
                    g.select('.domain').attr('stroke', '#ccc');
                    g.selectAll('text')
                        .style('font-family', '"Segoe UI", Roboto, sans-serif')
                        .style('font-size', '12px');
                });

            // create grouped bars
            const xSubgroup = d3.scaleBand()
                .domain(subgroups)
                .range([0, timeScale.bandwidth()])
                .padding(0.05);

            const colors = {
                good: '#59a14f',
                bad: '#e15759',
                yes: '#59a14f',
                no: '#e15759'
            };

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

            // add appropriate legend
            const labels = viewType === 'goodbad' ? ['Good', 'Bad'] : ['Agreed', 'Disagreed'];
            const legendColors = viewType === 'goodbad' 
                ? [colors.good, colors.bad]
                : [colors.yes, colors.no];
            addLegend(labels, legendColors);

        } else if (viewType === 'reviewtime') {
            // setup scatter plot
            // - one point per review
            // - x: hour of day
            // - y: review duration
            const wordsByHour = Array.from(hourlyGroups.entries())
                .flatMap(([hour, words]) => 
                    words.map(w => ({
                        ...w,
                        hour: +hour,
                        reviewTime: +w.reviewTime
                    }))
                );

            // setup scales for review times
            const timeExtent = d3.extent(wordsByHour, d => d.reviewTime);
            const reviewTimeScale = d3.scaleLinear()
                .domain([0, timeExtent[1]])
                .range([height - margin.bottom, margin.top]);

            addLegend(['Agreed', 'Disagreed'], ['#59a14f', '#e15759']);

            // create y-axis for review times
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

            // add jittered points
            const jitterWidth = timeScale.bandwidth() * 0.8;
            
            svg.selectAll('.review-point')
                .data(wordsByHour)
                .join('circle')
                .attr('class', 'word-performance review-point')
                .attr('cx', d => timeScale(d.hour) + timeScale.bandwidth() / 2 + (Math.random() - 0.5) * jitterWidth)
                .attr('cy', d => reviewTimeScale(d.reviewTime))
                .attr('r', 4)
                .style('fill', d => d.score === 'good' ? '#59a14f' : '#e15759')
                .style('opacity', 0.6)
                .on('mouseover', (event, d) => {
                    tooltip.selectAll('*').remove();
                    tooltip
                        .style('visibility', 'visible')
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px')
                        .html(`
                            Word: ${d.word} (${d.english})<br/>
                            Type of Word: ${d.partOS} (${categoryMap.names[d.category]})<br/>
                            Review Time: ${d.reviewTime}s<br/>
                            Result: ${d.score}
                        `);
                })
                .on('mouseout', () => tooltip.style('visibility', 'hidden'));
        }

        // add common labels
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

        // add view controls
        addControls(selectedDate, viewType);
    }

    // =========== UI COMPONENTS ===========

    // create legend for current view
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

    // add control buttons for view switching
    function addControls(selectedDate, viewType) {
        const buttonGroup = svg.append('g')
            .attr('class', 'word-performance button-group')
            .attr('transform', `translate(${width/2-100},${height+10})`);
    
        // create toggle button
        const toggleButton = buttonGroup.append('g')
            .attr('class', 'toggle-button')
            .style('cursor', 'pointer')
            .attr('transform', 'translate(0,0)');
    
        toggleButton.append('rect')
            .attr('width', 200)
            .attr('height', 30)
            .attr('rx', 5)
            .attr('fill', '#e15759');
    
        let currentView = viewType;
        let buttonText = viewType === 'goodbad' ? 'Show Agreement' :
                        viewType === 'agreement' ? 'Show Review Time' : 
                        'Show Good/Bad';
    
        toggleButton.append('text')
            .attr('x', 100)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .text(buttonText);
    
        // handle view cycling
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
    
        // create reset button
        const resetButton = buttonGroup.append('g')
            .attr('class', 'reset-button')
            .style('cursor', 'pointer')
            .attr('transform', `translate(${220},0)`);
    
        resetButton.append('rect')
            .attr('width', 100)
            .attr('height', 30)
            .attr('rx', 4)
            .attr('fill', '#e15759');
    
        resetButton.append('text')
            .attr('x', 50)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .text('Reset View');
    
        // handle reset to calendar view
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

    // handle transition from calendar to word view
    function transitionToWordView(date) {
        svg.selectAll('.month')
            .transition()
            .duration(750)
            .style('opacity', 0)
            .remove();
        
        renderWordPerformance(date);
    }

    // =========== INITIALIZATION & CLEANUP ===========
    
    // start with calendar view
    renderCalendars();
    
    // return cleanup function
    return () => {
        tooltip.remove();
    };
}
