// =========== SCROLLING VISUALIZATION CONTROLLER ===========
// Main controller for scroll-based visualization transitions
// - Manages section visibility based on scroll position
// - Handles viewport calculations and resize events
// - Dispatches events for active section changes
function scroller() {
    // =========== STATE MANAGEMENT ===========
    // Core state variables
    // - Container reference (defaults to body)
    // - Event dispatcher for section transitions
    // - Section elements and positions
    let container = d3.select('body');
    let dispatch = d3.dispatch('active', 'progress');
    let sections = d3.selectAll('.step');
    let sectionPositions;
    let currentIndex = -1;
    let containerOffset = 0;

    // =========== VIEWPORT CALCULATIONS ===========
    // Calculate and update section positions
    // - Get section positions relative to viewport
    // - Handle window resizing
    // - Store positions for scroll calculations
    function resize() {
        // Recalculate all section positions
        sectionPositions = [];
        let startPos;

        // Get positions of all sections
        sections.each(function(d, i) {
            let top = this.getBoundingClientRect().top;
            if (i === 0) startPos = top;
            sectionPositions.push(top - startPos);
        });
    }

    // =========== SCROLL POSITION TRACKING ===========
    // Monitor scroll position and update active section
    // - Calculate current scroll position
    // - Determine which section is in focus
    // - Trigger section change events
    function position() {
        // Get current scroll position with offset
        let pos = window.pageYOffset - containerOffset;
        let vh = window.innerHeight;

        // Check each section's position
        sections.each(function(d, i) {
            let rect = this.getBoundingClientRect();
            let midPoint = rect.top + rect.height / 2;

            // Section is active if in middle 50% of viewport
            if (midPoint > vh * 0.25 && midPoint < vh * 0.75) {
                // Only dispatch if section changed
                if (currentIndex !== i) {
                    dispatch.call('active', this, i);
                    currentIndex = i;
                }
            }
        });
    }

    // =========== EVENT BINDING ===========
    // Setup scroll and resize event handlers
    // - Bind scroll event listener
    // - Handle window resizing
    // - Initialize positions
    function scroll() {
        // Add scroll and resize handlers
        d3.select(window)
            .on('scroll.scroller', position)
            .on('resize.scroller', resize);

        // Initial sizing
        resize();
        
        // Small delay for proper initialization
        setTimeout(position, 100);
    }

    // =========== PUBLIC API ===========
    // Configure scroller behavior
    // - Set container element
    // - Configure offset
    // - Bind event handlers

    // Set container element
    scroll.container = function(value) {
        if (!arguments.length) return container;
        container = value;
        return scroll;
    };

    // Set vertical offset
    scroll.containerOffset = function(value) {
        if (!arguments.length) return containerOffset;
        containerOffset = value;
        return scroll;
    };

    // Bind event handlers
    scroll.on = function(action, callback) {
        dispatch.on(action, callback);
        return scroll;
    };

    return scroll;
}